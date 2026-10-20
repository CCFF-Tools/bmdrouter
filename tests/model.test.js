import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,validate} from '../model.js';
test('creates exactly 40 independent ports on each side',()=>{const d=blank();d.inputs[0].label='Camera 1';assert.equal(d.inputs.length,40);assert.equal(d.outputs.length,40);assert.equal(d.inputs[1].label,'');assert.equal(d.outputs[0].label,'');});
test('backup round trip preserves labels, locations and notes',()=>{const d=blank();d.inputs[0]={label:'Camera 1',location:'Stage',notes:'Cable A'};d.outputs[39].label='Recorder';assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);});
test('rejects incomplete, incompatible and malformed backups',()=>{for(const d of [null,{}, {...blank(),version:2},{...blank(),inputs:[]},{...blank(),outputs:Array(40).fill({label:42,location:'',notes:''})}])assert.throws(()=>validate(d));});
