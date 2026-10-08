/* Receiver subtraction in the same triangle order as visibility3. The trace
 * owns query checkpoints; this module only constructs the shared display scene. */
function urbanSubtractionData(q){return memo('urbanSequence'+keyq(q),()=>recordedSubtraction3(q,URBAN3.receivers,URBAN3.objects,{broadPhase:false}));}
function urbanPhysicalSurface(f){const r=URBAN3.receivers[f.owner];return r.kind==='building'||r.kind==='bound'&&r.face===0;}
function urbanStageSurfaces(pieces){return pieces.flatMap(f=>f.polys.map(poly=>({owner:f.owner,kind:f.kind,poly})));}
function urbanSubtractionScene(s){
 const q=s.light,trace=urbanSubtractionData(q),stages=1+4*trace.entries.length,stage=Math.min(stages-1,Math.floor(s.phase*stages)),index=stage?Math.floor((stage-1)/4):-1,part=stage?(stage-1)%4:-1,entry=trace.entries[index],final=stage===stages-1;
 const pieces=!entry?trace.initial:part===3?entry.after:entry.before,surfaces=urbanStageSurfaces(pieces),faces=[],lines=[];
 faces.push(...boxSurface().filter(f=>f.face===0).map(f=>({poly:f.poly,color:'#9faeb5'})));
 for(const b of URBAN3.boxes){const v=boxVertices(b);for(const f of BOX_FACES){const poly=f.map(i=>v[i]);faces.push({poly,color:'#9baeb9'});if(s.wire)lines.push(...edges3(poly,C.wallLine));}}
 faces.push(...surfaces.filter(urbanPhysicalSurface).map(f=>({poly:f.poly,color:C.tealLight,bias:.00015})));
 if(s.cuts&&stage)lines.push(...segLines(urbanReceiverCuts({surfaces}),C.teal,2.5));
 if(entry&&part<3){
  const poly=URBAN3.objects[index].poly;
  faces.push({poly,color:C.orange,bias:.0003});lines.push(...segLines(poly.map((a,i)=>[a,poly[(i+1)%poly.length]]),C.orange,3));
  for(const p of poly)lines.push({a:q,b:p,color:C.orange,alpha:.75,width:1.8,occlude:false,role:'source-ray'});
  if(part>=1&&entry.planes){for(const side of shadowSides(poly,q,1,Math.max(26,q[2]+1))){faces.push(side);lines.push(...edges3(side.poly,C.orange,.65).map(l=>({...l,occlude:false,role:'shadow-extension'})));}}
  if(part===2){for(const f of entry.removed.filter(urbanPhysicalSurface)){faces.push({poly:f.poly,color:C.orangeLight,bias:.00035});}lines.push(...segLines(urbanReceiverCuts({surfaces:entry.removed}),C.orange,3));}
 }
 const work=!entry?finishSolverWork(emptySolverWork()):part<2?entry.preparedWork:part===2?entry.overlapWork:entry.work;
 return {q,trace,stages,stage,index,part,entry,final,pieces,surfaces,faces,lines,work};
}
function drawUrbanSubtraction(s){
 if(!s.construction)return drawShadows({...s,variant:'construct',construction:false});
 const q=s.light,g=G(s),cam=cameraMain(s,g,[50,35,12]);
 if(URBAN3.boxes.some(b=>q[0]>b[0]&&q[0]<b[0]+b[2]&&q[1]>b[1]&&q[1]<b[1]+b[3]&&q[2]<b[4])){setPanel({title:'The source is inside a solid',body:['Move it outside the building or raise its elevation.'],legend:[]});return;}
 const scene=urbanSubtractionScene(s),{trace,stage,index,part,entry,final,surfaces,work}=scene;stepCount=scene.stages;
 ctx.raw(`<g data-shadow-sequence="true" data-stage="${stage}" data-occluder="${index}" data-part="${part}" data-removed-count="${entry?.removed.length||0}" data-final="${final}">`);
 drawShadowView(cam,scene,'main');observer3(q,cam,0,s.labels);register(q,cam,'light');
 if(s.inset){const rect={x:g.x+g.w-290,y:653,w:270,h:196},m=mapFit(rect,[[0,0],[100,0],[100,70],[0,70]]);ctx.fillStyle='#fff';ctx.fillRect(rect.x-8,rect.y-8,rect.w+16,rect.h+16);const top=camera3(rect,0,Math.PI/2,[50,35,12],Math.min(rect.w/100,rect.h/70));drawShadowView(top,scene,'plan');observer2(q,m,false);hitTargets.push({kind:'lightPlan',m,rect,point:m.p(q)});}
 ctx.raw('</g>');
 const processed=index<0?0:index+(part===3?1:0),physical=surfaces.filter(urbanPhysicalSurface),removedArea=entry?entry.removed.filter(urbanPhysicalSurface).reduce((a,f)=>a+area3(f.poly),0):0;
 const titles=['Choose the next triangular face','Extend its shadow beyond the face','Find its overlap with the receivers','Retain the unshadowed pieces'];
 const body=stage===0?'Start with all ground, roof, and wall receivers. Each building face is split into two triangular occluders.':final?'Every occluder has been subtracted. Only the final directly visible surfaces and their cut boundaries remain.':part===0?'The orange triangle is the next building-face occluder. The source and this face define the shadow half-spaces.':part===1?'Extend the face away from the source. The front plane starts the shadow behind the occluder; the side planes enclose its angular footprint.':part===2?(entry.changed?'Orange receiver patches show the actual intersection with this shadow. These patches will be removed from the remaining candidates.':'This shadow removes no remaining receiver area. It may point into empty space, touch only a boundary, or overlap area already removed.'):entry.changed?'Partition the intersected receiver polygons by the shadow planes. Retain the pieces outside the shadow; use them as the next candidates.':'No receiver polygons changed. Continue with the next occluder using the same retained candidates.';
 setPanel({title:stage===0?'Begin with every receiver':final?'The complete visible surfaces':titles[part],steps:['Choose face','Extend shadow','Find overlap','Retain pieces'],active:Math.max(0,part),body:[body],stats:[['Source elevation',number(q[2])+' m'],['Occluders processed',`${processed} / ${trace.entries.length}`],['Retained physical pieces',String(physical.length)],['Remaining physical area',number(physical.reduce((a,f)=>a+area3(f.poly),0))+' m²'],['Current shadow overlap',part>=2?number(removedArea)+' m²':'—']],legend:[[C.purple,'Source / observer'],[C.orange,'Current occluder and shadow'],[C.orangeLight,'Receiver area to remove'],[C.tealLight,'Remaining visible candidates'],['#9baeb9','Removed / occluded surface']],note:'Main and plan use the same receiver pieces, rays, and shadow geometry. Counts are recorded query checkpoints; projection and drawing are excluded.',progress:{kind:'urbanSequence',work}});
}
