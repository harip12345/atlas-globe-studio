// TopoJSON arcs are delta decoded once and reused by land masks and region highlights.
export const ISLANDS = [
  { id: 'java', name: 'Jawa', point: [110, -7.4] },
  { id: 'sumatra', name: 'Sumatra', point: [102, -.5] },
  { id: 'borneo', name: 'Kalimantan / Borneo · seluruh pulau', point: [114, .8] },
  { id: 'sulawesi', name: 'Sulawesi', point: [120.5, -1.8] },
  { id: 'bali', name: 'Bali', point: [115.14, -8.36] },
  { id: 'new-guinea', name: 'Papua / New Guinea · seluruh pulau', point: [141, -5.2] },
  { id: 'madagascar', name: 'Madagaskar', point: [46.5, -20] },
  { id: 'great-britain', name: 'Britania Raya · pulau', point: [-2, 53] },
];
export function decodeTopology(topo) {
  const arcs = topo.arcs.map(arc => {
    let x=0,y=0;
    return arc.map(p => {x+=p[0];y+=p[1];return [x*topo.transform.scale[0]+topo.transform.translate[0],y*topo.transform.scale[1]+topo.transform.translate[1]];});
  });
  const ring = refs => {
    const points=[];
    for(const ref of refs){const a=ref<0?[...arcs[~ref]].reverse():arcs[ref];if(points.length)points.pop();points.push(...a);}
    if(points.length && (points[0][0]!==points.at(-1)[0]||points[0][1]!==points.at(-1)[1]))points.push([...points[0]]);
    return points;
  };
  const geometry = g => {
    if(g.type==='GeometryCollection')return {type:g.type,geometries:g.geometries.map(geometry)};
    if(g.type==='Polygon')return {type:g.type,coordinates:g.arcs.map(ring)};
    if(g.type==='MultiPolygon')return {type:g.type,coordinates:g.arcs.map(p=>p.map(ring))};
    throw new Error(`Geometri tidak didukung: ${g.type}`);
  };
  const countries=topo.objects.countries.geometries.map(g=>({type:'Feature',id:String(g.id),properties:g.properties,geometry:geometry(g)}));
  const land=geometry(topo.objects.land),islandPolygons=[];
  function collect(g){if(g.type==='GeometryCollection')g.geometries.forEach(collect);else if(g.type==='MultiPolygon')g.coordinates.forEach(c=>islandPolygons.push({type:'Polygon',coordinates:c}));else islandPolygons.push(g);}
  collect(land);
  return {countries,land,islandPolygons,arcs};
}
