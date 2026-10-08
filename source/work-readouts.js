/* Count the named solver, not incidental scene drawing or independent error checks. */
function benchmarkKey(s){return JSON.stringify(s.dimension==='2d'?[s.dimension,s.map,s.q2,s.rays,s.rasterN]:[s.dimension,s.density,s.qxy,s.eye,s.ceiling,s.cubeN,s.sampleBudget]);}
function matchedBenchmark(s){return benchResult&&benchmarkKey(benchResult.settings)===benchmarkKey(s)?benchResult:null;}
function rayResultWork(result){const work=emptySolverWork();work.rayPrimitiveTests=result.stats.tests;work.rayBoxTests=result.stats.boxes||0;return finishSolverWork(work);}
function displayedSolverWork(s){
 const entry=(name,work)=>({name,work}),full='full solve';
 if(s.scene==='shadows')return panelData.title==='The source is inside a solid'?{scope:'not solved',entries:[]}:{scope:full,entries:[entry('3D receiver shadow subtraction',urbanData(s.light).work)]};
 if(s.scene==='subtraction'){const a=wallShadowData(s);return {scope:full,entries:[entry('Wall-shadow subtraction',sumSolverWork(a.work,a.preparation))],preparation:a.preparation};}
 if(s.scene==='expansion'){const d=twoData(s);if(s.variant==='locate'){const trace=pointLocationSequence(d.e.loc),k=Math.min(trace.length,Math.floor(s.phase*trace.length)+1);return {scope:'search so far',entries:[entry('Point location',pointLocationWork(trace.slice(0,k)))]};}return {scope:full,entries:[entry('Triangle expansion',d.e.work)]};}
 if(s.scene==='events')return {scope:full,entries:[entry('Corner-event visibility',twoData(s).v.work)]};
 if(s.scene==='air')return {scope:full,entries:[entry('Air-cell beam expansion',getBeams(terrainState(s)).work)]};
 if(s.scene==='terrain'){const d=terrainState(s);if(s.variant==='one'){const id=s.face<0?blockingFace(d):clamp(s.face,0,d.model.tris.length-1);return {scope:'one shadow',entries:[entry('One face: retained + blocked pieces',singleShadow(d,id).work)]};}const a=s.variant==='all'?memo('history'+s.density+keyq(d.q)+s.order,()=>attachSolverWork(()=>referenceSurface3(d.q,d.model.tris,occluderOrder(d.model.tris,d.q,s.order),true))):getReference(d);return {scope:full,entries:[entry('Terrain shadow subtraction',a.work)]};}
 if(s.scene==='projection')return {scope:full,entries:[entry('Terrain visibility before projection',getReference(terrainState(s)).work)]};
 if(s.scene==='metrics'||s.scene==='cost'&&s.variant==='raster'){
  if(s.dimension==='3d'){const ss=effectiveObserverState(s),d=terrainState(ss),sample=sampleData(s.scene==='cost'?{...ss,sampler:'raster',variant:'still'}:ss,d);return {scope:'query + output',entries:[entry('Continuous geometry',sumSolverWork(getReference(d).work,s.hidden?d.hiddenWork:null)),entry('Samples',sumSolverWork(sample.work,s.hidden?sample.hiddenWork:null))]};}
  const ss=effectiveObserverState(s),d=twoData(ss);
  if(s.scene==='cost'){const a=memo('raster2'+s.map+keyq(s.q2)+s.rasterN,()=>attachSolverWork(()=>rasterMap2(s.q2,d.scene,s.rasterN)));return {scope:'query + output',entries:[entry('Triangle expansion',d.e.work),entry('Raster samples',a.work)]};}
  const n=s.variant==='rays'?Math.round(8+(s.rays-8)*s.phase):s.rays,a=memo('sample2'+s.map+keyq(d.q)+n,()=>attachSolverWork(()=>sampleRay2(d.q,d.scene,n,true)));
  if(s.metric==='walls'){const coverage=memo('wallCoverage'+s.map+keyq(d.q)+n,()=>attachSolverWork(()=>wallCoverage(d.q,d.v,a)));return {scope:'query + output',entries:[entry('Corner-event wall geometry',d.v.work),entry('Sampled wall coverage',sumSolverWork(a.work,coverage.work))]};}
  return {scope:'query + output',entries:[entry('Triangle expansion',d.e.work),entry('Sampled polygon',a.work)]};
 }
 // The chart itself is not a visibility solver. Show the continuous baseline
 // for this input; its benchmark rows carry each other method's own counts.
 return {scope:'reference solve',entries:[s.dimension==='2d'?entry('Triangle expansion',twoData(s).e.work):entry('Terrain shadow subtraction',getReference(terrainState(s)).work)]};
}
function addWorkReadouts(s){
 const p=panelData,data=displayedSolverWork(s);p.work=data;p.stats=p.stats||[];
 const entries=data.entries,description=entries.map(e=>`${e.name}: ${solverWorkBreakdown(e.work)}`).join('\n');
 if(entries.length===2){p.stats.push(['Geometric tests · geometry / samples',entries.map(e=>number(e.work.geometricTests,0)).join(' / '),description],['Polygon clips · geometry / samples',entries.map(e=>number(e.work.polygonClips,0)).join(' / '),'Actual half-plane clipping passes. Sample counts include physical-surface reconstruction.']);if(entries.some(e=>e.work.segmentClips))p.stats.push(['Segment clips · geometry / samples',entries.map(e=>number(e.work.segmentClips,0)).join(' / '),'Clipping an opening or wall segment is separate from clipping a polygon.']);}
 else{const work=entries[0]?.work;p.stats.push([`Geometric tests · ${data.scope}`,work?number(work.geometricTests,0):'—',description],['Clip passes · polygon / segment',work?`${number(work.polygonClips,0)} / ${number(work.segmentClips,0)}`:'—','Polygon and segment clip passes are different operations; their individual signed tests are counted above.']);}
 if(data.preparation)p.stats.push(['Of these: footprint preparation tests',number(data.preparation.geometricTests,0),'Included in the full-solve total. This implementation currently removes solid footprints on each solver call.']);
}
function updateWorkReference(s){
 const target=$('workComparison');if(!target||!['expansion','subtraction'].includes(s.scene))return;
 const key=s.map+':'+keyq(s.q2)+':'+s.locator;if(target.dataset.key===key)return;
 const e=twoData(s).e,w=wallShadowData(s),wall=sumSolverWork(w.work,w.preparation),same=Math.abs(w.area-e.area)<1e-5;
 replaceHTML(target,`<h3>Both methods on the current plan</h3><p>${escapeHTML(SCENES[s.map].name)}; observer (${number(s.q2[0],2)}, ${number(s.q2[1],2)}) m. ${same?'Both produce '+number(e.area)+' m² of visible free space.':'The continuous results disagree; run the geometry checks before interpreting this comparison.'}</p><table><thead><tr><th>Counted work</th><th>Wall subtraction</th><th>Triangle expansion</th></tr></thead><tbody><tr><td>Geometric tests, complete solve</td><td>${number(wall.geometricTests,0)}</td><td>${number(e.work.geometricTests,0)}</td></tr><tr><td>Polygon clip passes</td><td>${number(wall.polygonClips,0)}</td><td>${number(e.work.polygonClips,0)}</td></tr><tr><td>Segment clip passes</td><td>${number(wall.segmentClips,0)}</td><td>${number(e.work.segmentClips,0)}</td></tr><tr><td>Footprint preparation tests included above</td><td>${number(w.preparation.geometricTests,0)}</td><td>0 — starts with the stored free-space mesh</td></tr></tbody></table><p>Triangle location uses ${s.locator==='scan'?'a linear scan':'the bounding-box index'}. Reusable mesh/index preparation is outside the query. ${number(wall.geometricTests/e.work.geometricTests,2)}× as many counted tests for wall subtraction here is a workload ratio, not a speed ratio. The 2D benchmark separately measures elapsed time and spatial mismatch.</p>`);
 target.dataset.key=key;
}
