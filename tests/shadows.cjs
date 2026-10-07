/* Shadow-tab regressions: shared scene, real cut boundaries and final-only view. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html';
const scratch=path.resolve(__dirname,'../.codex-scratch.nosync');fs.mkdirSync(scratch,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3840,height:2160},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url+'#shadows');await page.waitForFunction(()=>window.visibilityLab?.version===4);
  for(const phase of [0,.35,.65,1]){
   await page.evaluate(phase=>visibilityLab.renderAt('shadows',phase),phase);
   assert.equal(await page.locator('[data-key=variant]').count(),0);
   assert.equal(await page.getByRole('button',{name:'Inter-building shadow',exact:true}).count(),0);
   const actual=await page.evaluate(()=>{
    const groups=[...document.querySelectorAll('[data-shadow-view]')],scene=shadowScene(state);
    return {error:visibilityLab.snapshot().error,stage:scene.part,faces:scene.faces.length,edges:scene.lines.length,groups:groups.map(g=>({name:g.dataset.shadowView,stage:+g.dataset.stage,faces:+g.dataset.faceCount,edges:+g.dataset.edgeCount,renderedLines:g.querySelectorAll('line').length,transparent:g.querySelectorAll('polygon[fill-opacity]').length}))};
   });
   assert.equal(actual.error,null);assert.equal(actual.groups.length,2);
   for(const group of actual.groups){assert.equal(group.stage,actual.stage);assert.equal(group.faces,actual.faces);assert.equal(group.edges,actual.edges);assert.ok(group.renderedLines>0);if(phase>=.65)assert.ok(group.transparent>0,`${group.name} misses the extrusion`);else assert.equal(group.transparent,0);}
  }
  console.log('✓ Plan and 3D share classified faces, silhouettes, extrusions, shading and cuts at every stage; first-tab mode selector removed.');

  const cuts=await page.evaluate(()=>{const d=urbanData(state.light),physical=d.surfaces.filter(f=>f.kind==='building'||URBAN3.receivers[f.owner].face===0);return {old:physical.flatMap(f=>cutEdges(f.poly,URBAN3.receivers[f.owner].poly)).length,clean:urbanReceiverCuts(d).length};});
  assert.ok(cuts.clean>0&&cuts.clean<cuts.old,JSON.stringify(cuts));console.log('✓ Internal fragment outlines removed:',cuts);
  await page.screenshot({path:path.join(scratch,'shadows-construction-4k.png')});

  await page.locator('[data-key=construction]').uncheck();
  assert.equal(await page.locator('#explanationTitle').innerText(),'Visible and shadowed surfaces');
  for(const id of ['play','restart','prev','next','phase','duration'])assert.equal(await page.locator('#'+id).isDisabled(),true);
  let geometry=null;
  for(const phase of [0,.35,.65,1]){
   await page.evaluate(phase=>visibilityLab.renderAt('shadows',phase,{construction:false}),phase);
   const result=await page.evaluate(()=>{
    const scene=shadowScene(state);return {error:visibilityLab.snapshot().error,stage:scene.part,orangeFaces:scene.faces.filter(f=>f.color===C.orange).length,constructionEdges:scene.lines.filter(l=>l.color===C.orange||l.color===C.teal).length,geometry:document.querySelector('[data-shadow-view=main]').innerHTML.replace(/world-clip-\d+/g,'world-clip'),transparent:document.querySelectorAll('[data-shadow-view] polygon[fill-opacity]').length};
   });
   assert.equal(result.error,null);assert.equal(result.stage,3);assert.equal(result.orangeFaces,0);assert.equal(result.constructionEdges,0);assert.equal(result.transparent,0);
   if(geometry!==null)assert.equal(result.geometry,geometry);geometry=result.geometry;
  }
  console.log('✓ Construction off shows identical final shaded geometry at every phase; no extrusion, silhouette or cut lines.');
  await page.screenshot({path:path.join(scratch,'shadows-shading-4k.png')});

  for(const kind of ['lightPlan','light']){
   const before=await page.evaluate(()=>visibilityLab.getState());
   const coords=await page.evaluate(kind=>{const target=visibilityLab.hitTargets().find(t=>t.kind===kind),m=document.querySelector('#view').getScreenCTM(),q=visibilityLab.getState().light,b=target.m?target.m.p([q[0]+2,q[1]+1]):target.cam.p([q[0]+2,q[1]+1,q[2]]),a=new DOMPoint(...target.point).matrixTransform(m),z=new DOMPoint(...b).matrixTransform(m);return {a:[a.x,a.y],b:[z.x,z.y]};},kind);
   await page.mouse.move(...coords.a);await page.mouse.down();await page.mouse.move(...coords.b,{steps:3});await page.mouse.up();
   const after=await page.evaluate(()=>visibilityLab.getState());assert.ok(Math.hypot(after.light[0]-before.light[0]-2,after.light[1]-before.light[1]-1)<.03);assert.equal(after.light[2],before.light[2]);assert.equal(after.construction,false);
  }
  console.log('✓ Source dragging updates final shading accurately from both views.');

  // Exports preserve the final-only view and its disabled transport afterwards.
  await page.locator('#exportMode').selectOption('panel');const pending=page.waitForEvent('download');await page.locator('#svg').click();const dl=await pending;const svgPath=path.join(scratch,'shadows-shading.svg');await dl.saveAs(svgPath);const svg=fs.readFileSync(svgPath,'utf8');assert.ok(svg.includes('Visible and shadowed surfaces'));assert.ok(!svg.includes('Construct, then paint every receiver'));assert.ok(!/<(?:image|foreignObject)\b/.test(svg));assert.equal(await page.locator('#play').isDisabled(),true);
  const settings=await page.evaluate(()=>visibilityLab.getState()),settingsPath=path.join(scratch,'shadow-settings.json');fs.writeFileSync(settingsPath,JSON.stringify(settings));await page.locator('#reset').click();await page.locator('#load').setInputFiles(settingsPath);await page.waitForFunction(s=>JSON.stringify(visibilityLab.getState())===JSON.stringify(s),settings);
  await page.locator('[data-key=construction]').check();assert.equal(await page.locator('#play').isDisabled(),false);await page.locator('#restart').click();assert.equal(await page.locator('#explanationTitle').innerText(),'Which faces face the source?');
  await page.locator('#panelToggle').uncheck();assert.equal(await page.locator('[data-key=variant]').count(),0);
  await page.locator('#nav button[data-id=terrain]').click();assert.equal(await page.locator('[data-key=variant]').count(),1);assert.equal(await page.locator('[data-key=construction]').count(),0);
  console.log('✓ Toggle survives save/load and SVG export, restores construction controls, and leaves other tabs’ modes available.');

  // Legacy surface-only settings migrate to the new toggle.
  const legacy=await page.evaluate(()=>validate({scene:'shadows',variant:'surface',phase:.2}));assert.equal(legacy.variant,'construct');assert.equal(legacy.construction,false);
  for(const [width,height] of [[1920,1080],[3840,2160]]){await page.setViewportSize({width,height});await page.evaluate(()=>visibilityLab.renderAt('shadows',1,{construction:true}));await page.screenshot({path:path.join(scratch,`shadows-construction-${width}.png`)});}
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
