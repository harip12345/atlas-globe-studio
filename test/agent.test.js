import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main, parseArgs } from '../scripts/agent.js';
test('CLI creates, validates and paces an editable JSON without a browser',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-agent-')),original=path.join(dir,'original.json'),fast=path.join(dir,'fast.json');
 try{
  await main(['init','--out',original]);await main(['validate',original]);await main(['pace',original,'--seconds','0.25','--out',fast]);
  const a=JSON.parse(fs.readFileSync(original,'utf8')),b=JSON.parse(fs.readFileSync(fast,'utf8'));
  assert.deepEqual(a.scenes.map(s=>s.duration),b.scenes.map(s=>s.duration));assert.ok(b.scenes.every(s=>s.transition===.25));assert.equal(a.scenes[1].transition,3.5);
  await assert.rejects(()=>main(['pace',original,'--pace','unknown','--out',fast]),/fast/);
  await assert.rejects(()=>main(['pace',original,'--out',fast]),/--pace/);
  await assert.rejects(()=>main(['render',original,'--out',path.join(dir,'video.mp4'),'--fps','60']),/fps/);
  await assert.rejects(()=>main(['pace',original,'--pace','fast','--out',original]),/sumber/);
  await assert.rejects(()=>main(['render',original,'--out',path.join(dir,'original.mp4')]),/sumber/);
  assert.throws(()=>parseArgs(['init','--out']),/diperlukan/);assert.throws(()=>parseArgs(['init','--oops','x']),/dikenal/);
 }finally{for(const file of [original,fast])if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir);}
});
