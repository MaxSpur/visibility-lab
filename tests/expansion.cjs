/* Point-location completion, independent wall tab, and technical reference. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.LAB_URL||'http://127.0.0.1:8764/visibility-lab-v4.html',scratch=path.resolve(__dirname,'../.codex-scratch.nosync');fs.mkdirSync(scratch,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3840,height:2160},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url+'#expansion');await page.waitForFunction(()=>window.visibilityLab?.version===4);
  assert.equal(await page.locator('#nav button').count(),9);
  assert.equal(await page.locator('[data-key=variant] option[value=subtract]').count(),0);
  const locations=await page.evaluate(()=>{
   const result=[];
   for(let map=0;map<3;map++)for(const locator of ['index','scan'])for(const point of [SCENES[map].observer,[43,32],[12,32]]){
    visibilityLab.renderAt('expansion',1,{variant:'locate',map,locator,q2:point});const d=twoData(state),first=d.e.loc.trace.findIndex(t=>t.kind==='triangle'&&t.found),trace=pointLocationSequence(d.e.loc);
    result.push({map,locator,full:d.e.loc.trace.length,first,shown:trace.length,last:trace.at(-1),steps:visibilityLab.snapshot().steps,title:panelData.title,boxes:trace.filter(t=>t.kind==='box').length,triangles:trace.filter(t=>t.kind==='triangle').length,readouts:panelData.stats});
   }
   // All incident roots must still seed expansion on a valid artificial edge.
   const scene=SCENES[0];let point;
   for(let i=0;i<scene.mesh.tris.length&&!point;i++)for(let j=0;j<3;j++)if(scene.mesh.adj[i][j]>=0){const t=scene.mesh.tris[i],p=mul(add(t[j],t[(j+1)%3]),.5);if(validObserver(p,scene)){point=p;break;}}
   visibilityLab.renderAt('expansion',1,{variant:'locate',q2:point});const d=twoData(state);result.push({edgeRoots:d.e.roots.length,area:d.e.area,reference:d.v.area,last:pointLocationSequence(d.e.loc).at(-1)});
   return result;
  });
  for(const item of locations){assert.equal(item.last.kind,'triangle');assert.equal(item.last.found,true);if(item.edgeRoots){assert.ok(item.edgeRoots>=2);assert.ok(Math.abs(item.area-item.reference)<1e-6);}else{assert.equal(item.shown,item.first+1);assert.equal(item.steps,item.shown);assert.equal(item.title,'All three side tests pass');assert.equal(item.readouts[0][1],String(item.boxes));assert.equal(item.readouts[1][1],String(item.triangles));}}
  assert.ok(locations.some(item=>item.shown<item.full));
  console.log('✓ Locator endpoint is the first successful triangle across maps and both strategies; shared-edge roots remain intact.');
  await page.evaluate(()=>visibilityLab.renderAt('expansion',.98,{variant:'locate',duration:2}));await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#phase').value==='1'&&document.querySelector('#play').textContent==='Play');
  assert.equal(await page.locator('#explanationTitle').textContent(),'All three side tests pass');assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#timingLabel').textContent(),'Duration');assert.equal(await page.locator('#duration').getAttribute('aria-label'),'Search duration');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#phase').inputValue(),'1');
  await page.evaluate(()=>visibilityLab.setState({duration:12}));await page.screenshot({path:path.join(scratch,'point-location-complete-4k.png')});
  console.log('✓ Point-location playback stops at 100%, holds its successful result, and cannot step into later rejected candidates.');

  await page.locator('#nav button[data-id=subtraction]').click();assert.equal(await page.locator('#nav button[data-id=subtraction]').getAttribute('aria-selected'),'true');assert.equal(await page.locator('[data-key=locator]').count(),0);assert.equal(await page.locator('[data-key=wire]').count(),0);assert.equal(await page.locator('#docTitle').innerText(),'2D visibility by subtracting wall shadows');
  for(const map of [0,1,2]){
   let previous=Infinity;
   const n=await page.evaluate(map=>{visibilityLab.renderAt('subtraction',0,{map,q2:SCENES[map].observer});return wallShadowData(state).edges.length;},map);
   for(let processed=0;processed<=n;processed++){
    const phase=processed===0?0:processed===n?1:(3*processed+.03)/(1+3*n);
    const result=await page.evaluate(phase=>{state.phase=phase;visibilityLab.render();const p=visibilityLab.snapshot();return {error:p.error,processed:p.panel.stats[0][1],area:p.panel.stats[1][1],value:wallShadowData(state).stats[Number(p.panel.stats[0][1].split('/')[0])].area,reference:visibility(state.q2,SCENES[state.map]).area};},phase);
    assert.equal(result.error,null);assert.equal(result.processed,`${processed} / ${n}`);assert.ok(result.value<=previous+1e-6);previous=result.value;if(processed===n)assert.ok(Math.abs(result.value-result.reference)<1e-6);
   }
  }
  console.log('✓ Standalone subtraction stages remove only candidate overlap and complete to the independent visibility area on all maps.');

  // Legacy expansion/subtract settings select the new tab rather than disappearing.
  const legacyPath=path.join(scratch,'legacy-wall-subtract.json');fs.writeFileSync(legacyPath,JSON.stringify({scene:'expansion',variant:'subtract',phase:.4,q2:[43,32]}));await page.locator('#load').setInputFiles(legacyPath);await page.waitForFunction(()=>visibilityLab.getState().scene==='subtraction');assert.ok(page.url().endsWith('#subtraction'));assert.equal(await page.locator('#nav button[data-id=subtraction]').getAttribute('aria-selected'),'true');
  await page.evaluate(()=>visibilityLab.renderAt('subtraction',8.03/49,{variant:'subtract'}));await page.locator('#exportMode').selectOption('panel');const pending=page.waitForEvent('download');await page.locator('#svg').click();const dl=await pending,svgPath=path.join(scratch,'wall-subtraction.svg');await dl.saveAs(svgPath);const svg=fs.readFileSync(svgPath,'utf8');assert.ok(svg.includes('Bound the shadow behind it'));assert.ok(!/<(?:image|foreignObject)\b/.test(svg));
  await page.screenshot({path:path.join(scratch,'wall-subtraction-4k.png')});
  console.log('✓ Saved subtraction settings migrate to the new tab; its SVG remains vector geometry with the current explanation.');

  const reference=await page.evaluate(()=>({docs:Object.entries(DOCS).map(([key,d])=>({key,method:d.method.replace(/<[^>]*>/g,''),detail:d.detail.replace(/<[^>]*>/g,''),cost:d.cost||COST_HTML,sources:d.sources||SOURCES_HTML})),glossary:ACRONYMS_HTML}));
  for(const doc of reference.docs){assert.ok(doc.detail.split(/\s+/).length>=220,`${doc.key}: insufficient implementation detail`);assert.ok(!/\b(?:v2|v3|V2|V3)\b|previous version|horizontal line in|mirroring that view/.test(doc.method+doc.detail+doc.cost+doc.sources));assert.ok(doc.detail.includes('#lab-glossary')||/Terms and (?:abbreviations|acronyms)/.test(doc.detail));}
  for(const acronym of ['CPU','GPU','CGAL','BVH','LOS','TIN','DEM','JIT','SVG','HTML','IEEE','SIGGRAPH','JASA','SDH','ID','GRASS'])assert.ok(reference.glossary.includes(acronym));
  const sourceTexts=reference.docs.flatMap(d=>[d.method,d.detail]);const words=[...new Set(sourceTexts.join(' ').match(/\b[A-Z]{2,}\b/g)||[])];for(const word of words)assert.ok(reference.glossary.includes(word),`Undefined acronym: ${word}`);
  // Definitions remain reachable while the mode bookmark remains correct.
  await page.getByText('Implementation details and precision',{exact:true}).click();await page.locator('#detailDoc a[href="#lab-glossary"]').click();assert.equal(await page.locator('#acronymDoc').evaluate(el=>el.closest('details').open),true);assert.ok(page.url().endsWith('#subtraction'));assert.equal(await page.locator('#detailDoc').evaluate(el=>el.closest('details').open),true);
  await page.locator('.docs').screenshot({path:path.join(scratch,'wall-subtraction-reference.png')});
  // Keyboard shortcuts include the new ninth tab; scene identity remains stable.
  await page.keyboard.press('9');assert.equal((await page.evaluate(()=>visibilityLab.getState())).scene,'events');await page.keyboard.press('3');assert.equal((await page.evaluate(()=>visibilityLab.getState())).scene,'subtraction');
  await page.evaluate(()=>visibilityLab.renderAt('subtraction',8.03/49,{variant:'subtract'}));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(scratch,'wall-subtraction-4k.png')});
  assert.deepEqual(errors,[]);console.log('✓ All nine reference sections explain current implementations and acronyms; glossary navigation preserves the tab, and shortcuts cover 1–9.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
