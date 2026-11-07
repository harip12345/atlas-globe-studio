import { GlobeFilm } from './engine.js';
import { demo, scene, places, validateProject, total, locate, sceneStart, fromNarrative, captions, uid, clamp, TRANSITION_PRESETS, withTransitions, DEFAULT_SURFACE, EFFECT_TYPES } from './model.js';
import { COUNTRIES } from './countries.js';
import { ISLANDS } from './geography.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const icons={none:'◎',city:'▥',volcano:'△',mountain:'△',ship:'⌁',forest:'♧'};
const clock=(t,decimal=false)=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}${decimal?'.'+Math.floor(t%1*10):''}`;
let project=demo(),selected=0,time=0,playing=false,loop=true,lastFrame=0,ready=false,film,audio=null,jobId=null,pollTimer,toastTimer;
let past=[],future=[],storageTimer;
try{const saved=JSON.parse(localStorage.getItem('atlas-project-v1'));if(saved)project=validateProject(saved);}catch{/* An invalid or unavailable browser draft does not prevent opening the editor. */}
try{audio=JSON.parse(localStorage.getItem('atlas-audio-v1'))||null;}catch{}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function el(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function snapshot(){return JSON.stringify(project);}
function checkpoint(){past.push(snapshot());if(past.length>50)past.shift();future=[];historyButtons();}
function historyButtons(){$('#undo').disabled=!past.length;$('#redo').disabled=!future.length;}
function remember(){clearTimeout(storageTimer);storageTimer=setTimeout(()=>{try{localStorage.setItem('atlas-project-v1',snapshot());$('#save-status').textContent='Tersimpan di browser ini';}catch{$('#save-status').textContent='Unduh JSON untuk menyimpan proyek';}},250);}
function apply(p,saveHistory=true){if(saveHistory)checkpoint();stop();project=validateProject(p);selected=0;time=0;film?.setProject(project);renderAll();remember();}
function undo(redo=false){const source=redo?future:past,target=redo?past:future;if(!source.length)return;target.push(snapshot());stop();project=validateProject(JSON.parse(source.pop()));selected=Math.min(selected,project.scenes.length-1);time=Math.min(time,total(project));film?.setProject(project);renderAll();remember();}
async function api(url,options){const res=await fetch(url,options);let data;try{data=await res.json();}catch{throw new Error('Respons server tidak valid.');}if(!res.ok)throw new Error(data.error||'Permintaan gagal.');return data;}
const post=data=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function download(content,name,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function stop(){playing=false;$('#play').textContent='▶';$('#play').setAttribute('aria-label','Putar');$('#audio-player').pause();}
function syncAudio(play=false){const player=$('#audio-player');if(!audio)return;try{if(Number.isFinite(player.duration))player.currentTime=Math.min(time,player.duration);}catch{}if(play)player.play().catch(()=>toast('Audio belum dapat diputar. Pilih ulang berkas audio.'));}
function seek(t,changeSelection=true){time=clamp(t,0,total(project));syncAudio(playing);if(changeSelection){const i=locate(project,time).index;if(i!==selected){selected=i;renderScenes();renderInspector();renderTimeline();}}updateTransport();draw();}
function selectScene(index){stop();selected=clamp(index,0,project.scenes.length-1);time=sceneStart(project,selected);renderScenes();renderInspector();renderTimeline();updateTransport();draw();syncAudio();}
function renderScenes(){
  const list=$('#scene-list');list.replaceChildren();$('#scene-count').textContent=String(project.scenes.length).padStart(2,'0');$('#scene-total').textContent=`${total(project).toFixed(1)} DETIK`;
  project.scenes.forEach((s,i)=>{const b=el('button',`scene-card${i===selected?' active':''}`);b.setAttribute('aria-label',`Adegan ${i+1}: ${s.location}`);b.setAttribute('aria-pressed',String(i===selected));
    const thumb=el('span',`scene-thumb${s.altitude<.4?' detail':''}`);thumb.append(el('b','',String(i+1).padStart(2,'0')));if(s.object!=='none')thumb.append(el('span','thumb-icon',icons[s.object]));
    const copy=el('span','scene-card-copy');copy.append(el('small','',s.altitude>2?'THE BIG PICTURE':s.object==='none'?'FLY TO LOCATION':'CLOSER LOOK'),el('strong','',s.title.replaceAll('\n',' ')),el('time','',`${s.duration.toFixed(1)}s  ·  ${s.location}`));b.append(thumb,copy);b.onclick=()=>selectScene(i);list.append(b);
  });$('#add').disabled=project.scenes.length>=20;
}
function renderTimeline(){
  const line=$('#timeline');line.replaceChildren();const duration=total(project);
  project.scenes.forEach((s,i)=>{const b=el('button',`timeline-block${selected===i?' active':''}`);b.style.flexGrow=String(s.duration);b.style.flexBasis='0';b.title=`${clock(sceneStart(project,i))} · ${s.location}`;b.append(el('strong','',`${String(i+1).padStart(2,'0')}  ${s.location}`),el('small','',`${icons[s.object]}  ${s.duration.toFixed(1)}s`));b.onclick=()=>selectScene(i);line.append(b);});
  line.append(el('div','playhead'));$('#timeline-duration').textContent=`${duration.toFixed(1)}s`;$('#ruler-mid').textContent=clock(duration/2);$('#ruler-end').textContent=clock(duration);$('#seek').max=String(duration);updateTransport();
}
function renderInspector(){renderGeoInspector();const s=project.scenes[selected];for(const key of ['title','eyebrow','location','lat','lon','duration','transition','motion','object','stat','statLabel','narration','tilt'])$('#'+key).value=s[key];$('#altitude').value=Math.log(s.altitude);$('#altitude-value').textContent=s.altitude>2?'Bumi':s.altitude>.4?'Regional':'Detail';$('#tilt-value').textContent=`${s.tilt}°`;$('#inspector-number').textContent=String(selected+1).padStart(2,'0');$('#scene-type').textContent=s.altitude>2?'ORBITAL SHOT':s.object==='none'?'LOCATION SHOT':'OBJECT DETAIL';$('#place').value='';$('#move-up').disabled=selected===0;$('#move-down').disabled=selected===project.scenes.length-1;$('#delete').disabled=project.scenes.length===1;$('#duplicate').disabled=project.scenes.length>=20;}
function renderStyle(){renderSurfaceControls();for(const key of ['theme','brand','accent'])$('#'+key).value=project[key];for(const key of ['grid','borders','labels','route','captions'])$('#'+key).checked=project[key];$('#accent-value').textContent=project.accent.toUpperCase();$('#project-name').value=project.name;}
function renderAll(){renderScenes();renderTimeline();renderInspector();renderStyle();historyButtons();draw();}
function updateTransport(){$('#seek').value=String(time);$('#timecode').replaceChildren(document.createTextNode(clock(time,true)+' '),el('span','',`/ ${clock(total(project))}`));const head=$('.playhead');if(head)head.style.left=`${time/total(project)*100}%`;}
function draw(){if(ready)film.draw(time);}
const paceControls=el('div','pace-controls');
paceControls.append(el('span','field-label','TRANSISI SEMUA ADEGAN'));
const paceButtons=el('div','pace-buttons');
for(const [pace,label] of [['fast','Cepat · 0,5s'],['normal','Normal · 1,5s'],['cinematic','Sinematik · 3,5s']]){
  const button=el('button','secondary',label);button.type='button';button.dataset.pace=pace;
  button.onclick=()=>{checkpoint();stop();project=withTransitions(project,TRANSITION_PRESETS[pace]);film?.setProject(project);renderAll();remember();toast(`Transisi semua adegan: ${TRANSITION_PRESETS[pace]} detik. Durasi narasi tetap.`);};
  paceButtons.append(button);
}
paceControls.append(paceButtons,el('p','field-note','Zoom lebih cepat, lalu tahan lokasi selama sisa adegan. Durasi narasi tetap.'));
$('#transition').closest('.input-pair').after(paceControls);
function labeledControl(parent,label,input) {const wrapper=el('label','field-label',label);wrapper.htmlFor=input.id;parent.append(wrapper,input);return input;}
const surfaceControls=el('div','surface-controls');surfaceControls.append(el('div','divider'),el('h3','','Daratan & lautan'));
for(const [key,label,type,min,max] of [
  ['brightness','KECERAHAN BUMI','range',.25,3],['landBrightness','KECERAHAN DARATAN','range',.25,3],['oceanBrightness','KECERAHAN LAUT','range',.25,3],
  ['landColor','WARNA DARATAN','color'],['oceanColor','WARNA LAUT','color'],['tintStrength','KEKUATAN WARNA','range',0,1],
]){
  const input=el('input');input.id=`surface-${key}`;input.type=type;
  if(type==='range'){input.min=min;input.max=max;input.step=.05;}
  labeledControl(surfaceControls,label,input);
  if(type==='range'){const output=el('output','control-value');output.id=`surface-${key}-value`;surfaceControls.append(output);}
  input.onfocus=()=>checkpoint();input.oninput=()=>{
    project.surface={...DEFAULT_SURFACE,...project.surface,[key]:type==='color'?input.value:Number(input.value)};
    if(type==='color'&&project.surface.tintStrength===0)project.surface.tintStrength=.65;
    film?.setProject(project);renderSurfaceControls();remember();draw();
  };
}
const resetSurface=el('button','secondary full','Reset warna & kecerahan');resetSurface.onclick=()=>{checkpoint();project.surface={...DEFAULT_SURFACE};film?.setProject(project);renderSurfaceControls();remember();draw();};surfaceControls.append(resetSurface,el('p','field-note','Kekuatan warna 0% memakai tekstur asli. Pengaturan ini berlaku untuk semua adegan.'));
$('[data-content=style]').append(surfaceControls);
function renderSurfaceControls(){const s={...DEFAULT_SURFACE,...project.surface};for(const key of Object.keys(DEFAULT_SURFACE)){const input=$(`#surface-${key}`);if(input)input.value=s[key];const output=$(`#surface-${key}-value`);if(output)output.textContent=`${Math.round(s[key]*100)}%`;}}
const highlightControls=el('div','highlight-controls');highlightControls.append(el('div','divider'),el('h3','','Sorot wilayah'));
const regionSelect=el('select');regionSelect.id='highlight-region';const empty=el('option','','Tambah negara atau pulau…');empty.value='';regionSelect.append(empty);
for(const [label,options] of [['Pulau',ISLANDS.map(i=>({value:`island:${i.id}`,name:i.name}))],['Negara',COUNTRIES.map(c=>({value:`country:${c.id}`,name:c.name}))]]){
 const group=el('optgroup');group.label=label;for(const option of options){const o=el('option','',option.name);o.value=option.value;group.append(o);}regionSelect.append(group);
}
labeledControl(highlightControls,'NEGARA / PULAU',regionSelect);const regionList=el('div','region-list');regionList.id='highlight-list';highlightControls.append(regionList);
function editHighlight(patch){checkpoint();stop();const s=project.scenes[selected];if(updateScene('highlight',{...s.highlight,...patch}))renderGeoInspector();}
regionSelect.onchange=()=>{if(!regionSelect.value)return;const [type,id]=regionSelect.value.split(':');const regions=project.scenes[selected].highlight.regions;if(!regions.some(r=>r.type===type&&r.id===id))editHighlight({regions:[...regions,{type,id}]});regionSelect.value='';};
for(const [key,label,type]of [['style','GAYA WILAYAH','select'],['color','WARNA SOROTAN','color'],['opacity','KEKUATAN SOROTAN','range'],['pulse','ANIMASI BERDENYUT','checkbox']]){
 const input=el(type==='select'?'select':'input');input.id=`highlight-${key}`;
 if(type==='select')for(const [value,name]of [['hatch','Arsir diagonal'],['solid','Warna penuh'],['outline','Garis tepi']]){const o=el('option','',name);o.value=value;input.append(o);}else input.type=type;
 if(type==='range'){input.min=0;input.max=1;input.step=.05;}
 labeledControl(highlightControls,label,input);
 input.onfocus=()=>checkpoint();input.addEventListener(type==='checkbox'?'change':'input',()=>{const s=project.scenes[selected];if(type==='checkbox')checkpoint();updateScene('highlight',{...s.highlight,[key]:type==='checkbox'?input.checked:type==='range'?Number(input.value):input.value});});
}
const effectSelect=el('select');effectSelect.id='effect';for(const [value,label]of Object.entries(EFFECT_TYPES)){const o=el('option','',label);o.value=value;effectSelect.append(o);}
labeledControl(highlightControls,'EFEK LOKASI',effectSelect);effectSelect.onchange=()=>{checkpoint();updateScene('effect',effectSelect.value);};
highlightControls.append(el('p','field-note','Pilihan pulau mencakup seluruh daratannya. Negara mengikuti batas peta. Wilayah custom dapat ditulis sebagai poligon lewat JSON.'));
$('#object').nextElementSibling.after(highlightControls);
function renderGeoInspector(){
 const s=project.scenes[selected],h=s.highlight;regionList.replaceChildren();
 h.regions.forEach((r,i)=>{const b=el('button','region-chip');b.type='button';const name=r.type==='country'?COUNTRIES.find(c=>c.id===r.id)?.name:r.type==='island'?ISLANDS.find(c=>c.id===r.id)?.name:r.name;
  b.textContent=`${name||r.id} ×`;b.title='Hapus wilayah';b.onclick=()=>editHighlight({regions:h.regions.filter((_,j)=>j!==i)});regionList.append(b);
 });
 for(const key of ['style','color','opacity','pulse']){const input=$(`#highlight-${key}`);if(key==='pulse')input.checked=h[key];else input.value=h[key];}effectSelect.value=s.effect;regionSelect.value='';
}
function frame(now){
  if(playing&&ready){const delta=Math.min(.15,(now-lastFrame)/1000);time+=delta;if(time>=total(project)){if(loop){time=0;syncAudio(true);}else{time=total(project);stop();}}const i=locate(project,time).index;if(i!==selected){selected=i;renderScenes();renderInspector();renderTimeline();}draw();updateTransport();}
  lastFrame=now;requestAnimationFrame(frame);
}
function updateScene(key,value){
  const s=project.scenes[selected],candidate={...s,[key]:value};
  try{validateProject({...project,scenes:project.scenes.map((v,i)=>i===selected?candidate:v)});}catch(e){toast(e.message);return false;}
  Object.assign(s,candidate);film?.setProject(project);remember();renderScenes();renderTimeline();
  // Jump into the settled part of the shot when changing camera settings.
  if(['lat','lon','altitude','tilt','object','motion','highlight','effect'].includes(key)){stop();time=sceneStart(project,selected)+Math.min(s.duration-.05,Math.max(.75,Math.min(s.transition,s.duration*.72)));}
  time=Math.min(time,total(project));updateTransport();draw();return true;
}
for(const key of ['title','eyebrow','location','lat','lon','duration','transition','motion','object','stat','statLabel','narration','altitude','tilt']){
  const input=$('#'+key);input.addEventListener('focus',()=>{stop();checkpoint();});
  input.addEventListener('input',()=>{let v=input.value;if(['lat','lon','duration','transition','tilt'].includes(key)){if(v==='')return;v=Number(v);}if(key==='altitude')v=Math.exp(Number(v));if(updateScene(key,v)){if(key==='altitude')$('#altitude-value').textContent=v>2?'Bumi':v>.4?'Regional':'Detail';if(key==='tilt')$('#tilt-value').textContent=`${v}°`;}});
  input.addEventListener('change',()=>{if(['lat','lon','duration','transition','tilt'].includes(key))input.value=project.scenes[selected][key];});
}
places.forEach((p,i)=>{const option=el('option','',p.name);option.value=String(i);$('#place').append(option);const chip=el('button','',p.name);chip.onclick=()=>{$('#script').setRangeText(p.name,$('#script').selectionStart,$('#script').selectionEnd,'end');$('#script').focus();};$('#place-chips').append(chip);});
$('#place').onchange=()=>{if($('#place').value==='')return;checkpoint();const p=places[Number($('#place').value)];Object.assign(project.scenes[selected],{lat:p.lat,lon:p.lon,location:p.name,altitude:p.altitude,object:p.object,tilt:p.object==='none'?0:26});film?.setProject(project);renderInspector();time=sceneStart(project,selected)+Math.min(project.scenes[selected].transition,project.scenes[selected].duration*.72);renderScenes();renderTimeline();draw();remember();};
$$('[data-panel]').forEach(b=>b.onclick=()=>{$$('[data-panel]').forEach(v=>v.classList.toggle('active',v===b));$$('[data-content]').forEach(v=>v.hidden=v.dataset.content!==b.dataset.panel);});
for(const key of ['theme','brand','accent','grid','borders','labels','route','captions']){
  const input=$('#'+key);input.onfocus=()=>checkpoint();input.addEventListener(input.type==='checkbox'?'change':'input',()=>{if(input.type==='checkbox')checkpoint();project[key]=input.type==='checkbox'?input.checked:input.value;$('#accent-value').textContent=project.accent.toUpperCase();film?.setProject(project);draw();remember();});
}
$$('[data-color]').forEach(b=>b.onclick=()=>{checkpoint();project.accent=b.dataset.color;renderStyle();film?.setProject(project);draw();remember();});
$('#project-name').onfocus=()=>checkpoint();$('#project-name').oninput=()=>{project.name=$('#project-name').value;remember();};
$('#add').onclick=()=>{if(project.scenes.length>=20)return;checkpoint();project.scenes.push(scene({...project.scenes[selected],id:uid(),title:'Cerita berikutnya.',narration:'Lanjutkan narasimu di sini.',duration:5}));if(total(project)>120){project.scenes.pop();past.pop();toast('Durasi maksimal 120 detik.');return;}film?.setProject(project);selectScene(project.scenes.length-1);remember();};
$('#duplicate').onclick=()=>{if(project.scenes.length>=20)return;const s={...project.scenes[selected],id:uid()};if(total(project)+s.duration>120)return toast('Durasi maksimal 120 detik.');checkpoint();project.scenes.splice(selected+1,0,s);film?.setProject(project);selectScene(selected+1);remember();};
$('#delete').onclick=()=>{if(project.scenes.length===1)return;checkpoint();project.scenes.splice(selected,1);film?.setProject(project);selectScene(Math.min(selected,project.scenes.length-1));remember();};
function move(dir){const i=selected+dir;if(i<0||i>=project.scenes.length)return;checkpoint();[project.scenes[selected],project.scenes[i]]=[project.scenes[i],project.scenes[selected]];film?.setProject(project);selectScene(i);remember();}
$('#move-up').onclick=()=>move(-1);$('#move-down').onclick=()=>move(1);$('#undo').onclick=()=>undo();$('#redo').onclick=()=>undo(true);
$('#play').onclick=()=>{if(!ready)return;if(playing)return stop();if(time>=total(project))time=0;playing=true;lastFrame=performance.now();$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Jeda');syncAudio(true);};
$('#restart').onclick=()=>{stop();seek(0);};$('#seek').oninput=()=>seek(Number($('#seek').value));$('#loop').onclick=()=>{loop=!loop;$('#loop').classList.toggle('selected',loop);$('#loop').setAttribute('aria-pressed',String(loop));};
$('#safe').onclick=()=>{$('#safe-overlay').hidden=!$('#safe-overlay').hidden;$('#safe').classList.toggle('selected',!$('#safe-overlay').hidden);};
$('#snapshot').onclick=()=>{if(!ready)return;const a=el('a');a.href=$('#preview').toDataURL('image/png');a.download=`atlas-frame-${time.toFixed(1)}.png`;a.click();toast('Frame PNG disimpan.');};
$('#save').onclick=()=>{download(JSON.stringify(project,null,2),'atlas-project.json');toast('Proyek JSON disimpan.');};$('#import').onclick=()=>$('#project-file').click();
$('#project-file').onchange=async()=>{try{const file=$('#project-file').files[0];if(!file)return;if(file.size>1024*1024)throw new Error('Proyek terlalu besar (maks. 1 MB).');apply(JSON.parse(await file.text()));toast('Proyek dibuka.');}catch(e){toast(e.message);}finally{$('#project-file').value='';}};
$('#build-script').onclick=()=>{try{apply(fromNarrative($('#script').value));$('[data-panel=scenes]').click();toast('Adegan tersusun. Sesuaikan judul dan durasi di panel kanan.');}catch(e){toast(e.message);}};
$('#srt').onclick=()=>download(captions(project),'atlas-subtitles.srt','text/plain');
$('#presets').onclick=()=>$('#preset-dialog').showModal();$('#help').onclick=()=>$('#help-dialog').showModal();
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function preset(name){let p=demo();if(name==='maritime'){p.name='Jalur yang menghubungkan dunia';p.accent='#9ccde4';p.scenes[0].title='Dunia yang\nsaling terhubung.';p.scenes[0].narration='Dari angkasa, mari ikuti satu jalur pelayaran.';for(const [i,place]of [[1,places[5]],[2,places[5]],[3,places[4]]]){Object.assign(p.scenes[i],place,{location:place.name,title:i===1?'Sebuah jalur\ndi antara daratan.':i===2?'Mengangkut cerita.\nMelintasi samudra.':'Menuju\npersimpangan dunia.',narration:i===1?'Kamera mendekati Terusan Suez di Mesir.':i===2?'Ilustrasi kapal kontainer memperlihatkan objek utama dalam perjalanan ini.':'Dari Suez, perjalanan dilanjutkan ke Singapura.',altitude:i===1?.65:.13,object:i===1?'none':place.object,tilt:i===1?0:30,stat:place.name.toUpperCase(),statLabel:'ILUSTRASI JALUR PELAYARAN'});}}
  if(name==='mountains'){p.name='Cerita dari ketinggian';p.accent='#b6d2ae';p.scenes[0].title='Bumi punya\nbanyak puncak.';p.scenes[0].narration='Sebuah perjalanan untuk melihat ilustrasi pegunungan dari dekat.';[places[8],places[7],places[2]].forEach((place,j)=>Object.assign(p.scenes[j+1],place,{location:place.name,title:`Mendekat ke\n${place.name}.`,narration:`Kini kamera bergerak ke ${place.name}. Objek tiga dimensi menampilkan ilustrasi gunung di lokasi ini.`,tilt:30,stat:place.name.toUpperCase(),statLabel:'ILUSTRASI GUNUNG'}));}
  if(name==='cities'){p.name='Satu dunia, banyak kota';p.accent='#bdb1ec';[places[12],places[10],places[6],places[1]].forEach((place,j)=>Object.assign(p.scenes[j],place,{location:place.name,title:`Cerita dari\n${place.name}.`,narration:`Kita ${j===0?'memulai perjalanan di':'terbang menuju'} ${place.name}. Bentuk gedung ini adalah ilustrasi kota, bukan model bangunan sebenarnya.`,tilt:25,stat:place.name.toUpperCase(),statLabel:'ILUSTRASI KOTA',motion:'hold'}));}return p;}
$$('[data-preset]').forEach(b=>b.onclick=()=>{apply(preset(b.dataset.preset));$('#preset-dialog').close();toast('Template dibuka. Semua adegan bisa kamu ubah.');});
function audioUI(){const player=$('#audio-player');$('#audio-detail').hidden=!audio;if(audio){$('#audio-name').textContent=audio.name;player.src=audio.url;}else{player.removeAttribute('src');player.load();}}
$('#audio-file').onchange=async()=>{const file=$('#audio-file').files[0];if(!file)return;if(file.size>30*1024*1024)return toast('Audio maksimal 30 MB.');try{toast('Mengunggah audio ke server lokal…');const mime=file.type||({mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg',webm:'audio/webm'}[file.name.split('.').pop().toLowerCase()]);const result=await api('/api/audio',{method:'POST',headers:{'Content-Type':mime||'application/octet-stream'},body:file});audio={...result,name:file.name};audioUI();try{localStorage.setItem('atlas-audio-v1',JSON.stringify(audio));}catch{}toast(`Audio siap · ${clock(audio.duration)}`);}catch(e){toast(e.message);}finally{$('#audio-file').value='';}};
$('#audio-remove').onclick=()=>{stop();audio=null;audioUI();try{localStorage.removeItem('atlas-audio-v1');}catch{}};
$('#export').onclick=()=>{stop();$('#export-duration').textContent=`${total(project).toFixed(1)} DETIK`;$('#export-audio').textContent=audio?'Dengan audio':'Tanpa audio';$('#export-dialog').showModal();};
function exportBusy(busy){$('#start-export').disabled=busy;$('#cancel-export').hidden=!busy;$$('input[name=quality]').forEach(e=>e.disabled=busy);}
async function poll(){try{const job=await api(`/api/jobs/${jobId}`);$('#export-bar').value=job.progress;$('#export-percent').textContent=`${job.progress}%`;$('#export-message').textContent=job.frames?`Merender frame ${job.frame} / ${job.frames}`:'Menyiapkan renderer…';
  if(job.status==='completed'){exportBusy(false);$('#export-message').textContent='Video selesai dirender.';$('#export-result').hidden=false;$('#start-export').hidden=true;$('#download-video').href=job.url;$('#download-project').href=job.projectUrl;$('#download-srt').href=job.srtUrl;toast('MP4 siap diunduh.');jobId=null;return;}
  if(job.status==='failed'||job.status==='cancelled')throw new Error(job.error||'Ekspor gagal.');pollTimer=setTimeout(poll,800);
}catch(e){exportBusy(false);$('#export-error').textContent=e.message;jobId=null;}}
$('#start-export').onclick=async()=>{try{validateProject(project);exportBusy(true);$('#export-error').textContent='';$('#export-result').hidden=true;$('#export-progress').hidden=false;$('#export-percent').textContent='0%';$('#export-bar').value=0;$('#export-message').textContent='Menyiapkan renderer…';const job=await api('/api/render',post({project,quality:$('input[name=quality]:checked').value,fps:30,audioId:audio?.id}));jobId=job.id;await poll();}catch(e){exportBusy(false);$('#export-error').textContent=e.message;}};
$('#cancel-export').onclick=async()=>{if(!jobId)return;try{await api(`/api/jobs/${jobId}/cancel`,post({}));$('#export-message').textContent='Membatalkan…';}catch(e){toast(e.message);}};
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||$('dialog[open]'))return;if(e.code==='Space'){e.preventDefault();$('#play').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}if(e.key==='ArrowRight'){e.preventDefault();seek(time+.5);}if(e.key==='ArrowLeft'){e.preventDefault();seek(time-.5);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
renderAll();audioUI();requestAnimationFrame(frame);
try{film=new GlobeFilm($('#preview'));film.setProject(project);await film.ready;ready=true;$('#loading').hidden=true;draw();window.atlas={get project(){return project;},get time(){return time;},film,seek,selectScene,apply};const config=await api('/api/config');if(!config.browser)toast('Preview siap. Instal Chrome/Edge untuk ekspor MP4.');}catch(e){$('#loading').textContent=`Globe belum dapat dimuat: ${e.message}`;$('#render-state').textContent='ENGINE ERROR';console.error(e);}
if(audio){try{if(!(await fetch(audio.url,{method:'HEAD'})).ok)throw new Error();}catch{audio=null;audioUI();try{localStorage.removeItem('atlas-audio-v1');}catch{}}}
