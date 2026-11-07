import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateProject, captions } from './public/model.js';
import { browserPath, probe, renderFilm } from './lib/renderer.js';

const root=path.dirname(fileURLToPath(import.meta.url)),pub=path.join(root,'public'),output=path.join(root,'output');
fs.mkdirSync(output,{recursive:true});
const jobs=new Map(),audios=new Map();let active;
const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req,max=1024*1024){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>max)throw Object.assign(new Error('Berkas terlalu besar.'),{status:413});chunks.push(c);}return Buffer.concat(chunks);}
const read=async req=>{try{return JSON.parse(await body(req));}catch(e){if(e.status)throw e;throw Object.assign(new Error('JSON tidak valid.'),{status:400});}};
function sameOrigin(req){const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`)throw Object.assign(new Error('Origin tidak diizinkan.'),{status:403});}
async function serve(req,res,file,type){
  try{const st=await fs.promises.stat(file);if(!st.isFile())return json(res,404,{error:'Tidak ditemukan.'});
    const range=req.headers.range;let start=0,end=st.size-1,code=200;
    const headers={'Content-Type':type,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'};
    if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});return res.end();}start=+m[1];end=m[2]?Math.min(+m[2],end):end;if(start>end||start>=st.size){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});return res.end();}code=206;headers['Content-Range']=`bytes ${start}-${end}/${st.size}`;}
    headers['Content-Length']=end-start+1;res.writeHead(code,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(e){if(e.code==='ENOENT')return json(res,404,{error:'Tidak ditemukan.'});throw e;}
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.webm':'audio/webm','.ogg':'audio/ogg','.srt':'text/plain; charset=utf-8'};
export function createServer(){return http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost'),route=url.pathname;
  if(req.method==='POST')sameOrigin(req);
  if(route==='/api/config'&&req.method==='GET')return json(res,200,{browser:!!browserPath(),port:server.address()?.port,features:{surface:true,regions:true,effects:true}});
  if(route==='/api/audio'&&req.method==='POST'){
    const ext={'audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav','audio/mp4':'.m4a','audio/x-m4a':'.m4a','audio/webm':'.webm','video/webm':'.webm','audio/ogg':'.ogg'}[req.headers['content-type']?.split(';')[0]];
    if(!ext)return json(res,400,{error:'Pilih audio MP3, WAV, M4A, OGG, atau WebM.'});
    const id=randomUUID(),file=path.join(output,`audio-${id}${ext}`);await fs.promises.writeFile(file,await body(req,30*1024*1024));
    try{const meta=await probe(file);if(!meta.streams.some(s=>s.codec_type==='audio'))throw new Error('Berkas tidak memiliki audio.');audios.set(id,file);return json(res,201,{id,url:`/output/audio-${id}${ext}`,duration:Number(meta.format.duration)||0});}catch(e){await fs.promises.unlink(file).catch(()=>{});throw Object.assign(e,{status:400});}
  }
  if(route==='/api/render'&&req.method==='POST'){
    const data=await read(req);let project;try{project=validateProject(data.project);}catch(e){return json(res,400,{error:e.message});}
    if(active)return json(res,409,{error:'Satu ekspor sedang berjalan. Tunggu atau batalkan ekspor tersebut.'});
    const width=data.quality==='final'?1080:540,fps=data.fps===24?24:30;
    let audio;if(data.audioId){audio=audios.get(data.audioId);if(!audio&&/^[\da-f-]{36}$/.test(data.audioId)){const name=fs.readdirSync(output).find(f=>f.startsWith(`audio-${data.audioId}.`)&&['.mp3','.wav','.m4a','.ogg','.webm'].includes(path.extname(f)));if(name)audio=path.join(output,name);}if(!audio)return json(res,400,{error:'Unggah ulang audio sebelum ekspor.'});}
    const id=randomUUID(),file=path.join(output,`${id}.mp4`),controller=new AbortController();
    const job={id,status:'rendering',progress:0,frame:0,frames:0,createdAt:Date.now()};jobs.set(id,{job,controller});active=id;
    const origin=`http://127.0.0.1:${server.address().port}`;
    const timer=setTimeout(()=>controller.abort(),45*60*1000);timer.unref();
    renderFilm({project,width,fps,output:file,origin,audio,signal:controller.signal,onProgress:info=>Object.assign(job,info)}).then(async meta=>{
      await fs.promises.writeFile(path.join(output,`${id}.json`),JSON.stringify(project,null,2));await fs.promises.writeFile(path.join(output,`${id}.srt`),captions(project));
      Object.assign(job,{status:'completed',progress:100,url:`/output/${id}.mp4`,projectUrl:`/output/${id}.json`,srtUrl:`/output/${id}.srt`,...meta});
    }).catch(async e=>{Object.assign(job,{status:controller.signal.aborted?'cancelled':'failed',error:controller.signal.aborted?'Ekspor dibatalkan.':e.message});await fs.promises.unlink(file).catch(()=>{});}).finally(()=>{clearTimeout(timer);active=null;});
    return json(res,202,job);
  }
  const match=/^\/api\/jobs\/([\da-f-]+)(\/cancel)?$/.exec(route);
  if(match){const entry=jobs.get(match[1]);if(!entry)return json(res,404,{error:'Ekspor tidak ditemukan.'});if(match[2]&&req.method==='POST'){entry.controller.abort();return json(res,200,{ok:true});}if(!match[2]&&req.method==='GET')return json(res,200,entry.job);}
  if(route.startsWith('/api/'))return json(res,404,{error:'API tidak ditemukan.'});
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Metode tidak didukung.'});
  let relative;try{relative=decodeURIComponent(route);}catch{return json(res,400,{error:'Path tidak valid.'});}
  if(relative.includes('\\')||relative.includes('\0')||relative.split('/').includes('..'))return json(res,403,{error:'Path tidak diizinkan.'});
  let base=pub;
  if(relative.startsWith('/vendor/')){base=path.join(root,'node_modules/three/build');relative=relative.slice(7);if(!['/three.module.js','/three.core.js'].includes(relative))return json(res,404,{error:'Tidak ditemukan.'});}
  else if(relative.startsWith('/output/')){base=output;relative=relative.slice(7);}
  if(relative==='/')relative='/index.html';
  const file=path.resolve(base,'.'+relative);if(!file.startsWith(base+path.sep))return json(res,403,{error:'Path tidak diizinkan.'});
  return await serve(req,res,file,types[path.extname(file)]||'application/octet-stream');
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Server gagal memproses permintaan.'});else res.destroy();console.error(e.message);}
});}
export const server=createServer();
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3100,'127.0.0.1',()=>console.log(`ATLAS Globe Studio → http://127.0.0.1:${server.address().port}`));
