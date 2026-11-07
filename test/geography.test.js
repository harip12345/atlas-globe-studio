import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { geoContains } from 'd3-geo';
import { decodeTopology, ISLANDS } from '../public/geography.js';
import { validateProject, demo, DEFAULT_SURFACE } from '../public/model.js';
const decoded=decodeTopology(JSON.parse(fs.readFileSync(new URL('../public/assets/countries.json',import.meta.url),'utf8')));
test('island selections use the merged land, across country borders',()=>{
 const borneo=decoded.islandPolygons.find(p=>geoContains(p,ISLANDS.find(i=>i.id==='borneo').point));
 const indonesia=decoded.countries.find(c=>c.id==='360');
 assert.ok(geoContains(borneo,[110.35,1.55]));assert.equal(geoContains(indonesia,[110.35,1.55]),false);
 for(const island of ISLANDS)assert.equal(decoded.islandPolygons.filter(p=>geoContains(p,island.point)).length,1,island.id);
 assert.ok(geoContains(decoded.land,[110,-7.4]));assert.equal(geoContains(decoded.land,[90,-20]),false);
});
test('older project JSON receives neutral color controls and no highlighting',()=>{
 const old=demo();delete old.surface;for(const s of old.scenes){delete s.highlight;delete s.effect;}
 const p=validateProject(old);assert.deepEqual(p.surface,DEFAULT_SURFACE);assert.deepEqual(p.scenes[0].highlight.regions,[]);assert.equal(p.scenes[0].effect,'none');
});
test('surface settings and highlights survive validation and reject invalid inputs',()=>{
 const p=demo();p.surface={brightness:1.6,landColor:'#43ad65',oceanColor:'#1c6daf',landBrightness:1.8,tintStrength:.65};
 p.scenes[0].highlight={regions:[{type:'country',id:'360'},{type:'island',id:'java'}],style:'hatch',color:'#ffb765',opacity:.8,pulse:true};p.scenes[0].effect='radar';
 const validated=validateProject(p);assert.equal(validated.surface.landColor,'#43ad65');assert.equal(validated.scenes[0].highlight.regions.length,2);assert.equal(validated.scenes[0].effect,'radar');
 for(const value of [0,NaN,4])assert.throws(()=>validateProject({...p,surface:{brightness:value}}));
 assert.throws(()=>validateProject({...p,surface:{landColor:'red'}}));
 for(const h of [{regions:[{type:'country',id:'xxx'}]},{regions:[{type:'island',id:'missing'}]},{opacity:2},{style:'noise'},{regions:[{type:'polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1]]]}]}]){
  const q=demo();q.scenes[0].highlight=h;assert.throws(()=>validateProject(q));
 }
 const custom=demo();custom.scenes[0].highlight={regions:[{type:'polygon',name:'Wilayah custom',coordinates:[[[100,-5],[101,-5],[101,-4],[100,-5]]]}]};assert.equal(validateProject(custom).scenes[0].highlight.regions[0].name,'Wilayah custom');
});
