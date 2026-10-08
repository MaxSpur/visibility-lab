const fs=require('fs'),vm=require('vm');
global.document={getElementById:()=>({innerHTML:''})};
const source=__dirname+'/../source/';
vm.runInThisContext(['geometry.js','operation-counts.js','shadow-stages.js','receiver-boundaries.js','svg-world.js','svg-context.js','scenes.js','terrain-views.js','projection-views.js'].map(f=>fs.readFileSync(source+f,'utf8')).join('\n')+String.raw`
const check=(ok,message)=>{if(!ok)throw Error(message);},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
function independentFrustumClip(poly,pc,frame){
 const box=bboxOf(frame,2),planes=[{n:pc.f,d:dot(pc.f,pc.q)+.01}];
 for(const n of [sub(pc.r,mul(pc.f,box.lo[0])),sub(mul(pc.f,box.hi[0]),pc.r),sub(pc.u,mul(pc.f,box.lo[1])),sub(mul(pc.f,box.hi[1]),pc.u)])planes.push({n,d:dot(n,pc.q)});
 return clipByPlanes(poly,planes);
}
function containsXY(polys,p){return polys.some(poly=>{if(poly.length<3)return false;const signs=poly.map((a,i)=>cross(sub(poly[(i+1)%poly.length].slice(0,2),a.slice(0,2)),sub(p.slice(0,2),a.slice(0,2))));return signs.every(x=>x>=-1e-7)||signs.every(x=>x<=1e-7);});}
function validate(s,d){
 const workflow=projectionWorkflow(s,d),ref=referenceSurface3(d.q,d.model.tris,workflow.order),target=s.variant==='accumulate'?null:targetFace(s,d);
 const expected=ref.surfaces.filter(f=>target===null||f.owner===target).map(f=>({...f,poly:independentFrustumClip(f.poly,workflow.pc,workflow.frame)})).filter(f=>f.poly.length>=3),expectedArea=expected.reduce((a,f)=>a+area3(f.poly),0),area=workflow.surfaces.reduce((a,f)=>a+area3(f.poly),0);
 check(Math.abs(area-expectedArea)<1e-5*Math.max(1,expectedArea),'Physical viewport area differs: '+s.density+'/'+s.variant);
 // Pointwise comparison on every original receiving face, independent of the
 // different polygon partition/order produced by clip-before versus clip-after.
 for(let id=0;id<d.model.tris.length;id++){
  const tri=d.model.tris[id],actual=workflow.surfaces.filter(f=>f.owner===id).map(f=>f.poly),reference=expected.filter(f=>f.owner===id).map(f=>f.poly);
  for(let i=1;i<6;i++)for(let j=1;j<7-i;j++){const a=i/7,b=j/7,p=add(mul(tri[0],a),add(mul(tri[1],b),mul(tri[2],1-a-b)));check(containsXY(actual,p)===containsXY(reference,p),'Pointwise visibility differs on '+id);}
 }
 const input=s.variant==='accumulate'?d.model.tris.map((poly,id)=>({poly,id})):[{poly:d.model.tris[target],id:target}],candidateIds=input.filter(f=>independentFrustumClip(f.poly,workflow.pc,workflow.frame).length>=3).map(f=>f.id).sort((a,b)=>a-b);
 equal(workflow.receivers.map(f=>f.id).sort((a,b)=>a-b),candidateIds,'Candidate enumeration skipped a hidden face');
 for(const receiver of workflow.receivers){let previous=finishSolverWork(emptySolverWork());for(const entry of receiver.trace.entries){
  const prepared=measureSolverWork(()=>shadowPlanes(d.model.tris[entry.id],d.q)).work;equal(subtractSolverWork(entry.preparedWork,previous),prepared,'Preparation checkpoint does not measure the actual plane predicates');
  const overlap=measureSolverWork(()=>{const planes=entry.planes;if(!planes)return;for(const f of entry.before)for(const poly of f.polys){if(poly.length<3)continue;if(planes.some(h=>Math.max(...poly.map(p=>val3(h,p)))<=E3))continue;if(Math.max(...poly.map(p=>val3(planes[0],p)))<=E3)continue;if(planes.some(h=>Math.max(...poly.map(p=>val3(h,p)))<=E3))continue;clipByPlanes(poly,planes);}}).work;
  equal(subtractSolverWork(entry.overlapWork,entry.preparedWork),overlap,'Overlap checkpoint does not measure the actual classification and clipping');
  if(entry.changed){check(entry.overlapWork.polygonClips>entry.preparedWork.polygonClips,'Changed receiver has no real overlap clip');check(entry.work.polygonClips>entry.overlapWork.polygonClips,'Retained partition has no real clipping');}else equal(entry.work,entry.overlapWork,'Unchanged receiver charged partition clips');
  previous=entry.work;
 }}
 let previous=finishSolverWork(emptySolverWork()),overlaps=0;
 for(const step of workflow.timeline){for(const key of Object.keys(emptySolverWork()))check(step.work[key]>=previous[key],'Timeline counter decreased: '+key);previous=step.work;if(step.entry){const field=['prepare','extend'].includes(step.kind)?'preparedWork':step.kind==='overlap'?'overlapWork':'work';if(step.kind==='overlap'){overlaps++;check(step.entry.removed.length>0,'Overlap stage has no real overlap');}const receiverBase=subtractSolverWork(step.work,step.entry[field]);check(receiverBase.geometricTests>=workflow.filterWork.geometricTests,'Checkpoint omits viewport preparation');}}
 equal(previous,workflow.work,'Final timeline work differs');
 const allWork=sumSolverWork(workflow.filterWork,...workflow.receivers.map(c=>c.trace.work));equal(allWork,workflow.work,'Query checkpoints do not sum to actual work');
 // Rewind is a read of immutable recorded stages, not another charged solve.
 for(const phase of [1,.31,0,.76,1]){const one=projectionScene({...s,phase},d,workflow),again=projectionScene({...s,phase},d,workflow);equal(one.step.work,again.step.work,'Rewind changed counts');equal(one.green,again.green,'Rewind changed accepted geometry');}
 const final=projectionScene({...s,phase:1},d,workflow);check(final.clean,'Final state is not clean');check(!final.faces.some(f=>[C.orange,C.orangeLight,C.purple].includes(f.color))&&!final.lines.some(f=>[C.orange,C.orangeLight,C.purple].includes(f.color)),'Final state retains construction');
 return {workflow,ref,overlaps};
}
const defaults={...DEFAULT,scene:'projection',variant:'project',density:'regular'},d=terrainState(defaults),ref=referenceSurface3(d.q,d.model.tris),fractions=ref.pieces.map((f,id)=>({id,fraction:f.polys.reduce((a,p)=>a+area3(p),0)/area3(d.model.tris[id])}));
const cases=[{name:'defaultpartial',id:chooseProjection(d)},{name:'hidden',id:fractions.find(f=>f.fraction<1e-8)?.id},{name:'fullyvisible',id:fractions.find(f=>f.fraction>1-1e-8)?.id}];
for(const sample of cases){check(sample.id!==undefined,'Fixture misses '+sample.name);const result=validate({...defaults,face:sample.id},d);check(result.workflow.receivers.length===1,'Focused receiver omitted '+sample.name);if(sample.name==='defaultpartial')check(result.overlaps>0,'Partial face did not exercise overlap stages');if(sample.name==='hidden')check(result.workflow.surfaces.length===0,'Hidden face contributes a surface');}
let hiddenCandidates=0;
for(const density of ['coarse','regular','fine'])for(const qxy of [[9,35],[30,24]]){
 const s={...DEFAULT,scene:'projection',variant:'accumulate',density,qxy},d=terrainState(s),result=validate(s,d);
 for(const c of result.workflow.receivers)if(result.ref.pieces[c.id].polys.length===0){hiddenCandidates++;check(result.workflow.timeline.some(step=>step.kind==='target'&&step.candidate.id===c.id),'Hidden candidate lacks a target stage');}
}
check(hiddenCandidates>0,'Accumulation fixtures never tested hidden candidates');
const render={...defaults,face:cases[0].id,phase:1};ctx.reset();hitTargets=[];drawProjection(render);const svg=ctx.parts.join('');check(svg.includes('data-projection-sequence="true"')&&svg.includes('data-kind="accept"')&&svg.includes('data-clean="true"'),'Final selected metadata missing');check(svg.includes('data-projection-viewport="true"'),'Physical viewport frame missing');check(panelData.progress.kind==='projectionSequence','Readout scope missing');
console.log('PASS: focused partial/hidden/visible targets; coarse/regular/fine and observer variants; independent physical viewport area and pointwise visibility; hidden candidate enumeration; real monotone checkpoints; stable rewind; clean final vector scene.');
`);
