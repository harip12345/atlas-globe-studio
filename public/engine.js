import * as T from '/vendor/three.module.js';
import { clamp, ease, mix, locate, total, cameraAt, transitionDuration } from './model.js';
import { GeoLayers } from './surface.js';
import { createSceneEffect } from './effects.js';

const rad = Math.PI / 180;
export function geo(lat, lon, radius = 1) {
  return new T.Vector3(Math.cos(lat * rad) * Math.cos(lon * rad), Math.sin(lat * rad), -Math.cos(lat * rad) * Math.sin(lon * rad)).multiplyScalar(radius);
}
function dispose(group) {
  group.traverse(o => { o.geometry?.dispose(); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); });
  group.clear();
}
export class GlobeFilm {
  constructor(canvas, width = 540, height = 960) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0, 0); this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(50, width / height, .0005, 100);
    this.scene.add(new T.AmbientLight('#b2d9ff', 1.65));
    this.sun = new T.DirectionalLight('#fff0da', 2.5); this.scene.add(this.sun);
    this.earth = new T.Mesh(new T.SphereGeometry(1, 192, 128), new T.MeshPhongMaterial({ color: '#d1e5ef', shininess: 14, specular: '#203345' })); this.scene.add(this.earth);
    this.atmosphere = new T.Mesh(new T.SphereGeometry(1.023, 96, 64), new T.ShaderMaterial({
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vP=p.xyz; gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 vN; varying vec3 vP; void main(){float d=abs(dot(normalize(vN),normalize(-vP))); float a=pow(1.0-d,4.0)*0.65; gl_FragColor=vec4(0.12,0.48,0.9,a);}',
      transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
    })); this.scene.add(this.atmosphere);
    this.grid = new T.Group(); this.scene.add(this.grid); this.makeGrid();
    this.borders = new T.Group(); this.scene.add(this.borders);
    this.details = new T.Group(); this.scene.add(this.details);
    this.paths = new T.Group(); this.scene.add(this.paths);
    this.activeIndex = -1; this.setSize(width, height);
    this.ready = this.load();
  }
  async load() {
    const [texture, topo] = await Promise.all([
      new T.TextureLoader().loadAsync('/assets/earth.jpg'),
      fetch('/assets/countries.json').then(r => { if (!r.ok) throw new Error('Batas negara tidak tersedia.'); return r.json(); }),
    ]);
    texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.earth.material.map = texture; this.earth.material.needsUpdate = true;
    this.geoLayers=new GeoLayers(topo,this.earth,this.scene);
    const vertices = [];
    for (const arc of topo.arcs) {
      let x = 0, y = 0, prev;
      for (const point of arc) {
        x += point[0]; y += point[1];
        const lon = x * topo.transform.scale[0] + topo.transform.translate[0];
        const lat = y * topo.transform.scale[1] + topo.transform.translate[1];
        const p = geo(lat, lon, 1.0007);
        if (prev && prev.distanceTo(p) < .16) vertices.push(...prev.toArray(), ...p.toArray());
        prev = p;
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    this.borders.add(new T.LineSegments(g, new T.LineBasicMaterial({ color: '#dfdfc7', transparent: true, opacity: .26 })));
  }
  setSize(w, h) { this.canvas.width = w; this.canvas.height = h; this.renderer.setSize(w, h, false); this.camera.aspect = w/h; this.camera.updateProjectionMatrix(); }
  makeGrid() {
    const mat = new T.LineBasicMaterial({ color: '#7395ac', transparent: true, opacity: .12 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = []; for (let lon = -180; lon <= 180; lon += 2) points.push(geo(lat, lon, 1.001));
      this.grid.add(new T.Line(new T.BufferGeometry().setFromPoints(points), mat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const points = []; for (let lat = -90; lat <= 90; lat += 2) points.push(geo(lat, lon, 1.001));
      this.grid.add(new T.Line(new T.BufferGeometry().setFromPoints(points), mat));
    }
  }
  setProject(project) { this.project = project; this.activeIndex = -1; }
  buildDetail(s, index) {
    dispose(this.details); dispose(this.paths);
    const accent = this.project.accent;
    this.anchor = new T.Group(); this.anchor.position.copy(geo(s.lat, s.lon, 1.001));
    this.anchor.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), geo(s.lat,s.lon));
    this.details.add(this.anchor);
    this.effectGroup=new T.Group();this.anchor.add(this.effectGroup);
    this.animateEffect=createSceneEffect(s.effect,{T,group:this.effectGroup,color:accent});
    const material = (color, more = {}) => new T.MeshStandardMaterial({ color, roughness: .8, ...more });
    const put = (geometry, mat, x=0,y=0,z=0) => { const m = new T.Mesh(geometry,mat); m.position.set(x,y,z); this.object.add(m); return m; };
    this.object = new T.Group(); this.anchor.add(this.object);
    const groundMat = material('#223d3c');
    if (s.object !== 'none') {
      put(new T.CylinderGeometry(8,8.5,.4,64), groundMat,0,.2,0);
      const ring = put(new T.TorusGeometry(8.1,.035,6,100),material(accent,{emissive:accent,emissiveIntensity:.4}),0,.45,0); ring.rotation.x=-Math.PI/2;
    }
    if (s.object === 'city') {
      put(new T.BoxGeometry(14,.15,.65),material('#929d99'),0,.47,0);
      put(new T.BoxGeometry(.65,.15,14),material('#929d99'),0,.47,0);
      for (let i=0;i<24;i++) {
        const a=(i%6-2.5)*2.15,b=(Math.floor(i/6)-1.5)*2.5;
        const px=a+Math.sign(a)*.55,pz=b+Math.sign(b)*.55,h=1+(i*17%11)*.45;
        const mat=material(i%3===0?'#dbd6ba':i%3===1?'#9bb7b9':'#c0b098');
        put(new T.BoxGeometry(1.1,h,1.3),mat,px,h/2+.55,pz);
        for(let k=1;k<h;k+=.7) put(new T.BoxGeometry(1.115,.15,1.315),material('#578a99',{emissive:'#a9d8db',emissiveIntensity:.12}),px,k+.7,pz);
      }
      put(new T.CylinderGeometry(.24,.55,6,4),material('#f5e9cc'),0,3.5,0);
      put(new T.OctahedronGeometry(.65),material(accent,{emissive:accent,emissiveIntensity:.4}),0,6.8,0);
    }
    if (s.object === 'mountain' || s.object === 'volcano') {
      put(new T.ConeGeometry(6.6,5.2,40),material('#4d6151',{flatShading:true}),0,2.8,0);
      put(new T.ConeGeometry(3.6,3,36),material('#768375',{flatShading:true}),0,4.2,0);
      for(let i=0;i<9;i++){
        const angle=i*Math.PI*2/9,r=4.5;
        const ridge=put(new T.ConeGeometry(1.3,2.1,5),material(i%2?'#5b7057':'#64735d',{flatShading:true}),Math.cos(angle)*r,1.1,Math.sin(angle)*r);ridge.rotation.y=angle;
      }
      for(let i=0;i<20;i++){
        const angle=i*2.39,r=5.7+(i%3)*.38;
        put(new T.ConeGeometry(.22,.8+(i%4)*.15,5),material(i%2?'#8caa78':'#42604a'),Math.cos(angle)*r,.8,Math.sin(angle)*r);
      }
      if (s.object === 'mountain') put(new T.ConeGeometry(1.75,1.5,36),material('#e6eee8',{flatShading:true}),0,5.45,0);
      else {
        const crater=put(new T.TorusGeometry(1.1,.4,12,36),material('#483e36'),0,5.45,0); crater.rotation.x=Math.PI/2;
        const lava=put(new T.CircleGeometry(.95,36),material('#f18e49',{emissive:'#e8561c',emissiveIntensity:1}),0,5.46,0); lava.rotation.x=-Math.PI/2;
        this.smoke=[];
        for(let i=0;i<6;i++) {const m=put(new T.IcosahedronGeometry(.5+i*.1,2),material('#bcc3be',{transparent:true,opacity:.17,depthWrite:false}),Math.sin(i)*.3,6+i*.65,0);this.smoke.push(m);}
      }
    }
    if(s.object === 'forest') for(let i=0;i<45;i++) {
      const a=i*2.4,r=1+Math.sqrt(i/45)*5.7,h=1.5+(i%5)*.3;
      put(new T.CylinderGeometry(.08,.12,h,6),material('#8b7654'),Math.cos(a)*r,h/2+.4,Math.sin(a)*r);
      put(new T.ConeGeometry(.7,h,8),material(i%2?'#5a8a5c':'#8bae70'),Math.cos(a)*r,h+.4,Math.sin(a)*r);
    }
    if(s.object === 'ship') {
      put(new T.CylinderGeometry(7.8,7.8,.06,64),material('#305976',{metalness:.3}),0,.45,0);
      put(new T.BoxGeometry(3,1.3,10),material('#b56e54'),0,1.2,0);
      const bow=put(new T.ConeGeometry(2.1,2.5,4),material('#b56e54'),0,1.2,-5.7);bow.rotation.x=-Math.PI/2;bow.rotation.z=Math.PI/4;
      for(let i=0;i<14;i++) put(new T.BoxGeometry(1.25,.9,1.05),material(['#b8baa2','#dfa66c','#6b9999'][i%3]),(i%2-.5)*1.4,2.3,-3.5+Math.floor(i/2)*1.15);
      put(new T.BoxGeometry(2.6,2.8,1.5),material('#dddcc7'),0,3,4);
      put(new T.BoxGeometry(.2,2,.2),material('#bbb7a1'),0,5,4);
    }
    this.detailScale=['volcano','mountain'].includes(s.object)?.00155:.0025;
    this.object.scale.setScalar(this.detailScale);
    if (index > 0) {
      const prev = this.project.scenes[index-1], a=geo(prev.lat,prev.lon),b=geo(s.lat,s.lon);
      const angle=a.angleTo(b),points=[];
      for(let i=0;i<=128;i++) {
        const f=i/128; let v;
        if(angle<.0001) v=a.clone();
        else if(Math.PI-angle<.001) v=a.clone().applyAxisAngle(new T.Vector3(0,1,0),Math.PI*f);
        else v=a.clone().multiplyScalar(Math.sin((1-f)*angle)).addScaledVector(b,Math.sin(f*angle)).divideScalar(Math.sin(angle));
        points.push(v.normalize().multiplyScalar(1.004+Math.sin(f*Math.PI)*Math.min(.22,angle*.12)));
      }
      this.route = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({color:accent,transparent:true,opacity:.85}));this.paths.add(this.route);
    } else this.route = null;
    this.activeIndex=index;
  }
  draw(t) {
    const p=this.project;if(!p)return;
    const {scene:s,index,local}=locate(p,t), state=cameraAt(p,t);
    if(index!==this.activeIndex)this.buildDetail(s,index);
    const normal=geo(state.lat,state.lon),north=geo(state.lat+.01,state.lon).sub(normal).normalize();
    const tilt=state.tilt*rad;
    this.camera.position.copy(normal).multiplyScalar(1+state.altitude*Math.cos(tilt)).addScaledVector(north,-state.altitude*Math.sin(tilt));
    const focus=1-ease((state.altitude-.4)/2.4);
    this.camera.up.copy(north);this.camera.lookAt(normal.clone().multiplyScalar(focus).addScaledVector(north,state.altitude*.04*focus));
    this.sun.position.copy(this.camera.position).addScaledVector(north,3).add(new T.Vector3(2,1,1));
    this.grid.visible=p.grid;this.borders.visible=p.borders;this.paths.visible=p.route;
    this.earth.material.color.set(p.theme==='midnight'?'#538298':'#d1e5ef');
    this.geoLayers?.update(p,s,local,t);
    this.effectGroup.scale.setScalar(clamp(state.altitude*.075,.003,.08));this.animateEffect(t);
    this.object.visible=s.object!=='none' && state.altitude<.55;
    const pop=ease((state.progress-.45)/.5)*ease((.55-state.altitude)/.25);
    this.object.scale.setScalar(this.detailScale*pop);
    if(this.smoke && s.object==='volcano')this.smoke.forEach((m,i)=>{m.position.x=Math.sin(t*.7+i)*(.2+i*.1);m.position.y=6+((i*.65+t*.4)%5);});
    if(this.route)this.route.geometry.setDrawRange(0,Math.ceil(129*ease(local/transitionDuration(s))));
    this.renderer.render(this.scene,this.camera);
    const x=this.ctx,w=this.canvas.width,h=this.canvas.height;
    x.setTransform(w/540,0,0,h/960,0,0);
    const bg=x.createLinearGradient(0,0,540,960);bg.addColorStop(0,'#050c14');bg.addColorStop(.6,'#09141f');bg.addColorStop(1,'#03090f');x.fillStyle=bg;x.fillRect(0,0,540,960);
    for(let i=0;i<175;i++){x.globalAlpha=.15+(i%7)/18;x.fillStyle='#bccfe0';x.beginPath();x.arc((i*139.37+31)%540,(i*97.13+23)%960,i%9===0?.9:.45,0,Math.PI*2);x.fill();}x.globalAlpha=1;
    x.drawImage(this.renderer.domElement,0,0,540,960);
    const shade=x.createLinearGradient(0,0,0,960);shade.addColorStop(0,'rgba(3,9,15,.7)');shade.addColorStop(.34,'rgba(3,9,15,0)');shade.addColorStop(.65,'rgba(3,9,15,0)');shade.addColorStop(1,'rgba(3,9,15,.95)');x.fillStyle=shade;x.fillRect(0,0,540,960);
    this.hud(s,index,local,t,state);
  }
  text(text,x,y,font,color='#f4f3ea') { const c=this.ctx;c.font=font;c.fillStyle=color;c.fillText(text,x,y); }
  wrap(text,maxWidth,font) {
    const c=this.ctx;c.font=font;const lines=[];
    for(const para of String(text).split('\n')) {let line='';for(const word of para.split(/\s+/)){if(c.measureText(line+' '+word).width>maxWidth&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);}
    return lines;
  }
  hud(s,index,local,t,state) {
    const x=this.ctx,p=this.project,a=p.accent;
    x.save();x.textBaseline='alphabetic';
    x.fillStyle=a;x.fillRect(34,38,7,7);this.text(p.brand,51,46,'600 10px Arial','#b3bec4');
    x.textAlign='right';this.text(`${String(index+1).padStart(2,'0')} / ${String(p.scenes.length).padStart(2,'0')}`,506,46,'11px monospace','#9eabb6');x.textAlign='left';
    const reveal=ease(local/.7),dy=(1-reveal)*16;x.globalAlpha=reveal;
    this.text(s.eyebrow.toUpperCase(),34,106+dy,'600 10px Arial',a);
    let size=44,lines=this.wrap(s.title,465,`700 ${size}px Arial`);
    if(lines.length>3){size=34;lines=this.wrap(s.title,465,`700 ${size}px Arial`);}
    lines.slice(0,4).forEach((line,i)=>this.text(line,32,158+dy+i*size*1.12,`700 ${size}px Arial`));
    x.globalAlpha=1;
    // Screen-space labels use the same camera as the actual globe, and hide on the far side.
    if(p.labels && s.location!=='Bumi') {
      const pos=geo(s.lat,s.lon,1.003),view=pos.clone().project(this.camera);
      const facing=pos.clone().sub(this.camera.position).dot(pos)<0;
      const px=(view.x+1)*270,py=(1-view.y)*480;
      if(facing&&px>20&&px<520&&py>270&&py<690){
        const pointY=this.object.visible?py-35:py;
        x.shadowColor=a;x.shadowBlur=12;x.fillStyle=a;x.beginPath();x.arc(px,pointY,4,0,Math.PI*2);x.fill();x.shadowBlur=0;
        x.strokeStyle=a;x.lineWidth=1;x.globalAlpha=.7;x.beginPath();x.arc(px,pointY,11+Math.sin(t*2)*2,0,Math.PI*2);x.stroke();x.globalAlpha=1;
        x.font='600 12px Arial';const lw=x.measureText(s.location.toUpperCase()).width+24;
        let lx=clamp(px+22,20,520-lw),ly=pointY-39;
        x.strokeStyle='#9cabac';x.beginPath();x.moveTo(px+5,pointY-7);x.lineTo(lx,ly+8);x.stroke();
        x.fillStyle='rgba(5,16,24,.86)';x.fillRect(lx,ly-15,lw,28);x.fillStyle=a;x.fillRect(lx,ly-15,2,28);
        this.text(s.location.toUpperCase(),lx+12,ly+3,'600 12px Arial');
      }
    }
    if(s.stat){x.fillStyle=a;x.fillRect(34,701,25,2);this.text(s.stat,34,742,'600 26px Arial');this.text(s.statLabel,34,765,'9px Arial','#9caeb9');}
    if(p.captions && s.narration){
      const words=s.narration.split(/\s+/),count=Math.ceil(words.length/7),chunk=Math.min(count-1,Math.floor(local/s.duration*count));
      const phrase=words.slice(chunk*7,chunk*7+7).join(' '),ls=this.wrap(phrase,440,'500 20px Arial');
      x.textAlign='center';ls.slice(0,3).forEach((line,i)=>{
        x.font='500 20px Arial';const width=x.measureText(line).width;x.fillStyle='rgba(2,7,11,.82)';x.beginPath();x.roundRect(270-width/2-12,809+i*29,width+24,28,5);x.fill();this.text(line,270,830+i*29,'500 20px Arial','#f5f3e9');
      });x.textAlign='left';
    }
    const longitude=((state.lon+540)%360)-180;
    const coord=`${Math.abs(state.lat).toFixed(2)}°${state.lat<0?'S':'N'}  ${Math.abs(longitude).toFixed(2)}°${longitude<0?'W':'E'}`;
    this.text(coord,34,911,'9px monospace','#7e919e');x.textAlign='right';this.text(state.altitude>.5?'ORBITAL VIEW':'ILLUSTRATED DETAIL',506,911,'9px monospace','#7e919e');x.textAlign='left';
    x.fillStyle='#23303b';x.fillRect(34,928,472,2);x.fillStyle=a;x.fillRect(34,928,472*clamp(t/total(p),0,1),2);
    x.restore();
  }
  capture(t) {this.draw(t);return this.canvas.toDataURL('image/jpeg',.95).split(',')[1];}
}
