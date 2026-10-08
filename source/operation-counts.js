/* Executed visibility workload, not CPU instructions or equally priced units.
 * Call only around synchronous solvers, after geometry/index preparation.
 * Returned solver timings include instrumentation; never use them as a benchmark.
 * Rendering, error comparison, polygon area sums and model preparation are out
 * of scope. A clip pass is reported separately from its vertex predicates.
 * Function bindings are restored even when the solver throws. */
function emptySolverWork(){return {pointBoxTests:0,rayBoxTests:0,sideTests:0,halfPlaneTests:0,rayPrimitiveTests:0,rasterCoverageTests:0,rasterDepthTests:0,polygonClips:0,segmentClips:0};}
function finishSolverWork(work){return {...work,geometricTests:work.pointBoxTests+work.rayBoxTests+work.sideTests+work.halfPlaneTests+work.rayPrimitiveTests+work.rasterCoverageTests+work.rasterDepthTests};}
let solverWorkActive=false;
function measureSolverWork(run){
 if(solverWorkActive)throw Error('Solver workload measurement cannot be nested.');
 const work=emptySolverWork(),saved={clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,expand3,referenceSurface3,visibility3,visibility,rasterCube};let insideClipPredicate=0,trace=null;const checkpoint=()=>finishSolverWork(work);
 solverWorkActive=true;
 try{
  clip=function(poly,f,positive=true){work.polygonClips++;return saved.clip(poly,p=>{work.halfPlaneTests++;insideClipPredicate++;try{return f(p);}finally{insideClipPredicate--; }},positive);};
  val3=function(h,p){if(!insideClipPredicate)work.halfPlaneTests++;return saved.val3(h,p);};
  rayHit=function(...args){work.rayPrimitiveTests++;return saved.rayHit(...args);};
  rayTri3=function(...args){work.rayPrimitiveTests++;return saved.rayTri3(...args);};
  intersectFast=function(...args){work.rayPrimitiveTests++;return saved.intersectFast(...args);};
  rayBox=function(...args){work.rayBoxTests++;return saved.rayBox(...args);};
  locate2=function(...args){const result=saved.locate2(...args);work.pointBoxTests+=result.ops.boxes;work.sideTests+=3*result.ops.triangles;return result;};
  // Same arithmetic/branch order as the pinned routine. Instrument at the
  // executed endpoints, including early rejection; do not estimate 2*planes.
  clipSegment2=function(edge,planes){work.segmentClips++;let [a,b]=edge;for(const h of planes){work.halfPlaneTests+=2;const fa=dot(h.n,a)-h.d,fb=dot(h.n,b)-h.d;if(fa<-1e-9&&fb<-1e-9)return null;if(fa<0&&fb>=0)a=lerp(a,b,fa/(fa-fb));else if(fb<0&&fa>=0)b=lerp(a,b,fa/(fa-fb));}return norm(sub(a,b))>1e-8?[a,b]:null;};
  const runTrace=(fn,args)=>{const t={before:null,visits:[],snapshots:[]},value=fn(...args,(kind,index)=>{if(kind==='before')t.before=checkpoint();else t[kind][index]=checkpoint();},()=>work.sideTests++);trace=t;return value;};
  expandVector2=(q,scene,method='index')=>runTrace(countedExpansion2,[q,scene,method]);
  expand3=(...args)=>runTrace(countedExpansion3,args);
  referenceSurface3=(q,tris,order=null,history=false)=>runTrace(countedSurface3,[q,tris,order,history]);
  visibility=(q,scene)=>runTrace(countedEvent2,[q,scene]);
  visibility3=(q,receivers,occluders,history=false)=>runTrace(countedVisibility3,[q,receivers,occluders,history]);
  rasterCube=function(...args){const result=saved.rasterCube(...args);work.rasterCoverageTests+=3*result.stats.pixelCandidates;work.rasterDepthTests+=result.stats.fragments;return result;};
  const value=run(checkpoint);if(value&&typeof value.then==='function')throw Error('Solver workload measurement requires a synchronous callback.');const total=finishSolverWork(work);if(trace?.visits.length)trace.visits[trace.visits.length-1]=total;return {value,work:total,trace};
 }finally{
  ({clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,expand3,referenceSurface3,visibility3,visibility,rasterCube}=saved);solverWorkActive=false;
 }
}
// Wall footprints are re-created by this teaching solver on every call, though
// independent of q. Separate their measured cost instead of hiding that work.
function wallSolverWork(result,index=result.stats.length-1){const stats=result.stats[index],work=emptySolverWork();work.halfPlaneTests=stats.vertexTests+(stats.supportTests||0);work.polygonClips=stats.halfPlaneClips;return finishSolverWork(work);}
function wallPreparationWork(result){const work=emptySolverWork();work.halfPlaneTests=result.preprocessing.vertexTests;work.polygonClips=result.preprocessing.halfPlaneClips;return finishSolverWork(work);}
function solverWorkBreakdown(work){const groups=[['Point–box',work.pointBoxTests],['Ray–box',work.rayBoxTests],['Signed side',work.sideTests],['Half-plane',work.halfPlaneTests],['Ray–primitive',work.rayPrimitiveTests],['Pixel coverage',work.rasterCoverageTests],['Depth',work.rasterDepthTests]];return groups.filter(([,n])=>n).map(([label,n])=>`${label}: ${n.toLocaleString('en-US')}`).join(' · ')||'No geometric tests';}

