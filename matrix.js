import { toggleRoute } from './model.js?v=20261020-matrix1';

export function renderMatrix(root, data, save) {
  const section = document.createElement('section');
  section.className = 'matrix-panel';
  section.setAttribute('aria-label', 'Documented routing matrix');
  const legend = document.createElement('p');
  legend.className = 'matrix-legend';
  legend.textContent = '● Documented route · Blank cell = no documented route · One source per output';
  const status = document.createElement('p');
  status.className = 'matrix-status';
  status.setAttribute('role', 'status');
  const scroller = document.createElement('div');
  scroller.className = 'matrix-scroll';
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', '40 input rows by 40 output columns. Scroll to see all ports.');
  scroller.tabIndex = 0;
  const table = document.createElement('table');
  table.className = 'routing-matrix';
  const caption = table.createCaption();
  caption.textContent = 'Documented routes — inputs down the left, outputs across the top';
  caption.className = 'sr-only';
  const header = table.createTHead().insertRow();
  const corner = document.createElement('th');
  corner.className = 'matrix-corner';
  corner.textContent = 'Inputs ↓ / Outputs →';
  header.append(corner);
  const describe = (side, index) => `${side === 'inputs' ? 'Input' : 'Output'} ${index + 1}${data[side][index].label ? ': ' + data[side][index].label : ' (unlabeled)'}`;
  for (let o = 0; o < 40; o++) {
    const th = document.createElement('th');
    th.scope = 'col';
    const number = document.createElement('span');
    number.className = 'matrix-output-number';
    number.textContent = String(o + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'matrix-output-label';
    label.textContent = data.outputs[o].label || 'Unlabeled';
    th.title = describe('outputs', o);
    th.append(number, label);
    header.append(th);
  }
  const body = table.createTBody();
  const cells = [];
  const refresh = () => {
    status.textContent = `${data.routes.filter(source => source !== null).length} / 40 outputs have a documented source.`;
    cells.forEach((row, i) => row.forEach((button, o) => {
      const selected = data.routes[o] === i + 1;
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '●' : '';
    }));
  };
  let focused = null;
  function focusCell(button) {
    if (focused) focused.tabIndex = -1;
    focused = button;
    button.tabIndex = 0;
  }
  for (let i = 0; i < 40; i++) {
    const row = body.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = `${String(i + 1).padStart(2, '0')}  ${data.inputs[i].label || 'Unlabeled'}`;
    heading.title = describe('inputs', i);
    row.append(heading);
    cells[i] = [];
    for (let o = 0; o < 40; o++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crosspoint';
      button.dataset.input = i + 1;
      button.dataset.output = o + 1;
      button.tabIndex = -1;
      const description = `${describe('inputs', i)} → ${describe('outputs', o)}`;
      button.setAttribute('aria-label', description);
      button.title = description;
      button.addEventListener('focus', () => focusCell(button));
      button.addEventListener('click', () => {
        toggleRoute(data, i + 1, o + 1);
        save();
        refresh();
        status.textContent += data.routes[o] === null ? ` Cleared output ${o + 1}.` : ` Output ${o + 1} assigned to input ${i + 1}.`;
      });
      button.addEventListener('keydown', event => {
        const delta = {ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1]}[event.key];
        if (!delta) return;
        event.preventDefault();
        cells[Math.max(0, Math.min(39, i + delta[0]))][Math.max(0, Math.min(39, o + delta[1]))].focus();
      });
      row.insertCell().append(button);
      cells[i][o] = button;
    }
  }
  focusCell(cells[0][0]);
  refresh();
  scroller.append(table);
  section.append(legend, status, scroller);
  root.append(section);
}
