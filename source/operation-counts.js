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
 const work=emptySolverWork(),saved={clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,rasterCube};let insideClipPredicate=0;
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
  expandVector2=function(q,scene,method='index'){const result=saved.expandVector2(q,scene,method),roots=new Set(result.roots||[]);for(const visit of result.visits)for(let j=0;j<3;j++){const next=scene.mesh.adj[visit.tri][j];if(next>=0&&next!==visit.from&&!roots.has(next))work.sideTests++;}return result;};
  rasterCube=function(...args){const result=saved.rasterCube(...args);work.rasterCoverageTests+=3*result.stats.pixelCandidates;work.rasterDepthTests+=result.stats.fragments;return result;};
  const value=run();if(value&&typeof value.then==='function')throw Error('Solver workload measurement requires a synchronous callback.');return {value,work:finishSolverWork(work)};
 }finally{
  ({clip,val3,rayHit,rayTri3,intersectFast,rayBox,locate2,clipSegment2,expandVector2,rasterCube}=saved);solverWorkActive=false;
 }
}
// Wall footprints are re-created by this teaching solver on every call, though
// independent of q. Separate their measured cost instead of hiding that work.
function wallSolverWork(result,index=result.stats.length-1){const stats=result.stats[index],work=emptySolverWork();work.halfPlaneTests=stats.vertexTests+(stats.supportTests||0);work.polygonClips=stats.halfPlaneClips;return finishSolverWork(work);}
function wallPreparationWork(result){const work=emptySolverWork();work.halfPlaneTests=result.preprocessing.vertexTests;work.polygonClips=result.preprocessing.halfPlaneClips;return finishSolverWork(work);}
function solverWorkBreakdown(work){const groups=[['Point–box',work.pointBoxTests],['Ray–box',work.rayBoxTests],['Signed side',work.sideTests],['Half-plane',work.halfPlaneTests],['Ray–primitive',work.rayPrimitiveTests],['Pixel coverage',work.rasterCoverageTests],['Depth',work.rasterDepthTests]];return groups.filter(([,n])=>n).map(([label,n])=>`${label}: ${n.toLocaleString('en-US')}`).join(' · ')||'No geometric tests';}

function sumSolverWork(...entries){const work=emptySolverWork();for(const entry of entries)for(const key of Object.keys(work))work[key]+=entry?.[key]||0;return finishSolverWork(work);}
function pointLocationWork(trace){const work=emptySolverWork();for(const test of trace){if(test.kind==='box')work.pointBoxTests++;else if(test.kind==='triangle')work.sideTests+=test.signs.length;}return finishSolverWork(work);}
function attachSolverWork(run,kind='solver'){if(kind==='wall'){const value=run();value.work=wallSolverWork(value);value.preparation=wallPreparationWork(value);value.workBySnapshot=value.stats.map((_,i)=>wallSolverWork(value,i));return value;}const {value,work}=measureSolverWork(run);return {...value,work};}
