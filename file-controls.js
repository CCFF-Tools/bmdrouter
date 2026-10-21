import { exportLabelSet, parseLabelSet, exportRouting, parseRouting, exportConfiguration, parseConfiguration, mergeVideohubFile } from './videohub-files.js?v=20261021-mac1';

export function setupFileControls(getData, replaceData) {
  const $ = id => document.getElementById(id);
  let pending = null;
  const message = text => { $('exchange-status').textContent = text; };
  function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('export-labels').addEventListener('click', () => {
    try {
      download(exportLabelSet(getData()), 'Labels Videohub 40x40.txt');
      message('Label set exported: 40 inputs and 40 outputs. Open it in Videohub Setup → gear icon → Load label set.');
    } catch (error) { message(error.message); }
  });
  $('export-routing').addEventListener('click', () => {
    try {
      download(exportRouting(getData()), 'Videohub Routing 40x40.txt');
      message('Routing exported as Ethernet protocol commands. Apply it using the Windows or Mac helper. This is not a Videohub Setup label-set file. Unassigned outputs are omitted.');
    } catch (error) { message(error.message); }
  });
  $('export-configuration').addEventListener('click', () => {
    try { download(exportConfiguration(getData()), 'Videohub Configuration 40x40.txt'); message('Full configuration exported: 80 labels and 40 routes. Import and send using the Windows or Mac helper.'); }
    catch (error) { message(error.message); }
  });
  for (const kind of ['labels', 'routing', 'configuration']) {
    $(`import-${kind}`).addEventListener('click', () => $(`file-${kind}`).click());
    $(`file-${kind}`).addEventListener('change', async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (file.size > 1000000) throw new Error('Choose a text file smaller than 1 MB.');
        const bytes = await file.arrayBuffer();
        // Accept UTF-8 (with/without BOM) and UTF-16 BOMs from Windows text editors.
        const prefix = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
        const encoding = prefix[0] === 255 && prefix[1] === 254 ? 'utf-16le' : prefix[0] === 254 && prefix[1] === 255 ? 'utf-16be' : 'utf-8';
        const text = new TextDecoder(encoding, {fatal: true}).decode(bytes);
        pending = ({labels: parseLabelSet, routing: parseRouting, configuration: parseConfiguration}[kind])(text);
        const current = getData();
        $('exchange-title').textContent = kind === 'labels' ? 'Import label set?' : kind === 'routing' ? 'Import routing?' : 'Import full configuration?';
        $('exchange-summary').textContent = `${file.name}: ${pending.entries.length} entries. Only listed labels or routes will be updated in this browser. Router name, locations, and notes stay unchanged. No changes are sent to your router.${pending.ignored?.length ? ' Other protocol blocks are ignored: ' + pending.ignored.join(', ') + '.' : ''}`;
        const list = $('exchange-preview'); list.replaceChildren();
        let changes = 0;
        for (const entry of pending.entries) {
          const before = entry.side === 'routes' ? current.routes[entry.index] : current[entry.side][entry.index].label;
          if (before === entry.value) continue;
          changes++;
          const item = document.createElement('li');
          item.textContent = entry.side === 'routes' ? `Output ${entry.index + 1}: ${before === null ? 'unassigned' : 'Input ' + before} → Input ${entry.value}` : `${entry.side === 'inputs' ? 'Input' : 'Output'} ${entry.index + 1}: ${before || '(blank)'} → ${entry.value || '(blank)'}`;
          list.append(item);
        }
        $('exchange-apply').disabled = changes === 0;
        if (!changes) { const item = document.createElement('li'); item.textContent = 'No changes: the listed ports already match.'; list.append(item); }
        $('exchange-dialog').showModal();
      } catch (error) { pending = null; message(`Import failed: ${error.message}`); }
      finally { event.target.value = ''; }
    });
  }
  $('exchange-backup').addEventListener('click', () => $('export').click());
  $('exchange-cancel').addEventListener('click', () => $('exchange-dialog').close());
  $('exchange-dialog').addEventListener('close', () => { pending = null; });
  $('exchange-apply').addEventListener('click', () => {
    if (!pending) return;
    replaceData(mergeVideohubFile(getData(), pending));
    message('Import applied in this browser. No changes were sent to your router.');
    $('exchange-dialog').close();
  });
}
