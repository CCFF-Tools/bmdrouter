import { validate } from './model.js?v=20261020-matrix1';

function lines(text) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('Choose a text file smaller than 1 MB.');
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
}
function portIndex(value, base, line) {
  if (!/^\d+$/.test(value)) throw new Error(`Line ${line}: invalid port number.`);
  const index = Number(value) - base;
  if (!Number.isSafeInteger(index) || index < 0 || index > 39) throw new Error(`Line ${line}: port is outside this 40×40 router.`);
  return index;
}
function add(entries, seen, entry, line) {
  const key = `${entry.side}:${entry.index}`;
  if (seen.has(key)) throw new Error(`Line ${line}: duplicate ${entry.side} port ${entry.index + 1}.`);
  seen.add(key);
  entries.push(entry);
}

// Videohub Setup label set: headerless CSV, one-based ports, inputs then outputs.
// See docs/videohub-file-formats.md for evidence and compatibility limits.
export function exportLabelSet(data) {
  const valid = validate(data), rows = [];
  for (const side of ['inputs', 'outputs']) valid[side].forEach((port, index) => {
    if (/[^\x20-\x7e]|[,"]/.test(port.label)) {
      throw new Error(`${side === 'inputs' ? 'Input' : 'Output'} ${index + 1}: label-set export supports plain ASCII without commas or double quotes. Edit this label before exporting. Your saved label has not been changed.`);
    }
    rows.push(`${side === 'inputs' ? 'Input' : 'Output'},${index + 1},${port.label}`);
  });
  return rows.join('\r\n');
}

export function parseLabelSet(text) {
  const entries = [], seen = new Set();
  lines(text).forEach((line, index) => {
    if (!line.trim()) return;
    const match = /^(Input|Output),[ \t]*(\d+),(.*)$/.exec(line);
    if (!match) throw new Error(`Line ${index + 1}: expected Input,1,Label or Output,1,Label. Routing files must be imported separately.`);
    const value = /^(Input|Output),[ \t]+/.test(line) && match[3].startsWith(' ') ? match[3].slice(1) : match[3];
    if (value.length > 2000 || /[\x00-\x1f\x7f,"]/.test(value)) throw new Error(`Line ${index + 1}: label contains unsupported characters or extra CSV fields.`);
    add(entries, seen, {side: match[1] === 'Input' ? 'inputs' : 'outputs', index: portIndex(match[2], 1, index + 1), value}, index + 1);
  });
  if (!entries.length) throw new Error('No input or output labels were found.');
  return {kind: 'labels', entries};
}

// Routing uses the Ethernet protocol, NOT the Setup label-set format.
export function exportRouting(data) {
  const valid = validate(data);
  const routes = valid.routes.flatMap((source, index) => source === null ? [] : [`${index} ${source - 1}`]);
  if (!routes.length) throw new Error('No routing assignments to export. Assign sources in Matrix first.');
  return `VIDEO OUTPUT ROUTING:\n${routes.join('\n')}\n\n`;
}

export function parseRouting(text) {
  const entries = [], seen = new Set();
  let section = null, found = false;
  const ignored = new Set();
  lines(text).forEach((line, index) => {
    if (!line.trim()) { section = null; return; }
    if (/^[A-Z][A-Z0-9 _-]*:$/.test(line)) {
      section = line;
      if (section === 'VIDEO OUTPUT ROUTING:') found = true;
      else ignored.add(section.slice(0, -1));
      return;
    }
    if (!section) throw new Error(`Line ${index + 1}: expected a VideoHub protocol block header.`);
    if (section === 'VIDEOHUB DEVICE:') {
      const size = /^Video (?:inputs|outputs): (\d+)$/.exec(line);
      if (size && Number(size[1]) !== 40) throw new Error('This router report is not for a 40×40 router.');
    }
    if (section !== 'VIDEO OUTPUT ROUTING:') return;
    const match = /^(\d+) +(\d+)$/.exec(line);
    if (!match) throw new Error(`Line ${index + 1}: expected a zero-based output number and input number.`);
    add(entries, seen, {side: 'routes', index: portIndex(match[1], 0, index + 1), value: portIndex(match[2], 0, index + 1) + 1}, index + 1);
  });
  if (!found || !entries.length) throw new Error('No VIDEO OUTPUT ROUTING assignments were found. Label sets must be imported separately.');
  return {kind: 'routing', entries, ignored: [...ignored]};
}

export function mergeVideohubFile(data, parsed) {
  const result = validate(data);
  for (const {side, index, value} of parsed.entries) {
    if (side === 'routes') result.routes[index] = value;
    else result[side][index].label = value;
  }
  return validate(result);
}

// A portable protocol configuration contains labels and video routing only.
// It deliberately excludes locks, network settings, and device identity.
export function exportConfiguration(data) {
  const valid = validate(data);
  if (valid.routes.some(source => source === null)) throw new Error('A full configuration needs all 40 routes. Pull from the router or assign the missing sources first.');
  const blocks = ['inputs', 'outputs'].map(side => {
    const rows = valid[side].map((port, index) => {
      if (/[\x00-\x1f\x7f]/.test(port.label)) throw new Error(`${side} ${index + 1}: labels cannot contain line breaks or control characters.`);
      return `${index} ${port.label}`;
    });
    return `${side === 'inputs' ? 'INPUT' : 'OUTPUT'} LABELS:\n${rows.join('\n')}\n\n`;
  });
  return blocks.join('') + exportRouting(valid);
}

export function parseConfiguration(text) {
  const routing = parseRouting(text), entries = [], seen = new Set();
  let side = null;
  lines(text).forEach((line, index) => {
    if (!line) { side = null; return; }
    if (/^[A-Z][A-Z0-9 _-]*:$/.test(line)) {
      side = line === 'INPUT LABELS:' ? 'inputs' : line === 'OUTPUT LABELS:' ? 'outputs' : null;
      return;
    }
    if (!side) return;
    const match = /^(\d+) (.*)$/.exec(line);
    if (!match || match[2].length > 2000 || /[\x00-\x1f\x7f]/.test(match[2])) throw new Error(`Line ${index + 1}: invalid protocol label.`);
    add(entries, seen, {side, index: portIndex(match[1], 0, index + 1), value: match[2]}, index + 1);
  });
  for (const name of ['inputs', 'outputs']) if (entries.filter(entry => entry.side === name).length !== 40) throw new Error('A full configuration must contain all 40 input labels and 40 output labels. Use Import label set for labels only.');
  if (routing.entries.length !== 40) throw new Error('A full configuration must contain all 40 output routes. Use Import routing for partial routing files.');
  return {kind: 'configuration', entries: [...entries, ...routing.entries], ignored: routing.ignored.filter(name => !['INPUT LABELS', 'OUTPUT LABELS'].includes(name))};
}
