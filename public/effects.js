// New effects live here. Keep every animation a function of time for identical preview/export timing.
export const EFFECT_BUILDERS = {
  radar({T,group,color}) {
    const rings=[];
    for(let i=0;i<3;i++){
      const m=new T.Mesh(new T.RingGeometry(.96,1,96),new T.MeshBasicMaterial({color,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));
      m.rotation.x=-Math.PI/2;m.position.y=.08+i*.015;group.add(m);rings.push(m);
    }
    return t=>rings.forEach((m,i)=>{const p=(t*.5+i/3)%1;m.scale.setScalar(.2+p*2);m.material.opacity=(1-p)*.8;});
  },
  beacon({T,group,color}) {
    const column=new T.Mesh(new T.CylinderGeometry(.12,.3,2.6,32,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));column.position.y=1.3;group.add(column);
    const dot=new T.Mesh(new T.SphereGeometry(.16,24,16),new T.MeshBasicMaterial({color}));dot.position.y=2.7;group.add(dot);
    const radar=EFFECT_BUILDERS.radar({T,group,color});
    return t=>{radar(t);column.material.opacity=.23+.12*Math.sin(t*3);dot.scale.setScalar(1+.14*Math.sin(t*3));};
  },
};
export function createSceneEffect(type,context) {
  return EFFECT_BUILDERS[type]?.(context)||(()=>{});
}
