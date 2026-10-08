/* Receiver-first visibility within a physical camera frustum. Every viewport
 * candidate is tested, including fully hidden faces. Display stages read real
 * solver checkpoints; projection and drawing do not contribute to query work. */
function viewportClip(poly,pc,frame){
 const box=bboxOf(frame,2),near={n:pc.f,d:dot(pc.f,pc.q)+.01};
 return clipByPlanes(clip3(poly,near),cubePlanes(pc,pc.q,box.lo[0],box.hi[0],box.lo[1],box.hi[1]));
}
function projectionReceiverTrace(d,candidate,order){
 return recordedSubtraction3(d.q,[{owner:candidate.id,kind:'terrain',poly:candidate.poly}],order.map(id=>({id,poly:d.model.tris[id]})),{broadPhase:true});
}
function projectionReceiverStages(trace){
 const stages=[],batch=Math.max(1,Math.ceil(trace.entries.length/8));let skipped=[];
 const flush=()=>{if(!skipped.length)return;const entry=skipped.at(-1);stages.push({kind:'reject',entry,first:skipped[0].index,count:skipped.length,pieces:entry.after,work:entry.work});skipped=[];};
 for(const entry of trace.entries){
  if(!entry.changed){skipped.push(entry);if(skipped.length>=batch)flush();continue;}
  flush();
  stages.push({kind:'prepare',entry,pieces:entry.before,work:entry.preparedWork},
   {kind:'extend',entry,pieces:entry.before,work:entry.preparedWork},
   {kind:'overlap',entry,pieces:entry.before,work:entry.overlapWork},
   {kind:'retain',entry,pieces:entry.after,work:entry.work});
 }
 flush();return stages;
}
function projectionWorkflow(s,d=terrainState(s),rect={w:500,h:405}){
 const accumulated=s.variant==='accumulate',id=accumulated?-1:targetFace(s,d),target=id<0?null:d.model.tris[id],pc=accumulated||!s.viewFocus?projector(d.q):focusProjector(d.q,target),frame=projectionFrame(target||[],pc,!accumulated&&s.viewFocus,rect);
 const key='viewportSequence:'+d.model.tris.length+':'+keyq(d.q)+':'+s.order+':'+id+':'+keyq(frame.flat())+':'+keyq(pc.f);
 return memo(key,()=>{
  const input=accumulated?d.model.tris.map((poly,id)=>({id,poly})):[{id,poly:target}],filter=measureSolverWork(()=>input.map(f=>({...f,whole:f.poly,poly:viewportClip(f.poly,pc,frame)}))),candidates=filter.value.filter(f=>f.poly.length>=3);
  candidates.sort((a,b)=>norm(sub(centroid(a.poly),d.q))-norm(sub(centroid(b.poly),d.q))||a.id-b.id);
  const order=occluderOrder(d.model.tris,d.q,s.order),receivers=candidates.map(f=>({...f,trace:projectionReceiverTrace(d,f,order)})),timeline=[],zero=finishSolverWork(emptySolverWork());
  let work=filter.work,accepted=[];
  if(accumulated){timeline.push({kind:'begin',work:zero,accepted:[],processed:0});timeline.push({kind:'candidates',work,accepted:[],processed:0});}
  if(!accumulated&&!receivers.length){timeline.push({kind:'target',candidate:filter.value[0],work:zero,accepted:[],processed:0});timeline.push({kind:'viewport',candidate:filter.value[0],work,accepted:[],processed:0,pieces:[]});timeline.push({kind:'accept',candidate:filter.value[0],work,accepted:[],processed:0,pieces:[]});}
  for(let index=0;index<receivers.length;index++){
   const candidate=receivers[index],trace=candidate.trace;
   timeline.push({kind:'target',candidate,pieces:trace.initial,work:accumulated?work:zero,accepted,processed:index});
   timeline.push({kind:'viewport',candidate,pieces:trace.initial,work,accepted,processed:index});
   for(const step of projectionReceiverStages(trace))timeline.push({...step,candidate,work:sumSolverWork(work,step.work),accepted,processed:index});
   work=sumSolverWork(work,trace.work);
   accepted=[...accepted,...trace.surfaces];
   timeline.push({kind:'accept',candidate,pieces:trace.pieces,work,accepted,processed:index+1});
  }
  if(accumulated)timeline.push({kind:'complete',work,accepted,processed:receivers.length});
  return {pc,frame,receivers,timeline,work,filterWork:filter.work,surfaces:accepted,inputCount:input.length,order};
 });
}
function projectionSurfaces(pieces=[]){return pieces.flatMap(f=>f.polys.map(poly=>({owner:f.owner,kind:'terrain',poly})));}
function projectionCutLines(s,surfaces,d,color=C.teal,width=3){
 if(!s.cuts)return [];const groups=new Map();
 for(const f of surfaces){if(!groups.has(f.owner))groups.set(f.owner,[]);groups.get(f.owner).push(f.poly);}
 return [...groups].flatMap(([id,polys])=>segLines(receiverCutEdges(polys,d.model.tris[id]),color,width));
}
function projectionViewportPoint(pc,uv){return add(pc.q,add(mul(pc.f,12),add(mul(pc.r,uv[0]*12),mul(pc.u,uv[1]*12))));}
function projectionScene(s,d,workflow){
 const stage=Math.min(workflow.timeline.length-1,Math.floor(s.phase*workflow.timeline.length)),step=workflow.timeline[stage],{candidate,entry}=step,clean=['accept','complete'].includes(step.kind),faces=terrainFaces(d.model),lines=s.wire?groundLines(d.model):[],current=projectionSurfaces(step.pieces),green=clean?step.accepted:[...step.accepted,...(['retain','reject'].includes(step.kind)?current:[])],overlap=step.kind==='overlap'?entry.removed:[];
 faces.push(...surfaceFaces(green,C.green));lines.push(...projectionCutLines(s,green,d));
 const viewport=workflow.frame.map(p=>projectionViewportPoint(workflow.pc,p)),screenFaces=[];
 if(!clean&&candidate){
  faces.push({poly:candidate.whole,color:C.orange,alpha:.64,bias:.00015});lines.push(...segLines(uniqueEdges([candidate.whole]),C.orange,2.5));
  if(step.kind!=='target')for(const p of candidate.poly)lines.push({a:d.q,b:p,color:C.orange,alpha:.6,width:1.7});
  if(['viewport','prepare','extend','overlap','retain','reject'].includes(step.kind))screenFaces.push({poly:candidate.poly,color:C.orange,alpha:.15});
  if(['prepare','extend','overlap','retain'].includes(step.kind)&&entry){
   const blocker=d.model.tris[entry.id];faces.push({poly:blocker,color:C.purple,alpha:.35,bias:.0003});lines.push(...segLines(uniqueEdges([blocker]),C.purple,3));
   if(['extend','overlap'].includes(step.kind))for(const side of shadowSides(blocker,d.q,1,d.model.roof,C.purple)){faces.push(side);lines.push(...edges3(side.poly,C.purple,.5));}
   const boundary=receiverCutEdges(entry.after[0]?.polys||[],candidate.poly);
   if(['overlap','retain'].includes(step.kind))for(const edge of boundary){lines.push(...segLines([edge],C.teal,4));for(const p of edge){const h=planeOf(blocker),dir=sub(p,d.q),den=dot(h.n,dir),t=(h.d-dot(h.n,d.q))/den;if(Number.isFinite(t)&&t>0&&t<1+1e-5){const near=add(d.q,mul(dir,Math.min(t,1)));lines.push({a:d.q,b:near,color:C.purple,width:2.7},{a:near,b:p,color:C.teal,width:3});}}}
  }
  faces.push(...overlap.map(f=>({poly:f.poly,color:C.orangeLight,bias:.0004})));lines.push(...projectionCutLines(s,overlap,d,C.purple,3.5));
 }
 screenFaces.push(...green.map(f=>({poly:f.poly,color:C.green,alpha:.6})));
 faces.push({poly:viewport,color:'#edf2f5',alpha:.18,shade:false});
 for(const f of screenFaces){const poly=projectPolygon(f.poly,workflow.pc,workflow.frame).map(p=>projectionViewportPoint(workflow.pc,p));if(poly.length<3)continue;faces.push({...f,poly,shade:false});lines.push(...segLines(uniqueEdges([poly]),f.color===C.orange?C.orange:C.teal,1.5,.65));}
 const currentPolys=current.map(f=>f.poly),cuts=candidate?receiverCutEdges(currentPolys,candidate.whole):[],allVertices=candidate?constructionVertices([[candidate.whole,C.orange],[currentPolys.flat(),C.teal],[overlap.flatMap(f=>f.poly),C.purple]]):[],vertices=clean?allVertices.filter(v=>currentPolys.flat().some(p=>norm(sub(p,v.p))<1e-6)).map(v=>({...v,color:C.teal})):allVertices;
 return {stage,step,clean,faces,lines,green,current,overlap,viewport,vertices,cuts};
}
function drawProjectionObserver(s,d,workflow,scene,rect){
 const {step,clean,current,vertices,overlap}=scene,{pc,frame}=workflow,m=mapFit(rect,frame);
 insetBox(rect,s.variant==='accumulate'?'Observer view · forward +X':'Observer view · target detail');hitTargets.push({kind:'terrainDetail',inset:true,rect,point:[-1e6,-1e6]});
 ctx.raw(`<g data-terrain-view="detail" data-step="${scene.stage}" data-face="${step.candidate?.id??-1}" data-clean="${clean}">`);poly2(frame.map(m.p),'#f2f6f8',C.wallLine,2);insetClip(rect,'projection-detail-clip');
 const background=terrainFaces(d.model).sort((a,b)=>dot(sub(centroid(b.poly),d.q),pc.f)-dot(sub(centroid(a.poly),d.q),pc.f));projectedContext(d,pc,frame,m,background);
 for(const f of scene.green)poly2(projectPolygon(f.poly,pc,frame).map(m.p),C.tealLight,C.teal,2);
 if(!clean&&step.candidate){
  const candidate=step.candidate,raw=projectPolygon(candidate.whole,pc,frame);ctx.raw('<g data-current-face-overlay="true">');poly2(raw.map(m.p),step.kind==='target'?rgba(C.orange,.26):null,C.orange,3,step.kind==='target'?[]:[7,5]);ctx.raw('</g>');
  if(['prepare','extend','overlap','retain'].includes(step.kind)&&step.entry)poly2(projectPolygon(d.model.tris[step.entry.id],pc,frame).map(m.p),rgba(C.purple,.18),C.purple,2);
  if(step.kind!=='target')for(const f of current)poly2(projectPolygon(f.poly,pc,frame).map(m.p),rgba(C.teal,.28),C.teal,2);
  for(const f of overlap)poly2(projectPolygon(f.poly,pc,frame).map(m.p),rgba(C.orange,.42),C.purple,3);
 }
 // The current physical face is an inspection overlay above neutral context.
 // Acceptance removes its original outline, shadow copy and blocker geometry.
 drawConstructionLabels(s,vertices,p=>dot(sub(p,d.q),pc.f)>.01?m.p(pc.point(p)):null,'observer');ctx.raw('</g></g>');
}
function drawProjection(s){
 figureLabelBoxes=[];
 const d=terrainState(s),g=G(s),left={x:g.x,y:65,w:g.w*.57,h:765},right={x:g.x+g.w*.59,y:243,w:g.w*.40,h:405},workflow=projectionWorkflow(s,d,right),scene=projectionScene(s,d,workflow),{step,clean}=scene,cam=cameraMain(s,left,[50,35,12]),candidate=step.candidate,entry=step.entry;
 stepCount=workflow.timeline.length;
 ctx.raw(`<g data-projection-sequence="true" data-stage="${scene.stage}" data-kind="${step.kind}" data-target="${candidate?.id??-1}" data-occluder="${entry?.id??-1}" data-clean="${clean}" data-accepted="${step.processed}">`);
 drawTerrainMain(cam,scene.faces,scene.lines);ctx.raw('<g data-projection-viewport="true">');ink3(scene.viewport,cam,C.ink,2);ctx.raw('</g>');if(s.labels)pointLabel('Viewport',cam.p(scene.viewport[3]),C.ink,4,-6);
 if(!clean&&candidate)ink3(candidate.whole,cam,C.orange,2.5);if(['retain','reject','accept'].includes(step.kind))scene.current.forEach(f=>ink3(f.poly,cam,C.teal,3));drawConstructionLabels(s,scene.vertices,cam.p,'main');observer3(d.q,cam,d.q[2]-s.eye,s.labels);registerTerrain(s,d,cam,s.variant==='project');
 drawProjectionObserver(s,d,workflow,scene,right);ctx.raw('</g>');
 const titles={begin:'Begin with the observer viewport',candidates:'Find every viewport candidate',target:'Select the next receiving triangle',viewport:'Clip the face to the viewport',reject:'Reject shadows that miss this face',prepare:'Choose a shadow that reaches it',extend:'Extend the occluder’s shadow',overlap:'Find the shadow’s actual overlap',retain:'Subtract the overlap and keep the rest',accept:'Add only the surviving green face',complete:'The completed geometric observer view'},area=scene.current.reduce((n,f)=>n+area3(f.poly),0),acceptedArea=step.accepted.reduce((n,f)=>n+area3(f.poly),0),processed=entry?entry.index+(['reject','retain'].includes(step.kind)?1:0):step.kind==='accept'&&candidate?.trace?workflow.order.length:0;
 const body={begin:'The camera is at q and looks along +X. Its near plane and four side planes define the receiving domain.',candidates:`Clip all ${workflow.inputCount} terrain triangles to that domain. ${workflow.receivers.length} intersect the viewport; hidden faces are kept as candidates until their shadows are tested.`,target:'Orange is the original physical triangle. Clip it to the viewport, then test any surviving pieces against every terrain occluder, including blockers outside the viewport.',viewport:'Intersect the physical face with the near plane and the four angular side planes. The framed copy shows its perspective footprint.',reject:`This group of ${step.count||0} occluders removes no remaining area. A separating half-plane, the depth plane, or an empty overlap rejects each shadow. The counters include every test in the group.`,prepare:'Purple is a blocker whose shadow intersects the remaining receiver. Its three side planes bound the angular cone; its base plane starts the shadow behind the blocker.',extend:'Extend that face away from q. A projected overlap alone is insufficient: the receiving surface must also lie behind the occluder.',overlap:'The orange patch is the actual intersection of the receiver and shadow. Purple directions reach the blocker; teal continuations reach the cut on the receiver.',retain:'Split the affected polygon at the shadow planes. Remove the overlap and carry the outside pieces forward to the next blocker.',accept:area>E3?'Discard the orange target and purple construction. Only these surviving green physical fragments are added to the observer view.':'The target is fully hidden or outside the viewport. Discard its construction; it contributes no surface to the observer view.',complete:'Every viewport candidate has been tested against the terrain. The green fragments are the accumulated visible physical surface within this camera’s field.'};
 const active=['begin','candidates','target'].includes(step.kind)?0:step.kind==='viewport'?1:step.kind==='accept'||step.kind==='complete'?3:2;
 const stats=s.variant==='accumulate'?[['Receivers processed / candidates',`${step.processed} / ${workflow.receivers.length}`],['Current target triangle',candidate?String(candidate.id):'—'],['Occluders tested for this target',candidate?`${processed} / ${workflow.order.length}`:'—'],['Accepted physical surface',number(acceptedArea)+' m²']]:[['Target triangle',String(candidate?.id??-1)],['Original sloping triangle',number(candidate?area3(candidate.whole):0)+' m²'],['Remaining target surface',step.kind==='target'?'—':number(area)+' m²'],['Occluders tested',`${processed} / ${workflow.order.length}`]];
 setPanel({title:titles[step.kind],steps:['Choose receiver','Clip to viewport','Subtract blocker shadows','Accept green fragments'],active,body:[body[step.kind]],stats,legend:[[C.orange,'Original target / overlap to remove'],[C.purple,'Current blocker and limiting directions'],[C.teal,'Retained geometric boundary'],[C.tealLight,s.variant==='accumulate'?'Accepted viewport surface':'Surviving target surface']],note:s.variant==='accumulate'?'Targets run near → far. Blocker order is selectable; scroll or drag the outside view without changing the observer camera.':'Click a terrain face to select it. The observer inset and outside viewport use the same perspective projection.',progress:{kind:'projectionSequence',work:step.work,face:candidate?.id??-1,stage:scene.stage,step:step.kind,processed}});
}
