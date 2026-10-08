/* Receiver subtraction has four actual solver checkpoints per terrain facet.
 * Main and plan consume one display scene; geometric accounting comes solely
 * from recordedSubtraction3, independently of drawing or area readouts. */
function terrainSubtractionData(d,order='near'){
 return memo('terrainSequence'+d.model.tris.length+keyq(d.q)+order,()=>{
  const tris=d.model.tris,ids=occluderOrder(tris,d.q,order);
  return recordedSubtraction3(d.q,tris.map((poly,owner)=>({poly,owner,kind:'terrain'})),ids.map(id=>({id,poly:tris[id]})),{broadPhase:true});
 });
}
function terrainSequenceSurfaces(pieces){return pieces.flatMap(f=>f.polys.map(poly=>({owner:f.owner,kind:f.kind,poly})));}
function terrainSequenceCuts(pieces,tris){return pieces.flatMap(f=>receiverCutEdges(f.polys,tris[f.owner]));}
function terrainSubtractionScene(s,d=terrainState(s)){
 const trace=terrainSubtractionData(d,s.order),stages=1+4*trace.entries.length,stage=Math.min(stages-1,Math.floor(s.phase*stages)),index=stage?Math.floor((stage-1)/4):-1,part=stage?(stage-1)%4:-1,entry=trace.entries[index],final=stage===stages-1;
 const pieces=!entry?trace.initial:part===3?entry.after:entry.before,surfaces=terrainSequenceSurfaces(pieces),faces=d.model.tris.map(poly=>({poly,color:'#b3bfc0'})),lines=s.wire?groundLines(d.model):[];
 faces.push(...surfaces.map(f=>({poly:f.poly,color:C.tealLight,bias:.00015})));
 if(s.cuts&&stage)lines.push(...segLines(terrainSequenceCuts(pieces,d.model.tris),C.teal,2.5));
 if(entry&&part<3){
  const poly=d.model.tris[entry.id];faces.push({poly,color:C.orange,bias:.0003});lines.push(...segLines(poly.map((a,i)=>[a,poly[(i+1)%poly.length]]),C.orange,3));
  if(part>=1&&entry.planes){for(const p of poly)lines.push({a:d.q,b:p,color:C.orange,alpha:.45,width:1.5});for(const side of shadowSides(poly,d.q,1,d.model.roof)){faces.push(side);lines.push(...edges3(side.poly,C.orange,.7));}}
  if(part===2){
   faces.push(...entry.removed.map(f=>({poly:f.poly,color:C.orangeLight,bias:.00035})));
   if(s.cuts){const grouped=new Map();for(const f of entry.removed){if(!grouped.has(f.owner))grouped.set(f.owner,[]);grouped.get(f.owner).push(f.poly);}for(const [owner,polys] of grouped)lines.push(...segLines(receiverCutEdges(polys,d.model.tris[owner]),C.orange,3));}
  }
 }
 const work=!entry?finishSolverWork(emptySolverWork()):part<2?entry.preparedWork:part===2?entry.overlapWork:entry.work;
 return {d,q:d.q,trace,stages,stage,index,part,entry,final,pieces,surfaces,faces,lines,work};
}
function drawTerrainSubtraction(s){
 const scene=terrainSubtractionScene(s),{d,q,trace,stage,index,part,entry,final,surfaces,work}=scene,g=G(s),cam=cameraMain(s,g);stepCount=scene.stages;
 ctx.raw(`<g data-terrain-sequence="true" data-stage="${stage}" data-occluder="${entry?.id??-1}" data-part="${part}" data-removed-count="${entry?.removed.length||0}" data-final="${final}">`);
 drawTerrainMain(cam,scene.faces,scene.lines);observer3(q,cam,q[2]-s.eye,s.labels);registerTerrain(s,d,cam,false);
 drawLinkedTerrainPlan(s,d,scene.faces,scene.lines,{x:g.x+g.w-280,y:640,w:260,h:208},false);ctx.raw('</g>');
 const processed=index<0?0:index+(part===3?1:0),area=surfaces.reduce((a,f)=>a+area3(f.poly),0),overlap=entry?.removed.reduce((a,f)=>a+area3(f.poly),0)||0;
 const titles=['Choose the next terrain facet','Extend its shadow behind the facet','Find the receiving overlap','Retain the unshadowed pieces'];
 const body=stage===0?'Begin with every physical terrain triangle as a visible candidate. Subtract one terrain-facet shadow at a time.':final?'All terrain-facet shadows have been removed. Green fragments and their cut boundaries form the complete physical viewshed.':part===0?'The orange triangle is the next occluder. Its face and observer define the front and side half-spaces of the shadow.':part===1?'Extend the face away from the observer. The front plane excludes terrain between the observer and the facet; side planes bound its angular footprint.':part===2?(entry.changed?'Orange patches are the actual overlap with remaining receiver pieces. Previously removed areas stay gray; this overlap is next to be removed.':'No remaining receiver area intersects this shadow. The facet may touch only a boundary or shadow terrain already removed.'):(entry.changed?'Partition each intersected receiver by the shadow planes. Retain the pieces outside the shadow and use them as the next candidates.':'The candidate pieces are unchanged. Proceed to the next facet.');
 setPanel({title:stage===0?'Begin with every terrain receiver':final?'The complete terrain viewshed':titles[part],steps:['Choose face','Extend shadow','Find overlap','Retain pieces'],active:Math.max(0,part),body:[body],stats:[['Faces processed',`${processed} / ${trace.entries.length}`],['Remaining terrain area',number(area)+' m²'],['Retained receiver pieces',String(surfaces.length)],['Current shadow overlap',part>=2?number(overlap)+' m²':'—'],['Order',s.order==='near'?'3D centroid distance':s.order==='spiral'?'Distance bands + azimuth':s.order]],legend:[[C.tealLight,'Remaining visible candidates'],[C.teal,'Persisting geometric cut edges'],[C.orange,'Current facet and shadow'],[C.orangeLight,'Receiver area to remove'],['#b3bfc0','Removed / occluded terrain']],note:'Main and plan share the same geometry. Counts follow preparation, overlap detection and retained-piece partitioning; projection and drawing are excluded.',progress:{kind:'terrainSequence',work}});
}