function sumSolverWork(...entries){const work=emptySolverWork();for(const entry of entries)for(const key of Object.keys(work))work[key]+=entry?.[key]||0;return finishSolverWork(work);}
function pointLocationWork(trace){const work=emptySolverWork();for(const test of trace){if(test.kind==='box')work.pointBoxTests++;else if(test.kind==='triangle')work.sideTests+=test.signs.length;}return finishSolverWork(work);}
function attachSolverWork(run,kind='solver'){if(kind==='wall'){const value=run();value.work=wallSolverWork(value);value.preparation=wallPreparationWork(value);value.workBySnapshot=value.stats.map((_,i)=>wallSolverWork(value,i));return value;}const {value,work,trace}=measureSolverWork(run);const result={...value,work};if(trace){result.workBeforeVisits=trace.before||finishSolverWork(emptySolverWork());result.workByVisit=trace.visits;result.workPerVisit=trace.visits.map((v,i)=>subtractSolverWork(v,i?trace.visits[i-1]:result.workBeforeVisits));if(trace.snapshots.length)result.workBySnapshot=trace.snapshots;}return result;}

function subtractSolverWork(a,b){const w=emptySolverWork();for(const k of Object.keys(w))w[k]=(a?.[k]||0)-(b?.[k]||0);return finishSolverWork(w);}

/* Checkpointed copies retain the pinned predicate arithmetic and receiver loop order.
 * Independent shadow planes are prepared at their own occluder checkpoint. The callbacks
 * sample executed predicate counters; interpolation is never used. */
function countedExpansion2(q,scene,method='index',record,side){const start=NOW(),mesh=scene.mesh,loc=locate2(q,mesh,method),visits=[],queue=[],ops={...loc.ops,portals:0,clips:0};
 if(loc.root<0)return {root:-1,visits:[],pieces:[],area:0,loc,ops,ms:NOW()-start};
 record('before',0);
 const rootSet=new Set(loc.roots);for(const tri of loc.roots)queue.push({tri,from:-1,parent:-1,portal:null,opening:null,planes:[],depth:0});
 for(let k=0;k<queue.length;k++){if(k>20000)throw Error('2D beam safety limit exceeded.');const s=queue[k],t=mesh.tris[s.tri],poly=s.planes.length?clipPlanes2(t,s.planes):t;ops.clips+=s.planes.length;if(poly.length<3||area(poly)<1e-8)continue;const index=visits.length,v={...s,index,poly};visits.push(v);
  for(let j=0;j<3;j++){const next=mesh.adj[s.tri][j];if(next<0||next===s.from||rootSet.has(next))continue;const portal=[t[j],t[(j+1)%3]];/* Exit faces have q on the interior side. */side();if(cross(sub(portal[1],portal[0]),sub(q,portal[0]))<=1e-8)continue;ops.portals++;const opening=clipSegment2(portal,s.planes);if(!opening)continue;queue.push({tri:next,from:s.tri,parent:index,portal,opening,incoming:s.planes,planes:cone2(q,opening),depth:s.depth+1});}
 record('visits',index);}
 return {root:loc.root,roots:loc.roots,loc,visits,pieces:visits.map(v=>v.poly),area:visits.reduce((a,v)=>a+area(v.poly),0),ops,ms:NOW()-start};}
