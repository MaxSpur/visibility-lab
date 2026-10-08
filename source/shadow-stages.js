/* A solver trace, not an animated estimate. Preparation, overlap detection and
 * retained-piece partitioning execute once, with cumulative typed checkpoints.
 * The arithmetic and regularization follow the pinned subtractShadow routine.
 * No display projection, area readout or scene-graph work is measured here. */
function recordedSubtraction3(q,receivers,occluders,{broadPhase=true}={}){
 const initial=receivers.map((f,i)=>({owner:f.owner??i,kind:f.kind,polys:[f.poly]}));
 const measured=measureSolverWork(checkpoint=>{
  let pieces=initial;const entries=[];
  for(let index=0;index<occluders.length;index++){
   const occluder=occluders[index],planes=shadowPlanes(occluder.poly||occluder,q),before=pieces,preparedWork=checkpoint(),removed=[];
   // Rejection and actual overlap clipping precede partitioning. Preserve each
   // receiver's polygon order so retained output is byte-for-byte compatible.
   const classified=before.map(f=>({...f,items:f.polys.map(poly=>{
    if(!planes||poly.length<3)return {poly,overlap:null};
    if(broadPhase&&planes.some(h=>Math.max(...poly.map(p=>val3(h,p)))<=E3))return {poly,overlap:null};
    if(Math.max(...poly.map(p=>val3(planes[0],p)))<=E3)return {poly,overlap:null};
    if(planes.some(h=>Math.max(...poly.map(p=>val3(h,p)))<=E3))return {poly,overlap:null};
    const overlap=clipByPlanes(poly,planes);
    if(overlap.length<3||area3(overlap)<E3)return {poly,overlap:null};
    removed.push({owner:f.owner,kind:f.kind,poly:overlap});return {poly,overlap};
   })}));
   const overlapWork=checkpoint();
   pieces=classified.map(f=>({owner:f.owner,kind:f.kind,polys:f.items.flatMap(({poly,overlap})=>{
    if(!overlap)return [poly];
    let rest=poly;const out=[];
    for(const h of planes){const outside=clip3(rest,h,false);if(outside.length>=3&&area3(outside)>E3)out.push(outside);rest=clip3(rest,h,true);if(rest.length<3)break;}
    return out;
   })}));
   entries.push({id:occluder.id??index,index,planes,before,removed,after:pieces,preparedWork,overlapWork,work:checkpoint(),changed:removed.length>0});
  }
  return {initial,entries,pieces,surfaces:pieces.flatMap(f=>f.polys.map(poly=>({owner:f.owner,kind:f.kind,poly})))};
 });
 return {...measured.value,work:measured.work};
}
