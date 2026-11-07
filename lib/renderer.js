import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { total, validateProject } from '../public/model.js';

export function browserPath() {
  return [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(p => p && fs.existsSync(p));
}
export function probe(file) {
  return new Promise((resolve,reject) => {
    const proc=spawn('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{windowsHide:true});let data='';
    proc.stdout.on('data',c=>data+=c);proc.stderr.resume();proc.on('error',()=>reject(new Error('FFprobe tidak ditemukan. Instal FFmpeg dan masukkan ke PATH.')));
    proc.on('close',code=>{try{if(code)throw new Error('Berkas media tidak valid.');resolve(JSON.parse(data));}catch(e){reject(e);}});
  });
}
export async function renderFilm({ project, width=540, fps=30, output, origin, audio, onProgress=()=>{}, signal }) {
  project=validateProject(project);
  if(![540,1080].includes(width)||![24,30].includes(fps))throw new Error('Resolusi atau frame rate tidak valid.');
  const exe=browserPath();if(!exe)throw new Error('Chrome/Edge tidak ditemukan. Atur CHROME_PATH ke executable Chromium.');
  const height=width*16/9,frames=Math.ceil(total(project)*fps);
  let browser,encoder,done;
  const stop=()=>{encoder?.kill();browser?.close().catch(()=>{});};
  signal?.addEventListener('abort',stop,{once:true});
  try {
    signal?.throwIfAborted();
    browser=await chromium.launch({executablePath:exe,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout:30000});
    const page=await browser.newPage({viewport:{width:540,height:960}});
    await page.goto(`${origin}/film.html`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.filmReady||window.filmError,{timeout:30000});
    await page.evaluate(async ({project,width,height})=>{if(window.filmError)throw new Error(window.filmError);await window.filmReady;window.film.setProject(project);window.film.setSize(width,height);},{project,width,height});
    signal?.throwIfAborted();
    const args=['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0'];
    if(audio)args.push('-i',audio,'-map','0:v:0','-map','1:a:0','-af','apad','-c:a','aac','-b:a','192k');else args.push('-an');
    args.push('-t',String(total(project)),'-c:v','libx264','-preset','fast','-crf',width===1080?'18':'21','-pix_fmt','yuv420p','-movflags','+faststart',output);
    encoder=spawn('ffmpeg',args,{windowsHide:true,stdio:['pipe','ignore','pipe']});let errors='',encoderFailure;
    encoder.stderr.on('data',c=>{errors=(errors+c.toString()).slice(-4000);});
    encoder.stdin.on('error',()=>{});
    done=new Promise((resolve,reject)=>{encoder.on('error',()=>reject(new Error('FFmpeg tidak ditemukan. Instal FFmpeg dan masukkan ke PATH.')));encoder.on('close',code=>code===0?resolve():reject(new Error(errors||`FFmpeg berhenti (${code}).`)));});
    done.catch(e=>{encoderFailure=e;});
    for(let frame=0;frame<frames;frame++) {
      signal?.throwIfAborted();if(encoderFailure)throw encoderFailure;
      const jpg=await page.evaluate(t=>window.film.capture(t),frame/fps);
      if(!encoder.stdin.write(Buffer.from(jpg,'base64')))await Promise.race([once(encoder.stdin,'drain'),done.then(()=>{throw new Error('Encoder berhenti lebih awal.');})]);
      if(frame%3===0)onProgress({frame,frames,progress:Math.round(frame/frames*98)});
    }
    encoder.stdin.end();await done;onProgress({frame:frames,frames,progress:100});
    return {width,height,fps,duration:total(project),frames};
  } finally {
    signal?.removeEventListener('abort',stop);
    if(encoder&&encoder.exitCode===null)encoder.kill();
    if(browser)await browser.close();
    // Playwright owns and cleans its temporary browser profile.
  }
}
