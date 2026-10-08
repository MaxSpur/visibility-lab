const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=__dirname+'/../source/';
vm.runInThisContext(['geometry.js','operation-counts.js','shadow-stages.js'].map(f=>fs.readFileSync(source+f,'utf8')).join('\n')+String.raw`
const check=(ok,message)=>{if(!ok)throw Error(message);},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
function verify(q,receivers,occluders,broadPhase,expected){
 const pinned=expected(),reference=measureSolverWork(expected),trace=recordedSubtraction3(q,receivers,occluders,{broadPhase});
 equal(trace.pieces,pinned.pieces,'Pinned retained geometry differs');
 equal(trace.pieces,reference.value.pieces,'Retained geometry differs');equal(trace.work,reference.work,'Typed total differs');
 check(trace.entries.length===occluders.length,'Missing occluder entries');
 let previous=finishSolverWork(emptySolverWork());
 for(const entry of trace.entries){
  for(const next of [entry.preparedWork,entry.overlapWork,entry.work]){for(const k of Object.keys(emptySolverWork()))check(next[k]>=previous[k],'Checkpoint decreased: '+k);previous=next;}
  for(const f of entry.before){const kept=entry.after.find(a=>a.owner===f.owner),gone=entry.removed.filter(a=>a.owner===f.owner);const before=f.polys.reduce((n,p)=>n+area3(p),0),after=kept.polys.reduce((n,p)=>n+area3(p),0)+gone.reduce((n,p)=>n+area3(p.poly),0);check(Math.abs(before-after)<1e-5*Math.max(1,before),'Removed and retained areas do not partition receiver');}
  check(entry.changed===(entry.removed.length>0),'Changed flag differs');
 }
 equal(previous,trace.work,'Last checkpoint differs');return trace;
}
for(const size of [[2,2],[3,2]]){const model=inputTerrain(...size);for(const q of [[20,30,terrainZ(20,30)+4],[65,20,terrainZ(65,20)+8]])for(const order of ['mesh','near','spiral']){const seq=occluderOrder(model.tris,q,order),occluders=seq.map(id=>({id,poly:model.tris[id]}));const t=verify(q,model.tris.map((poly,owner)=>({poly,owner,kind:'terrain'})),occluders,true,()=>referenceSurface3(q,model.tris,seq));equal(t.entries.map(e=>e.id),seq,'Explicit face ids lost');}}
const urban=urbanModel();for(const q of [[18,31,28],[35,15,40]])verify(q,urban.receivers,urban.objects,false,()=>visibility3(q,urban.receivers,urban.objects));
// Coplanar/tangent contact must never create a removed face.
const flat=[[0,0,0],[5,0,0],[0,5,0]],contact=recordedSubtraction3([0,0,5],[{poly:flat,kind:'terrain'}],[flat]);check(contact.entries[0].removed.length===0,'Coplanar contact subtracted');
const nullCone=recordedSubtraction3([1,1,0],[{poly:flat}],[flat]);check(nullCone.entries[0].planes===null&&!nullCone.entries[0].changed,'Null cone changed output');
const none=recordedSubtraction3([0,0,5],[{poly:flat,owner:91,kind:'custom'}],[]);check(none.pieces[0].owner===91&&none.pieces[0].kind==='custom','Receiver identity lost');check(none.work.geometricTests===0,'Empty trace charged work');
const savedBindings=[clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,expand3,referenceSurface3,visibility3,visibility,rasterCube];
let threw=false;try{recordedSubtraction3([0,0,5],[{poly:flat}],[{poly:null}]);}catch(e){threw=true;}check(threw,'Malformed input must throw');
check(savedBindings.every((f,i)=>f===[clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,expand3,referenceSurface3,visibility3,visibility,rasterCube][i]),'Bindings not restored after exception');check(!solverWorkActive,'Accounting lock not restored');
equal(measureSolverWork(()=>shadowPlanes(flat,[0,0,5])).work,measureSolverWork(()=>shadowPlanes(flat,[0,0,5])).work,'Accounting not reusable');
console.log('PASS: staged terrain/urban geometry and typed work match pinned solvers; monotone actual checkpoints; area partition; tangent/null cases; exception restoration.');
`);
