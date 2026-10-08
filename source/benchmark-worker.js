/* Runs in a Blob worker. Drawing, DOM updates and error bars remain outside
 * solver timers. Cancellation is checked between completed individual tests. */
let benchmarkWorkerCancelled=false;
self.onmessage=async({data})=>{
 if(data.type==='cancel'){benchmarkWorkerCancelled=true;return;}
 if(data.type!=='run')return;
 benchmarkWorkerCancelled=false;
 try{
  const detail=data.options.suite==='detail',solve=detail?buildTerrainDetailSuite:buildBenchmarkSuite,result=await solve({...data.options,environment:data.environment,sourceFingerprint:data.sourceFingerprint,
   shouldCancel:()=>benchmarkWorkerCancelled,
   onCase:row=>self.postMessage({type:'case',row}),
   onProgress:progress=>self.postMessage({type:'progress',progress}),
   yieldUI:()=>new Promise(resolve=>setTimeout(resolve,0))});
  if(detail)result.metadata.helperFingerprint=data.helperFingerprint;
  const compact=detail?compactTerrainDetailStatistics(result):compactBenchmarkStatistics(result);result.geometrySummaries=compact.geometrySummaries;result.preparationStats=compact.preparationStats;
  self.postMessage({type:'complete',result});
 }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
};
