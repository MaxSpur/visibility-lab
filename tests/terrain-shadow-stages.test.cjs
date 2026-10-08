const fs=require('fs'),vm=require('vm');
global.document={getElementById:()=>({innerHTML:''})};
const source=__dirname+'/../source/';
vm.runInThisContext(['geometry.js','operation-counts.js','shadow-stages.js','receiver-boundaries.js','svg-world.js','svg-context.js','scenes.js','terrain-views.js','terrain-shadow-stages.js'].map(f=>fs.readFileSync(source+f,'utf8')).join('\n')+String.raw`
const check=(ok,message)=>{if(!ok)throw Error(message);},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
const model=inputTerrain(3,2),q=[20,30,terrainZ(20,30)+4],d={q,model:{...model,roof:Math.max(model.peak,q[2])+1}};
for(const order of ['near','spiral','mesh']){
 const s={...DEFAULT,scene:'terrain',variant:'all',order},trace=terrainSubtractionData(d,order),expected=measureSolverWork(()=>referenceSurface3(q,model.tris,occluderOrder(model.tris,q,order)));
 let previous=finishSolverWork(emptySolverWork()),changed=false;
 for(let step=0;step<1+4*trace.entries.length;step++){
  const scene=terrainSubtractionScene({...s,phase:step/(4*trace.entries.length)},d);
  check(scene.stage===step,'Slider selected wrong stage');
  for(const key of Object.keys(emptySolverWork()))check(scene.work[key]>=previous[key],'Counter decreased: '+key);previous=scene.work;
  if(scene.part===2&&scene.entry.changed){changed=true;check(scene.faces.some(f=>f.color===C.orangeLight),'Overlap patches absent');}
  check(scene.faces.every(f=>f.poly.flat().every(Number.isFinite)),'Nonfinite display geometry');
 }
 const final=terrainSubtractionScene({...s,phase:1},d);equal(final.work,expected.work,'Final operation counts differ');equal(final.pieces,expected.value.pieces,'Final receiver pieces differ');check(Math.abs(final.surfaces.reduce((a,f)=>a+area3(f.poly),0)-expected.value.area)<1e-8,'Final area differs');check(final.final&&final.part===3,'Missing final retained stage');
 check(!final.faces.some(f=>[C.orange,C.orangeLight,C.purple].includes(f.color))&&!final.lines.some(f=>[C.orange,C.orangeLight,C.purple].includes(f.color)),'Construction remains in final scene');check(changed,'Fixture did not exercise overlap');
}
// Render through the real vector path and check the main/plan scene metadata.
const renderState={...DEFAULT,scene:'terrain',variant:'all',density:'coarse',phase:1};ctx.reset();hitTargets=[];drawTerrainSubtraction(renderState);const svg=ctx.parts.join('');
check(svg.includes('data-terrain-sequence="true"')&&svg.includes('data-final="true"'),'Missing clean final metadata');const main=svg.match(/data-terrain-view="main" data-face-count="(\d+)" data-edge-count="(\d+)"/),plan=svg.match(/data-terrain-view="plan" data-face-count="(\d+)" data-edge-count="(\d+)"/);check(main&&plan&&main[1]===plan[1]&&main[2]===plan[2],'Main and plan differ');check(panelData.progress.kind==='terrainSequence','Counter scope missing');check(hitTargets.every(t=>!t.selectFaces),'Accumulation accidentally enables selection');
console.log('PASS: all terrain occluder orders, exact final output/work, progressive checkpoints, overlap patches, clean final scene, shared main/plan metadata.');
`);
