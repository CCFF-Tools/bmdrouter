import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,validate,toggleRoute} from '../model.js';
test('creates exactly 40 independent ports on each side',()=>{const d=blank();d.inputs[0].label='Camera 1';assert.equal(d.inputs.length,40);assert.equal(d.outputs.length,40);assert.equal(d.inputs[1].label,'');assert.equal(d.outputs[0].label,'');});
test('backup round trip preserves labels, locations and notes',()=>{const d=blank();d.inputs[0]={label:'Camera 1',location:'Stage',notes:'Cable A'};d.outputs[39].label='Recorder';assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);});
test('rejects incomplete, incompatible and malformed backups',()=>{for(const d of [null,{}, {...blank(),version:3},{...blank(),inputs:[]},{...blank(),outputs:Array(40).fill({label:42,location:'',notes:''})}])assert.throws(()=>validate(d));});

test('old backups retain labels and migrate to empty routes',()=>{const old=blank();old.version=1;delete old.routes;old.inputs[0].label='Existing camera';const migrated=validate(old);assert.equal(migrated.version,2);assert.equal(migrated.inputs[0].label,'Existing camera');assert.deepEqual(migrated.routes,Array(40).fill(null));});
test('routes assign, replace and clear per output, with fan-out supported',()=>{const d=blank();toggleRoute(d,1,1);toggleRoute(d,1,40);assert.equal(d.routes[0],1);assert.equal(d.routes[39],1);toggleRoute(d,40,1);assert.equal(d.routes[0],40);assert.equal(d.routes[39],1);toggleRoute(d,40,1);assert.equal(d.routes[0],null);assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);assert.throws(()=>toggleRoute(d,0,1));});
test('rejects invalid route assignments without accepting partial data',()=>{for(const routes of [undefined,[],Array(40).fill(0),Array(40).fill(41),Array(40).fill('1'),Array(40).fill(1.5),Array(40)])assert.throws(()=>validate({...blank(),routes}));});