function countedExpansion3(q,model,record){const roots=[];model.cells.forEach((c,i)=>{if(c.faces.every(f=>val3(f.h,q)<=E3))roots.push(i);});if(!roots.length)throw Error('Observer must be inside the bounded air volume.');const root=roots[0];
 // A source on an artificial shared face needs every incident air cell seeded.
 record('before',0);
 const queue=roots.map(cell=>({cell,entry:-1,beam:[],aperture:null,parent:-1,depth:0})),visits=[],surfaces=[];
 for(let k=0;k<queue.length;k++){if(k>80000)throw Error('Beam expansion safety limit reached; reduce mesh detail.');const item=queue[k],cell=model.cells[item.cell];item.index=k;item.outputs=[];visits.push(item);
 for(let j=0;j<4;j++){const face=cell.faces[j];if(j===item.entry||val3(face.h,q)>=-E3)continue;
 const p=clipByPlanes(face.poly,item.beam);if(p.length<3||omega3(p,q)<1e-11)continue;
 const edge={poly:p,whole:face.poly,kind:face.kind,boundary:face.boundary,from:item.cell};item.outputs.push(edge);
 if(face.next<0)surfaces.push({...edge,visit:k});else queue.push({cell:face.next,entry:face.other,beam:conePlanes(p,q),aperture:p,whole:face.poly,parent:k,depth:item.depth+1});}
 record('visits',k);}
 const volume=surfaces.reduce((s,f)=>s+fragmentVolume(f.poly,q),0),surfaceArea=surfaces.filter(f=>f.kind==='terrain').reduce((s,f)=>s+area3(f.poly),0),planArea=surfaces.filter(f=>f.kind==='terrain').reduce((s,f)=>s+area(f.poly.map(p=>p.slice(0,2))),0);
 return {q,root,roots,visits,surfaces,volume,surfaceArea,planArea,omega:surfaces.reduce((s,f)=>s+omega3(f.poly,q),0)};
}
function countedSurface3(q,tris,order=null,history=false,record){const start=NOW(),seq=order||tris.map((_,i)=>i),planes=seq,stats={pairs:0,broadRejects:0,planeEvaluations:0,clips:0,peakFragments:tris.length};let pieces=tris.map((poly,owner)=>({owner,kind:'terrain',polys:[poly]}));const snapshots=history?[pieces]:[];
 record('snapshots',0);let checkpointIndex=0;for(const id of planes){const h=shadowPlanes(tris[id],q);if(!h){if(history)snapshots.push(pieces);record('snapshots',++checkpointIndex);continue;}pieces=pieces.map(f=>({...f,polys:f.polys.flatMap(poly=>{stats.pairs++;if(h.some(pl=>{stats.planeEvaluations+=poly.length;return Math.max(...poly.map(p=>val3(pl,p)))<=E3;})){stats.broadRejects++;return [poly];}stats.clips++;return subtractShadow(poly,h);})}));stats.peakFragments=Math.max(stats.peakFragments,pieces.reduce((n,f)=>n+f.polys.length,0));if(history)snapshots.push(pieces);record('snapshots',++checkpointIndex);}
 const surfaces=pieces.flatMap(f=>f.polys.map(poly=>({owner:f.owner,kind:'terrain',poly})));return {q,pieces,surfaces,area:surfaces.reduce((a,f)=>a+area3(f.poly),0),stats,ms:NOW()-start,snapshots,order:seq};}
function countedVisibility3(q,receivers,occluders,history=false,record){let pieces=receivers.map((f,i)=>({owner:i,kind:f.kind,polys:[f.poly]}));const snapshots=history?[pieces]:[],planes=occluders;
 record('snapshots',0);for(let j=0;j<planes.length;j++){const f=planes[j],h=shadowPlanes(f.poly||f,q);if(!h){if(history)snapshots.push(pieces);record('snapshots',j+1);continue;}pieces=pieces.map(f=>({...f,polys:f.polys.flatMap(p=>subtractShadow(p,h))}));if(history)snapshots.push(pieces);record('snapshots',j+1);}
 const surfaces=pieces.flatMap(f=>f.polys.map(poly=>({poly,kind:f.kind,owner:f.owner})));return {surfaces,pieces,snapshots,volume:surfaces.reduce((s,f)=>s+fragmentVolume(f.poly,q),0),area:surfaces.filter(f=>f.kind==='terrain').reduce((s,f)=>s+area3(f.poly),0)};
}
// Receiver-focused construction: unrelated receivers are never charged merely
// because the full viewshed supplies the neutral background in the illustration.
function projectionReceiverWork(q,tris,id){return measureSolverWork(()=>{let pieces=[tris[id]];for(const tri of tris){const h=shadowPlanes(tri,q);if(!h)continue;pieces=pieces.flatMap(poly=>h.some(pl=>Math.max(...poly.map(p=>val3(pl,p)))<=E3)?[poly]:subtractShadow(poly,h));}return pieces;}).work;}
function recordedVisitWork(result,progress){
 if(!result.workByVisit?.length)return result.work;
 if(progress.ids){return sumSolverWork(result.workBeforeVisits,...[...new Set(progress.ids)].map(i=>result.workPerVisit[i]));}
 const count=clamp(progress.index||0,0,result.workByVisit.length);return count?result.workByVisit[count-1]:result.workBeforeVisits;
}
function recordedSnapshotWork(result,index){return result.workBySnapshot?.[clamp(index||0,0,result.workBySnapshot.length-1)]||result.work;}

function countedEvent2(q,scene,record){const edges=sceneEdges(scene),angles=[0,TAU];
 for(const e of edges)angles.push(wrap(Math.atan2(e.a[1]-q[1],e.a[0]-q[0])));
 angles.sort((a,b)=>a-b);const events=angles.filter((a,i)=>!i||a-angles[i-1]>1e-11),sectors=[];
 record('snapshots',0);for(let i=0;i<events.length-1;i++){const a=events[i],b=events[i+1];if(b-a<1e-11)continue;
 const hit=nearest(q,(a+b)/2,edges);if(!hit)continue; const pa=rayHit(q,a,hit.edge),pb=rayHit(q,b,hit.edge);
 if(pa&&pb){sectors.push({a,b,edge:hit.edge,pa:pa.p,pb:pb.p});record('snapshots',sectors.length);}}
 const polygon=clean(sectors.flatMap(s=>[s.pa,s.pb]));return {edges,events,sectors,polygon,area:area(polygon)};}
