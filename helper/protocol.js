import net from 'node:net';
import { EventEmitter } from 'node:events';

export const sections = {inputs: 'INPUT LABELS', outputs: 'OUTPUT LABELS', routes: 'VIDEO OUTPUT ROUTING', locks: 'VIDEO OUTPUT LOCKS'};
const emptyState = () => ({version: '', device: {}, inputs: Array(40).fill(null), outputs: Array(40).fill(null), routes: Array(40).fill(null), locks: Array(40).fill(null)});

// TCP chunks are not protocol messages. Keep partial lines and UTF-8 sequences.
export class BlockReader {
  buffer = '';
  push(chunk) {
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, '\n');
    if (this.buffer.length > 1000000) throw new Error('Router response exceeded 1 MB.');
    const blocks = [];
    let end;
    while ((end = this.buffer.indexOf('\n\n')) !== -1) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      if (block) blocks.push(block.split('\n'));
    }
    return blocks;
  }
}

export class Videohub extends EventEmitter {
  constructor({port = 9990, timeout = 4000} = {}) {
    super(); this.port = port; this.timeout = timeout; this.state = emptyState();
    this.connected = false; this.host = ''; this.lastError = ''; this.queue = Promise.resolve();
  }
  exclusive(action) {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }
  snapshot() { return structuredClone(this.state); }
  disconnect(reason = '') {
    const socket = this.socket;
    this.socket = null; this.connected = false; this.lastError = reason;
    this.emit('offline', new Error(reason || 'Router disconnected.'));
    socket?.destroy();
  }
  connect(host) { return this.exclusive(() => this._connect(host)); }
  async _connect(host) {
    this.disconnect(); this.state = emptyState(); this.host = host;
    const reader = new BlockReader();
    const socket = net.createConnection({host, port: this.port});
    this.socket = socket; socket.setEncoding('utf8'); socket.setNoDelay(true);
    socket.on('data', chunk => {
      if (this.socket !== socket) return;
      try { for (const lines of reader.push(chunk)) this.accept(lines); }
      catch (error) { this.disconnect(error.message); }
    });
    socket.on('error', error => { if (this.socket === socket) this.disconnect(`Cannot reach router: ${error.message}`); });
    socket.on('close', () => { if (this.socket === socket) this.disconnect('Router closed the connection.'); });
    await this.wait(() => this.complete(), 'block', 'The router did not provide a complete 40×40 state.');
    if (this.socket !== socket) throw new Error(this.lastError || 'Router disconnected during initialization.');
    this.connected = true; this.lastError = '';
    return this.snapshot();
  }
  complete() {
    return this.state.version.startsWith('2.') && this.state.device['Device present'] === 'true' &&
      Object.keys(sections).every(side => this.state[side].every(value => value !== null));
  }
  accept([header, ...rows]) {
    const name = header.replace(/:$/, '');
    if (name === 'PROTOCOL PREAMBLE' || name === 'VIDEOHUB DEVICE') {
      const values = Object.fromEntries(rows.map(row => { const i = row.indexOf(': '); return i < 0 ? [] : [row.slice(0, i), row.slice(i + 2)]; }).filter(pair => pair.length));
      if (name === 'PROTOCOL PREAMBLE') {
        this.state.version = values.Version || '';
        if (!this.state.version.startsWith('2.')) throw new Error('Unsupported Videohub protocol version.');
      } else {
        if (this.connected && Object.entries(values).some(([key, value]) => this.state.device[key] !== value)) throw new Error('Router device information changed. Reconnect and pull before sending.');
        Object.assign(this.state.device, values);
        if (this.state.device['Device present'] !== 'true') throw new Error('No supported router is present. Check firmware and connection.');
        for (const key of ['Video inputs', 'Video outputs']) {
          if (this.state.device[key] !== '40') throw new Error('This helper supports 40×40 Videohubs only.');
        }
      }
    }
    const side = Object.keys(sections).find(key => sections[key] === name);
    const received = new Set();
    if (side) for (const row of rows) {
      const match = /^(\d+) (.*)$/.exec(row);
      if (!match) continue; // Future protocol fields may be added.
      const index = Number(match[1]);
      if (index < 0 || index >= 40 || received.has(index)) throw new Error('Invalid or duplicate port in router response.');
      received.add(index);
      let value = match[2];
      if (side === 'routes') {
        if (!/^\d+$/.test(value) || Number(value) > 39) throw new Error('Invalid router crosspoint.');
        value = Number(value) + 1;
      } else if (side === 'locks') {
        if (!['U', 'L', 'O'].includes(value)) throw new Error('Unknown router lock state.');
      } else if (value.length > 2000 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Unsupported label received from router.');
      this.state[side][index] = value;
    }
    this.emit('block', {name, full: received.size === 40});
  }
  wait(predicate, event, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const clean = () => { clearTimeout(timer); this.off(event, check); this.off('offline', fail); };
      const fail = error => { clean(); reject(error); };
      const check = value => { if (predicate(value)) { clean(); resolve(); } };
      const timer = setTimeout(() => { fail(new Error(timeoutMessage)); this.disconnect(timeoutMessage); }, this.timeout);
      this.on(event, check); this.on('offline', fail);
    });
  }
  async command(text, expectedSection) {
    if (!this.socket || !this.connected) throw new Error('Connect to a router first.');
    let acknowledged = false, received = !expectedSection, rejected = false;
    const response = this.wait(block => {
      if (block.name === 'NAK') { rejected = true; return true; }
      if (block.name === 'ACK') acknowledged = true;
      if (block.name === expectedSection && block.full) received = true;
      return acknowledged && received;
    }, 'block', 'Router response timed out. The operation may have partially applied; reconnect and pull before retrying.');
    this.socket.write(text);
    await response;
    if (rejected) throw new Error('The router rejected the command (NAK).');
  }
  async _refresh() {
    for (const section of Object.values(sections)) await this.command(`${section}:\n\n`, section);
    return this.snapshot();
  }
  refresh() { return this.exclusive(() => this._refresh()); }
  ping() { return this.exclusive(() => this.command('PING:\n\n')); }
}
