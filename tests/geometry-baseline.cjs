/* Pin the original Astra core. Compare original outputs when its parent HTML
   is available; standalone clones verify the pin and independent invariants.
   Timings are excluded from comparisons. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const originalPath = path.join(root, '..', 'visibility-lab-v3-astra.html');
const currentSource = fs.readFileSync(path.join(root, 'source/geometry.js'), 'utf8').trim();
const hash = source => crypto.createHash('sha256').update(source).digest('hex');
const pinnedHash = '3a227e00249c813c577ec4790c809abe8b3eaacc25dc0233313c5c54b233b0ee';
assert.equal(hash(currentSource), pinnedHash, 'v4 preserves the original Astra computational core');
let baselineSource = null;
if (fs.existsSync(originalPath)) {
  const original = fs.readFileSync(originalPath, 'utf8');
  const start = original.indexOf('<script>');
  const end = original.indexOf('/* Graphics-only renderer.', start);
  assert(start >= 0 && end > start, 'Original geometry extraction boundaries exist');
  baselineSource = original.slice(start + '<script>'.length, end).trim();
  assert.equal(hash(baselineSource), pinnedHash, 'The original Astra geometry baseline has not changed');
  assert.equal(currentSource, baselineSource, 'v4 preserves the complete original geometry source byte for byte, ignoring outer whitespace');
}
function context(source) {
  const ctx = vm.createContext({console, performance: {now: () => 0}});
  vm.runInContext(source, ctx, {timeout: 30000});
  vm.runInContext('SCENES.forEach(s => {s.mesh=meshFor(s);});', ctx);
  return ctx;
}
const baseline = baselineSource ? context(baselineSource) : null, current = context(currentSource);
function evaluate(ctx, code) {
  // JSON normalizes VM realms. No timers appear in the fixture summaries.
  return JSON.parse(vm.runInContext(`JSON.stringify((()=>{${code}})())`, ctx, {timeout:120000}));
}
let checks = 0;
function match(name, code, inspect) {
  const actual = evaluate(current, code);
  if (baseline) assert.deepEqual(actual, evaluate(baseline, code), `${name}: results and operation counts match original Astra`);
  if (inspect) inspect(actual);
  checks++;
  console.log(`✓ ${name}`);
  return actual;
}
const close = (a,b,tol=1e-7) => assert(Math.abs(a-b)<=tol, `${a} ≈ ${b}`);
for (let scene=0; scene<3; scene++) {
  for (const q of [null, [43,32], [12,32], [88,30]]) {
    match(`2D map ${scene}, observer ${q||'default'}`, `
      const s=SCENES[${scene}],q=${JSON.stringify(q)}||s.observer;
      if(!validObserver(q,s))throw Error('Fixture observer is not valid');
      const a=expandVector2(q,s,'index'),b=expandVector2(q,s,'scan'),v=visibility(q,s);
      const summarize=x=>({area:x.area,roots:x.roots,ops:x.ops,
        visits:x.visits.map(f=>({tri:f.tri,parent:f.parent,opening:f.opening,poly:f.poly}))});
      const rays=[32,256,2048].map(n=>{const indexed=sampleRay2(q,s,n,true),scan=sampleRay2(q,s,n,false);
        return {n,area:indexed.area,scanArea:scan.area,polygon:indexed.polygon,scanPolygon:scan.polygon,
          indexedStats:indexed.stats,scanStats:scan.stats,error:polygonComparison2(a,indexed,q)};});
      return {index:summarize(a),scan:summarize(b),referenceArea:v.area,rays,edges:sceneEdges(s).length};
    `, x=>{
      close(x.index.area,x.scan.area); close(x.index.area,x.referenceArea);
      assert(x.index.visits.length>1);
      x.rays.forEach(r=>{
        close(r.area,r.scanArea); assert.deepEqual(r.polygon,r.scanPolygon);
        assert.equal(r.scanStats.tests,r.n*x.edges);
        assert(r.indexedStats.tests<=r.scanStats.tests);
        assert(r.error.xor>=0);
      });
    });
  }
}
match('2D observer on an artificial shared edge seeds both sides', `
  const s=SCENES[0];let q;
  for(let i=0;i<s.mesh.tris.length&&!q;i++)for(let j=0;j<3;j++){
    if(s.mesh.adj[i][j]<0)continue;
    const t=s.mesh.tris[i],p=mul(add(t[j],t[(j+1)%3]),.5);
    if(validObserver(p,s)){q=p;break;}
  }
  const a=expandVector2(q,s,'index'),b=expandVector2(q,s,'scan');
  return {q,indexRoots:[...a.roots].sort(),scanRoots:[...b.roots].sort(),area:a.area,scanArea:b.area,reference:visibility(q,s).area};
`, x=>{assert(x.indexRoots.length>=2);assert.deepEqual(x.indexRoots,x.scanRoots);close(x.area,x.scanArea);close(x.area,x.reference);});
for (const [nx,ny,qxy,height] of [[4,3,[18,24],8],[6,4,[38,34],4],[10,7,[9,35],8]]) {
  match(`Terrain ${nx}×${ny}, observer ${qxy}`, `
    const base=inputTerrain(${nx},${ny}),q=[${qxy[0]},${qxy[1]},terrainHeight(${qxy[0]},${qxy[1]},base.tris)+${height}];
    const m=terrainWithCeiling(base,q,1),near=occluderOrder(m.tris,q,'near'),spiral=occluderOrder(m.tris,q,'spiral');
    const ref=referenceSurface3(q,m.tris,near),rev=referenceSurface3(q,m.tris,[...near].reverse()),sp=referenceSurface3(q,m.tris,spiral);
    const beam=expand3(q,m),hidden=complementSurfaces(m.tris,ref.surfaces),prepared=prepare3(m.tris);
    const cube=[8,16,32].map(N=>{
      const indexed=rayCube(q,prepared,N,true),brute=rayCube(q,prepared,N,false),raster=rasterCube(q,m.tris,N);
      const a=recoverCells(indexed,m.tris),b=recoverCells(raster,m.tris);
      return {N,ids:Array.from(indexed.ids),bruteIDs:Array.from(brute.ids),rasterIDs:Array.from(raster.ids),
        depth:Array.from(indexed.depth),bruteDepth:Array.from(brute.depth),rasterDepth:Array.from(raster.depth),
        rayStats:indexed.stats,bruteStats:brute.stats,rasterStats:raster.stats,
        rayArea:a.area,rasterArea:b.area,rayPolys:a.polys,rasterPolys:b.polys,
        rayError:surfaceError(ref,a,m.tris),rasterError:surfaceError(ref,b,m.tris)};
    });
    return {q,faces:m.tris.length,total:m.tris.reduce((s,p)=>s+area3(p),0),
      reference:{area:ref.area,surfaces:ref.surfaces,stats:ref.stats},reverseArea:rev.area,spiralArea:sp.area,
      hiddenArea:hidden.reduce((s,f)=>s+area3(f.poly),0),
      beam:{surfaceArea:beam.surfaceArea,volume:beam.volume,omega:beam.omega,visits:beam.visits.length,
        terrain:beam.surfaces.filter(f=>f.kind==='terrain').map(f=>f.poly)},cube};
  `, x=>{
    close(x.reference.area,x.reverseArea);close(x.reference.area,x.spiralArea);
    close(x.reference.area,x.beam.surfaceArea);close(x.reference.area+x.hiddenArea,x.total);
    close(x.beam.omega,4*Math.PI);assert(x.beam.visits>0);
    x.cube.forEach(c=>{
      assert.equal(c.ids.length,6*c.N*c.N);
      assert.deepEqual(c.ids,c.bruteIDs);assert.deepEqual(c.ids,c.rasterIDs);
      c.depth.forEach((d,i)=>{if(d!==null){close(d,c.bruteDepth[i],1e-6);close(d,c.rasterDepth[i],1e-6);}});
      assert.equal(c.bruteStats.tests,6*c.N*c.N*x.faces);
      assert(c.rayStats.tests<=c.bruteStats.tests);assert(c.rasterStats.pixelCandidates>0);
      close(c.rayArea,c.rasterArea);assert(c.rayArea<=x.total+1e-6);
      assert(c.rayError.xor>=0);close(c.rayError.xor,c.rasterError.xor);
    });
  });
}
console.log(`Passed ${checks} ${baseline?'matched baseline':'independent invariant'} fixtures; geometry source matches the pinned original Astra core.`);
