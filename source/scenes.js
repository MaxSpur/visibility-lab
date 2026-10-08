const MODES=[
 {id:'shadows',name:'1 · Shadow construction',variants:[['construct','Construct the silhouette shadow'],['subtract','Subtract shadows, face by face']]},
 {id:'subtraction',name:'2 · Subtract wall shadows',variants:[['subtract','Subtract shadows, wall by wall'],['result','Inspect the complete visible region']]},
 {id:'expansion',name:'3 · Expanding triangles',variants:[['expand','Locate → expand the complete isovist'],['locate','Find the observer triangle'],['opening','Inspect one clipped opening']]},
 {id:'air',name:'4 · Terrain: beams',variants:[['branch','Follow one beam, face by face'],['expand','Accumulate all terrain beams'],['project','Explain the cut of a selected terrain face']]},
 {id:'terrain',name:'5 · Terrain: shadow cuts',variants:[['one','Only the highlighted face’s shadow'],['all','Subtract shadows, face by face']]},
 {id:'projection',name:'6 · Terrain in the view',variants:[['project','Explain the projected cut'],['accumulate','Build the observer view, triangle by triangle']]},
 {id:'metrics',name:'7 · Geometry vs Raster',variants:[['raycast','Raycast'],['raster','Raster']]},
 {id:'cost',name:'8 · Benchmarks',variants:[['bench','Benchmarks']]}
];
const DEFAULT={scene:'shadows',variant:'construct',phase:0,duration:12,panel:true,map:0,q2:[43,32],qxy:[9,35],eye:8,light:[9,16,10],yaw:-.65,pitch:.78,zoom:1,wire:true,airWire:false,airOpacity:.65,cuts:true,history:true,labels:true,inset:true,construction:true,opening:0,locator:'index',ceiling:1,face:-1,order:'near',dimension:'2d',metric:'area',raySearch:'indexed',rays:48,sampleBudget:4096,cubeN:26,sampler:'surface',compare:'overlay',hidden:false,shadowEnvelope:false,sampleWire:false,viewFocus:true,showRays:true,rayDisplay:'hits',rayDrawLimit:128,candidates:false,density:'regular',rasterN:48,exportMode:'graphics'};
let state=structuredClone(DEFAULT),playing=false,lastTick=0,playStart=0,phaseStart=0,hitTargets=[],stepCount=1,exporting=false,panelData={},benchResult=null,benchmarkBusy=false;
const savedTabs=new Map(),cache=new Map();
function memo(key,fn){if(cache.has(key))return cache.get(key);const v=fn();cache.set(key,v);if(cache.size>14)cache.delete(cache.keys().next().value);return v;}
let lastSample={key:null,value:null},lastError={key:null,value:null};
const keyq=q=>q.map(v=>v.toFixed(6)).join(','),number=(v,d=1)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(a,b)=>b?`${a>=b?'+':''}${number((a-b)/b*100,2)}%`:'—';
const $=id=>document.getElementById(id);
function setPanel(data){panelData=data;}
function G(s){return {x:20,y:20,w:W-40,h:860};}
function boundsPoly(b){return [[b.lo[0],b.lo[1]],[b.hi[0],b.lo[1]],[b.hi[0],b.hi[1]],[b.lo[0],b.hi[1]]];}
function baseModel(s){const dims=s.density==='coarse'?[6,4]:s.density==='fine'?[12,8]:[10,7];return memo('base'+dims,()=>{const m=inputTerrain(...dims);m.nx=dims[0];m.ny=dims[1];m.prepared=prepare3(m.tris);return m;});}
function terrainState(s,needBeams=false){const base=baseModel(s),q=[...s.qxy,terrainHeight(...s.qxy,base.tris)+s.eye],key='terrain'+s.density+keyq(q)+s.ceiling;return memo(key,()=>({q,base,model:terrainWithCeiling(base,q,s.ceiling)}));}
function getReference(d,order='near'){if(!d.reference)d.reference=attachSolverWork(()=>referenceSurface3(d.q,d.model.tris,occluderOrder(d.model.tris,d.q,order)));return d.reference;}
function getBeams(d){if(!d.beams){const t=NOW();d.beams=attachSolverWork(()=>expand3(d.q,d.model));d.beams.ms=NOW()-t;}return d.beams;}
function twoData(s){const scene=SCENES[s.map],q=s.q2;return memo('two'+s.map+keyq(q)+s.locator,()=>({scene,q,v:attachSolverWork(()=>visibility(q,scene)),e:attachSolverWork(()=>expandVector2(q,scene,s.locator))}));}
function cameraMain(s,g=G(s),center=[50,35,12]){return {...camera3(g,s.yaw,s.pitch,center,Math.min(g.w/131,g.h/111)*(s.zoom||1)),main:true};}
function register(q,cam,kind){hitTargets.push({kind,rect:cam.rect,point:cam.p(q),cam});}
function segLines(edges,color=C.teal,width=2,alpha=1){return edges.map(([a,b])=>({a,b,color,width,alpha}));}
function groundLines(model){return uniqueEdges(model.tris).map(([a,b])=>({a,b,color:'#9cabaf',alpha:.72,width:1}));}
function originalForSurface(f,model){return f.owner!==undefined?model.tris[f.owner]:model.boundary[f.boundary]?.poly||f.whole||f.poly;}
function completedLines(s,surfaces,model,color=C.teal){if(!s.cuts)return [];return surfaces.flatMap(f=>segLines(cutEdges(f.poly,originalForSurface(f,model)),color,2.5));}
function ink3(poly,cam,color=C.teal,width=3,dash=[]){if(poly.length<2)return;poly.forEach((p,i)=>line2(cam.p(p),cam.p(poly[(i+1)%poly.length]),color,width,dash));}
function clipDisplay(poly,z=30){return clipByPlanes(poly,[{n:[1,0,0],d:0},{n:[-1,0,0],d:-100},{n:[0,1,0],d:0},{n:[0,-1,0],d:-70},{n:[0,0,1],d:0},{n:[0,0,-1],d:-z}]);}
function shadowSides(tri,q,grow=1,roof=30,color=C.orange){const far=tri.map(v=>add(v,mul(sub(v,q),grow*12)));return tri.map((a,i)=>{const j=(i+1)%tri.length;return {poly:clipDisplay([a,tri[j],far[j],far[i]],roof),color,alpha:.15,shade:false};}).filter(f=>f.poly.length>2);}
function urbanData(q){return memo('urban'+keyq(q),()=>{const v=attachSolverWork(()=>visibility3(q,URBAN3.receivers,URBAN3.objects));return {q,...v};});}
// Merge query fragments on each complete planar receiver before drawing cuts.
// Subtraction seams and the input diagonal are not physical shadow boundaries.
function urbanReceiverCuts(d){
 if(d.receiverCuts)return d.receiverCuts;
 const groups=new Map();
 for(const f of d.surfaces){
  const r=URBAN3.receivers[f.owner];
  if(r.kind!=='building'&&!(r.kind==='bound'&&r.face===0))continue;
  const key=r.kind==='building'?`building:${r.bi}:${r.fi}`:'ground';
  if(!groups.has(key)){
   const whole=r.kind==='building'?BOX_FACES[r.fi].map(i=>boxVertices(URBAN3.boxes[r.bi])[i]):[[0,0,0],[100,0,0],[100,70,0],[0,70,0]];
   groups.set(key,{whole,polys:[]});
  }
  groups.get(key).polys.push(f.poly);
 }
 return d.receiverCuts=[...groups.values()].flatMap(f=>receiverCutEdges(f.polys,f.whole));
}
function shadowScene(s){
 const q=s.light,d=urbanData(q),part=s.construction?Math.min(3,Math.floor(s.phase*4)):3;
 const grow=clamp(s.phase*4-2,0,1),roof=Math.max(26,q[2]+1),faces=[],lines=[];
 faces.push(...boxSurface().filter(f=>f.face===0).map(f=>({poly:f.poly,color:part===3?'#9faeb5':'#f0f4f5'})));
 URBAN3.boxes.forEach(b=>{const v=boxVertices(b);BOX_FACES.forEach(f=>{
  const poly=f.map(i=>v[i]),front=dot(normal3(poly),sub(q,poly[0]))>0;
  faces.push({poly,color:part===0?(front?'#a5d1c7':'#b7c3cb'):part===3?'#9baeb9':C.wall});
  // Vertical faces project to edges in plan; their classification stays visible.
  if(part===0)lines.push(...segLines(poly.map((a,i)=>[a,poly[(i+1)%poly.length]]),front?'#4d9e8b':'#8193a0',1.5));
  else if(s.wire)lines.push(...edges3(poly,C.wallLine));
 });});
 if(part===3){
  d.surfaces.filter(f=>f.kind==='building'||f.kind==='bound'&&Math.abs(centroid(f.poly)[2])<1e-6).forEach(f=>faces.push({poly:f.poly,color:C.tealLight,bias:.00015}));
  if(s.construction)lines.push(...segLines(urbanReceiverCuts(d),C.teal,2.5));
 }
 if(s.construction&&part>=2){
  for(const b of URBAN3.boxes)for(const [a,z] of silhouette(b,q)){
   const p=clipDisplay([a,z,add(z,mul(sub(z,q),12*grow)),add(a,mul(sub(a,q),12*grow))],roof);
   if(p.length>2){faces.push({poly:p,color:C.orange,alpha:.12,shade:false});lines.push(...edges3(p,C.orange,.6));}
  }
 }
 if(s.construction&&part>=1)for(const b of URBAN3.boxes)lines.push(...segLines(silhouette(b,q),C.orange,4));
 return {q,d,part,faces,lines};
}
function drawShadowView(cam,scene,name){
 ctx.raw(`<g data-shadow-view="${name}" data-stage="${scene.part}" data-face-count="${scene.faces.length}" data-edge-count="${scene.lines.length}">`);
 drawWorld(cam,scene.faces,scene.lines);ctx.raw('</g>');
}
function drawShadows(s){
 if(s.variant==='subtract')return drawUrbanSubtraction(s);
 const q=s.light,g=G(s),cam=cameraMain(s,g,[50,35,12]);
 if(URBAN3.boxes.some(b=>q[0]>b[0]&&q[0]<b[0]+b[2]&&q[1]>b[1]&&q[1]<b[1]+b[3]&&q[2]<b[4])){setPanel({title:'The source is inside a solid',body:['Move it outside the building or raise its elevation.'],legend:[]});return;}
 const scene=shadowScene(s),{d,part}=scene;stepCount=4;
 drawShadowView(cam,scene,'main');observer3(q,cam,0,s.labels);register(q,cam,'light');
 if(s.inset){
  const rect={x:g.x+g.w-290,y:653,w:270,h:196},m=mapFit(rect,[[0,0],[100,0],[100,70],[0,70]]);
  ctx.fillStyle='#fff';ctx.fillRect(rect.x-8,rect.y-8,rect.w+16,rect.h+16);
  const top=camera3(rect,0,Math.PI/2,[50,35,12],Math.min(rect.w/100,rect.h/70));
  // Reuse all stage geometry, with proper top-view occlusion. Vertical faces
  // and silhouette edges collapse to projected edges rather than a second model.
  drawShadowView(top,scene,'plan');observer2(q,m,false);
  hitTargets.push({kind:'lightPlan',m,rect,point:m.p(q)});
 }
 const titles=['Which faces face the source?','Find the silhouette edges','Extend edges away from the source','Paint every receiving surface'];
 setPanel({title:s.construction?titles[part]:'Visible and shadowed surfaces',steps:s.construction?['Classify faces','Extrude the silhouette','Clip ground, roofs, and walls']:null,active:part===0?0:part===1||part===2?1:2,
 body:[s.construction?['The normal of each face decides whether it points toward the purple source.','An edge between opposite-facing faces belongs to the silhouette.','Orange quadrilaterals extend the silhouette away from the source, forming the shadow sides.','Teal surfaces remain directly visible. Dark surfaces include shadows cast onto other buildings. The teal cuts mark actual visibility boundaries.'][part]:'Teal surfaces have an unobstructed connection to the source. Dark surfaces are in shadow. Move the source to update the ground, roofs, and walls.'],
 stats:[['Source elevation',number(q[2],1)+' m'],['Clipped receiver pieces',String(d.surfaces.length)]],
 legend:[[C.purple,'Source / observer'],...(s.construction?[[C.orange,'Silhouette and shadow sides']]:[]),[C.tealLight,'Visible surface'],['#9baeb9','Occluded surface']],
 note:'Drag the purple source in either view. The plan uses the same geometry and construction stage, seen from directly above.',progress:{kind:'urban',index:part===3?URBAN3.objects.length:0}});
}
function chooseOpening(e){let best=-1,score=-1;for(let i=0;i<e.visits.length;i++){const v=e.visits[i];if(!v.portal)continue;const ratio=norm(sub(...v.opening))/norm(sub(...v.portal)),lost=1-ratio;if(ratio>.08&&ratio<.95){const a=area(v.poly),s=a*(1-Math.abs(lost-.5));if(s>score){score=s;best=i;}}}return best>=0?best:Math.min(1,e.visits.length-1);}
function mapMesh(scene,m){uniqueEdges(scene.mesh.tris).forEach(([a,b])=>line2(m.p(a),m.p(b),'#aabec7',1.35));}
function drawExpansion(s){const d=twoData(s),{scene,q,e}=d,g=G(s),m=mapFit({x:g.x+12,y:60,w:g.w-24,h:780},scene.outer);mapBase(scene,m);hitTargets.push({kind:'map2',rect:m.rect,point:m.p(q),m});if(s.wire)mapMesh(scene,m);
 if(s.variant==='locate'){const loc=e.loc,trace=pointLocationSequence(loc),k=Math.min(trace.length-1,Math.floor(s.phase*trace.length)),current=trace[k];stepCount=trace.length;for(const t of trace.slice(0,k+1)){if(t.kind==='triangle')poly2(scene.mesh.tris[t.id].map(m.p),t.found?rgba(C.green,.5):rgba(C.red,.075),t.found?C.teal:null,3);}if(current?.kind==='box')poly2(boundsPoly(current.node).map(m.p),rgba(C.purple,.06),current.found?C.purple:C.red,3,current.found?[]:[8,5]);if(current?.kind==='triangle'){const triangle=scene.mesh.tris[current.id];poly2(triangle.map(m.p),null,current.found?C.teal:C.orange,4);triangle.forEach((a,i)=>{const b=triangle[(i+1)%3],edge=sub(b,a),mid=mul(add(a,b),.5),n=unit([-edge[1],edge[0]]),col=current.signs[i]>=-1e-8?C.teal:C.orange;arrow2(m.p(mid),m.p(add(mid,mul(n,3))),col,3);});}walls(scene,m,s.labels);observer2(q,m,s.labels);setPanel({title:current?.kind==='box'?(current.found?'The point is inside this box':'Reject this bounding box'):(current?.found?'All three side tests pass':'A triangle side test fails'),body:[current?.kind==='triangle'&&current.found?'All three edge tests pass. The highlighted triangle contains the observer; the search demonstration ends here.':s.locator==='index'?'Reject groups with the bounding-box tree, then test candidate triangles.':'Test the triangles in their stored order.','The small arrows mark each edge’s interior side. A containing triangle passes all three tests.'],stats:[['Box tests so far',String(trace.slice(0,k+1).filter(t=>t.kind==='box').length)],['Triangle tests so far',String(trace.slice(0,k+1).filter(t=>t.kind==='triangle').length)],['Input triangles',String(scene.mesh.tris.length)]],legend:[[C.purple,'Bounding-box candidate'],[C.orange,'Triangle under test'],[C.tealLight,'Containing triangle']],note:'Three signed edge tests decide containment. Expansion seeds every containing triangle when the observer is on a shared mesh edge.'});return;}
 const roots=e.visits.filter(v=>!v.portal).length,nonroot=e.visits.length-roots;let index,part,rootOnly=false;
 if(s.variant==='opening'){index=s.opening>0?clamp(s.opening,roots,e.visits.length-1):chooseOpening(e);part=Math.min(2,Math.floor(s.phase*3));stepCount=3;}
 else{stepCount=1+3*nonroot;const step=Math.min(stepCount-1,Math.floor(s.phase*stepCount));rootOnly=step===0;index=rootOnly?0:roots+Math.floor((step-1)/3);part=rootOnly?0:(step-1)%3;}
 const v=e.visits[index],ids=s.variant==='opening'?pathTo(e.visits,v.parent):Array.from({length:rootOnly?roots:index},(_,i)=>i);for(const i of ids){poly2(e.visits[i].poly.map(m.p),C.tealLight);if(s.cuts)cutEdges(e.visits[i].poly,scene.mesh.tris[e.visits[i].tri]).forEach(([a,b])=>line2(m.p(a),m.p(b),C.teal,3));}
 if(s.wire)mapMesh(scene,m);
 if(!rootOnly&&v?.portal){const t=scene.mesh.tris[v.tri];poly2(t.map(m.p),rgba(C.purple,.035),C.purple,2.5);line2(m.p(v.portal[0]),m.p(v.portal[1]),C.purple,8);
  if(part>=1){poly2(v.poly.map(m.p),rgba(C.teal,.19),C.teal,3,[6,4]);line2(m.p(v.opening[0]),m.p(v.opening[1]),C.orange,6);for(const p of v.opening){line2(m.p(q),m.p(p),C.orange,2.5,[7,5]);const angle=Math.atan2(p[1]-q[1],p[0]-q[0]),hits=t.map((a,j)=>rayHit(q,angle,{a,b:t[(j+1)%3]})).filter(Boolean).sort((a,b)=>b.t-a.t),far=hits[0]?.p;if(far)line2(m.p(p),m.p(far),C.teal,4);dot2(m.p(p),6,C.orange);}}
  if(part===2){poly2(v.poly.map(m.p),rgba(C.green,.48),C.teal,3.5);cutEdges(v.poly,t).forEach(([a,b])=>line2(m.p(a),m.p(b),C.teal,4.5));line2(m.p(v.opening[0]),m.p(v.opening[1]),C.orange,6);}
 }
 walls(scene,m,s.labels);observer2(q,m,s.labels);
 setPanel({title:rootOnly?'Start in the containing triangle':['Find the shared opening','Continue its boundary directions','Keep the clipped polygon'][part],steps:['Find the observer triangle','Clip the shared opening','Continue straight into its neighbor'],active:rootOnly?0:part===0?1:2,body:[rootOnly?`The ${s.locator==='index'?'bounding-box query':'linear scan'} tested ${e.loc.ops.triangles} triangles. The containing free-space triangle is entirely visible.`:['Purple is the entire shared edge. Its stored neighbor identifies the next triangle.','Orange is the surviving edge. Dark teal lines extend past it to show precisely where the next triangle is cut.','The filled polygon is retained. Its dark cut edges stay visible while the search continues.'][part]],stats:[['Search entries',rootOnly?`${roots} / ${e.visits.length}`:`${index+1} / ${e.visits.length}`],['Visible area at completion',number(e.area)+' m²']],legend:[[C.purple,'Whole shared opening'],[C.orange,'Surviving opening'],[C.teal,'Cut / limiting straight direction'],[C.tealLight,'Confirmed visible region']],note:'The cone keeps its apex at the observer. Shared mesh edges are openings, not walls. Every dark cut belongs to the query result.',progress:{kind:'expansion',index:rootOnly?roots:index+1,part,...(s.variant==='opening'?{ids:[...ids,index]}:{})}});
}
function sampleData(s,d){let count=s.sampler==='surface'?Math.max(d.model.tris.length,Math.round(s.sampleBudget)):s.cubeN;if(s.variant==='rays')count=s.sampler==='surface'?Math.round(d.model.tris.length+(Math.max(d.model.tris.length,s.sampleBudget)-d.model.tris.length)*s.phase):Math.round(2+(s.cubeN-2)*s.phase);const key=s.sampler+s.density+keyq(d.q)+count;if(lastSample.key===key)return lastSample.value;let v;if(s.sampler==='surface'){const partition=memo('partition'+s.density+count,()=>surfacePatches(d.model.tris,count));v=attachSolverWork(()=>sampleSurface(d.q,d.base.prepared,partition,true));v.preparationMs=partition.ms;}else{const raw=attachSolverWork(()=>s.sampler==='raster'?rasterCube(d.q,d.model.tris,count):rayCube(d.q,d.base.prepared,count,true));v=attachSolverWork(()=>recoverCells(raw,d.model.tris));v.queryWork=raw.work;v.recoveryWork=v.work;v.work=sumSolverWork(raw.work,v.recoveryWork);v.count=6*count*count;}lastSample={key,value:v};return v;}
function sampleError(s,d,sa){const key=lastSample.key;if(lastError.key===key)return lastError.value;const v=surfaceError(getReference(d),sa,d.model.tris);lastError={key,value:v};return v;}
function drawMetrics2(s){const sc=SCENES[s.map],ss=effectiveObserverState(s),d=twoData(ss),n=s.variant==='rays'?Math.round(8+(s.rays-8)*s.phase):s.rays,sa=memo('sample2'+s.map+keyq(d.q)+n,()=>attachSolverWork(()=>sampleRay2(d.q,sc,n,true))),g=G(s),m=mapFit({x:g.x+10,y:60,w:g.w-20,h:780},sc.outer);stepCount=16;mapBase(sc,m);hitTargets.push({kind:'map2',rect:m.rect,point:m.p(d.q),m});
 if(s.metric==='walls'){const wc=memo('wallCoverage'+s.map+keyq(d.q)+n,()=>attachSolverWork(()=>wallCoverage(d.q,d.v,sa)));poly2(d.v.polygon.map(m.p),rgba(C.teal,.065));d.v.sectors.forEach(f=>line2(m.p(f.pa),m.p(f.pb),C.teal,7));wc.segments.forEach(f=>line2(m.p(f.seg[0]),m.p(f.seg[1]),C.orange,3.5));if(s.showRays){const stride=Math.max(1,Math.ceil(sa.hits.length/s.rayDrawLimit));sa.hits.forEach((h,i)=>{if(i%stride===0)line2(m.p(d.q),m.p(h.p),rgba(C.orange,.65),1.7);});}walls(sc,m,s.labels);observer2(d.q,m,s.labels);setPanel({title:`${number(n,0)} first-hit rays`,body:['Compare physical first-hit lengths on building walls and on the enclosing analysis border.'],metrics:[['Visible wall length',number(wc.ref.walls)+' m',number(wc.sample.walls)+' m',pct(wc.sample.walls,wc.ref.walls)],['Visible border length',number(wc.ref.border)+' m',number(wc.sample.border)+' m',pct(wc.sample.border,wc.ref.border)],['Escaped directions',number(wc.ref.escape*100)+'%',number(wc.sample.escape*100)+'%',`${number((wc.sample.escape-wc.ref.escape)*100,2)} pp`]],legend:[[C.teal,'Geometric wall / border pieces'],[C.orange,'Sample-assigned pieces']],note:'The analysis border is not physical sky. Escaped directions are a planar openness proxy; radial occlusion edges are not counted as walls.'});return;}
 poly2(d.v.polygon.map(m.p),rgba(C.teal,.21));poly2(sa.polygon.map(m.p),rgba(C.orange,.32),C.orange,3.5);const stride=Math.max(1,Math.ceil(n/s.rayDrawLimit));if(s.showRays)sa.hits.forEach((h,i)=>{if(i%stride===0)line2(m.p(d.q),m.p(h.p),rgba(C.orange,.68),2);});poly2(d.v.polygon.map(m.p),null,C.teal,3.5);walls(sc,m,s.labels);observer2(d.q,m,s.labels);
 const error=memo('err2'+s.map+keyq(d.q)+n,()=>polygonComparison2(d.e,sa,d.q));setPanel({title:`${number(n,0)} rays versus geometry`,metrics:[['Visible area',number(d.e.area)+' m²',number(sa.area)+' m²',pct(sa.area,d.e.area)],['Mismatched area','0 m²',number(error.xor)+' m²',number(error.xor/d.e.area*100,2)+'%']],body:['Teal is the continuous polygon. Orange joins the sampled first-hit endpoints.','Area gains and losses can cancel; mismatched area also measures their locations.'],stats:[['Triangle entries / input',`${d.e.visits.length} / ${sc.mesh.tris.length}`],['Ray / wall tests',number(sa.stats.tests,0)]],legend:[[C.teal,'Geometric reference'],[C.orange,'Sampled polygon'],[C.purple,'Observer']],note:`All ${number(n,0)} rays are calculated; ${s.showRays?Math.ceil(n/stride):0} are drawn. Neither displayed area is a pixel count.`});
}
function shadowEnvelopeLines(d,edges,color){const sides=[];for(const [a,b] of edges){const poly=clipDisplay([a,b,add(b,mul(sub(b,d.q),12)),add(a,mul(sub(a,d.q),12))],d.model.roof);if(poly.length>=3&&area3(poly)>1e-6)sides.push({poly,color,alpha:.11,shade:false});}return sides;}
function drawMetrics3(s){const ss=effectiveObserverState(s);const d=terrainState(ss),ref=getReference(d),sa=sampleData(ss,d),err=sampleError(ss,d,sa),total=d.model.tris.reduce((a,t)=>a+area3(t),0),g=G(s);stepCount=16;
 if(s.hidden&&!d.hidden){const h=measureSolverWork(()=>complementSurfaces(d.model.tris,ref.surfaces));d.hidden=h.value;d.hiddenWork=h.work;}if(s.hidden&&!sa.hidden){const h=measureSolverWork(()=>hiddenAngularCells(sa,d.model.tris));sa.hidden=h.value;sa.hiddenWork=h.work;}const green=s.hidden?d.hidden:ref.surfaces,orange=s.hidden?sa.hidden:sa.polys;
 if(!d.referenceOutline)d.referenceOutline=outlineEdges(ref.surfaces);const outlineKey=s.hidden?'hiddenOutline':'outline';if(!sa[outlineKey])sa[outlineKey]=outlineEdges(orange);if(s.hidden&&!d.hiddenOutline)d.hiddenOutline=outlineEdges(d.hidden);const greenEdges=s.hidden?d.hiddenOutline:d.referenceOutline;
 const overlay=s.compare==='overlay',rects=overlay?[g]:[{x:g.x,y:70,w:g.w/2-12,h:760},{x:g.x+g.w/2+12,y:70,w:g.w/2-12,h:760}];const cams=rects.map(r=>cameraMain(s,r,[50,35,12])),base=terrainFaces(d.model),mesh=s.wire?groundLines(d.model):[],envelopes=[];if(s.shadowEnvelope&&!sa.outline)sa.outline=outlineEdges(sa.polys);const referenceSides=s.shadowEnvelope?shadowEnvelopeLines(d,d.referenceOutline,C.teal):[],sampleSides=s.shadowEnvelope?shadowEnvelopeLines(d,sa.outline,C.orange):[];
 const draw=(cam,which)=>{const faces=[...base,...envelopes],lines=[...mesh];if(which==='both'||which==='green'){faces.push(...referenceSides);faces.push(...green.map(f=>({poly:f.poly,color:C.green,alpha:overlay?.45:1,bias:.00015})));lines.push(...segLines(greenEdges,C.teal,overlay?3:2));}if(which==='both'||which==='orange'){faces.push(...sampleSides);faces.push(...orange.map(f=>({poly:f.poly,color:C.orange,alpha:overlay?.34:1,bias:.0003})));if(s.sampleWire)lines.push(...segLines(uniqueEdges(orange.map(f=>f.poly)),C.orange,1,.45));lines.push(...segLines(sa[outlineKey],C.orange,overlay?1.7:2));if(s.showRays){const stride=Math.max(1,Math.ceil(sa.rays.length/s.rayDrawLimit));sa.rays.forEach((r,i)=>{if(i%stride===0)lines.push({a:d.q,b:r.p,color:C.orange,alpha:.56,width:1.3});});}}drawWorld(cam,faces,lines);observer3(d.q,cam,d.q[2]-ss.eye,s.labels);};
 if(overlay)draw(cams[0],'both');else{draw(cams[0],'green');draw(cams[1],'orange');if(s.labels){text2('GEOMETRIC REFERENCE',rects[0].x+12,75,22,C.teal);text2('SAMPLED RECONSTRUCTION',rects[1].x+12,75,22,C.orange);}}for(const cam of cams)register(d.q,cam,'terrain');
 const a=s.hidden?total-ref.area:ref.area,b=s.hidden?total-sa.area:sa.area;setPanel({title:s.hidden?'Compare hidden surface':'Compare visible surface',metrics:[[s.hidden?'Hidden terrain area':'Visible terrain area',number(a)+' m²',number(b)+' m²',pct(b,a)],['Mismatched surface','0 m²',number(err.xor)+' m²',number(err.xor/ref.area*100,2)+'% of visible ref.']],body:[s.sampler==='surface'?'One geometric LOS test at each patch centroid; assign its result to that whole terrain patch.':s.sampler==='raster'?'Project triangles into a six-face depth grid, then recover their physical cell footprints.':'One first-hit ray per angular cell; recover that cell’s footprint on its selected terrain triangle.'],stats:[[s.sampler==='surface'?'Surface-target rays':'Angular cells / directions',number(sa.count,0)],['Primitive intersection tests',s.sampler==='raster'?'0 — depth raster':number(sa.stats.tests,0)]],legend:[[C.teal,'Continuous geometry'],[C.orange,'Sampled surface'],['#8797a6',s.shadowEnvelope?'Extruded shadow boundaries: unmeasured':'Unclassified background']],note:'No visible-air volume or sky cap enters these totals. Overlay uses the same observer and illustration camera for both results.'});
}
function drawMetrics(s){return drawSampleComparison(s);}
const pauseUI=()=>new Promise(r=>setTimeout(r,0));
