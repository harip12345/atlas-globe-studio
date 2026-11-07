import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { demo, fromNarrative, validateProject, total, captions, withTransitions, TRANSITION_PRESETS, transitionDuration } from '../public/model.js';

export function parseArgs(args) {
  const [command,...rest]=args,options={},positionals=[];
  for(let i=0;i<rest.length;i++){
    if(!rest[i].startsWith('--')){positionals.push(rest[i]);continue;}
    const key=rest[i].slice(2);
    if(!['out','pace','seconds','script','quality','audio','fps'].includes(key))throw new Error(`Opsi tidak dikenal: --${key}`);
    if(!rest[i+1]||rest[i+1].startsWith('--'))throw new Error(`Nilai --${key} diperlukan.`);
    options[key]=rest[++i];
  }
  return {command,options,positionals};
}
function pace(project,options){
  if(options.pace&&options.seconds)throw new Error('Pilih --pace atau --seconds.');
  if(options.pace){if(!Object.hasOwn(TRANSITION_PRESETS,options.pace))throw new Error('--pace harus fast, normal, atau cinematic.');return withTransitions(project,TRANSITION_PRESETS[options.pace]);}
  return options.seconds!==undefined?withTransitions(project,Number(options.seconds)):project;
}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
const report=data=>console.log(JSON.stringify(data));
export async function main(args=process.argv.slice(2)){
  const {command,options,positionals}=parseArgs(args);
  if(!command||command==='help'){report({commands:['init --out projects/story.json [--script story.txt] [--pace fast]','validate projects/story.json','pace projects/story.json --pace fast --out projects/story-fast.json','render projects/story.json --out output/story.mp4 [--quality draft|final] [--audio voice.mp3] [--fps 24|30] [--pace fast]'],transitionSeconds:TRANSITION_PRESETS});return;}
  if(!['init','validate','pace','render'].includes(command))throw new Error('Perintah tidak dikenal. Gunakan: node scripts/agent.js help');
  if(command!=='init'&&positionals.length!==1)throw new Error('Berikan satu path proyek JSON.');
  if(command==='init'&&positionals.length)throw new Error('Gunakan --script untuk narasi atau tanpa argumen untuk demo.');
  if(command!=='init'&&options.script)throw new Error('--script hanya untuk init.');
  if(command==='validate'&&(options.pace||options.seconds))throw new Error('validate membaca proyek apa adanya; gunakan perintah pace untuk mengubah transisi.');
  if(command!=='render'&&['audio','fps','quality'].some(k=>options[k]!==undefined))throw new Error('--audio, --fps, dan --quality hanya untuk render.');
  if(command==='pace'&&!options.pace&&options.seconds===undefined)throw new Error('Berikan --pace atau --seconds.');
  let project=command==='init'?(options.script?fromNarrative(fs.readFileSync(path.resolve(options.script),'utf8')):demo()):validateProject(JSON.parse(fs.readFileSync(path.resolve(positionals[0]),'utf8')));
  project=pace(project,options);
  if(command==='validate'){report({ok:true,scenes:project.scenes.length,duration:total(project),shots:project.scenes.map(s=>({id:s.id,location:s.location,duration:s.duration,transition:s.transition,effectiveTransition:transitionDuration(s)}))});return;}
  if(!options.out)throw new Error('--out diperlukan agar hasil memiliki nama file yang jelas.');
  const output=path.resolve(options.out);
  const source=command==='init'?(options.script?path.resolve(options.script):null):path.resolve(positionals[0]);
  if(source&&source.toLowerCase()===output.toLowerCase())throw new Error('Gunakan --out berbeda agar file sumber tetap utuh.');
  if(command!=='render'){
    if(path.extname(output).toLowerCase()!=='.json')throw new Error('--out harus berakhiran .json.');
    write(output,JSON.stringify(project,null,2));report({ok:true,project:output,scenes:project.scenes.length,duration:total(project)});return;
  }
  if(path.extname(output).toLowerCase()!=='.mp4')throw new Error('--out harus berakhiran .mp4.');
  const quality=options.quality||'draft',fps=Number(options.fps||30);
  if(!['draft','final'].includes(quality)||![24,30].includes(fps))throw new Error('Gunakan --quality draft|final dan --fps 24|30.');
  const audio=options.audio?path.resolve(options.audio):undefined;
  if(audio&&!fs.statSync(audio).isFile())throw new Error('Berkas audio tidak ditemukan.');
  const base=output.slice(0,-4),jsonOutput=base+'.json',srtOutput=base+'.srt';
  if(source&&[jsonOutput,srtOutput].some(p=>p.toLowerCase()===source.toLowerCase()))throw new Error('Nama --out bertabrakan dengan file sumber. Gunakan folder atau nama lain.');
  if(audio&&[output,jsonOutput,srtOutput].some(p=>p.toLowerCase()===audio.toLowerCase()))throw new Error('Audio dan file hasil harus berbeda.');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const {server}=await import('../server.js');const {renderFilm,probe}=await import('../lib/renderer.js');
  const controller=new AbortController(),abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
  try{
    server.listen(0,'127.0.0.1');await once(server,'listening');
    let last=-1;const metadata=await renderFilm({project,width:quality==='final'?1080:540,fps,output,audio,origin:`http://127.0.0.1:${server.address().port}`,signal:controller.signal,onProgress:({progress})=>{if(Math.floor(progress/10)!==last){last=Math.floor(progress/10);console.error(JSON.stringify({progress}));}}});
    const meta=await probe(output);write(jsonOutput,JSON.stringify(project,null,2));write(srtOutput,captions(project));
    report({ok:true,video:output,project:jsonOutput,subtitles:srtOutput,...metadata,codec:meta.streams.find(s=>s.codec_type==='video')?.codec_name,audio:meta.streams.some(s=>s.codec_type==='audio')});
  }finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);await new Promise(resolve=>server.close(resolve));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){main().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;});}
