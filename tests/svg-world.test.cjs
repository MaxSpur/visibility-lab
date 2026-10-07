const fs=require('fs'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
const root=__dirname+'/../source/',drawing=fs.readFileSync(root+'svg-context.js','utf8');
function drawingFunction(name){const start=drawing.indexOf('function '+name+'(');let depth=0;for(let i=drawing.indexOf('{',start);i<drawing.length;i++){if(drawing[i]==='{')depth++;if(drawing[i]==='}'&&!--depth)return drawing.slice(start,i+1);}throw Error(name);}
vm.runInThisContext(fs.readFileSync(root+'geometry.js','utf8')+'\nconst C={wall:"#cccccc",wallLine:"#777777"};\n'+drawingFunction('rgb')+'\n'+drawingFunction('camera3')+'\n'+fs.readFileSync(root+'svg-world.js','utf8')+'\nglobalThis.svgAPI={worldSVG,camera3,makeTerrain3,area,inside,lerp};');
const {worldSVG,camera3,makeTerrain3,area,inside,lerp}=globalThis.svgAPI;
const cam={rect:{x:0,y:0,w:10,h:10},p:p=>p.slice(0,2),depth:p=>p[2]},face=(z,color='#ff0000',alpha=1)=>({poly:[[0,0,z(0,0)],[10,0,z(10,0)],[10,10,z(10,10)],[0,10,z(0,10)]],color,alpha,shade:false});
function polygons(svg){return [...svg.matchAll(/<polygon data-world-face="(\d+)" points="([^"]+)"[^>]*>/g)].map(m=>({index:+m[1],poly:m[2].split(' ').map(s=>s.split(',').map(Number))}));}
function drawnArea(svg,index){return polygons(svg).filter(f=>f.index===index).reduce((s,f)=>s+area(f.poly),0);}
function lineSegments(svg){return [...svg.matchAll(/<line data-world-line="\d+" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)].map(m=>m.slice(1).map(Number));}
let svg=worldSVG(cam,[face(x=>x),face(x=>10-x,'#0000ff')]);assert(Math.abs(drawnArea(svg,0)-50)<1e-5);assert(Math.abs(drawnArea(svg,1)-50)<1e-5);
// At 100 interior screen points, each emitted opaque fragment must be the true
// nearest of the intersecting affine planes; center-distance sorts fail here.
for(let i=0;i<100;i++){const p=[.13+i%10,.17+Math.floor(i/10)],expected=p[0]>5?0:1,got=polygons(svg).filter(f=>inside(p,f.poly));assert.equal(got.length,1);assert.equal(got[0].index,expected);}
svg=worldSVG(cam,[face(()=>1),face(()=>1,'#0000ff')]);assert.equal(drawnArea(svg,0),0);assert.equal(drawnArea(svg,1),100);
const blocker={poly:[[3,0,2],[7,0,2],[7,10,2],[3,10,2]],color:'#0000ff',shade:false};svg=worldSVG(cam,[blocker],[{a:[0,5,0],b:[10,5,0],width:3}]);assert.deepEqual(lineSegments(svg),[[0,5,3,5],[7,5,10,5]]);assert(svg.includes('stroke-width="3"'));
// A sloping line pierces a depth plane halfway across the footprint.
svg=worldSVG(cam,[face(()=>5)],[{a:[0,5,0],b:[10,5,10]}]);const piercing=lineSegments(svg);assert.equal(piercing.length,1);assert(Math.abs(piercing[0][0]-4.934)<1e-5);assert.equal(piercing[0][2],10);
svg=worldSVG(cam,[blocker],[{a:[0,5,2],b:[10,5,2]}]);assert.equal(lineSegments(svg).length,1,'Coplanar mesh line should be visible with display bias');
svg=worldSVG(cam,[face(()=>0,'#ff0000',.4),blocker]);assert.equal(drawnArea(svg,0),60,'Transparent face must not leak through opaque blocker');
svg=worldSVG(cam,[face(()=>1,'#ff0000',.4),face(()=>1,'#0000ff')]);assert.equal(drawnArea(svg,0),100,'Transparent coplanar layer passes baseline LEQUAL depth test');
svg=worldSVG(cam,[face(()=>3,'#ff0000',.4),face(()=>1,'#00ff00',.4)]);assert.deepEqual(polygons(svg).map(p=>p.index),[1,0],'Transparent far-to-near ordering');
const offscreen={poly:[[-20,-20,1],[20,-20,1],[20,20,1],[-20,20,1]],shade:false};svg=worldSVG(cam,[offscreen]);assert.equal(drawnArea(svg,0),100);assert(polygons(svg)[0].poly.every(p=>p.every(v=>v>=0&&v<=10)));assert(svg.includes('<clipPath'));assert(!/<image|<canvas|NaN|Infinity/.test(svg));
const next=worldSVG(cam,[offscreen]);assert.notEqual(svg.match(/id="([^"]+)"/)[1],next.match(/id="([^"]+)"/)[1]);
svg=worldSVG(cam,[{poly:[[0,0,0],[1,1,1],[2,2,2]]},{poly:[[NaN,0,1],[1,1,1],[2,1,1]]}]);assert.equal(polygons(svg).length,0,'Degenerate/nonfinite polygons must be omitted');
// Real TIN plus 5,040 tiny surface patches exercises the projected bounds hash.
const model=makeTerrain3(),patches=[];
for(const t of model.tris){const point=(i,j)=>t[0].map((v,k)=>v+(t[1][k]-v)*i/6+(t[2][k]-v)*j/6);for(let i=0;i<6;i++)for(let j=0;j<6-i;j++){patches.push({poly:[point(i,j),point(i+1,j),point(i,j+1)],color:'#55bb99',bias:.00004});if(i+j<5)patches.push({poly:[point(i+1,j),point(i+1,j+1),point(i,j+1)],color:'#55bb99',bias:.00004});}}
const realCam=camera3({x:0,y:0,w:900,h:650},-.6,.66,[50,35,12],6),faces=[...model.tris.map(poly=>({poly,color:'#cccccc'})),...patches],timings=[];
for(let i=0;i<3;i++){const start=performance.now();svg=worldSVG(realCam,faces);timings.push(performance.now()-start);}assert(!/NaN|Infinity|<image/.test(svg));assert(worldSVG.lastStats.faceCandidates<faces.length**2/4,'Broad phase did not prune pair tests');
console.log(JSON.stringify({fixtures:'crossing depths, ties, partial and piercing lines, transparency, camera clip, finite geometry',patches:patches.length,faces:faces.length,svgBytes:svg.length,milliseconds:timings,stats:worldSVG.lastStats},null,2));
