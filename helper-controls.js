export function setupHelperControls(getData, replaceData) {
  const $ = id => document.getElementById(id);
  if (!document.querySelector('meta[name="videohub-helper"]')) return;
  $('helper-download').hidden = true; $('helper-panel').hidden = false;
  let token = '', busy = false, connected = false, pending = null, previewHasChanges = false, lastSnapshot = '';
  const message = text => { $('helper-message').textContent = text; };
  function enabled() {
    document.querySelectorAll('#helper-panel button').forEach(button => { button.disabled = busy; });
    document.querySelectorAll('[data-connected], #router-disconnect').forEach(button => { button.disabled = busy || !connected; });
    $('router-address').disabled = busy;
    $('router-network').disabled = busy;
    $('router-discover').disabled = busy || !$('router-network').options.length;
    $('router-preview-apply').disabled = busy || !pending || !previewHasChanges;
  }
  async function api(path, data) {
    const response = await fetch(`/api/${path}`, {method: data === undefined ? 'GET' : 'POST',
      headers: {'X-Video-Router': '1', ...(token ? {Authorization: `Bearer ${token}`} : {}), ...(data === undefined ? {} : {'Content-Type': 'application/json'})},
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(30000)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Helper request failed.');
    return result;
  }
  function status(value) {
    connected = value.connected;
    const dot = document.createElement('span'); dot.className = 'connection-dot'; dot.setAttribute('aria-hidden', 'true');
    $('connection-status').classList.toggle('connected', connected);
    $('connection-status').replaceChildren(dot, document.createTextNode(`Connection status: ${connected ? 'connected — ' + value.host : 'disconnected'}`));
    if (!connected) { $('live-routes').replaceChildren(); $('live-updated').textContent = value.error || 'Connect to see live routing.'; lastSnapshot = ''; }
    if (value.snapshot) live(value.snapshot);
    enabled();
  }
  function live(snapshot) {
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSnapshot) return;
    lastSnapshot = serialized;
    $('live-updated').textContent = `${snapshot.device['Model name']} · Current router state. This view updates independently of your documentation.`;
    for (const side of ['input', 'output']) {
      const select = $(`live-${side}`), selected = select.value;
      select.replaceChildren(...snapshot[`${side}s`].map((label, index) => {
        const option = document.createElement('option'); option.value = index + 1;
        option.textContent = `${index + 1}${label ? ' — ' + label : ''}`; return option;
      }));
      if (selected) select.value = selected;
    }
    $('live-routes').replaceChildren(...snapshot.routes.map((input, index) => {
      const row = document.createElement('tr');
      for (const text of [`${index + 1}${snapshot.outputs[index] ? ' — ' + snapshot.outputs[index] : ''}`, `${input}${snapshot.inputs[input - 1] ? ' — ' + snapshot.inputs[input - 1] : ''}`, snapshot.locks[index] === 'U' ? 'Unlocked' : snapshot.locks[index] === 'O' ? 'Locked by this address' : 'Locked']) {
        const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
      }
      return row;
    }));
  }
  async function refresh() {
    try { status(await api('state')); }
    catch { status({connected: false}); message('The helper is unavailable. Start it again and reload this page.'); }
  }
  async function run(action) {
    if (busy) return;
    busy = true; enabled();
    try { await action(); } catch (error) { message(error.name === 'TimeoutError' ? 'The helper request timed out. A send may have partially applied. Check the connection and pull from the router before retrying.' : error.message); }
    finally { await refresh(); busy = false; enabled(); }
  }
  function describe(change) {
    return change.side === 'routes' ? `Output ${change.index + 1}: ${change.before === null ? 'unassigned' : 'Input ' + change.before} → Input ${change.value}` : `${change.side === 'inputs' ? 'Input' : 'Output'} ${change.index + 1}: ${change.before || '(blank)'} → ${change.value || '(blank)'}`;
  }
  function preview(title, summary, changes, action, button) {
    pending = action;
    previewHasChanges = changes.length > 0;
    $('router-preview-title').textContent = title; $('router-preview-summary').textContent = summary;
    $('router-preview-list').replaceChildren(...changes.map(change => { const item = document.createElement('li'); item.textContent = describe(change); return item; }));
    if (!changes.length) { const item = document.createElement('li'); item.textContent = 'No changes needed.'; $('router-preview-list').append(item); }
    $('router-preview-apply').textContent = button; $('router-preview-apply').disabled = busy || !previewHasChanges;
    $('router-preview').showModal();
  }
  $('router-preview-backup').addEventListener('click', () => $('export').click());
  $('router-preview-cancel').addEventListener('click', () => $('router-preview').close());
  $('router-preview').addEventListener('close', () => { pending = null; });
  $('router-preview-apply').addEventListener('click', () => {
    const action = pending; pending = null; $('router-preview').close();
    if (action) run(action);
  });
  $('router-connect').addEventListener('click', () => run(async () => {
    const host = $('router-address').value.trim();
    message(`Connecting to ${host}…`); await api('connect', {host});
    try { localStorage.setItem('video-router-helper-address', host); } catch { /* Optional preference. */ }
    message('Connected. Pull to review the router’s labels and routes, or preview a send.');
  }));
  $('router-disconnect').addEventListener('click', () => run(async () => { await api('disconnect', {}); message('Disconnected. Your saved documentation is unchanged.'); }));
  $('router-discover').addEventListener('click', () => run(async () => {
    message('Looking for 40×40 Videohubs on the selected network…'); $('discovered-routers').replaceChildren();
    const result = await api('discover', {network: $('router-network').value});
    for (const router of result.routers) {
      const button = document.createElement('button'); button.className = 'secondary'; button.textContent = `${router.model} — ${router.host}`;
      button.addEventListener('click', () => { $('router-address').value = router.host; $('router-connect').click(); }); $('discovered-routers').append(button);
    }
    message(result.routers.length ? 'Choose a router to connect.' : 'No 40×40 Videohubs found. Check the network, or enter the router’s IP address directly.');
  }));
  $('router-pull').addEventListener('click', () => run(async () => {
    message('Reading labels and routes…');
    const {snapshot} = await api('pull', {}), current = getData(), changes = [];
    for (const side of ['inputs', 'outputs', 'routes']) snapshot[side].forEach((value, index) => {
      const before = side === 'routes' ? current.routes[index] : current[side][index].label;
      if (before !== value) changes.push({side, index, before, value});
    });
    preview('Pull labels and routing?', `${changes.length} changes to saved documentation from ${snapshot.device['Model name']}. Router name, notes, and locations are preserved. Nothing is sent to the router.`, changes, async () => {
      const imported = structuredClone(getData());
      for (const side of ['inputs', 'outputs']) snapshot[side].forEach((label, index) => { imported[side][index].label = label; });
      imported.routes = [...snapshot.routes]; replaceData(imported); message('Labels and routing pulled into your documentation. Export a backup or full configuration to save a file.');
    }, 'Update documentation');
    message('Review the pull before replacing saved labels and routing.');
  }));
  for (const kind of ['labels', 'routing', 'full', 'route']) $(`router-${kind}`).addEventListener('click', () => run(async () => {
    const request = kind === 'route' ? {kind, input: Number($('live-input').value), output: Number($('live-output').value)} : {kind, data: getData()};
    message('Reading the router and preparing a preview…');
    const plan = await api('preview', request);
    preview(kind === 'route' ? 'Change this live route?' : 'Send changes to router?', `${plan.model} at ${plan.host}: ${plan.changes.length} changes. ${kind === 'labels' ? 'Includes clearing labels that are blank in your documentation. Routing stays unchanged.' : kind === 'routing' || kind === 'route' ? 'Labels stay unchanged.' : 'Labels and routing will change.'} The preview expires after two minutes.`, plan.changes, async () => {
      message('Sending changes and verifying router readback…');
      const result = await api('apply', {id: plan.id});
      if (kind === 'route') {
        const updated = structuredClone(getData()); updated.routes[request.output - 1] = result.snapshot.routes[request.output - 1]; replaceData(updated);
      }
      message(`${result.verified} changes verified by reading the router back.`);
    }, 'Send to router');
    message('Review the proposed changes before sending.');
  }));
  async function start() {
    busy = true; enabled();
    try {
      const session = await api('session'); token = session.token;
      for (const network of session.networks) {
        const option = document.createElement('option'); option.value = network.id; option.textContent = `${network.name}: ${network.range}`; $('router-network').append(option);
      }
      try { $('router-address').value = localStorage.getItem('video-router-helper-address') || ''; } catch { /* Optional preference. */ }
      await refresh();
      let polling = false;
      setInterval(async () => { if (busy || polling || document.hidden) return; polling = true; try { await refresh(); } finally { polling = false; } }, 2000);
    } catch (error) { message(`Could not initialize the helper: ${error.message}. Reload this page.`); }
    finally { busy = false; enabled(); }
  }
  start();
}
