import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Videohub } from './protocol.js';
import { Control } from './control.js';
import { discover, networks, isLocalIPv4 } from './discovery.js';

const root = new URL('../', import.meta.url);
const assets = new Set(['index.html', 'style.css', 'app.js', 'model.js', 'matrix.js', 'theme.js', 'file-controls.js', 'videohub-files.js', 'helper-controls.js']);
const mime = {html: 'text/html', css: 'text/css', js: 'text/javascript'};
function json(response, status, value) { response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'}); response.end(JSON.stringify(value)); }
async function body(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1000000) throw new Error('Request exceeds 1 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export async function startServer({port = 49340, router = new Videohub(), allowTestLoopback = false, heartbeat = 5000} = {}) {
  const token = randomBytes(32).toString('hex'), control = new Control(router);
  let origin, scanning = false, pinging = false;
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
      json(response, 403, {error: 'Only the local helper page can access this service.'}); return;
    }
    const path = new URL(request.url, origin).pathname;
    try {
      if (path.startsWith('/api/')) {
        if (request.headers['x-video-router'] !== '1') { json(response, 403, {error: 'Open the helper page to use this service.'}); return; }
        if (path === '/api/session' && request.method === 'GET') { json(response, 200, {token, networks: networks()}); return; }
        const supplied = Buffer.from(request.headers.authorization || ''), expected = Buffer.from(`Bearer ${token}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { json(response, 403, {error: 'Helper session expired. Reload this page.'}); return; }
        if (path === '/api/state' && request.method === 'GET') {
          json(response, 200, {connected: router.connected, host: router.host, error: router.lastError, snapshot: router.connected ? router.snapshot() : null}); return;
        }
        if (request.method !== 'POST' || request.headers['content-type'] !== 'application/json') { json(response, 405, {error: 'Use a JSON POST request.'}); return; }
        const data = await body(request);
        if (path === '/api/connect') {
          if (typeof data.host !== 'string' || (!isLocalIPv4(data.host) && !(allowTestLoopback && data.host === '127.0.0.1'))) throw new Error('Enter the router’s private IPv4 address (10.x, 172.16–31.x, 192.168.x, or 169.254.x).');
          control.plans.clear();
          json(response, 200, {snapshot: await router.connect(data.host)});
        } else if (path === '/api/disconnect') {
          // Queue behind in-flight operations; never silently switch routers during a send.
          await router.exclusive(() => { router.disconnect(); control.plans.clear(); }); json(response, 200, {});
        } else if (path === '/api/discover') {
          if (scanning) throw new Error('Discovery is already running.');
          scanning = true;
          try { json(response, 200, {routers: await discover(data.network)}); } finally { scanning = false; }
        } else if (path === '/api/pull') json(response, 200, {snapshot: await router.refresh()});
        else if (path === '/api/preview') json(response, 200, await control.preview(data));
        else if (path === '/api/apply') json(response, 200, await control.apply(data.id));
        else json(response, 404, {error: 'Unknown helper operation.'});
        return;
      }
      const file = path === '/' ? 'index.html' : path.slice(1);
      if (request.method !== 'GET' || !assets.has(file)) { response.writeHead(404); response.end('Not found'); return; }
      let content = await readFile(fileURLToPath(new URL(file, root)));
      if (file === 'index.html') content = Buffer.from(content.toString().replace('<head>', '<head><meta name="videohub-helper" content="1">'));
      response.setHeader('Content-Type', `${mime[file.split('.').pop()]}; charset=utf-8`); response.end(content);
    } catch (error) { if (!response.headersSent) json(response, 400, {error: error.message}); else response.end(); }
  });
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); origin = `http://127.0.0.1:${server.address().port}`; resolve(); });
  });
  const timer = setInterval(async () => {
    if (!router.connected || pinging) return;
    pinging = true;
    try { await router.ping(); } catch (error) { router.disconnect(error.message); } finally { pinging = false; }
  }, heartbeat);
  timer.unref();
  return {server, origin, close: async () => { clearInterval(timer); router.disconnect(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }};
}
