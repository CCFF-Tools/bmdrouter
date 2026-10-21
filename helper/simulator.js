// Local test fixture. No physical router is used or discovered by this server.
import net from 'node:net';
import { BlockReader, sections } from './protocol.js';

export async function startSimulator({fragment = false, ackOnly = false, nak = false, silent = false, size = 40} = {}) {
  const state = {inputs: Array.from({length: 40}, (_, i) => `Source ${i + 1}`), outputs: Array.from({length: 40}, (_, i) => `Destination ${i + 1}`), routes: Array.from({length: 40}, (_, i) => i + 1), locks: Array(40).fill('U')};
  const sockets = new Set(), commands = [];
  let ignorePing = false;
  const block = side => `${sections[side]}:\n${state[side].map((value, i) => `${i} ${side === 'routes' ? value - 1 : value}`).join('\n')}\n\n`;
  const send = (socket, text) => {
    if (!fragment) { socket.write(text); return; }
    // Includes CRLF split between writes and a multi-byte UTF-8 label.
    const bytes = Buffer.from(text.replace(/\n/g, '\r\n'));
    for (let i = 0; i < bytes.length; i += 7) socket.write(bytes.subarray(i, i + 7));
  };
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    socket.setEncoding('utf8'); const reader = new BlockReader();
    if (!silent) send(socket, `PROTOCOL PREAMBLE:\nVersion: 2.3\n\nVIDEOHUB DEVICE:\nDevice present: true\nModel name: Smart Videohub 12G 40x40 simulator\nVideo inputs: ${size}\nVideo outputs: ${size}\n\n` + Object.keys(sections).map(block).join(''));
    socket.on('data', chunk => {
      for (const [header, ...rows] of reader.push(chunk)) {
        commands.push({header, rows});
        if (header === 'PING:') { if (!ignorePing) send(socket, 'ACK\n\n'); continue; }
        const side = Object.keys(sections).find(key => `${sections[key]}:` === header);
        if (!side) { send(socket, 'NAK\n\n'); continue; }
        if (!rows.length) { send(socket, `ACK\n\n${block(side)}`); continue; }
        if (nak) { send(socket, 'NAK\n\n'); continue; }
        if (!ackOnly) for (const row of rows) {
          const i = row.indexOf(' '), index = Number(row.slice(0, i)), value = row.slice(i + 1);
          if (side === 'routes' && state.locks[index] !== 'U') continue;
          state[side][index] = side === 'routes' ? Number(value) + 1 : value;
        }
        send(socket, `ACK\n\n${block(side)}`);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {port: server.address().port, state, commands,
    broadcast: side => { for (const socket of sockets) send(socket, block(side)); },
    stopPings: () => { ignorePing = true; },
    drop: () => { for (const socket of sockets) socket.destroy(); },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); }};
}
