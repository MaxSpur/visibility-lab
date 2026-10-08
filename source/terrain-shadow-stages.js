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
  if(part>=1&&entry.planes){for(const p of poly)lines.push({a:d.q,b:p,color:C.orange,alpha:.75,width:1.9,occlude:false,sourceRay:true});for(const side of shadowSides(poly,d.q,1,d.model.roof)){faces.push(side);lines.push(...edges3(side.poly,C.orange,.7).map(l=>({...l,occlude:false})));}}
  if(part===2){
   faces.push(...entry.removed.map(f=>({poly:f.poly,color:C.orangeLight,bias:.00035})));
   if(s.cuts){const grouped=new Map();for(const f of entry.removed){if(!grouped.has(f.owner))grouped.set(f.owner,[]);grouped.get(f.owner).push(f.poly);}for(const [owner,polys] of grouped)lines.push(...segLines(receiverCutEdges(polys,d.model.tris[owner]),C.orange,3));}
  }
 }
 const work=!entry?finishSolverWork(emptySolverWork()):part<2?entry.preparedWork:part===2?entry.overlapWork:entry.work;
 return {d,q:d.q,trace,stages,stage,index,part,entry,final,pieces,surfaces,faces,lines,work};
}
function terrainSingleShadowData(d,id){return memo('singleReceiverSequence'+d.model.tris.length+keyq(d.q)+id,()=>recordedSingleShadow3(d.q,d.model.tris,id));}
function terrainSingleShadowScene(s,d=terrainState(s)){
 const id=targetFace(s,d,blockingFace),trace=terrainSingleShadowData(d,id),timeline=[{kind:'choose',start:0,end:.05,work:finishSolverWork(emptySolverWork())},{kind:'prepare',start:.05,end:.10,work:trace.preparedWork},{kind:'extend',start:.10,end:.35,work:trace.preparedWork}];
 const receiverSteps=3*trace.entries.length,width=.50/Math.max(1,receiverSteps);let receiverStep=0;
 for(const entry of trace.entries)for(const [kind,work] of [['classify',entry.classifiedWork],['overlap',entry.overlapWork],['retain',entry.work]]){const start=.35+receiverStep*width;receiverStep++;timeline.push({kind,entry,start,end:.35+receiverStep*width,work});}
 timeline.push({kind:'complete',start:.85,end:1,work:trace.work});
 const phaseStops=timeline.map(t=>t.start),stage=Math.max(0,timeline.findLastIndex(t=>s.phase>=t.start)),event=timeline[stage],step={...event,grow:event.kind==='extend'?clamp((s.phase-event.start)/(event.end-event.start),0,1):1},entry=step.entry,finished=step.kind==='complete',processed=finished?trace.entries.length:entry?entry.owner+(step.kind==='retain'?1:0):0;
 const completed=trace.entries.slice(0,processed),retained=completed.flatMap(e=>e.after),removed=completed.flatMap(e=>e.removed),faces=d.model.tris.map(poly=>({poly,color:'#b3bfc0'})),lines=s.wire?groundLines(d.model):[],poly=d.model.tris[id];
 faces.push(...retained.map(f=>({poly:f.poly,color:C.tealLight,bias:.00015})),...removed.map(f=>({poly:f.poly,color:'#879b9c',bias:.00015})));
 if(s.cuts)for(const e of completed)lines.push(...segLines(receiverCutEdges(e.after.map(f=>f.poly),d.model.tris[e.owner]),C.teal,2.5));
 if(!finished){
  faces.push({poly,color:C.orange,bias:.0003});lines.push(...segLines(uniqueEdges([poly]),C.orange,3).map(l=>({...l,occlude:false})));
  for(const p of poly)lines.push({a:d.q,b:p,color:C.orange,width:1.9,alpha:.8,occlude:false,sourceRay:true});
  if(!['choose','prepare'].includes(step.kind)&&trace.planes)for(const side of shadowSides(poly,d.q,step.grow??1,d.model.roof)){faces.push(side);lines.push(...edges3(side.poly,C.orange,.8).map(l=>({...l,occlude:false})));}
  if(entry){faces.push({poly:entry.poly,color:C.purple,alpha:.20,bias:.00025,candidate:true});lines.push(...segLines(uniqueEdges([entry.poly]),C.purple,3).map(l=>({...l,occlude:false,candidate:true,receiver:entry.owner,role:'receiver-candidate'})));if(step.kind==='overlap'&&entry.overlap.length){faces.push({poly:entry.overlap,color:C.orangeLight,bias:.0004});lines.push(...segLines(uniqueEdges([entry.overlap]),C.orange,3).map(l=>({...l,occlude:false})));}}
 }
 return {d,id,trace,timeline,phaseStops,stage,step,processed,retained,removed,faces,lines,finished,work:step.work};
}
function drawTerrainSingleShadow(s){
 const scene=terrainSingleShadowScene(s),{d,id,trace,timeline,stage,step,processed,finished,work}=scene,g=G(s),cam=cameraMain(s,g);stepCount=timeline.length;
 ctx.raw(`<g data-terrain-single-sequence="true" data-stage="${stage}" data-kind="${step.kind}" data-occluder="${id}" data-candidate="${step.entry?.owner??-1}" data-processed="${processed}" data-final="${finished}">`);
 drawTerrainMain(cam,scene.faces,scene.lines);observer3(d.q,cam,d.q[2]-s.eye,s.labels);registerTerrain(s,d,cam,true);drawLinkedTerrainPlan(s,d,scene.faces,scene.lines,{x:g.x+g.w-280,y:640,w:260,h:208},true);ctx.raw('</g>');
 const titles={choose:'Choose one terrain facet',prepare:'Prepare its shadow half-spaces',extend:'Extend its shadow through the terrain',classify:'Test the next receiving triangle',overlap:'Find the actual receiver overlap',retain:'Partition and retain the outside pieces',complete:'Only this facet’s shadow'},entry=step.entry;
 const body={choose:'Click a triangle in the main view or plan to select the occluder. Its selection follows you across terrain tabs.',prepare:'The observer and selected facet define three angular side planes and a front plane. The front plane excludes surfaces nearer than the facet.',extend:'Grow the construction away from the observer. Continuous orange lines connect the observer, selected facet and clipped extrusion. The recorded query cost stays fixed while the display grows.',classify:entry?.possible?'The purple receiver passes the separating-plane tests. Its intersection with the shadow must now be clipped.':'The purple receiver is outside at least one shadow half-space or touches only the front plane. It cannot contain a positive-area shadow overlap.',overlap:entry?.overlap.length?'The orange patch is the receiver’s actual intersection with the selected shadow. It will be removed by the next partition.':'There is no positive-area overlap on this receiver. Tangent contacts and empty clips remove no surface.',retain:entry?.overlap.length?'Partition the receiver along the shadow planes. Green pieces remain outside; the darker patch is blocked by this one selected facet.':'Keep the entire receiver unchanged and continue with the next triangle.',complete:'Every receiving triangle has been tested against this one facet. Green is unaffected terrain; darker patches show only this selected facet’s shadow.'};
 setPanel({title:titles[step.kind],steps:['Choose facet','Extend shadow','Test each receiver','Keep the result'],active:step.kind==='choose'?0:['prepare','extend'].includes(step.kind)?1:finished?3:2,body:[body[step.kind]],stats:[['Occluding triangle',String(id)],['Receivers processed',`${processed} / ${trace.entries.length}`],['Receiver under test',entry?String(entry.owner):'—'],['Shadow area found',number(scene.removed.reduce((a,f)=>a+area3(f.poly),0))+' m²'],['Current overlap',step.kind==='overlap'||step.kind==='retain'?number(area3(entry.overlap))+' m²':'—']],legend:[[C.orange,'Selected facet and continuous source rays'],[C.purple,'Receiving triangle under test'],[C.orangeLight,'Overlap to remove'],[C.tealLight,'Retained receiver area'],['#879b9c','Only the selected facet’s shadow']],note:'Each receiver has genuine classification, overlap and partition checkpoints. Scroll or drag to inspect; click a triangle to select the facet.',progress:{kind:'terrainSingleSequence',work,face:id,receiver:entry?.owner??-1,step:step.kind,phaseStops:scene.phaseStops}});
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
