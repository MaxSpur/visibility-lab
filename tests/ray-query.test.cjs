const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),src=__dirname+'/../source/';
const code=['geometry','operation-counts','ray-query'].map(n=>fs.readFileSync(src+n+'.js','utf8')).join('\n');
const check=String.raw`
function verify(tris,q,N,indexed){const original=prepare3(tris),prepared=prepareRayQuery(original),a=rayCube(q,original,N,indexed),b=traceRayCube(q,prepared,N,indexed);if(a.ids.some((v,i)=>v!==b.ids[i]))throw Error('Ray winner differs');if(a.depth.some((v,i)=>v!==b.depth[i]))throw Error('Ray depth differs');if(a.stats.tests!==b.stats.tests||a.stats.boxes!==b.stats.boxes)throw Error('Traversal operation counts differ');if(b.work.rayPrimitiveTests!==b.stats.tests||b.work.rayBoxTests!==b.stats.boxes)throw Error('Typed operation counts differ');}
for(const [nx,ny] of [[2,2],[6,4],[12,8]]){const tris=makeTerrain3(nx,ny).tris;for(const q of [[28,22,25],[0,0,8],[50,35,25],[100,70,3]])for(const N of [2,8,16])for(const indexed of [false,true])verify(tris,q,N,indexed);}
// Coplanar shared-edge hit ties, parallel directions, tiny determinants and
// duplicated surfaces must preserve baseline tie-breaking and early rejection.
const tris=[[[0,0,0],[4,0,0],[4,4,0]],[[0,0,0],[4,4,0],[0,4,0]],[[0,0,0],[4,0,0],[4,4,0]],[[0,0,1],[1e-13,0,1],[0,1e-13,1]]];for(const q of [[2,2,2],[0,0,1],[4,4,1]])for(const indexed of [false,true])verify(tris,q,8,indexed);
`;
vm.runInThisContext(code+check);vm.runInNewContext(code+check,{performance,console});
console.log('PASS: scalar ray query matches baseline IDs, exact depths, traversal counts and typed work in native and isolated VM execution.');
