/* Stage framing, linked scene geometry, picked-target output and native exports. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const scratch=path.resolve(__dirname,'../.codex-scratch.nosync');fs.mkdirSync(scratch,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3840,height:2160},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html#air');await page.waitForFunction(()=>window.visibilityLab);
  const frames=await page.evaluate(()=>{visibilityLab.renderAt('air',0,{density:'regular',variant:'branch'});return stepCount;});
  for(const k of [0,1,2,15,16,17,frames-3,frames-2,frames-1]){
   const data=await page.evaluate(({k,frames})=>{
    visibilityLab.renderAt('air',(k+.1)/frames,{variant:'branch',density:'regular'});
    const s=visibilityLab.snapshot(),d=terrainState(state),e=getBeams(d),active=e.visits[s.panel.progress.index-1],part=k%3,cell=clipCell(d.model.cells[active.cell],active.beam),rect=terrainLayout(state).detail,{whole,points,pc,frame}=beamDetailFrame(d,active,part,cell,rect),m=mapFit(rect,frame),center=m.p(pc.point(centroid(points))),labels=which=>[...document.querySelectorAll(`[data-terrain-vertices=${which}] [data-point-label]`)].map(el=>el.dataset.pointLabel),green=document.querySelector('[data-observer-highlights]');
    return {error:s.error,part:s.panel.progress.part,detail:document.querySelector('[data-terrain-view=detail]').dataset,main:document.querySelector('[data-terrain-view=main]').dataset,plan:document.querySelector('[data-terrain-view=plan]').dataset,center,rect,whole:whole.map(p=>m.p(pc.point(p))),depths:whole.map(p=>dot(sub(p,d.q),pc.f)),labels:[labels('main'),labels('observer')],overlay:document.querySelectorAll('[data-current-face-overlay] path').length,greenEdges:green.querySelectorAll('path[stroke]').length,greenFaces:green.querySelectorAll('path[fill]:not([fill=none])').length,svg:document.querySelector('#view').outerHTML};
   },{k,frames});
   assert.equal(data.error,null);assert.equal(data.part,k%3);assert.equal(Number(data.detail.step),k%3);
   assert.ok(Math.abs(data.center[0]-(data.rect.x+data.rect.w/2))<1e-6);assert.ok(Math.abs(data.center[1]-(data.rect.y+data.rect.h/2))<1e-6,'detail centers on current geometry');
   for(const p of data.whole){assert.ok(p[0]>=data.rect.x-1&&p[0]<=data.rect.x+data.rect.w+1,'whole face fits horizontally at every stage');assert.ok(p[1]>=data.rect.y-1&&p[1]<=data.rect.y+data.rect.h+1,'whole face fits vertically at every stage');}
   assert.ok(data.depths.every(z=>z>.01),'whole face stays in front of the observer camera');assert.deepEqual(data.labels[0],data.labels[1],'every vertex letter appears in both views');assert.ok(['A','B','C'].every(l=>data.labels[0].includes(l)));assert.ok(data.overlay>0,'whole face is overlaid above context');if(k%3>=1)assert.ok(data.greenEdges>0,'highlighted cell edges are projected too');if(k%3===2)assert.ok(data.greenFaces>0,'highlighted cell and terrain fills keep their green color');
   assert.equal(data.main.faceCount,data.plan.faceCount);assert.equal(data.main.edgeCount,data.plan.edgeCount);assert.ok(!/NaN|Infinity/.test(data.svg));
  }
  console.log('✓ Every stage fits the whole face, projects green construction geometry and matches all vertex letters; plan reuses every main face and edge.');
  const coverage=await page.evaluate(()=>{let checked=0;for(const density of ['coarse','regular','fine'])for(const qxy of [[9,35],[42,30]]){visibilityLab.renderAt('air',0,{density,qxy,variant:'branch'});const d=terrainState(state),e=getBeams(d),rect=terrainLayout(state).detail;for(const active of e.visits.filter(v=>v.whole)){const cell=clipCell(d.model.cells[active.cell],active.beam);for(const part of [0,1,2]){const {whole,pc,frame}=beamDetailFrame(d,active,part,cell,rect),box=bboxOf(frame,2);for(const p of whole){const uv=pc.point(p);if(dot(sub(p,d.q),pc.f)<=.01||!uv.every(Number.isFinite)||uv.some((v,i)=>v<box.lo[i]-1e-7||v>box.hi[i]+1e-7))return {error:{density,qxy,part,cell:active.cell},checked};}checked++;}}}return {error:null,checked};});
  assert.equal(coverage.error,null,JSON.stringify(coverage.error));console.log(`✓ Whole-face framing covers ${coverage.checked} construction stages across all terrain densities and two observer positions.`);
  await page.evaluate(()=>visibilityLab.renderAt('air',.321,{variant:'branch',density:'regular',qxy:[9,35],airWire:true,airOpacity:.65}));await page.screenshot({path:path.join(scratch,'terrain-beam-detail-4k.png')});
  const wire=await page.evaluate(()=>{const before=document.querySelector('[data-terrain-view=main]').dataset.edgeCount;visibilityLab.setState({airWire:false});return [Number(before),Number(document.querySelector('[data-terrain-view=main]').dataset.edgeCount)];});assert.ok(wire[0]>wire[1]);
  await page.screenshot({path:path.join(scratch,'terrain-beam-detail-clean-4k.png')});
  const ids=await page.evaluate(()=>{const d=terrainState(state),ref=getReference(d);const area=i=>ref.pieces[i].polys.reduce((n,p)=>n+area3(p),0);return [chooseProjection(d),d.model.tris.findIndex((p,i)=>area(i)<1e-7),d.model.tris.findIndex((p,i)=>Math.abs(area3(p)-area(i))<1e-7)];});
  for(const id of ids.filter(i=>i>=0)){
   const data=await page.evaluate(id=>{visibilityLab.renderAt('air',.66,{variant:'project',face:id,viewFocus:false});const d=terrainState(state),b=beamTarget(d,id),ref=getReference(d),labels=which=>[...document.querySelectorAll(`[data-terrain-vertices=${which}] [data-point-label]`)].map(el=>el.dataset.pointLabel);return {id:visibilityLab.snapshot().panel.stats[0][1],beam:b.visible.reduce((n,p)=>n+area3(p),0),reference:ref.pieces[id].polys.reduce((n,p)=>n+area3(p),0),labels:[labels('main'),labels('observer')],viewport:document.querySelector('[data-projection-viewport]')!==null,error:visibilityLab.snapshot().error};},id);
   assert.equal(data.error,null);assert.equal(Number(data.id),id);assert.ok(Math.abs(data.beam-data.reference)<1e-5,'picked face has matching continuous beam/shadow output');assert.equal(data.viewport,false,'beam view has no projected copy');assert.deepEqual(data.labels[0],data.labels[1],'all target and cut letters match, even with a legacy unfocused setting');
  }
  await page.evaluate(()=>visibilityLab.renderAt('air',.66,{variant:'project'}));await page.screenshot({path:path.join(scratch,'terrain-beam-target-4k.png')});
  await page.evaluate(()=>visibilityLab.renderAt('projection',.66,{viewFocus:true}));assert.equal(await page.locator('[data-projection-viewport] path').count(),4,'projected copy is framed by four viewport edges');
  for(const style of await page.locator('[data-point-label]').evaluateAll(es=>es.map(e=>({stroke:e.getAttribute('stroke'),order:e.getAttribute('paint-order')})))){assert.equal(style.stroke,'#fff');assert.equal(style.order,'stroke fill');}
  await page.screenshot({path:path.join(scratch,'terrain-projection-viewport-4k.png')});
  await page.locator('#exportMode').selectOption('panel');const promise=page.waitForEvent('download');await page.locator('#svg').click();const download=await promise,file=path.join(scratch,'terrain-projection-viewport.svg');await download.saveAs(file);const svg=fs.readFileSync(file,'utf8');assert.ok(svg.includes('data-projection-viewport'));assert.ok(svg.includes('Geometric tests'));assert.ok(!/<(?:image|foreignObject)\b/.test(svg));
  assert.deepEqual(errors,[]);console.log('✓ Selected hidden/partial/visible targets agree between solvers; viewport frame, readable point labels and SVG export verified.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
