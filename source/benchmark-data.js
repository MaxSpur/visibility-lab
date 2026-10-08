/* The build embeds compact statistics and a self-contained worker. No network
 * requests or raw offline observations are needed to open the portable lab. */
const SAVED_BENCHMARK=/*BENCHMARK_DATA*/null;
const SAVED_TERRAIN_BENCHMARK=/*TERRAIN_BENCHMARK_DATA*/null;
const BENCHMARK_WORKER_SOURCE=/*BENCHMARK_WORKER*/"";
const BENCHMARK_SOURCE_FINGERPRINT=/*BENCHMARK_FINGERPRINT*/"";
const TERRAIN_BENCHMARK_HELPER_FINGERPRINT=/*TERRAIN_BENCHMARK_FINGERPRINT*/"";
const SAVED_BENCHMARK_CLOUDS=/*BENCHMARK_CLOUD_DATA*/null;
const SAVED_BENCHMARK_ARCHIVES=/*BENCHMARK_ARCHIVE_DATA*/[];
const SAVED_BENCHMARK_EXTENSIONS=/*BENCHMARK_EXTENSION_DATA*/[];
const BENCHMARK_EXTENSION_FINGERPRINT=/*BENCHMARK_EXTENSION_FINGERPRINT*/"";
function mergeSavedBenchmark(base,suite='core'){
 if(!base)return null;const result=structuredClone(base),source=base.metadata?.sourceFingerprint,cloud=SAVED_BENCHMARK_CLOUDS?.datasets?.[suite],provenance={sourceFingerprint:source,statisticsAsset:suite==='detail'?'terrain-detail-statistics.json':'statistics.json',seed:base.protocol.seed};
 const decorate=(rows,points,origin,geometry=null)=>rows.map(r=>({...r,...(r.methodId==='raster3'?{label:'Depth raster · six-face depth grids',method:'Depth raster · six-face depth grids',variant:'depth',sampleSpace:'Six angular cube faces'}:{}),provenance:origin,cloud:points.filter(p=>p.methodId===r.methodId&&p.resolution===r.resolution&&(!geometry||p.geometry===geometry))}));const current=r=>!['ray3-indexed','ray3-linear','raster3'].includes(r.methodId);result.rows=decorate(result.rows.filter(current),cloud?.points||[],provenance);result.geometrySummaries=result.geometrySummaries.map(g=>({...g,rows:decorate(g.rows.filter(current),cloud?.points||[],provenance,g.geometry)}));
 for(const addition of SAVED_BENCHMARK_EXTENSIONS.filter(a=>a.metadata.extensionSuite===suite)){const origin={...addition.metadata,seed:addition.protocol.seed},rows=decorate(addition.rows,addition.cloud||[],origin);for(const r of rows){const at=result.rows.findIndex(p=>p.methodId===r.methodId&&p.resolution===r.resolution);if(at<0)result.rows.push(r);else result.rows[at]=r;}for(const group of addition.geometrySummaries){let target=result.geometrySummaries.find(g=>g.domain===group.domain&&g.geometry===group.geometry);if(!target){target={...group,rows:[]};result.geometrySummaries.push(target);}for(const r of decorate(group.rows,addition.cloud||[],origin,group.geometry)){const at=target.rows.findIndex(p=>p.methodId===r.methodId&&p.resolution===r.resolution);if(at<0)target.rows.push(r);else target.rows[at]=r;}}(result.preparationStats??=[]).push(...(addition.preparationStats||[]));}
 result.protocol.resolutions3=[...new Set(result.rows.filter(r=>r.domain==='terrain'&&r.resolution).map(r=>r.resolution))].sort((a,b)=>a-b);
 // Coverage describes the displayed, revised rows. The archived assets keep
 // their original completed/total counts and are exported independently.
 result.completed=result.rows.reduce((n,r)=>n+(r.caseCount??r.stats.total.n+(r.failureCount||0)),0);result.total=result.completed;result.failedCases=result.rows.reduce((n,r)=>n+(r.failureCount||0),0);
 result.metadata.archivedMethods=['ray3-indexed','ray3-linear','raster3'];result.metadata.preservedStatistics=true;result.metadata.frozenSourceMap={'sample-comparison':'source/benchmark-sample-baseline.js'};result.metadata.additions=SAVED_BENCHMARK_EXTENSIONS.filter(a=>a.metadata.extensionSuite===suite).map(a=>a.metadata);return result;
}

function benchmarkArchivedDatasets(kind='core'){return [kind==='detail'?SAVED_TERRAIN_BENCHMARK:SAVED_BENCHMARK,...SAVED_BENCHMARK_ARCHIVES.filter(a=>a.metadata.extensionSuite===kind)].filter(Boolean);}

function benchmarkExportArchive(kind='core'){download(new Blob([JSON.stringify({format:'visibility-benchmark-archive',datasets:benchmarkArchivedDatasets(kind)},null,2)],{type:'application/json'}),'visibility-benchmark-archive-'+kind+'.json');}
