import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Videohub, BlockReader } from '../helper/protocol.js';
import { Control } from '../helper/control.js';
import { startSimulator } from '../helper/simulator.js';
import { startServer } from '../helper/server.js';
import { candidates, isLocalIPv4, probe } from '../helper/discovery.js';
import { blank } from '../model.js';

async function fixture(t, options = {}) {
  const simulator = await startSimulator(options);
  const router = new Videohub({port: simulator.port, timeout: 400});
  t.after(async () => { router.disconnect(); await simulator.close(); });
  return {simulator, router, control: new Control(router)};
}
const documentation = state => {
  const data = blank();
  for (const side of ['inputs', 'outputs']) state[side].forEach((label, i) => { data[side][i].label = label; });
  data.routes = [...state.routes]; return data;
};

test('framing accepts split CRLF, multiple blocks, and retains incomplete messages', () => {
  const parser = new BlockReader();
  assert.deepEqual(parser.push('ACK\r'), []);
  assert.deepEqual(parser.push('\n\r'), []);
  assert.deepEqual(parser.push('\nPING:\n\nINPUT LABELS:\n0 Camera'), [['ACK'], ['PING:']]);
  assert.deepEqual(parser.push(' A\n\n'), [['INPUT LABELS:', '0 Camera A']]);
});
test('complete initial state, blank/Unicode labels, unsolicited updates and verified one-based routing', async t => {
  const {simulator, router, control} = await fixture(t, {fragment: true});
  simulator.state.inputs[0] = 'Caméra'; simulator.state.inputs[1] = '';
  const snapshot = await router.connect('127.0.0.1');
  assert.equal(snapshot.inputs[0], 'Caméra'); assert.equal(snapshot.inputs[1], '');
  assert.equal(snapshot.routes[39], 40); assert.equal(router.connected, true);
  const plan = await control.preview({kind: 'route', input: 40, output: 1});
  assert.equal(simulator.state.routes[0], 1); // Preview sends no writes.
  const result = await control.apply(plan.id);
  assert.equal(result.verified, 1); assert.equal(result.snapshot.routes[0], 40);
  assert(simulator.commands.some(c => c.header === 'VIDEO OUTPUT ROUTING:' && c.rows[0] === '0 39'));
  simulator.state.routes[1] = 9; simulator.broadcast('routes');
  await router.ping(); assert.equal(router.snapshot().routes[1], 9);
  await assert.rejects(control.apply(plan.id), /expired/);
});
test('label sends leave routing untouched; full sends require all routes and validate protocol injection', async t => {
  const {simulator, router, control} = await fixture(t);
  const data = documentation(await router.connect('127.0.0.1'));
  data.inputs[0].label = 'New, "camera"'; data.outputs[39].label = ''; data.routes[0] = 40;
  let plan = await control.preview({kind: 'labels', data});
  assert.equal(plan.changes.length, 2); await control.apply(plan.id);
  assert.equal(simulator.state.routes[0], 1); assert.equal(simulator.state.outputs[39], '');
  plan = await control.preview({kind: 'full', data}); await control.apply(plan.id);
  assert.equal(simulator.state.routes[0], 40);
  data.routes[10] = null; await assert.rejects(control.preview({kind: 'routing', data}), /all 40/);
  data.inputs[0].label = 'bad\n\nVIDEO OUTPUT ROUTING:\n0 1';
  await assert.rejects(control.preview({kind: 'labels', data}), /control characters/);
});
test('locked outputs and stale previews prevent writes without unlocking', async t => {
  const {simulator, router, control} = await fixture(t);
  await router.connect('127.0.0.1');
  for (const lock of ['L', 'O']) {
    simulator.state.locks[0] = lock;
    await assert.rejects(control.preview({kind: 'route', input: 2, output: 1}), /locked/);
  }
  simulator.state.locks[0] = 'U';
  let plan = await control.preview({kind: 'route', input: 2, output: 1});
  simulator.state.routes[0] = 3;
  await assert.rejects(control.apply(plan.id), /changed since the preview/);
  plan = await control.preview({kind: 'route', input: 2, output: 1});
  simulator.state.locks[0] = 'L';
  await assert.rejects(control.apply(plan.id), /locked/);
  assert.equal(simulator.commands.filter(c => c.rows.length).length, 0);
});
test('ACK without applied state is a failure, not reported success', async t => {
  const {router, control} = await fixture(t, {ackOnly: true});
  await router.connect('127.0.0.1');
  const plan = await control.preview({kind: 'route', input: 2, output: 1});
  await assert.rejects(control.apply(plan.id), /not confirmed by readback/);
});
test('full-table previews detect changes to routes that originally needed no write', async t => {
  const {simulator, router, control} = await fixture(t);
  const data = documentation(await router.connect('127.0.0.1')); data.routes[0] = 40;
  const plan = await control.preview({kind: 'routing', data});
  assert.equal(plan.changes.length, 1);
  simulator.state.routes[39] = 1;
  await assert.rejects(control.apply(plan.id), /changed since the preview/);
  assert.equal(simulator.commands.filter(c => c.rows.length).length, 0);
});
test('NAK is surfaced and failed writes are never retried automatically', async t => {
  const {router, control, simulator} = await fixture(t, {nak: true});
  await router.connect('127.0.0.1');
  const plan = await control.preview({kind: 'route', input: 2, output: 1});
  await assert.rejects(control.apply(plan.id), /NAK/);
  assert.equal(simulator.commands.filter(c => c.rows.length).length, 1);
});
test('wrong-size and incomplete devices fail; heartbeat timeout disconnects', async t => {
  const wrong = await fixture(t, {size: 12});
  await assert.rejects(wrong.router.connect('127.0.0.1'), /40×40/);
  assert.equal(wrong.router.connected, false);
  const silent = await fixture(t, {silent: true});
  await assert.rejects(silent.router.connect('127.0.0.1'), /complete/);
  const live = await fixture(t); await live.router.connect('127.0.0.1'); live.simulator.stopPings();
  await assert.rejects(live.router.ping(), /timed out/); assert.equal(live.router.connected, false);
});
test('reconnect and expiry invalidate send previews', async t => {
  const {router, control} = await fixture(t); await router.connect('127.0.0.1');
  let plan = await control.preview({kind: 'route', input: 2, output: 1});
  await router.connect('127.0.0.1'); await assert.rejects(control.apply(plan.id), /connection changed/);
  plan = await control.preview({kind: 'route', input: 2, output: 1}); control.plans.get(plan.id).expires = 0;
  await assert.rejects(control.apply(plan.id), /expired/);
});
test('discovery identifies protocol and size, and restricts scan to local adapter subnet', async t => {
  const {simulator} = await fixture(t);
  assert.equal((await probe('127.0.0.1', {port: simulator.port})).model, 'Smart Videohub 12G 40x40 simulator');
  const wrong = await fixture(t, {size: 12}); assert.equal(await probe('127.0.0.1', {port: wrong.simulator.port}), null);
  assert.equal(isLocalIPv4('192.168.1.1'), true); assert.equal(isLocalIPv4('8.8.8.8'), false); assert.equal(isLocalIPv4('127.0.0.1'), false);
  const ips = candidates({address: '192.168.1.130', netmask: '255.255.255.128'});
  assert.equal(ips.length, 125); assert(!ips.includes('192.168.1.128')); assert(!ips.includes('192.168.1.130')); assert(!ips.includes('192.168.1.255')); assert(ips.every(ip => Number(ip.split('.')[3]) > 128));
});
test('loopback HTTP API blocks foreign origins, missing tokens, rebinding and source-file access; authenticated flow works', async t => {
  const {router} = await fixture(t);
  const helper = await startServer({port: 0, router, allowTestLoopback: true}); t.after(() => helper.close());
  const call = (path, options) => fetch(helper.origin + path, options);
  let response = await call('/'); assert((await response.text()).includes('name="videohub-helper"')); assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal((await call('/helper/server.js')).status, 404);
  assert.equal((await call('/api/session')).status, 403);
  assert.equal((await call('/api/session', {headers: {'X-Video-Router': '1', Origin: 'https://evil.example'}})).status, 403);
  const reboundStatus = await new Promise((resolve, reject) => {
    http.get(helper.origin + '/api/session', {headers: {'X-Video-Router': '1', Host: 'evil.example'}}, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(reboundStatus, 403);
  const {token} = await (await call('/api/session', {headers: {'X-Video-Router': '1'}})).json();
  assert.equal((await call('/api/state', {headers: {'X-Video-Router': '1'}})).status, 403);
  const headers = {'X-Video-Router': '1', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'};
  const post = async (path, data) => { const res = await call('/api/' + path, {method: 'POST', headers, body: JSON.stringify(data)}); return {status: res.status, body: await res.json()}; };
  assert.equal((await post('connect', {host: '8.8.8.8'})).status, 400);
  assert.equal((await post('connect', {host: '127.0.0.1'})).status, 200);
  const plan = await post('preview', {kind: 'route', input: 40, output: 1}); assert.equal(plan.status, 200);
  const applied = await post('apply', {id: plan.body.id}); assert.equal(applied.body.snapshot.routes[0], 40);
  assert.equal((await post('pull', {})).body.snapshot.inputs.length, 40);
  await post('disconnect', {}); assert.equal(router.connected, false);
});
