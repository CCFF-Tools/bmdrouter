// Exercise the extracted distribution, including paths with spaces and its launcher.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const launcher = path.join(root, 'Start Video Router Matrix.command');
await access(launcher, constants.X_OK);
await access(path.join(root, 'runtime/node'), constants.X_OK);
const helper = spawn(launcher, ['--no-open'], {cwd: '/tmp', stdio: ['ignore', 'pipe', 'pipe']});
let output = '';
helper.stdout.on('data', chunk => { output += chunk; });
helper.stderr.on('data', chunk => { output += chunk; });
const exited = once(helper, 'exit');
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (helper.exitCode !== null) throw new Error(`Launcher exited early: ${output}`);
    try {
      const response = await fetch('http://127.0.0.1:49340/', {signal: AbortSignal.timeout(500)});
      if (response.ok && (await response.text()).includes('name="videohub-helper"')) { ready = true; break; }
    } catch { /* Wait for the bundled runtime to start. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, `Packaged helper did not start: ${output}`);
  assert(output.includes('Video Router Matrix Helper'), 'Expected this launcher to start the server.');
  const headers = {'X-Video-Router': '1'};
  const sessionResponse = await fetch('http://127.0.0.1:49340/api/session', {headers});
  assert.equal(sessionResponse.status, 200);
  const session = await sessionResponse.json(); assert(session.token);
  const stateResponse = await fetch('http://127.0.0.1:49340/api/state', {headers: {...headers, Authorization: `Bearer ${session.token}`}});
  assert.equal(stateResponse.status, 200);
  assert.equal((await stateResponse.json()).connected, false);
  console.log('PASS: extracted Mac launcher, executable permissions, bundled runtime, browser assets and authenticated local API.');
} finally {
  helper.kill('SIGTERM');
  const force = setTimeout(() => helper.kill('SIGKILL'), 4000);
  await exited; clearTimeout(force);
}
