import os from 'node:os';
import net from 'node:net';
import { BlockReader } from './protocol.js';

export function isLocalIPv4(host) {
  if (net.isIP(host) !== 4) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}
const numeric = ip => ip.split('.').reduce((n, octet) => ((n << 8) | Number(octet)) >>> 0, 0);
export function networks() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, entries]) => entries
    .filter(entry => entry.family === 'IPv4' && !entry.internal && isLocalIPv4(entry.address))
    .map(entry => ({id: `${entry.address}/${entry.netmask}`, name, address: entry.address, netmask: entry.netmask,
      range: `${entry.address.split('.').slice(0, 3).join('.')}.1–254 (within adapter subnet)`})));
}
export function candidates(network) {
  const address = numeric(network.address), mask = numeric(network.netmask), subnet = (address & mask) >>> 0;
  const prefix = network.address.split('.').slice(0, 3).join('.');
  return Array.from({length: 254}, (_, i) => `${prefix}.${i + 1}`).filter(ip => {
    const n = numeric(ip);
    return ip !== network.address && ((n & mask) >>> 0) === subnet && n !== subnet && n !== ((subnet | ~mask) >>> 0);
  });
}
export function probe(host, {port = 9990, timeout = 1200} = {}) {
  return new Promise(resolve => {
    const socket = net.createConnection({host, port}), reader = new BlockReader();
    let protocol = false, finished = false;
    const finish = result => { if (finished) return; finished = true; clearTimeout(timer); socket.destroy(); resolve(result); };
    const timer = setTimeout(() => finish(null), timeout);
    socket.setEncoding('utf8');
    socket.on('error', () => finish(null)); socket.on('close', () => finish(null));
    socket.on('data', chunk => {
      try {
        for (const [header, ...rows] of reader.push(chunk)) {
          if (header === 'PROTOCOL PREAMBLE:') protocol = rows.some(row => /^Version: 2\./.test(row));
          if (header === 'VIDEOHUB DEVICE:' && protocol) {
            const values = Object.fromEntries(rows.map(row => { const i = row.indexOf(': '); return [row.slice(0, i), row.slice(i + 2)]; }));
            finish(values['Device present'] === 'true' && values['Video inputs'] === '40' && values['Video outputs'] === '40' ? {host, model: values['Model name'] || 'Videohub 40×40'} : null);
          }
        }
      } catch { finish(null); }
    });
  });
}
export async function discover(id) {
  const network = networks().find(item => item.id === id);
  if (!network) throw new Error('Choose a network adapter from this computer.');
  const pending = candidates(network), found = [];
  await Promise.all(Array.from({length: 24}, async () => {
    while (pending.length) {
      const result = await probe(pending.shift());
      if (result) found.push(result);
    }
  }));
  return found.sort((a, b) => numeric(a.host) - numeric(b.host));
}
