const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html';
const scratch=path.resolve(__dirname,'../.codex-scratch.nosync');
fs.mkdirSync(scratch,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3840,height:2160}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await page.waitForFunction(()=>window.visibilityLab?.version===4);
  for(const [width,height] of [[3840,2160],[1920,1080]]){
   await page.setViewportSize({width,height});
   for(const [scene,variant] of [['shadows','construct'],['expansion','expand'],['air','branch'],['terrain','one'],['projection','project']]){
    const positions=[];
    for(const phase of [0,.35,.65,1]){
     await page.evaluate(s=>visibilityLab.renderAt(s.scene,s.phase,{variant:s.variant,panel:true}),{scene,variant,phase});
     const p=await page.evaluate(()=>{
      const stats=document.querySelector('#explanationFooter .stats'),title=document.querySelector('#explanationTitle'),mode=document.querySelector('[data-key=variant]'),legend=document.querySelector('#explanationFooter .legend');
      return {modeBottom:mode?.getBoundingClientRect().bottom??null,titleTop:title.getBoundingClientRect().top,titleFont:parseFloat(getComputedStyle(title).fontSize),rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),statsTop:stats.getBoundingClientRect().top,statsBottom:stats.getBoundingClientRect().bottom,legendTop:legend.getBoundingClientRect().top,error:visibilityLab.snapshot().error};
     });
     assert.equal(p.error,null);if(scene==='shadows')assert.equal(p.modeBottom,null);else assert.ok(p.modeBottom<p.titleTop);assert.ok(p.titleFont>=p.rootFont*1.4);assert.ok(p.statsBottom<p.legendTop);positions.push(p.statsTop);
    }
    assert.ok(Math.max(...positions)-Math.min(...positions)<1,`${scene} stats move with the step: ${positions}`);
   }
  }
  console.log('✓ Mode dropdown precedes larger titles; readouts stay fixed above legends across changing steps at 4K/1080p.');

  // Hiding the explanation must leave the mode selector available.
  await page.locator('#panelToggle').uncheck();assert.equal(await page.locator('#controls [data-key=variant]').count(),1);
  await page.locator('[data-key=variant]').selectOption('project');assert.equal((await page.evaluate(()=>visibilityLab.getState())).variant,'project');
  await page.locator('#panelToggle').check();assert.equal(await page.locator('#demonstrationControls [data-key=variant]').count(),1);assert.equal(await page.locator('#controls [data-key=variant]').count(),0);
  console.log('✓ Mode selection remains accessible with the explanation hidden.');

  // Numeric field formatting follows real drag updates without rounding saved radians.
  await page.evaluate(()=>visibilityLab.renderAt('shadows',.5,{panel:true,yaw:-.9591999499368062,pitch:.8981400394178201}));
  const state=await page.evaluate(()=>visibilityLab.getState());
  assert.equal(await page.locator('input[type=number][data-key=yaw]').inputValue(),'-55.0');
  assert.equal(await page.locator('input[type=number][data-key=pitch]').inputValue(),'51.5');
  assert.equal(state.yaw,-.9591999499368062);assert.equal(state.pitch,.8981400394178201);
  for(const degrees of ['1.0','89.0']){
   const field=page.locator('input[type=number][data-key=pitch]');await field.fill(degrees);await field.press('Tab');
   const s=await page.evaluate(()=>visibilityLab.snapshot());assert.equal(s.error,null);assert.ok(Math.abs(s.state.pitch*180/Math.PI-Number(degrees))<1e-8);
  }
  await page.locator('input[type=number][data-key=yaw]').fill('179.9');await page.locator('input[type=number][data-key=yaw]').press('Tab');
  assert.equal(await page.locator('input[type=number][data-key=yaw]').inputValue(),'179.9');
  console.log('✓ One-decimal degree readouts retain saved radian precision and accept the wider camera range.');

  await page.evaluate(()=>visibilityLab.renderAt('shadows',.5,{panel:true}));
  const before=await page.evaluate(()=>visibilityLab.getState());
  const drag=await page.evaluate(()=>{const t=visibilityLab.hitTargets().find(t=>t.cam),m=document.querySelector('#view').getScreenCTM(),a=new DOMPoint(t.rect.x+45,t.rect.y+90).matrixTransform(m),b=new DOMPoint(t.rect.x+105,t.rect.y+90).matrixTransform(m);return {a:[a.x,a.y],b:[b.x,b.y]};});
  await page.mouse.move(...drag.a);await page.mouse.down();await page.mouse.move(...drag.b,{steps:3});await page.mouse.up();
  const after=await page.evaluate(()=>visibilityLab.getState());assert.ok(after.yaw<before.yaw);assert.deepEqual(after.light,before.light);assert.deepEqual(after.qxy,before.qxy);
  assert.match(await page.locator('input[type=number][data-key=yaw]').inputValue(),/^-?\d+\.\d$/);
  console.log('✓ Rightward orbit drag uses the corrected direction and leaves the observer fixed.');

  await page.evaluate(()=>visibilityLab.renderAt('shadows',.52,{panel:true,exportMode:'panel'}));
  const svg=await page.evaluate(()=>visibilityLab.exportSVG('panel'));
  assert.ok(!svg.includes('Construct, then paint every receiver'));assert.ok(!svg.includes('Demonstration'));assert.ok(svg.includes('Source elevation'));assert.ok(!svg.includes('Optional: complementary visible air'));assert.ok(!/<(?:image|foreignObject)\b/.test(svg));
  await page.setViewportSize({width:3840,height:2160});await page.evaluate(()=>visibilityLab.renderAt('shadows',.52,{panel:true}));await page.screenshot({path:path.join(scratch,'shared-ui-4k.png')});
  assert.deepEqual(errors,[]);console.log('✓ Vector panel export omits the removed shadow mode and includes anchored readouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
