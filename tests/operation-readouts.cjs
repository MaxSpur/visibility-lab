/* Executed workload, matched solver outputs, shared input and vector readouts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html',scratch=path.resolve(__dirname,'../.codex-scratch.nosync');fs.mkdirSync(scratch,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3840,height:2160},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url+'#subtraction');await page.waitForFunction(()=>window.visibilityLab?.version===4);
  assert.deepEqual(await page.locator('#nav button').allTextContents(),['1 · Shadow construction','2 · Subtract wall shadows','3 · Expanding triangles','4 · Terrain: beams','5 · Terrain: shadow cuts','6 · Terrain in the view','7 · Geometry and samples','8 · Effort and raster','9 · Corner events']);
  const cases=await page.evaluate(()=>MODES.flatMap(m=>m.variants.map(([variant])=>({scene:m.id,variant}))));
  for(const settings of cases.concat(['raycast','raster'].map(variant=>({scene:'metrics',variant,dimension:'3d'})),[{scene:'cost',variant:'bench',dimension:'3d'},{scene:'cost',variant:'raster',dimension:'3d'}])){
   const data=await page.evaluate(settings=>{visibilityLab.renderAt(settings.scene,.55,{density:'coarse',sampleBudget:140,cubeN:4,rays:16,rasterN:8,...settings});const s=visibilityLab.snapshot();return {error:s.error,work:s.panel.work,stats:s.panel.stats};},settings);
   assert.equal(data.error,null,JSON.stringify(settings));assert.ok(data.work.entries.length>=1,JSON.stringify(settings));
   for(const entry of data.work.entries){assert.ok(Number.isInteger(entry.work.geometricTests)&&entry.work.geometricTests>=0,JSON.stringify({settings,entry}));assert.ok(Number.isInteger(entry.work.polygonClips)&&entry.work.polygonClips>=0);}
   assert.ok(data.stats.some(([name])=>name.startsWith('Geometric tests')));assert.ok(data.stats.some(([name])=>name.includes('clips')||name.includes('Clip passes')));
  }
  console.log('✓ Every tab/variant shows scoped integer operation counts; 3D sample totals include reconstruction.');
  // The displayed counters are stage prefixes; timings/benchmarks remain full solves.
  for(const [scene,variant] of [['subtraction','subtract'],['expansion','expand'],['air','expand'],['terrain','all'],['events','sweep']]){
   const counts=[];
   for(const phase of [0,.5,1])counts.push(await page.evaluate(({scene,variant,phase})=>{visibilityLab.renderAt(scene,phase,{variant,density:'coarse',map:0,q2:[43,32]});const w=visibilityLab.snapshot().panel.work.entries[0].work;return [w.geometricTests,w.polygonClips,w.segmentClips];},{scene,variant,phase}));
   for(let i=1;i<counts.length;i++)for(let j=0;j<3;j++)assert.ok(counts[i][j]>=counts[i-1][j],JSON.stringify({scene,variant,counts}));
   assert.ok(counts[2][0]>counts[0][0],JSON.stringify({scene,variant,counts}));
  }
  console.log('✓ Accumulated work follows slider progress and rewinding rather than counting rendered frames.');

  await page.evaluate(()=>visibilityLab.renderAt('subtraction',1,{q2:[43,32],map:0}));
  let s=await page.evaluate(()=>visibilityLab.snapshot());assert.equal(s.panel.work.entries[0].work.geometricTests,2633);assert.equal(s.panel.work.entries[0].work.polygonClips,533);assert.equal(s.panel.work.preparation.geometricTests,415);
  assert.match(await page.locator('#workComparison').textContent(),/2,633/);assert.match(await page.locator('#workComparison').textContent(),/272/);
  const wallArea=await page.evaluate(()=>wallShadowData(state).area);await page.locator('#nav button[data-id=expansion]').click();await page.locator('#phase').fill('1');s=await page.evaluate(()=>visibilityLab.snapshot());assert.deepEqual(s.state.q2,[43,32]);assert.equal(s.panel.work.entries[0].work.geometricTests,272);assert.equal(s.panel.work.entries[0].work.polygonClips,34);assert.equal(s.panel.work.entries[0].work.segmentClips,17);assert.ok(Math.abs(wallArea-await page.evaluate(()=>twoData(state).e.area))<1e-6);
  await page.screenshot({path:path.join(scratch,'operation-expansion-4k.png')});
  const before=await page.locator('#workComparison').textContent();
  const point=await page.evaluate(()=>{const target=visibilityLab.hitTargets().find(t=>t.kind==='map2'),ctm=document.querySelector('#view').getScreenCTM(),p=target.m.p([46,33]),q=new DOMPoint(p[0],p[1]).matrixTransform(ctm),a=new DOMPoint(target.point[0],target.point[1]).matrixTransform(ctm);return {a:[a.x,a.y],b:[q.x,q.y]};});
  await page.mouse.move(...point.a);await page.mouse.down();await page.mouse.move(...point.b,{steps:3});await page.mouse.up();assert.notEqual(await page.locator('#workComparison').textContent(),before);const current=await page.evaluate(()=>visibilityLab.getState().q2);await page.locator('#nav button[data-id=subtraction]').click();s=await page.evaluate(()=>visibilityLab.snapshot());assert.deepEqual(s.state.q2,current);assert.match(await page.locator('#workComparison').textContent(),new RegExp(current[0].toFixed(2)));
  console.log('✓ Default continuous outputs agree; counts distinguish preparation, polygon and segment work; live comparison follows the shared observer.');

  await page.evaluate(()=>visibilityLab.renderAt('cost',0,{dimension:'2d',map:0,q2:[43,32],rays:32,rasterN:8}));await page.getByRole('button',{name:'Run measured comparison',exact:true}).click();await page.waitForFunction(()=>visibilityLab.benchmark()?.dimension==='2d'&&!benchmarkBusy);
  let bench=await page.evaluate(()=>visibilityLab.benchmark());let wall=bench.rows.find(r=>r.family==='wall'),expansion=bench.rows.find(r=>r.family==='geometry');assert.ok(wall);assert.equal(wall.work.geometricTests,2633);assert.equal(expansion.work.geometricTests,272);assert.ok(Math.abs(wall.area-expansion.area)<1e-6);assert.ok(wall.error<1e-8);assert.equal(wall.preparationWork.geometricTests,415);
  for(const row of bench.rows){assert.ok(Number.isFinite(row.query)&&row.query>=0);assert.ok(row.work.geometricTests>0);}
  assert.match(await page.locator('#benchmarkTable').innerText(),/Geometric tests/);assert.match(await page.locator('#benchmarkTable').innerText(),/Wall-shadow subtraction/);
  fs.writeFileSync(path.join(scratch,'operation-benchmark-2d.json'),JSON.stringify(bench,null,2));await page.screenshot({path:path.join(scratch,'operation-benchmark-2d-4k.png')});
  await page.locator('[data-key=map]').selectOption('1');assert.equal(await page.locator('#benchmarkTable').innerText(),'');assert.equal(await page.evaluate(()=>matchedBenchmark(state)),null);
  console.log('✓ Timed 2D comparison includes wall subtraction, records separate typed counts and hides stale results after geometry changes.');

  await page.evaluate(()=>visibilityLab.renderAt('cost',0,{dimension:'3d',density:'coarse',cubeN:4,sampleBudget:140}));await page.getByRole('button',{name:'Run measured comparison',exact:true}).click();await page.waitForFunction(()=>visibilityLab.benchmark()?.dimension==='3d'&&!benchmarkBusy);
  bench=await page.evaluate(()=>visibilityLab.benchmark());for(const row of bench.rows){assert.ok(row.work.geometricTests>0,JSON.stringify(row));if(row.queryWork){assert.equal(row.work.geometricTests,row.queryWork.geometricTests+row.recoveryWork.geometricTests);assert.equal(row.work.polygonClips,row.queryWork.polygonClips+row.recoveryWork.polygonClips);}}
  await page.locator('input[type=number][data-key=yaw]').fill('35.0');await page.locator('input[type=number][data-key=yaw]').press('Tab');assert.ok(await page.locator('#benchmarkTable').innerText());
  await page.locator('input[type=number][data-key=eye]').fill('9.0');await page.locator('input[type=number][data-key=eye]').press('Tab');assert.equal(await page.locator('#benchmarkTable').innerText(),'');
  console.log('✓ 3D benchmark counts query and area recovery separately; orbit preserves results while observer elevation invalidates the match.');

  await page.evaluate(()=>visibilityLab.renderAt('subtraction',1,{map:0,q2:[43,32]}));await page.locator('#exportMode').selectOption('panel');const download=page.waitForEvent('download');await page.locator('#svg').click();const file=path.join(scratch,'operation-subtraction.svg');await(await download).saveAs(file);const svg=fs.readFileSync(file,'utf8');assert.ok(svg.includes('Geometric tests'));assert.ok(svg.includes('2,633'));assert.ok(!/<(?:image|foreignObject)\b/.test(svg));await page.screenshot({path:path.join(scratch,'operation-subtraction-4k.png')});assert.deepEqual(errors,[]);
  console.log('✓ Counted-work readouts are native selectable text and remain vector text in SVG export.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
