const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html';
const scratch=path.resolve(__dirname,'../.codex-scratch.nosync');
fs.mkdirSync(scratch,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true}),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8764/')&&!r.url().startsWith('blob:'))remote.push(r.url());});
  try{
    await page.goto(url);await page.waitForFunction(()=>window.visibilityLab?.version===4);
    assert.equal(await page.locator('canvas,#record,#cancel').count(),0);
    assert.equal(await page.locator('#view image,#view foreignObject').count(),0);
    assert.equal(await page.locator('#view text').first().evaluate(el=>getComputedStyle(el).userSelect),'text');
    assert.equal(await page.locator('h1').innerText(),'Geometric Visibility Lab');
    console.log('✓ Native SVG view, selectable labels, no recorder or raster display.');

    // The same physical point must map correctly before and after panel resizing.
    for(const panel of [true,false]){
      await page.evaluate(panel=>visibilityLab.renderAt('expansion',.32,{panel,q2:[43,32]}),panel);
      await page.waitForFunction(panel=>document.querySelector('#explanation').hidden===!panel,panel);
      const p=await page.evaluate(()=>{const target=visibilityLab.hitTargets().find(t=>t.kind==='map2'),m=document.querySelector('#view').getScreenCTM(),a=new DOMPoint(...target.point).matrixTransform(m),b=new DOMPoint(...target.m.p([45,33])).matrixTransform(m);return {a:[a.x,a.y],b:[b.x,b.y]};});
      await page.mouse.move(...p.a);await page.mouse.down();await page.mouse.move(...p.b,{steps:3});await page.mouse.up();
      const q=await page.evaluate(()=>visibilityLab.getState().q2);assert.ok(Math.hypot(q[0]-45,q[1]-33)<.02,JSON.stringify(q));
    }
    console.log('✓ Observer dragging remains accurate with panel shown or hidden.');

    await page.evaluate(()=>visibilityLab.renderAt('projection',.65,{panel:true}));
    const before=await page.evaluate(()=>visibilityLab.getState());
    const r=await page.evaluate(()=>{const rect=visibilityLab.hitTargets().find(t=>t.cam).rect,m=document.querySelector('#view').getScreenCTM(),a=new DOMPoint(rect.x+45,rect.y+70).matrixTransform(m),b=new DOMPoint(rect.x+105,rect.y+90).matrixTransform(m);return {a:[a.x,a.y],b:[b.x,b.y]};});await page.mouse.move(...r.a);await page.mouse.down();await page.mouse.move(...r.b,{steps:3});await page.mouse.up();
    const after=await page.evaluate(()=>visibilityLab.getState());assert.notEqual(after.yaw,before.yaw);assert.deepEqual(after.qxy,before.qxy);
    console.log('✓ Orbit changes the illustration camera without moving the observer.');

    await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
    assert.equal(await page.locator('#nav').isVisible(),true);assert.equal(await page.locator('#controls').isVisible(),true);assert.equal(await page.locator('#svg').isVisible(),true);for(const section of ['#sceneDocs','#generalDocs'])assert.equal(await page.locator(section).isVisible(),false);
    await page.screenshot({path:path.join(scratch,'fullscreen-1080p.png')});
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
    console.log('✓ Whole-page fullscreen retains tabs, controls and exports.');

    await page.evaluate(()=>visibilityLab.renderAt('expansion',.45,{panel:true}));
    const old=await page.locator('#phase').inputValue();await page.locator('#next').click();assert.notEqual(await page.locator('#phase').inputValue(),old);
    await page.locator('#play').click();await page.waitForFunction(()=>+document.querySelector('#phase').value>.46);await page.locator('#play').click();assert.equal(await page.locator('#play').innerText(),'Play');
    // Selectable HTML explanations keep real DOM text.
    const selected=await page.locator('#explanationTitle').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const s=window.getSelection();s.removeAllRanges();s.addRange(r);return s.toString();});assert.ok(selected.length>5);
    console.log('✓ Stepping, playback and explanation text selection.');

    await page.evaluate(()=>visibilityLab.renderAt('terrain',1,{variant:'all',panel:false,exportMode:'panel'}));
    const title=await page.locator('#explanationTitle').textContent();
    for(const mode of ['graphics','panel']){
      await page.locator('#exportMode').selectOption(mode);
      const pending=page.waitForEvent('download');await page.locator('#svg').click();const dl=await pending;
      const file=path.join(scratch,mode+'.svg');await dl.saveAs(file);
      const text=fs.readFileSync(file,'utf8');assert.ok(!/<(?:image|foreignObject)\b/.test(text));assert.ok(!/\b(?:NaN|Infinity)\b/.test(text));
      const parsed=await page.evaluate(markup=>{const doc=new DOMParser().parseFromString(markup,'image/svg+xml');return {error:doc.querySelector('parsererror')?.textContent||null,polygons:doc.querySelectorAll('polygon').length,text:doc.documentElement.textContent};},text);
      assert.equal(parsed.error,null);assert.ok(parsed.polygons>140);if(mode==='panel')assert.ok(parsed.text.includes(title));else assert.ok(!parsed.text.includes(title));
      assert.equal(await page.locator('#explanation').isVisible(),false);
    }
    const pngPending=page.waitForEvent('download');await page.locator('#png').click();const png=await pngPending;const pngPath=path.join(scratch,'panel-export.png');await png.saveAs(pngPath);const bytes=fs.readFileSync(pngPath);assert.equal(bytes.readUInt32BE(16),3840);assert.ok(bytes.readUInt32BE(20)>500);
    console.log('✓ Graphics/panel SVG downloads contain vectors and parse as XML; PNG is 3840 px wide.');

    const saved=await page.evaluate(()=>visibilityLab.getState()),jsonPending=page.waitForEvent('download');await page.locator('#save').click();const json=await jsonPending,jsonPath=path.join(scratch,'settings.json');await json.saveAs(jsonPath);
    await page.locator('#reset').click();await page.locator('#load').setInputFiles(jsonPath);await page.waitForFunction(saved=>JSON.stringify(visibilityLab.getState())===JSON.stringify(saved),saved);
    console.log('✓ Save/load settings restores the demonstration configuration.');

    await page.evaluate(()=>visibilityLab.renderAt('cost',0));
    assert.equal(await page.locator('#nav button').count(),8);
    assert.equal(await page.locator('#nav button[data-id=events]').count(),0);
    assert.equal(await page.locator('[data-key=variant]').count(),0);
    assert.equal(await page.locator('.transport').isVisible(),false);
    assert.equal(await page.locator('#controls [data-key]').count(),0);
    assert.equal(await page.locator('#sceneDocs #detailDoc').count(),1);
    assert.equal(await page.locator('#generalDocs #workDetailDoc').count(),1);
    await page.getByRole('button',{name:'Run benchmarks',exact:true}).click();
    await page.waitForFunction(()=>visibilityLab.benchmark()?.rows?.length&&!benchmarkBusy,{},{timeout:240000});
    const result=await page.evaluate(()=>visibilityLab.benchmark());
    assert.equal(result.protocol.planCases,18);assert.equal(result.protocol.terrainCases,18);assert.equal(result.protocol.urbanCases,6);
    assert.equal(result.protocol.repeats,3);assert.equal(result.protocol.warmups,1);
    assert.equal(result.protocol.batching.targetMs,5);assert.equal(result.protocol.batching.maxBatch,4096);
    for(const record of result.cases){
      assert.ok(Number.isInteger(record.queryBatchSize)&&record.queryBatchSize>=1&&record.queryBatchSize<=4096,record.methodId);
      assert.equal(record.queryRuns.length,3);assert.equal(record.queryBatchElapsedMs.length,3);
      record.queryRuns.forEach((value,i)=>assert.equal(value,record.queryBatchElapsedMs[i]/record.queryBatchSize));
      if(record.recoveryBatchSize){assert.ok(Number.isInteger(record.recoveryBatchSize)&&record.recoveryBatchSize<=4096);assert.equal(record.recoveryRuns.length,3);assert.equal(record.recoveryBatchElapsedMs.length,3);record.recoveryRuns.forEach((value,i)=>assert.equal(value,record.recoveryBatchElapsedMs[i]/record.recoveryBatchSize));}
      else{assert.equal(record.recoveryBatchSize,0);assert.deepEqual(record.recoveryRuns,[]);assert.deepEqual(record.recoveryBatchElapsedMs,[]);}
    }
    assert.ok(result.rows.every(row=>row.query>0),'Every measured query median is positive after timer normalization');
    for(const methodId of ['expand2','wall2','ray2-linear','ray2-indexed','raster2','shadow3','beam3','ray3-linear','ray3-indexed','raster3','viewport3','urban3'])assert.ok(result.rows.some(r=>r.methodId===methodId),methodId);
    assert.ok(result.cases.every(r=>Number.isFinite(r.query)&&Number.isFinite(r.total)&&(r.error===null||Number.isFinite(r.error))));
    assert.ok(result.rows.every(r=>r.stats.total.q1<=r.stats.total.median&&r.stats.total.median<=r.stats.total.q3));
    assert.ok(await page.locator('#view text').count()>20,'Benchmark graph has accessible vector labels');
    assert.equal(await page.locator('.transport').isVisible(),false);
    fs.writeFileSync(path.join(scratch,'benchmarks-measured.json'),JSON.stringify(result,null,2));
    for(const [width,height] of [[3840,2160],[1920,1080]]){await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(scratch,`benchmarks-measured-${width}.png`)});}
    await page.locator('#nav button[data-id=expansion]').click();await page.locator('#tests').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Passed:'),{},{timeout:120000});
    console.log('✓ Graph-only fixed benchmarks cover every method, paired observer cases and spatial quartiles; independent geometry checks still run.');

    assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
    await page.setViewportSize({width:3840,height:2160});await page.evaluate(()=>visibilityLab.renderAt('projection',.65,{panel:true}));await page.screenshot({path:path.join(scratch,'v4-4k.png')});
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
