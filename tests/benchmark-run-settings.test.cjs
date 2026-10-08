const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),root=path.join(__dirname,'..');
const names=['geometry','operation-counts','wall-shadow2','benchmark-sample-baseline','benchmark-suite','benchmark-detail-suite','terrain-raster','ray-query','ray-reconstruction','benchmark-extension-suite','benchmark-run-settings'];
globalThis.benchmarkTestAssert=assert;
vm.runInThisContext('const assert=globalThis.benchmarkTestAssert;\n'+names.map(n=>fs.readFileSync(path.join(root,'source',n+'.js'),'utf8')).join('\n')+String.raw`
(async()=>{
 const quick=planBenchmarkRun({...BENCHMARK_RUN_PRESETS.quick,runPreset:'quick'});assert.equal(quick.total,36);assert.deepEqual(quick.options.resolutions2,[16,32,64]);assert.equal(quick.caseLimit,36);
 const detail=planBenchmarkRun({...BENCHMARK_RUN_PRESETS.quick,runSuite:'detail',runLevels:[48,192],runMethods:['beam3','ray3-indexed'],positions:2});assert.equal(detail.total,12);
 assert.throws(()=>planBenchmarkRun({...BENCHMARK_RUN_PRESETS.quick,ray3Min:16,ray3Max:8}),/minimum/);assert.throws(()=>planBenchmarkRun({...BENCHMARK_RUN_PRESETS.quick,runMethods:[]}),/method/);
 assert.deepEqual(benchmarkRunPowers(1024,16384),[1024,2048,4096,8192,16384]);
 const tiny=inputTerrain(2,2),q=[15,10,terrainHeight(15,10,tiny.tris)+8],terrain={density:'coarse',name:'Tiny terrain',base:tiny,observers:[q]},original=createBenchmarkWorkloads;
 createBenchmarkWorkloads=()=>({plans:[],terrains:[terrain],urban:[]});
 const runOptions={...BENCHMARK_RUN_PRESETS.quick,positions:1,runMethods:['ray3-indexed','raster3-surface'],ray3Min:4,ray3Max:4,surfaceMin:8,surfaceMax:8,maxSeconds:0,maxCases:0,targetMs:1,maxBatch:1,bootstrapReplicates:10};
 let progress=0,seen=[];const result=await runConfiguredBenchmarkSuite({...runOptions,onCase:r=>seen.push(r),onProgress:()=>progress++});assert.doesNotThrow(()=>structuredClone(result),'Worker results contain no callback functions');assert.equal(result.completed,2);assert.equal(result.failedCases,0);assert.equal(progress,4);assert.deepEqual(seen.map(r=>r.methodId),['ray3-indexed','raster3-surface']);assert.equal(result.metadata.runSettings,true);assert.equal(result.protocol.batching.targetMs,1);assert.equal(result.protocol.targetMs,1);assert.equal(result.cases[0].queryBatchSize,1);
 const partial=await runConfiguredBenchmarkSuite({...runOptions,maxCases:1});assert.equal(partial.completed,1);assert.equal(partial.status,'cancelled');assert.equal(partial.protocol.budget.reason,'case limit');
 const time=await runConfiguredBenchmarkSuite({...runOptions,maxSeconds:1,shouldCancel:()=>true});assert.equal(time.completed,0);assert.equal(time.status,'cancelled');
 const geometry=await runConfiguredBenchmarkSuite({...runOptions,runMethods:['viewport3']});assert.equal(geometry.completed,1);assert.equal(geometry.failedCases,0);assert.equal(geometry.cases[0].methodId,'viewport3');
 const actual=original({positions:1});createBenchmarkWorkloads=()=>({...actual,plans:actual.plans.slice(0,1),terrains:[],urban:[]});const plan=await runConfiguredBenchmarkSuite({...runOptions,runMethods:['wall2','ray2-indexed'],ray2Min:16,ray2Max:16});assert.equal(plan.completed,2);assert.equal(plan.failedCases,0);assert.deepEqual(plan.cases.map(c=>c.methodId),['wall2','ray2-indexed']);
 createBenchmarkWorkloads=original;console.log('PASS: exact selected counts, normalization, independent method selection, fresh timing limits, streamed cases, and cooperative partial results.');
})().catch(e=>{console.error(e);process.exitCode=1;});
`);
