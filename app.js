import { setupFileControls } from './file-controls.js?v=20261021-files1';
import { renderMatrix } from './matrix.js?v=20261020-matrix1';
import { blank, validate } from './model.js?v=20261020-matrix1';
const key='portbook-v1';
let data=blank(), view='all', mode='edit', pending=null;
const $=id=>document.getElementById(id);
let startupError='';
try { const raw=localStorage.getItem(key); if(raw) data=validate(JSON.parse(raw)); }
catch {startupError='Could not load saved data. Export any edits before closing.';}
function count(){const n=[...data.inputs,...data.outputs].filter(p=>p.label.trim()).length;$('count').textContent=`${n} / 80`;$('progress').value=n;}
function save(){try{localStorage.setItem(key,JSON.stringify(data));$('save-status').textContent='✓ Saved in this browser';}catch{$('save-status').textContent='Unable to save — export a backup before closing.';}count();}
function render(){
  $('device-name').readOnly=mode!=='edit';
  document.querySelector('.toolbar').hidden=mode==='matrix';
  $('view-hint').textContent=mode==='matrix'?'Click a cell to document a route; click it again to clear. Arrow keys move between cells. Documentation only — no hardware control.':mode==='edit'?'Click any field to edit. Your changes save as you type.':mode==='list'?'Read-only port list. Switch to Edit to make changes.':'Read-only port grid. Switch to Edit to make changes.';
  document.querySelectorAll('button[data-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.mode===mode);button.setAttribute('aria-pressed',String(button.dataset.mode===mode));});
  const query=$('search').value.trim().toLowerCase(), onlyEmpty=$('unlabeled').checked, onlyLabeled=$('labeled').checked;
  const root=$('ports');root.replaceChildren();root.classList.toggle('single',view!=='all');root.dataset.mode=mode;let matches=0;
  if(mode==='matrix'){renderMatrix(root,data,save);$('no-results').hidden=true;count();return;}
  for(const side of ['inputs','outputs']){
    if(view!=='all'&&view!==side) continue;
    const section=document.createElement('section');section.className=`port-group ${side}`;
    const heading=document.createElement('div');heading.className='group-heading';
    heading.innerHTML=`<h2><span class="direction" aria-hidden="true">${side==='inputs'?'↘':'↗'}</span>${side==='inputs'?'Inputs':'Outputs'}</h2><small>${side==='inputs'?'Sources into your router':'Destinations from your router'}</small>`;
    section.append(heading);
    const columns=document.createElement('div');columns.className='column-head';columns.innerHTML='<span>PORT</span><span>LABEL</span><span>LOCATION / DEVICE</span>';if(mode!=='grid')section.append(columns);
    const body=document.createElement('div');body.className=mode==='grid'?'port-grid':'port-rows';section.append(body);
    data[side].forEach((port,i)=>{
      if(onlyEmpty&&port.label.trim())return;
      if(onlyLabeled&&!port.label.trim())return;
      if(query&&![String(i+1),String(i+1).padStart(2,'0'),...Object.values(port)].some(s=>s.toLowerCase().includes(query)))return;
      matches++;
      const row=document.createElement('div');row.className='port-row';
      const number=document.createElement('span');number.className='number';number.textContent=String(i+1).padStart(2,'0');row.append(number);
      if(mode!=='edit'){
        row.classList.toggle('unlabeled',!port.label.trim());
        const label=document.createElement('span');label.className='port-label';label.textContent=port.label||'Unlabeled';row.append(label);
        const location=document.createElement('span');location.className='port-location';location.textContent=port.location;row.append(location);
        if(port.notes){const notes=document.createElement('p');notes.className='port-notes';notes.textContent=port.notes;row.append(notes);}
        if(side==='outputs' && data.routes[i]!==null){const route=document.createElement('p');route.className='port-notes';const source=data.routes[i];route.textContent=`Documented source: Input ${source}${data.inputs[source-1].label ? ' — '+data.inputs[source-1].label : ''}`;row.append(route);}
        body.append(row);return;
      }
      for(const field of ['label','location','notes']){
        const input=document.createElement(field==='notes'?'textarea':'input');input.value=port[field];input.maxLength=2000;input.setAttribute('aria-label',`${side==='inputs'?'Input':'Output'} ${i+1} ${field}`);
        input.placeholder=field==='notes'?'Cable IDs, formats, or notes…':'';
        input.addEventListener('input',()=>{port[field]=input.value;save();});
        if(field==='notes'){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=port.notes?'Notes':'Add note';input.addEventListener('input',()=>summary.textContent=port.notes?'Notes':'Add note');details.append(summary,input);row.append(details);}else row.append(input);
      }
      body.append(row);
    });
    root.append(section);
  }
  $('no-results').hidden=matches>0;count();
}
$('device-name').value=data.name;
$('device-name').addEventListener('input',e=>{data.name=e.target.value;save();});
document.querySelectorAll('button[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;render();}));
$('search').addEventListener('input',render);for(const id of ['labeled','unlabeled'])$(id).addEventListener('change',()=>{if($(id).checked)$(id==='labeled'?'unlabeled':'labeled').checked=false;render();});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));
$('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`video-router-matrix-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw new Error('This file is too large for a Video Router Matrix backup.');pending=validate(JSON.parse(await file.text()));$('restore').showModal();}catch(error){$('save-status').textContent=`Import failed: ${error.message}`;}finally{e.target.value='';}});
$('cancel').addEventListener('click',()=>{pending=null;$('restore').close();});
$('confirm').addEventListener('click',()=>{if(!pending)return;data=pending;pending=null;$('device-name').value=data.name;$('restore').close();save();render();});
let printState;
window.addEventListener('beforeprint',()=>{printState={view,mode,query:$('search').value,onlyEmpty:$('unlabeled').checked,onlyLabeled:$('labeled').checked};view='all';mode='list';$('search').value='';$('unlabeled').checked=false;$('labeled').checked=false;render();document.querySelectorAll('details').forEach(d=>{d.open=!!d.querySelector('textarea').value;});});
window.addEventListener('afterprint',()=>{if(!printState)return;view=printState.view;mode=printState.mode;$('search').value=printState.query;$('unlabeled').checked=printState.onlyEmpty;$('labeled').checked=printState.onlyLabeled;render();printState=null;});
$('print').addEventListener('click',()=>window.print());render();if(startupError)$('save-status').textContent=startupError;

setupFileControls(()=>data, imported=>{data=imported;$('device-name').value=data.name;save();render();});
