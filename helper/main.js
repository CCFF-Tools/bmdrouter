import { spawn } from 'node:child_process';
import { startServer } from './server.js';

try {
  const helper = await startServer();
  console.log(`Video Router Matrix Helper\n\nOpen ${helper.origin}\nKeep this window open while using the router. Close it to stop the helper.\n`);
  if (process.argv.includes('--open') && !process.argv.includes('--no-open') && ['win32', 'darwin'].includes(process.platform)) {
    // URL is a fixed loopback address, never user-provided shell input.
    const command = process.platform === 'darwin' ? '/usr/bin/open' : 'rundll32.exe';
    const args = process.platform === 'darwin' ? [helper.origin] : ['url.dll,FileProtocolHandler', helper.origin];
    const browser = spawn(command, args, {detached: true, stdio: 'ignore'});
    browser.on('error', () => console.log(`Open ${helper.origin} in your browser.`)); browser.unref();
    browser.on('exit', code => { if (code) console.log(`Open ${helper.origin} in your browser.`); });
  }
  const stop = async () => { await helper.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? 'The helper port is already in use. If the helper is running, open http://127.0.0.1:49340. Otherwise close the program using port 49340 and try again.' : error.message);
  process.exitCode = 1;
}
