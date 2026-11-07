import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demo, validateProject, cameraAt, fromNarrative, total, locate, captions, withTransitions, TRANSITION_PRESETS, transitionDuration } from '../public/model.js';
test('demo is valid and all scene boundaries keep camera position continuous',()=>{
  const p=validateProject(demo());assert.equal(total(p),22);let start=0;
  for(const s of p.scenes.slice(0,-1)){start+=s.duration;const before=cameraAt(p,start-1e-7),after=cameraAt(p,start);for(const k of ['lat','lon','altitude','tilt'])assert.ok(Math.abs(before[k]-after[k])<1e-5,`${k} jumps at ${start}`);}
});
test('camera takes the short route across the date line',()=>{const p=demo();p.scenes[0].lon=179;p.scenes[0].motion='hold';p.scenes[1].lon=-179;const c=cameraAt(p,6.75);assert.ok(c.lon>179&&c.lon<181);});
test('rejects invalid camera values and overlong projects',()=>{for(const [key,value]of [['lat',91],['lon',181],['altitude',0],['duration',NaN],['transition',0],['tilt',90]]){const p=demo();p.scenes[0][key]=value;assert.throws(()=>validateProject(p));}const p=demo();p.scenes=Array.from({length:5},(_,i)=>({...p.scenes[0],id:String(i),duration:30}));assert.throws(()=>validateProject(p),/120/);});
test('narration selects the most specific place and creates real scene timing',()=>{const p=fromNarrative('Dari angkasa kita melihat bumi.\nMari ke Indonesia.\nKini mendekat ke Gunung Merapi.');assert.equal(p.scenes[0].location,'Bumi');assert.equal(p.scenes[0].object,'none');assert.equal(p.scenes[2].object,'volcano');assert.equal(locate(p,p.scenes[0].duration).index,1);assert.match(captions(p),/00:00:00,000 --> 00:00:04,000/);assert.throws(()=>fromNarrative(''));});
test('place names must be complete words',()=>{assert.equal(fromNarrative('Kita kembali ke sini.').scenes[0].location,'Indonesia');assert.equal(fromNarrative('Kamera menuju Bali.').scenes[0].location,'Bali');});
test('fast transitions arrive in half a second without shortening narration',()=>{
 const original=demo(),p=withTransitions(original,TRANSITION_PRESETS.fast),start=p.scenes[0].duration;
 assert.equal(total(p),total(original));assert.equal(p.scenes[1].narration,original.scenes[1].narration);assert.equal(original.scenes[1].transition,3.5);
 assert.equal(cameraAt(p,start).progress,0);assert.ok(cameraAt(p,start+.25).progress<1);assert.equal(cameraAt(p,start+.5).progress,1);
 assert.equal(cameraAt(p,start+2).lat,p.scenes[1].lat);assert.equal(p.scenes[1].transition,.5);
 assert.throws(()=>withTransitions(p,.1));assert.equal(transitionDuration({...p.scenes[1],duration:1,transition:3}),.72);
});
