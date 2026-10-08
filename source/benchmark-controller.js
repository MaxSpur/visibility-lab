/* Saved and live timings are independent datasets. Display settings never
 * trigger measurement, and partial aggregates never bootstrap on the UI thread. */
const benchmarkUI={benchSource:SAVED_BENCHMARK?'saved':'live',benchView:'xy',timeScale:'log',errorScale:'linear',interval:'iqr',positions:25,seed:20261008,ribbons:true,measurements:false,growthResolution:32,triangleScale:'log'};
const benchmarkLiveSets={core:null,detail:null};
let benchmarkLive=null,benchmarkWorker=null,benchmarkWorkerURL=null,benchmarkSelected=null,benchmarkFrame=0,benchmarkRunOptions={},benchmarkWaiters=[];
let benchmarkRun={running:false,status:'idle',completed:0,total:0,failed:0,currentmethod:null,message:'',started:null};
benchResult=mergeSavedBenchmark(SAVED_BENCHMARK,'core');
function benchmarkStatus(){return {...benchmarkRun,source:benchmarkUI.benchSource};}
function benchmarkConfig(){return {...benchmarkUI,...benchmarkRunOptions};}
function benchmarkViewSuite(){return benchmarkUI.benchView==='terrain-detail'?'detail':'core';}
function selectedBenchmark(){return benchmarkSelected?benchmarkInspectableRows().find(r=>benchmarkRowKey(r)===benchmarkSelected)||null:null;}
function configureBenchmark(options={}){
 for(const [key,choices] of Object.entries({benchSource:['saved','live'],benchView:['xy','overview','terrain-detail'],timeScale:['log','linear'],errorScale:['log','linear'],interval:['iqr','ci'],triangleScale:['log','linear']}))if(choices.includes(options[key]))benchmarkUI[key]=options[key];
 for(const key of ['ribbons','measurements'])if(options[key]!==undefined)benchmarkUI[key]=!!options[key];
 if(options.growthResolution!==undefined)benchmarkUI.growthResolution=Number(options.growthResolution);
 if(options.positions!==undefined){const n=Number(options.positions);if(!Number.isInteger(n)||n<1||n>1000)throw Error('Choose 1–1000 observer samples per geometry.');benchmarkUI.positions=n;}
 if(options.seed!==undefined)benchmarkUI.seed=Number(options.seed)>>>0;
 for(const k of ['repeats','resolutions2','rasters2','resolutions3','bootstrapReplicates','tasks','selective','resumeCases'])if(options[k]!==undefined)benchmarkRunOptions[k]=structuredClone(options[k]);
 selectBenchmarkDataset(benchmarkUI.benchSource,false);if(state.scene==='cost'){buildControls();render();}return benchmarkConfig();
}
function selectBenchmarkDataset(source,redraw=true){benchmarkUI.benchSource=source;const kind=benchmarkViewSuite();benchResult=source==='saved'?mergeSavedBenchmark(kind==='detail'?SAVED_TERRAIN_BENCHMARK:SAVED_BENCHMARK,kind):benchmarkLiveSets[kind];if(benchmarkSelected&&!selectedBenchmark())benchmarkSelected=null;if(redraw&&state.scene==='cost'){buildControls();render();}}
function benchmarkEnvironment(){return {runtime:'Browser JavaScript · dedicated worker',userAgent:navigator.userAgent,platform:navigator.platform,hardwareConcurrency:navigator.hardwareConcurrency,timer:'performance.now'};}
function benchmarkScheduleRender(){if(benchmarkFrame)return;benchmarkFrame=requestAnimationFrame(()=>{benchmarkFrame=0;if(state.scene==='cost'){render();updateBenchmarkProgress();}});}
function benchmarkResolve(){const result=benchmarkLive;for(const resolve of benchmarkWaiters.splice(0))resolve(result);}
function benchmarkCleanupWorker(){benchmarkWorker?.terminate();benchmarkWorker=null;if(benchmarkWorkerURL)URL.revokeObjectURL(benchmarkWorkerURL);benchmarkWorkerURL=null;}
function benchmarkExport(){if(!benchResult)return;download(new Blob([JSON.stringify(benchResult,null,2)],{type:'application/json'}),'visibility-benchmarks-'+benchmarkViewSuite()+'-'+(benchmarkUI.benchSource==='saved'?'saved-statistics':'live-results')+'.json');}
function benchmarkSelectPoint(key){benchmarkSelected=key;render();}
function toggleBenchmarkSeries(id){if(benchmarkHiddenMethods.has(id))benchmarkHiddenMethods.delete(id);else benchmarkHiddenMethods.add(id);buildControls();render();}
function stopBenchmark(){if(!benchmarkRun.running||!benchmarkWorker)return;benchmarkRun.status='stopping';benchmarkRun.message='Stopping after the current individual test…';benchmarkWorker.postMessage({type:'cancel'});updateBenchmarkProgress();}
async function runBenchmark(options={}){
 if(benchmarkBusy||exporting)return benchmarkLive;
 if(options instanceof Event)options={};configureBenchmark(options);stopPlaying();benchmarkBusy=true;
 const kind=benchmarkViewSuite(),runOptions={positions:benchmarkUI.positions,seed:benchmarkUI.seed,...(kind==='detail'?{resolutions3:SAVED_TERRAIN_BENCHMARK?.protocol.resolutions3||[8,16,32]}:{}),...benchmarkRunOptions,suite:kind},total=benchmarkCurrentCaseTotal(kind,runOptions.positions,runOptions);
 const environment=benchmarkEnvironment();benchmarkLive={format:'visibility-benchmark-live',version:2,date:new Date().toISOString(),metadata:{environment,sourceFingerprint:BENCHMARK_SOURCE_FINGERPRINT,...(kind==='detail'?{helperFingerprint:TERRAIN_BENCHMARK_HELPER_FINGERPRINT}:{})},protocol:{positions:runOptions.positions,requestedPositions:runOptions.positions,seed:runOptions.seed,planCases:kind==='detail'?0:runOptions.positions*3,terrainCases:runOptions.positions*(kind==='detail'?TERRAIN_DETAIL_LEVELS.length:3),urbanCases:kind==='detail'?0:runOptions.positions,...(kind==='detail'?{levels:TERRAIN_DETAIL_LEVELS,resolutions3:runOptions.resolutions3}:{}),confidence:{replicates:runOptions.bootstrapReplicates||1000}},status:'running',rows:[],cases:[],preparation:[],completed:0,total,failedCases:0};
 benchmarkLiveSets[kind]=benchmarkLive;benchmarkRun={running:true,status:'running',suite:kind,completed:0,total,failed:0,currentmethod:null,message:kind==='detail'?'Preparing paired terrain meshes…':'Preparing the seven geometry groups…',started:NOW()};selectBenchmarkDataset('live');
 const completion=new Promise(resolve=>benchmarkWaiters.push(resolve));
 try{
  if(typeof Worker==='undefined')throw Error('Dedicated workers are unavailable in this browser. Saved statistics are still available.');
  benchmarkWorkerURL=URL.createObjectURL(new Blob([BENCHMARK_WORKER_SOURCE],{type:'application/javascript'}));benchmarkWorker=new Worker(benchmarkWorkerURL);
  const finish=(status,message)=>{benchmarkRun.running=false;benchmarkRun.status=status;benchmarkRun.message=message;benchmarkBusy=false;benchmarkCleanupWorker();if(state.scene==='cost'){buildControls();render();updateBenchmarkProgress();}benchmarkResolve();};
  benchmarkWorker.onmessage=({data})=>{
   if(data.type==='case'){
    benchmarkLive.cases.push(data.row);benchmarkLive.completed=benchmarkLive.cases.length;benchmarkLive.failedCases+=data.row.status==='failed'?1:0;benchmarkLive.rows=aggregateBenchmarkCases(benchmarkLive.cases,{confidence:false,seed:runOptions.seed});benchmarkRun.completed=benchmarkLive.completed;benchmarkRun.failed=benchmarkLive.failedCases;
    if(kind==='detail')benchmarkLive.geometrySummaries=benchmarkDetailPartialSummaries(benchmarkLive.cases,runOptions.seed);
    if(benchmarkUI.benchSource==='live'&&benchmarkViewSuite()===kind)benchResult=benchmarkLive;benchmarkScheduleRender();
   }else if(data.type==='progress'){
    benchmarkRun.total=data.progress.total;benchmarkRun.currentmethod=data.progress.currentmethod;benchmarkRun.fixture=data.progress.fixture;if(benchmarkRun.status!=='stopping')benchmarkRun.message=data.progress.message;updateBenchmarkProgress();
   }else if(data.type==='complete'){
    benchmarkLive={...data.result,date:benchmarkLive.date,format:'visibility-benchmark-live',version:2};benchmarkLiveSets[kind]=benchmarkLive;benchmarkRun.completed=data.result.completed;benchmarkRun.total=data.result.total;benchmarkRun.failed=data.result.failedCases;if(benchmarkUI.benchSource==='live'&&benchmarkViewSuite()===kind)benchResult=benchmarkLive;
    const stopped=data.result.status==='cancelled';finish(stopped?'stopped':'complete',`${stopped?'Stopped with partial results':'Live run complete'} · ${data.result.completed} / ${data.result.total} tests · ${data.result.failedCases} failed`);
   }else if(data.type==='error'){benchmarkLive.status='failed';finish('failed','Run stopped: '+data.message);}
  };
  benchmarkWorker.onerror=event=>{benchmarkLive.status='failed';finish('failed','Worker stopped: '+event.message);};
  benchmarkWorker.postMessage({type:'run',options:runOptions,environment,sourceFingerprint:BENCHMARK_SOURCE_FINGERPRINT,helperFingerprint:TERRAIN_BENCHMARK_HELPER_FINGERPRINT,extensionFingerprint:BENCHMARK_EXTENSION_FINGERPRINT});updateBenchmarkProgress();
 }catch(error){benchmarkBusy=false;benchmarkRun.running=false;benchmarkRun.status='failed';benchmarkRun.message=error.message;benchmarkLive.status='failed';benchmarkCleanupWorker();buildControls();render();updateBenchmarkProgress();benchmarkResolve();}
 return completion;
}
function updateBenchmarkProgress(){
 const run=$('benchmarkProgress');if(!run)return;const completed=benchmarkRun.completed,total=benchmarkRun.total,source=benchmarkUI.benchSource==='saved'?'Saved statistics':'Live results';
 $('benchmarkRunProgress').hidden=benchmarkRun.status==='idle';
 run.hidden=benchmarkRun.status==='idle';run.value=completed;run.max=total||1;run.setAttribute('aria-valuetext',`${completed} of ${total} tests finished`);
 $('benchmarkProgressText').textContent=benchmarkRun.status==='idle'?'':`${number(completed,0)} / ${number(total,0)} tests${benchmarkRun.failed?' · '+number(benchmarkRun.failed,0)+' failed':''} · ${benchmarkRun.message}`;
 const stop=$('benchmarkStop'),button=$('benchmarkStart');if(stop){stop.disabled=!benchmarkRun.running||benchmarkRun.status==='stopping';stop.textContent=benchmarkRun.status==='stopping'?'Stopping…':'Stop';}if(button)button.disabled=benchmarkRun.running;
 const exportButton=$('benchmarkExport');if(exportButton)exportButton.disabled=!benchResult?.rows.length;
 $('png').disabled=benchmarkRun.running;$('svg').disabled=exporting;
 if(state.scene==='cost')$('status').textContent=benchmarkRun.running?`${source} shown · measuring ${benchmarkLive.protocol.positions} samples per geometry`:'';
}
function benchmarkChoice(label,key,choices,width){const el=document.createElement('label');el.className='setting benchmark-setting';el.style.flexBasis=width+'rem';const span=document.createElement('span');span.textContent=label;const input=document.createElement('select');input.dataset.key=key;input.setAttribute('aria-label',label);for(const [value,text] of choices){const o=document.createElement('option');o.value=value;o.textContent=text;if(key==='benchSource'&&value==='saved')o.disabled=benchmarkViewSuite()==='detail'?!SAVED_TERRAIN_BENCHMARK:!SAVED_BENCHMARK;input.append(o);}input.value=benchmarkUI[key];input.onchange=()=>configureBenchmark({[key]:input.value});el.append(span,input);return el;}
function benchmarkNumber(label,key,min,max,width){const el=document.createElement('label');el.className='setting benchmark-setting benchmark-number';el.style.flexBasis=width+'rem';const span=document.createElement('span');span.textContent=label;const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=1;input.value=benchmarkUI[key];input.dataset.key=key;input.setAttribute('aria-label',label);input.disabled=benchmarkRun.running;input.onchange=()=>{if(!input.checkValidity()){input.reportValidity();return;}benchmarkUI[key]=Number(input.value);};el.append(span,input);return el;}
function buildBenchmarkControls(c){
 c.append(benchmarkChoice('Results','benchSource',[['saved','Saved statistics'],['live','Live results']],11),benchmarkChoice('Plot','benchView',[['xy','Time vs mismatch'],['overview','Overview'],['terrain-detail','Terrain detail']],11),benchmarkChoice('Time axis','timeScale',[['log','Logarithmic'],['linear','Linear']],8),benchmarkChoice('Mismatch axis','errorScale',[['linear','Linear'],['log','Logarithmic']],8),benchmarkChoice('Intervals','interval',[['iqr','Observer spread (quartiles)'],['ci','Median uncertainty (95%)']],17),benchmarkNumber('Samples / geometry','positions',1,1000,9),benchmarkNumber('Random seed','seed',0,4294967295,8));
 if(benchmarkViewSuite()==='detail'){let resolutions=[...new Set([...(benchResult?.protocol.resolutions3||SAVED_TERRAIN_BENCHMARK?.protocol.resolutions3||[8,16,32]),...(benchResult?.rows||[]).filter(r=>r.domain==='terrain'&&r.resolution).map(r=>r.resolution)])].sort((a,b)=>a-b);if(!resolutions.length)resolutions=[8,16,32];if(!resolutions.includes(benchmarkUI.growthResolution))benchmarkUI.growthResolution=resolutions.at(-1);c.append(benchmarkChoice('Fixed grid N · growth','growthResolution',resolutions.map(n=>{const sampled=(benchResult?.rows||[]).filter(r=>r.domain==='terrain'&&r.resolution===n),rays=sampled.some(r=>r.family==='rays'||r.family==='bvh'),raster=sampled.some(r=>r.methodId==='raster3-surface');return [n,'N = '+n+(rays&&!raster?' · rays':raster&&!rays?' · Raster':'')];}),8),benchmarkChoice('Triangle axis','triangleScale',[['log','Logarithmic'],['linear','Linear']],8));}
 for(const [key,label] of [['ribbons','Filled intervals'],['measurements','Individual measurements']]){const toggle=document.createElement('label');toggle.className='benchmark-toggle';const input=document.createElement('input');input.type='checkbox';input.dataset.key=key;input.checked=benchmarkUI[key];input.onchange=()=>configureBenchmark({[key]:input.checked});toggle.append(input,document.createTextNode(label));c.append(toggle);}
 const run=actionControl('Run in this browser',()=>{if([...c.querySelectorAll('input[type=number]')].every(input=>input.reportValidity()))runBenchmark();},true);run.id='benchmarkStart';run.disabled=benchmarkRun.running;
 const stop=actionControl('Stop',stopBenchmark);stop.id='benchmarkStop';stop.disabled=!benchmarkRun.running;const exportButton=actionControl('Export results',benchmarkExport);exportButton.id='benchmarkExport';exportButton.disabled=!benchResult?.rows.length;const archive=actionControl('Export archived results',()=>benchmarkExportArchive(benchmarkViewSuite()));archive.id='benchmarkExportArchive';c.append(run,stop,exportButton,archive);if(benchmarkHiddenMethods.size)c.append(actionControl('Show all methods',()=>{benchmarkHiddenMethods.clear();buildControls();render();}));
 const progress=document.createElement('div');progress.id='benchmarkRunProgress';progress.className='benchmark-run-progress';const bar=document.createElement('progress');bar.id='benchmarkProgress';bar.setAttribute('aria-label','Finished individual benchmark tests');const text=document.createElement('span');text.id='benchmarkProgressText';progress.append(bar,text);c.append(progress);updateBenchmarkProgress();
 $('help').textContent=benchmarkViewSuite()==='detail'?'Terrain detail uses identical physical XY positions and +8 m eye height across mesh levels. Run measures the displayed suite; Stop keeps finished tests.':'Paired, seeded positions across three plans, three terrain meshes and one building scene. Live results update after each individual test; Stop keeps finished tests.';
}
