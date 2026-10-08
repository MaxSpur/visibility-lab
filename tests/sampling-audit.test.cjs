/* Small sampling audit: point-query agreement does not certify recovered area. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync(__dirname+'/../source/geometry.js','utf8')+String.raw`
const audit=(condition,message)=>{if(!condition)throw Error(message);};
function matchedAngularAudit(q,tris,N){const ray=rayCube(q,prepare3(tris),N,true),raster=rasterCube(q,tris,N);audit(ray.ids.every((id,i)=>id===raster.ids[i]),'Ray and reciprocal-depth raster centers must select matching first surfaces');for(let i=0;i<ray.depth.length;i++)if(Number.isFinite(ray.depth[i]))audit(Math.abs(ray.depth[i]-raster.depth[i])<1e-8,'Center forward depth must agree independently');audit(raster.stats.fragments>0,'Raster must evaluate actual projected coverage');const reference=referenceSurface3(q,tris),sample=recoverCells(ray,tris),error=surfaceError(reference,sample,tris);audit(Math.abs(error.xor-error.missed-error.extra)<1e-7,'Symmetric difference separates missed and false-visible physical areas');return {reference,sample,error};}
const flat=[[[0,0,0],[100,0,0],[100,70,0]],[[0,0,0],[100,70,0],[0,70,0]]],q=[50,35,8],flatCases=[2,4,8].map(N=>matchedAngularAudit(q,flat,N));
for(const item of flatCases){audit(Math.abs(item.reference.area-7000)<1e-7,'Analytical flat terrain must be entirely visible');audit(item.error.extra<1e-7,'Flat sample cannot invent area outside input triangles');audit(item.error.missed>100,'Center-only owner reconstruction demonstrably leaves holes even without obstruction');}
audit(flatCases[2].error.missed>flatCases[1].error.missed,'Angular-cell aliasing can make error nonmonotonic with sample resolution');
// Rear triangle spans an angular cell. A small nearer triangle covers a portion
// away from its center; first-hit winner extrapolation misses that occlusion.
const occluded=[[[4,-4,-4],[4,4,-4],[4,0,4]],[[2,.1,-1.7],[2,.7,-1.7],[2,.1,-1.1]]],partial=matchedAngularAudit([0,0,0],occluded,2);
audit(partial.error.extra>.5,'Center winner footprint can falsely include hidden rear surface');audit(partial.error.missed>1,'The same footprint rule can miss visible surface');
console.log('PASS: independent center winners/depth agree; analytically visible flat terrain exposes reconstruction holes/nonmonotonic aliasing; small occluder exposes false-visible physical area.');
`);
