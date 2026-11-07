import * as T from '/vendor/three.module.js';
import { geoPath, geoEquirectangular, geoContains, geoArea } from './lib/geo.js';
import { decodeTopology, ISLANDS } from './geography.js';
import { DEFAULT_SURFACE, DEFAULT_HIGHLIGHT, ease } from './model.js';

export class GeoLayers {
  constructor(topo,earth,scene) {
    this.data=decodeTopology(topo);
    this.countries=new Map(this.data.countries.map(f=>[f.id,f]));
    this.islands=new Map(ISLANDS.map(i=>[i.id,this.data.islandPolygons.find(p=>geoContains(p,i.point))]));
    this.width=4096;this.height=2048;
    this.projection=geoEquirectangular().scale(this.width/(2*Math.PI)).translate([this.width/2,this.height/2]).precision(.15);
    const mask=document.createElement('canvas');mask.width=this.width;mask.height=this.height;
    const c=mask.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);c.fillStyle='#fff';c.beginPath();geoPath(this.projection,c)(this.data.land);c.fill();
    this.landMask=new T.CanvasTexture(mask);this.landMask.colorSpace=T.NoColorSpace;
    this.uniforms={uLandMask:{value:this.landMask},uLandColor:{value:new T.Color()},uOceanColor:{value:new T.Color()},uLandBrightness:{value:1},uOceanBrightness:{value:1},uSurfaceBrightness:{value:1},uTintStrength:{value:0}};
    earth.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.fragmentShader='uniform sampler2D uLandMask; uniform vec3 uLandColor; uniform vec3 uOceanColor; uniform float uLandBrightness; uniform float uOceanBrightness; uniform float uSurfaceBrightness; uniform float uTintStrength;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float landFactor = texture2D(uLandMask, vMapUv).r;
        vec3 tintColor = mix(uOceanColor, uLandColor, landFactor);
        float detailLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(diffuseColor.rgb, tintColor * (0.45 + 0.55 * sqrt(max(0.0, detailLuma))), uTintStrength);
        diffuseColor.rgb *= mix(uOceanBrightness, uLandBrightness, landFactor) * uSurfaceBrightness;
      `);
    };
    earth.material.customProgramCacheKey=()=> 'atlas-surface-v1';earth.material.needsUpdate=true;
    this.overlayCanvas=document.createElement('canvas');this.overlayCanvas.width=this.width;this.overlayCanvas.height=this.height;
    this.overlayTexture=new T.CanvasTexture(this.overlayCanvas);this.overlayTexture.colorSpace=T.SRGBColorSpace;
    this.overlay=new T.Mesh(new T.SphereGeometry(1.0016,192,128),new T.MeshBasicMaterial({map:this.overlayTexture,transparent:true,opacity:1,depthWrite:false}));
    this.overlay.visible=false;scene.add(this.overlay);
  }
  regionGeometry(region) {
    if(region.type==='country')return this.countries.get(region.id);
    if(region.type==='island')return this.islands.get(region.id);
    // Custom areas represent the smaller spherical polygon; normalize GeoJSON winding.
    let coordinates=region.coordinates.map(r=>r.map(p=>[...p]));
    if(geoArea({type:'Polygon',coordinates})>2*Math.PI)coordinates=coordinates.map(r=>r.reverse());
    return {type:'Polygon',coordinates};
  }
  paintHighlight(highlight) {
    const c=this.overlayCanvas.getContext('2d'),path=geoPath(this.projection,c),geometries=highlight.regions.map(r=>this.regionGeometry(r));
    c.clearRect(0,0,this.width,this.height);c.save();
    if(highlight.style!=='outline'){
      c.fillStyle=highlight.color;
      for(const geometry of geometries){if(!geometry)continue;c.beginPath();path(geometry);c.fill();}
      if(highlight.style==='hatch'){
        // Apply a pattern through the region alpha mask, retaining the coastline and holes.
        c.globalCompositeOperation='source-in';
        const pattern=document.createElement('canvas');pattern.width=24;pattern.height=24;
        const p=pattern.getContext('2d');p.fillStyle=highlight.color;p.globalAlpha=.18;p.fillRect(0,0,24,24);p.globalAlpha=1;p.strokeStyle=highlight.color;p.lineWidth=4;
        for(let x=-24;x<=24;x+=24){p.beginPath();p.moveTo(x,24);p.lineTo(x+24,0);p.stroke();}
        c.fillStyle=c.createPattern(pattern,'repeat');c.fillRect(0,0,this.width,this.height);
        c.globalCompositeOperation='source-over';
      }
    }
    c.strokeStyle=highlight.color;c.lineWidth=highlight.style==='outline'?3:1.7;
    for(const geometry of geometries){if(!geometry)continue;c.beginPath();path(geometry);c.stroke();}
    c.restore();this.overlayTexture.needsUpdate=true;
  }
  update(project,scene,local,time) {
    const surface=project.surface||DEFAULT_SURFACE,u=this.uniforms;
    u.uLandColor.value.set(surface.landColor);u.uOceanColor.value.set(surface.oceanColor);
    u.uLandBrightness.value=surface.landBrightness;u.uOceanBrightness.value=surface.oceanBrightness;u.uSurfaceBrightness.value=surface.brightness;u.uTintStrength.value=surface.tintStrength;
    const highlight=scene.highlight||{...DEFAULT_HIGHLIGHT,regions:[]};
    this.overlay.visible=highlight.regions.length>0&&highlight.opacity>0;
    if(this.overlay.visible){const key=JSON.stringify([highlight.regions,highlight.color,highlight.style]);if(this.highlightKey!==key){this.paintHighlight(highlight);this.highlightKey=key;}
      this.overlay.material.opacity=highlight.opacity*ease(local/.3)*(highlight.pulse ? .72+.28*Math.sin(time*3) : 1);
    }
  }
}
