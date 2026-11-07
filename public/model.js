import { COUNTRIES } from './countries.js';
import { ISLANDS } from './geography.js';
export const uid = () => globalThis.crypto.randomUUID();
export const EFFECT_TYPES = Object.freeze({ none: 'Tanpa efek', radar: 'Radar · lingkaran menyebar', beacon: 'Beacon · sorotan lokasi' });
export const DEFAULT_SURFACE = Object.freeze({ brightness: 1, landBrightness: 1, oceanBrightness: 1, landColor: '#85a36f', oceanColor: '#236c9f', tintStrength: 0 });
export const DEFAULT_HIGHLIGHT = Object.freeze({ color: '#ffb765', opacity: .7, style: 'hatch', pulse: false });
const countryIds = new Set(COUNTRIES.map(c=>c.id));
function bounded(value, min, max, label) { if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${label} harus ${min}–${max}.`);return value; }
function hex(value,label) {if(!/^#[\da-f]{6}$/i.test(value))throw new Error(`${label} harus warna hex, misalnya #55aaff.`);return value;}
export function normalizeSurface(value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('surface harus berupa objek.');
  const out={...DEFAULT_SURFACE,...value};
  for(const k of ['brightness','landBrightness','oceanBrightness'])out[k]=bounded(out[k],.25,3,k);
  out.tintStrength=bounded(out.tintStrength,0,1,'tintStrength');
  for(const k of ['landColor','oceanColor'])out[k]=hex(out[k],k);
  return Object.fromEntries(Object.keys(DEFAULT_SURFACE).map(k=>[k,out[k]]));
}
export function normalizeHighlight(value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('highlight harus berupa objek.');
  const out={...DEFAULT_HIGHLIGHT,...value};
  out.regions=value.regions??[];
  if(!Array.isArray(out.regions)||out.regions.length>16)throw new Error('Pilih maksimal 16 wilayah per adegan.');
  out.regions=out.regions.map(r=>{
    if(!r||typeof r!=='object')throw new Error('Wilayah tidak valid.');
    if(r.type==='country'){if(!countryIds.has(String(r.id)))throw new Error(`ID negara tidak tersedia: ${r.id}`);return {type:r.type,id:String(r.id)};}
    if(r.type==='island'){if(!ISLANDS.some(i=>i.id===r.id))throw new Error(`ID pulau tidak tersedia: ${r.id}`);return {type:r.type,id:r.id};}
    if(r.type!=='polygon'||!Array.isArray(r.coordinates)||r.coordinates.length<1||r.coordinates.length>8)throw new Error('Wilayah harus country, island, atau polygon.');
    let count=0;
    const coordinates=r.coordinates.map(ring=>{
      if(!Array.isArray(ring)||ring.length<4)throw new Error('Ring poligon minimal 4 titik, tertutup.');
      count+=ring.length;if(count>512)throw new Error('Poligon maksimal 512 titik.');
      const result=ring.map(point=>{if(!Array.isArray(point)||point.length!==2)throw new Error('Titik poligon harus [bujur, lintang].');return [bounded(point[0],-180,180,'Bujur poligon'),bounded(point[1],-90,90,'Lintang poligon')];});
      if(result[0][0]!==result.at(-1)[0]||result[0][1]!==result.at(-1)[1])throw new Error('Ring poligon harus tertutup.');return result;
    });
    return {type:r.type,name:String(r.name||'Wilayah custom').slice(0,70),coordinates};
  });
  out.color=hex(out.color,'Warna arsiran');out.opacity=bounded(out.opacity,0,1,'Opacity arsiran');
  if(!['hatch','solid','outline'].includes(out.style))throw new Error('Gaya arsiran harus hatch, solid, atau outline.');
  if(typeof out.pulse!=='boolean')throw new Error('pulse harus boolean.');
  return {regions:out.regions,color:out.color,opacity:out.opacity,style:out.style,pulse:out.pulse};
}
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
export const mix = (a, b, t) => a + (b - a) * t;
export const TRANSITION_PRESETS = Object.freeze({ fast: .5, normal: 1.5, cinematic: 3.5 });
export const transitionDuration = s => Math.min(s.duration * .72, s.transition);
export function withTransitions(project, seconds) {
  return validateProject({ ...project, scenes: project.scenes.map(s => ({ ...s, transition: seconds })) });
}
export const places = [
  { name: 'Indonesia', lat: -2.5, lon: 118, altitude: 1.25, object: 'none' },
  { name: 'Jakarta', lat: -6.1754, lon: 106.8272, altitude: .18, object: 'city' },
  { name: 'Gunung Merapi', lat: -7.5407, lon: 110.446, altitude: .085, object: 'volcano' },
  { name: 'Bali', lat: -8.34, lon: 115.09, altitude: .16, object: 'mountain' },
  { name: 'Singapura', lat: 1.3521, lon: 103.8198, altitude: .14, object: 'city' },
  { name: 'Terusan Suez', lat: 30.58, lon: 32.34, altitude: .16, object: 'ship' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, altitude: .16, object: 'city' },
  { name: 'Gunung Fuji', lat: 35.3606, lon: 138.7274, altitude: .085, object: 'mountain' },
  { name: 'Himalaya', lat: 27.9881, lon: 86.925, altitude: .12, object: 'mountain' },
  { name: 'Amazon', lat: -3.4653, lon: -62.2159, altitude: .38, object: 'forest' },
  { name: 'New York', lat: 40.7128, lon: -74.006, altitude: .16, object: 'city' },
  { name: 'Kairo', lat: 30.0444, lon: 31.2357, altitude: .18, object: 'city' },
  { name: 'London', lat: 51.5072, lon: -.1276, altitude: .18, object: 'city' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, altitude: .18, object: 'city' },
  { name: 'Afrika', lat: 4, lon: 20, altitude: 1.5, object: 'none' },
  { name: 'Eropa', lat: 48, lon: 14, altitude: 1, object: 'none' },
];
export const total = p => p.scenes.reduce((a, s) => a + s.duration, 0);
export const sceneStart = (p, index) => p.scenes.slice(0, index).reduce((a, s) => a + s.duration, 0);
export function locate(p, time) {
  let start = 0;
  for (let index = 0; index < p.scenes.length; index++) {
    const scene = p.scenes[index];
    if (time < start + scene.duration || index === p.scenes.length - 1) return { scene, index, local: clamp(time - start, 0, scene.duration), start };
    start += scene.duration;
  }
}
export function cameraAt(p, time) {
  const { scene: s, index, local } = locate(p, time);
  const prev = p.scenes[Math.max(0, index - 1)];
  const prevLon = prev.lon + (index > 0 && prev.motion === 'orbit' ? prev.duration * 1.8 : 0);
  const prevAltitude = prev.altitude * (index > 0 && prev.motion === 'push' ? .87 : 1);
  const f = ease(local / transitionDuration(s));
  const delta = ((s.lon - prevLon + 540) % 360) - 180;
  const hold = s.motion === 'orbit' ? local * 1.8 : 0;
  return {
    lat: mix(prev.lat, s.lat, f), lon: prevLon + delta * f + hold,
    altitude: Math.exp(mix(Math.log(prevAltitude), Math.log(s.altitude), f)) * (s.motion === 'push' ? 1 - .13 * local / s.duration : 1),
    tilt: mix(prev.tilt, s.tilt, f), progress: f,
  };
}
export function scene(data = {}) {
  return { id: uid(), title: 'Lokasi berikutnya', eyebrow: 'MENJELAJAH BUMI', narration: 'Tulis narasi adegan ini.', location: 'Indonesia', lat: -2.5, lon: 118, altitude: 1.2, duration: 5, transition: 3, tilt: 0, motion: 'hold', object: 'none', stat: '', statLabel: '', highlight: {...DEFAULT_HIGHLIGHT,regions:[]}, effect: 'none', ...data };
}
export function demo() {
  return { version: 1, surface: {...DEFAULT_SURFACE}, name: 'Dari angkasa ke Nusantara', accent: '#f9ae65', theme: 'satellite', grid: true, borders: true, labels: true, captions: true, route: true, brand: 'ATLAS / EARTH STORIES', scenes: [
    scene({ title: 'Satu bumi.\nJutaan cerita.', eyebrow: 'PERSPEKTIF YANG BERBEDA', narration: 'Dari kejauhan, bumi menyimpan jutaan cerita. Mari mendekat ke salah satunya.', location: 'Bumi', lat: 8, lon: 108, altitude: 3.2, duration: 5, motion: 'orbit', stat: '01', statLabel: 'SEBUAH PERJALANAN' }),
    scene({ title: 'Di antara\ndua samudra.', eyebrow: 'ASIA TENGGARA', narration: 'Kamera bergerak mendekati kepulauan Indonesia, di antara Samudra Hindia dan Pasifik.', ...places[0], location: 'Indonesia', duration: 5, altitude: .85, transition: 3.5, stat: 'INDONESIA', statLabel: 'NEGARA KEPULAUAN' }),
    scene({ title: 'Sebuah kota.\nBegitu banyak gerak.', eyebrow: '06°10′ LS · 106°49′ BT', narration: 'Di pulau Jawa, kita mendekati Jakarta. Gedung dan jalan menjadi ilustrasi kehidupan sebuah kota.', ...places[1], location: 'Jakarta', duration: 6, altitude: .13, tilt: 24, transition: 3.8, stat: 'JAKARTA', statLabel: 'ILUSTRASI KOTA · BUKAN MODEL AKTUAL' }),
    scene({ title: 'Lebih dekat.\nLebih bercerita.', eyebrow: 'DARI LOKASI KE OBJEK', narration: 'Beralih ke Gunung Merapi. Ilustrasi gunung membantu menjelaskan objek yang sedang dibahas.', ...places[2], location: 'Gunung Merapi', duration: 6, tilt: 42, transition: 3.5, motion: 'push', stat: 'MERAPI', statLabel: 'ILUSTRASI GUNUNG · BUKAN MODEL AKTUAL' }),
  ] };
}
export function validateProject(p) {
  if (!p || p.version !== 1 || !Array.isArray(p.scenes) || !p.scenes.length || p.scenes.length > 20) throw new Error('Proyek harus memiliki 1–20 adegan (versi 1).');
  const out = { version: 1, name: String(p.name || 'Cerita bumi').slice(0, 120), brand: String(p.brand || 'ATLAS / EARTH STORIES').slice(0, 50), accent: /^#[\da-f]{6}$/i.test(p.accent) ? p.accent : '#f9ae65', theme: ['satellite', 'midnight'].includes(p.theme) ? p.theme : 'satellite', ...Object.fromEntries(['grid','borders','labels','captions','route'].map(k => [k, p[k] !== false])), scenes: [] };
  out.surface=normalizeSurface(p.surface);
  for (const s of p.scenes) {
    if (!s || typeof s !== 'object') throw new Error('Data adegan tidak valid.');
    for (const [key, min, max] of [['lat',-85,85],['lon',-180,180],['altitude',.065,5],['duration',1,30],['transition',.25,10],['tilt',0,45]]) {
      if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max) throw new Error(`Nilai ${key} harus ${min}–${max}.`);
    }
    const v = { ...s, id: String(s.id || uid()).slice(0,100) };
    for (const [key, max] of [['title',120],['narration',1500],['location',70],['eyebrow',80],['stat',40],['statLabel',90]]) v[key] = String(s[key] || '').slice(0,max);
    v.object = ['none','city','volcano','mountain','ship','forest'].includes(s.object) ? s.object : 'none';
    v.motion = ['hold','orbit','push'].includes(s.motion) ? s.motion : 'hold';
    v.highlight=normalizeHighlight(s.highlight);
    v.effect=s.effect??'none';if(!Object.hasOwn(EFFECT_TYPES,v.effect))throw new Error(`Efek tidak tersedia: ${v.effect}`);
    out.scenes.push(v);
  }
  if (new Set(out.scenes.map(s => s.id)).size !== out.scenes.length) throw new Error('ID adegan harus unik.');
  if (total(out) > 120) throw new Error('Durasi maksimal 120 detik.');
  return out;
}
export function fromNarrative(text) {
  const chunks = text.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 10);
  if (!chunks.length) throw new Error('Tulis satu paragraf per adegan terlebih dahulu.');
  let last = places[0];
  const scenes = chunks.map((n, i) => {
    const hit = [...places].sort((a,b) => b.name.length - a.name.length).find(p => new RegExp(`(?<!\\p{L})${p.name}(?!\\p{L})`, 'iu').test(n));
    if (hit) last = hit;
    const space = /angkasa|planet|bumi|dunia/i.test(n) && !hit;
    return scene({ title: n.split(/[.!?]/)[0].slice(0, 78), narration: n, eyebrow: space ? 'SEBUAH PERSPEKTIF' : 'MENDEKAT KE CERITA', ...last, location: space ? 'Bumi' : last.name, altitude: space ? 3.2 : last.altitude, object: space ? 'none' : last.object, duration: clamp(Math.ceil(n.split(/\s+/).length / 2.4), 4, 15), tilt: !space && last.object !== 'none' ? 26 : 0, motion: space ? 'orbit' : 'hold', stat: space ? '' : last.name.toUpperCase(), statLabel: 'CERITA DARI BUMI' });
  });
  return validateProject({ ...demo(), name: 'Cerita dari narasi', scenes });
}
export function captions(p) {
  let start = 0;
  const stamp = t => { const ms = Math.round(t*1000); return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`; };
  return p.scenes.map((s,i) => { const a = start; start += s.duration; return `${i+1}\n${stamp(a)} --> ${stamp(start)}\n${s.narration}\n`; }).join('\n');
}
