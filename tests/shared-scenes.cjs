const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const get=()=>page.evaluate(()=>visibilityLab.getState()),set=s=>page.evaluate(s=>visibilityLab.setState(s),s),tab=id=>page.locator(`#nav button[data-id=${id}]`).click();
 try{
  await page.goto(process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html');await page.waitForFunction(()=>window.visibilityLab);
  await page.evaluate(()=>visibilityLab.renderAt('expansion',.45,{map:0,q2:[12,12],variant:'locate',yaw:.3}));
  await tab('subtraction');assert.deepEqual((await get()).q2,[12,12]);assert.equal((await get()).map,0);
  await set({q2:[12,50]});await tab('events');assert.deepEqual((await get()).q2,[12,50]);
  await tab('expansion');let s=await get();assert.deepEqual(s.q2,[12,50]);assert.equal(s.variant,'locate');assert.equal(s.phase,.45);assert.equal(s.yaw,.3);
  await page.locator('select[data-key=map]').selectOption('1');await set({q2:[10,10]});await tab('subtraction');assert.equal((await get()).map,1);assert.deepEqual((await get()).q2,[10,10]);
  await page.locator('select[data-key=map]').selectOption('0');assert.deepEqual((await get()).q2,[12,50]);
  await page.locator('select[data-key=map]').selectOption('1');assert.deepEqual((await get()).q2,[10,10]);
  const drag=await page.evaluate(()=>{const t=visibilityLab.hitTargets().find(t=>t.kind==='map2'),matrix=document.querySelector('#view').getScreenCTM(),a=new DOMPoint(...t.point).matrixTransform(matrix),b=new DOMPoint(...t.m.p([13,15])).matrixTransform(matrix);return {a:[a.x,a.y],b:[b.x,b.y]};});
  await page.mouse.move(...drag.a);await page.mouse.down();await page.mouse.move(...drag.b,{steps:3});await page.mouse.up();await tab('events');s=await get();assert.ok(Math.hypot(s.q2[0]-13,s.q2[1]-15)<.2,JSON.stringify({q:s.q2,drag}));await set({q2:[10,10]});
  console.log('✓ Plan tabs share map/observer while retaining tab modes, phases and camera; every map remembers its own valid observer.');
  await page.evaluate(()=>visibilityLab.renderAt('air',.3,{qxy:[22,42],density:'coarse',eye:11,ceiling:2.5,yaw:.6}));
  await tab('terrain');s=await get();assert.deepEqual(s.qxy,[22,42]);assert.equal(s.density,'coarse');assert.equal(s.eye,11);assert.equal(s.ceiling,2.5);
  await set({qxy:[30,48],eye:7,face:5});await tab('projection');assert.deepEqual((await get()).qxy,[30,48]);assert.equal((await get()).face,5);await tab('air');assert.equal((await get()).face,5);await tab('terrain');assert.equal((await get()).face,5);await tab('projection');
  await tab('metrics');await page.locator('select[data-key=dimension]').selectOption('3d');s=await get();assert.deepEqual(s.qxy,[30,48]);assert.equal(s.eye,7);assert.equal(s.density,'coarse');
  await page.locator('select[data-key=dimension]').selectOption('2d');s=await get();assert.equal(s.map,1);assert.deepEqual(s.q2,[10,10]);
  await tab('shadows');await set({light:[18,20,13]});await tab('air');assert.deepEqual((await get()).qxy,[30,48]);await tab('shadows');assert.deepEqual((await get()).light,[18,20,13]);
  console.log('✓ Terrain geometry, selected face, eye and ceiling synchronize across dimensional views; urban light remains its separate scene family.');
  await page.evaluate(()=>visibilityLab.renderAt('metrics',.25,{dimension:'2d',map:0,variant:'move'}));
  const displayed=await page.evaluate(()=>visibilityLab.hitTargets().find(t=>t.kind==='map2').m.inverse(visibilityLab.hitTargets().find(t=>t.kind==='map2').point));
  await tab('expansion');s=await get();assert.ok(Math.hypot(s.q2[0]-displayed[0],s.q2[1]-displayed[1])<1e-8);
  await set({q2:[12,12]});await tab('metrics');const returned=await page.evaluate(()=>{const t=visibilityLab.hitTargets().find(t=>t.kind==='map2');return t.m.inverse(t.point);});assert.ok(Math.hypot(returned[0]-12,returned[1]-12)<1e-8);
  console.log('✓ Retired sampling modes migrate to raycast and preserve the shared observer; resolution does not move it.');
  const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadPromise,fs=require('node:fs');const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(saved.sharedScenes.plan.observers.length,3);assert.deepEqual(saved.sharedScenes.urban.light,[18,20,13]);
  await page.locator('#load').setInputFiles({name:'sampling-settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  const restoredMoving=await page.evaluate(()=>{const t=visibilityLab.hitTargets().find(t=>t.kind==='map2');return t.m.inverse(t.point);});assert.ok(Math.hypot(restoredMoving[0]-12,restoredMoving[1]-12)<1e-8);
  await page.locator('#load').setInputFiles({name:'shared-settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...saved,scene:'shadows',variant:'construct'}))});
  await tab('subtraction');assert.deepEqual((await get()).q2,[12,12]);await tab('air');assert.deepEqual((await get()).qxy,[30,48]);
  await page.locator('#reset').click();await tab('projection');assert.deepEqual((await get()).qxy,[9,35]);
  assert.deepEqual(errors,[]);console.log('✓ Settings carry all family positions; reset applies to the shared current family.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
