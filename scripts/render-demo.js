import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { server } from '../server.js';
import { renderFilm, probe } from '../lib/renderer.js';
import { demo, validateProject, captions } from '../public/model.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fileArg=process.argv.find(a=>a.endsWith('.json'));
const p=fileArg?validateProject(JSON.parse(fs.readFileSync(path.resolve(fileArg),'utf8'))):demo();
const width=process.argv.includes('--final')?1080:540;
server.listen(0,'127.0.0.1');await once(server,'listening');
const out=path.join(root,'output','atlas-demo.mp4');let reported=-1;
try{const result=await renderFilm({project:p,width,output:out,origin:`http://127.0.0.1:${server.address().port}`,onProgress:({progress})=>{if(Math.floor(progress/10)>reported){reported=Math.floor(progress/10);console.log(`Rendering ${progress}%`);}}});
  fs.writeFileSync(path.join(root,'output','atlas-demo.json'),JSON.stringify(p,null,2));fs.writeFileSync(path.join(root,'output','atlas-demo.srt'),captions(p));const meta=await probe(out);console.log(JSON.stringify({output:out,...result,codec:meta.streams[0].codec_name}));
}finally{server.close();}
