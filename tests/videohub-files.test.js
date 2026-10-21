import test from 'node:test';
import assert from 'node:assert/strict';
import { blank } from '../model.js';
import { exportLabelSet, parseLabelSet, exportRouting, parseRouting, exportConfiguration, parseConfiguration, mergeVideohubFile } from '../videohub-files.js';

test('native label export uses one-based ports, CRLF, inputs first, and all 80 records',()=>{
 const d=blank();d.inputs[0].label='Camera 1';d.outputs[39].label='Last monitor';
 const text=exportLabelSet(d), rows=text.split('\r\n');
 assert.equal(rows.length,80);assert.equal(rows[0],'Input,1,Camera 1');assert.equal(rows[39],'Input,40,');assert.equal(rows[40],'Output,1,');assert.equal(rows[79],'Output,40,Last monitor');assert.equal(text.endsWith('\n'),false);
 assert.deepEqual(mergeVideohubFile(blank(),parseLabelSet(text)),d);
});
test('spaced public example imports labels without changing routes, notes, locations or other ports',()=>{
 const d=blank();d.inputs[0].location='Stage';d.inputs[0].notes='Cable 17';d.inputs[1].label='Keep';d.routes[0]=40;
 const result=mergeVideohubFile(d,parseLabelSet('\uFEFFInput, 1, Constellation PGM\r\nOutput, 20, VideoHub Aux 2\r\n'));
 assert.equal(result.inputs[0].label,'Constellation PGM');assert.equal(result.outputs[19].label,'VideoHub Aux 2');assert.equal(result.inputs[1].label,'Keep');assert.equal(result.inputs[0].notes,'Cable 17');assert.equal(result.inputs[0].location,'Stage');assert.equal(result.routes[0],40);assert.equal(d.inputs[0].label,'');
});
test('blank labels and literal spacing round trip without fabricated names',()=>{
 const d=blank();d.inputs[0].label=' Camera A ';const result=mergeVideohubFile(d,parseLabelSet(exportLabelSet(d)));assert.deepEqual(result,d);
 const cleared=mergeVideohubFile(d,parseLabelSet('Input,1,'));assert.equal(cleared.inputs[0].label,'');
});
test('rejects ambiguous or unsafe label files and never silently alters unsupported export labels',()=>{
 for(const input of ['', 'Type,Port,Label', 'Input,0,Bad', 'Output,41,Bad', 'Input,1,A\nInput,1,B', 'Input,1,Camera,A', 'Input,1,"Camera"', 'Input,1,bad\0label'])assert.throws(()=>parseLabelSet(input),input);
 for(const label of ['Camera,A','"Camera"','Café','Camera\nA']){const d=blank();d.inputs[0].label=label;assert.throws(()=>exportLabelSet(d));assert.equal(d.inputs[0].label,label);}
});
test('routing matches official zero-based example and omits unassigned outputs',()=>{
 const d=blank();d.routes[0]=6;d.routes[39]=1;
 assert.equal(exportRouting(d),'VIDEO OUTPUT ROUTING:\n0 5\n39 0\n\n');
 assert.deepEqual(mergeVideohubFile(blank(),parseRouting(exportRouting(d))),d);
 assert.throws(()=>exportRouting(blank()));
});
test('routing imports snapshot safely, preserves other documentation, reports ignored sections',()=>{
 const d=blank();d.inputs[0].label='Keep';d.routes[1]=4;
 const parsed=parseRouting('VIDEOHUB DEVICE:\r\nVideo inputs: 40\r\nVideo outputs: 40\r\n\r\nINPUT LABELS:\r\n0 Ignore\r\n\r\nVIDEO OUTPUT LOCKS:\r\n0 F\r\n\r\nVIDEO OUTPUT ROUTING:\r\n0 39\r\n\r\nEND PRELUDE:\r\n\r\n');
 const result=mergeVideohubFile(d,parsed);assert.equal(result.routes[0],40);assert.equal(result.routes[1],4);assert.equal(result.inputs[0].label,'Keep');assert(parsed.ignored.includes('VIDEO OUTPUT LOCKS'));assert.equal(exportRouting(result).includes('LOCKS'),false);
});
test('rejects invalid route numbers, duplicates, mismatched routers and empty command blocks',()=>{
 for(const input of ['VIDEO OUTPUT ROUTING:\n40 0\n\n','VIDEO OUTPUT ROUTING:\n0 40\n\n','VIDEO OUTPUT ROUTING:\n0 -1\n\n','VIDEO OUTPUT ROUTING:\n0 1\n0 2\n\n','VIDEO OUTPUT ROUTING:\n\n','VIDEOHUB DEVICE:\nVideo inputs: 20\n\nVIDEO OUTPUT ROUTING:\n0 1\n\n','Output,1,Monitor'])assert.throws(()=>parseRouting(input),input);
});

test('full protocol configuration round trips all labels and routes without locks or lost metadata', () => {
 const data=blank();data.inputs[0].label='Caméra, "A"';data.outputs[39].label=' Monitor ';data.routes=Array.from({length:40},(_,i)=>40-i);
 const text=exportConfiguration(data);assert(text.startsWith('INPUT LABELS:\n0 Caméra, "A"\n'));assert(text.endsWith('39 0\n\n'));assert(!text.includes('LOCKS'));
 const local=blank();local.inputs[0].notes='Cable 12';local.inputs[0].location='Stage';
 const imported=mergeVideohubFile(local,parseConfiguration(text+'VIDEO OUTPUT LOCKS:\n0 F\n\n'));
 assert.deepEqual(imported.routes,data.routes);assert.equal(imported.outputs[39].label,' Monitor ');assert.equal(imported.inputs[0].notes,'Cable 12');assert.equal(imported.inputs[0].location,'Stage');
 assert(parseConfiguration(text+'VIDEO OUTPUT LOCKS:\n0 F\n\n').ignored.includes('VIDEO OUTPUT LOCKS'));
});
test('full configuration rejects incomplete tables, duplicate labels, protocol injection and partial label blocks', () => {
 assert.throws(()=>exportConfiguration(blank()),/all 40/);
 const data=blank();data.routes.fill(1);const text=exportConfiguration(data);
 assert.throws(()=>parseConfiguration(text.replace('39 0\n','')),/40 output routes/);
 assert.throws(()=>parseConfiguration(text.replace('0 \n','0 \n0 Duplicate\n')),/duplicate/);
 assert.throws(()=>parseConfiguration(text.replace('INPUT LABELS:','IGNORED LABELS:')),/40 input labels/);
 data.inputs[0].label='Injected\n\n';assert.throws(()=>exportConfiguration(data),/control characters/);
});
