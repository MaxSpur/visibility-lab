/* Native HTML/SVG layout checks. Run against the new V4 localhost artifact. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const URL=process.env.V4_URL||'http://127.0.0.1:8764/visibility-lab-v4.html';
const OUT=path.resolve(__dirname,'../.codex-scratch.nosync');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const reports=[],failures=[],pageErrors=[];let captures=0;
 try{
 for(const [width,height] of [[3840,2160],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>pageErrors.push({width,message:e.message}));
  await page.goto(URL);await page.waitForFunction(()=>window.visibilityLab?.version===4);
  const {modes,defaults}=await page.evaluate(()=>({modes:MODES.map(m=>({id:m.id,variants:m.variants.map(v=>v[0])})),defaults:visibilityLab.getState()}));
  assert.equal(modes.length,8,'Only the eight requested demonstration tabs remain');
  const branding=await page.evaluate(async()=>{
   const images=[...document.querySelectorAll('.brand-links img')];
   await Promise.all(images.map(i=>i.decode()));
   const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,centerY:r.y+r.height/2};};
   return{images:images.map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0,rect:rect(i),href:i.closest('a').href})),title:document.querySelector('h1').textContent,author:{text:document.querySelector('.author-link').textContent,href:document.querySelector('.author-link').href,rect:rect(document.querySelector('.author-link'))},header:rect(document.querySelector('.lab-header'))};
  });
  assert.deepEqual(branding.images.map(i=>i.alt),['Geovis','LASTIG','IGN','Géodata Paris','Université Gustave Eiffel']);
  assert.deepEqual(branding.images.map(i=>i.href),['https://www.umr-lastig.fr/geovis/','https://www.umr-lastig.fr/','https://www.ign.fr/','https://geodata-paris.fr/','https://www.univ-gustave-eiffel.fr/']);
  assert.equal(branding.title,'Geometric Visibility Lab');
  assert.equal(branding.author.text,'MAXIM SPUR');
  assert.equal(branding.author.href,'https://www.umr-lastig.fr/maxim-spur/');
  for(const i of branding.images)assert.ok(i.loaded&&i.rect.width>0&&i.rect.height>0&&i.rect.right<=width&&i.rect.bottom<=height,'Logo loaded and visible: '+i.alt);
  const centers=branding.images.map(i=>i.rect.centerY);
  assert.ok(Math.max(...centers)-Math.min(...centers)<1,'Logo artwork boxes share one vertical center');
  for(let i=1;i<branding.images.length;i++)assert.ok(branding.images[i].rect.x>=branding.images[i-1].rect.right,'Affiliations retain the requested visual order');
  assert.ok(branding.author.rect.right<=width&&branding.author.rect.x>branding.images.at(-1).rect.right,'Author stays at the upper right without overlapping affiliations');
  const cases=[];
  for(const mode of modes)for(const variant of mode.variants)for(const phase of [0,.5,1])for(const panel of [true,false])cases.push({scene:mode.id,variant,phase,panel});
  for(const phase of [0,.35,.65,1])for(const panel of [true,false])cases.push({scene:'shadows',variant:'construct',phase,panel,construction:false});
  // Dense controls are layout-sensitive; solver budgets are low because this
  // test checks DOM layout, with numerical/high-density gates tested elsewhere.
  for(const variant of ['raycast','raster'])for(const panel of [true,false])cases.push({scene:'metrics',variant,phase:.5,panel,dimension:'3d',shadowEnvelope:true,sampleWire:true});
  for(const dimension of ['2d','3d'])cases.push({scene:'cost',variant:'bench',phase:.5,panel:true,dimension});
  for(const method of ['raycast','raster'])for(const phase of [0,.5,1])cases.push({scene:'metrics',variant:method,dimension:'2d',metric:'walls',phase,panel:true});
  cases.push({scene:'metrics',variant:'raycast',phase:.5,panel:true,dimension:'3d',stressControls:true});
  let frames=0;const panelTops=[];
  for(const settings of cases){
   await page.evaluate(s=>visibilityLab.setState(s),{...defaults,...settings});
   if(settings.stressControls)await page.evaluate(()=>{const c=document.getElementById('controls'),sample=c.querySelector('.setting');while(c.children.length<20)c.append(sample.cloneNode(true));});
   const data=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const get=id=>rect(document.getElementById(id)),ex=document.getElementById('explanation'),panel=!ex.hidden&&getComputedStyle(ex).display!=='none',buttonRects=[...document.querySelectorAll('#nav button')].map(rect);
    return {error:visibilityLab.snapshot().error,viewport:{width:innerWidth,height:innerHeight},demo:get('presentation'),stage:get('stage'),controls:get('controls'),toolrow:rect(document.querySelector('.toolrow')),transport:rect(document.querySelector('.transport')),nav:get('nav'),buttonRects,panel,panelRect:get('explanation'),title:get('explanationTitle'),body:get('explanationBody'),footer:get('explanationFooter'),panelScroll:{height:ex.scrollHeight,clientHeight:ex.clientHeight,width:ex.scrollWidth,clientWidth:ex.clientWidth},pageWidth:document.documentElement.scrollWidth,controlCount:document.getElementById('controls').children.length,titleText:document.getElementById('explanationTitle').textContent};
   });
   const issues=[];
   if(data.error)issues.push('render error: '+data.error);
   for(const key of ['demo','stage','controls','toolrow','transport','nav']){const r=data[key];if(r.x<-.5||r.y<-.5||r.right>width+.5||r.bottom>height+.5)issues.push(key+' outside viewport: '+JSON.stringify(r));}
   if(Math.abs(data.demo.height-height)>.5)issues.push('demo height differs from viewport');
   if(data.pageWidth>width)issues.push('horizontal page overflow');
   if(new Set(data.buttonRects.map(r=>Math.round(r.y))).size!==1)issues.push('nav buttons wrap');
   for(const r of data.buttonRects)if(r.right>width+.5||r.x<-.5)issues.push('nav button outside viewport');
   if(settings.scene==='cost'){
    if(data.panel)issues.push('benchmark explanation panel should be hidden');
    if(data.transport.width!==0||data.transport.height!==0)issues.push('benchmark playback controls should be hidden');
   }
   if(data.panel){
    if(data.panelScroll.height>data.panelScroll.clientHeight+1||data.panelScroll.width>data.panelScroll.clientWidth+1)issues.push('explanation requires scrolling: '+JSON.stringify(data.panelScroll));
    if(data.footer.bottom>data.panelRect.bottom+1||data.body.bottom>data.panelRect.bottom+1)issues.push('explanation content extends beyond panel');
    if(data.body.bottom>data.footer.y+1)issues.push('explanation body overlaps anchored readouts');
    panelTops.push({scene:settings.scene,variant:settings.variant,phase:settings.phase,title:data.titleText,titleY:data.title.y,bodyY:data.body.y,titleHeight:data.title.height});
   }
   const entry={width,height,settings,controlCount:data.controlCount,stage:data.stage,issues};reports.push(entry);frames++;
   if(issues.length){failures.push(entry);if(captures<8){const file=`layout-${width}-${settings.scene}-${settings.variant}-${settings.phase}-${captures}.png`;await page.screenshot({path:path.join(OUT,file),fullPage:false});entry.screenshot=file;captures++;}}
  }
  // Stable title slots within a given stage position: controls can legitimately
  // alter the stage height, but title/body top must not depend on title length.
  const titleOffsets=await page.evaluate(()=>({gap:parseFloat(getComputedStyle(document.getElementById('explanation')).gap)}));
  const relative=panelTops.map(p=>p.bodyY-p.titleY),heights=panelTops.map(p=>p.titleHeight);
  if(Math.max(...relative)-Math.min(...relative)>1||Math.max(...heights)-Math.min(...heights)>1)failures.push({width,height,issues:['title/body offset or fixed two-line title height varies'],relativeRange:[Math.min(...relative),Math.max(...relative)],heightRange:[Math.min(...heights),Math.max(...heights)],titleOffsets});
  console.log(JSON.stringify({width,height,frames,failures:failures.filter(f=>f.width===width).length,maxControlCount:Math.max(...reports.filter(r=>r.width===width).map(r=>r.controlCount))}));
  await page.close();
 }
 fs.writeFileSync(path.join(OUT,'layout-report.json'),JSON.stringify({checked:reports.length,pageErrors,failures,reports},null,2));
 console.log(JSON.stringify({checked:reports.length,pageErrors,failures:failures.length,report:path.join(OUT,'layout-report.json')}));
 assert.equal(pageErrors.length,0,'No JavaScript page errors');assert.equal(failures.length,0,'Native layout fits projector viewports');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
