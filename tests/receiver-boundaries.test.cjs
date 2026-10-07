const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname+'/../source/';vm.runInThisContext(fs.readFileSync(root+'geometry.js','utf8')+'\n'+fs.readFileSync(root+'receiver-boundaries.js','utf8')+'\nglobalThis.receiverAPI={receiverCutEdges,URBAN3,visibility3,BOX_FACES,boxVertices,inside,normal3,firstHit3,unit,sub,norm,cross3,centroid};');
const {receiverCutEdges,URBAN3,visibility3,BOX_FACES,boxVertices,inside,normal3,firstHit3,unit,sub,norm,cross3,centroid}=globalThis.receiverAPI;
const quad=(x0,y0,x1,y1)=>[[x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0]],whole=quad(0,0,10,10),length=edges=>edges.reduce((s,[a,b])=>s+norm(sub(a,b)),0);
assert.equal(receiverCutEdges([[[0,0,0],[10,0,0],[10,10,0]],[[0,0,0],[10,10,0],[0,10,0]]],whole).length,0,'Shared triangulation diagonal retained');
let pieces=[quad(0,0,5,5),quad(5,0,10,2),quad(5,2,10,5)],edges=receiverCutEdges(pieces,whole);assert.equal(edges.length,1,'T junction or subtraction seam retained');assert(Math.abs(length(edges)-10)<1e-7);assert(edges[0].every(p=>Math.abs(p[1]-5)<1e-7));
assert.equal(receiverCutEdges(pieces.map(p=>p.slice().reverse()),whole).length,1,'Input winding affects union');
const ring=[quad(0,0,10,3),quad(0,7,10,10),quad(0,3,3,7),quad(7,3,10,7)];edges=receiverCutEdges(ring,whole);assert.equal(edges.length,4);assert(Math.abs(length(edges)-16)<1e-7,'Hole boundary not retained');
const tilted=p=>[p[0],p[1]*.6,p[1]*.8];edges=receiverCutEdges(pieces.map(p=>p.map(tilted)),whole.map(tilted));assert.equal(edges.length,1);assert(Math.abs(length(edges)-10)<1e-7);assert(edges[0].every(p=>Math.abs(p[1]-3)<1e-7&&Math.abs(p[2]-4)<1e-7));
const perturbed=[quad(0,0,5,5),quad(5+1e-8,0,10,2),quad(5-1e-8,2,10,5)];assert.equal(receiverCutEdges(perturbed,whole).length,1,'Tolerance exposes microscopic shared-edge seams');
// Clip display fragments to the receiver; no returned edge can exceed its quad.
edges=receiverCutEdges([quad(-5,-5,15,5)],whole);assert.equal(edges.length,1);assert(edges.flat().every(p=>p[0]>=-1e-7&&p[0]<=10+1e-7&&Math.abs(p[1]-5)<1e-7));
let receiversChecked=0,cutsChecked=0,independentChecks=0;
function flattened(poly,n){const axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));return poly.map(p=>p.filter((_,i)=>i!==axis));}
for(const q of [[9,16,10],[9,16,17.5],[15,16,8],[15,30,12],[50,5,14],[90,40,8],[10,10,30]]){const result=visibility3(q,URBAN3.receivers,URBAN3.objects),groups=[{whole:quad(0,0,100,70),pieces:result.surfaces.filter(f=>f.kind==='bound'&&URBAN3.receivers[f.owner].face===0).map(f=>f.poly)}];
 URBAN3.boxes.forEach((b,bi)=>{const vertices=boxVertices(b);BOX_FACES.forEach((f,fi)=>groups.push({whole:f.map(i=>vertices[i]),pieces:result.surfaces.filter(s=>s.kind==='building'&&URBAN3.receivers[s.owner].bi===bi&&URBAN3.receivers[s.owner].fi===fi).map(s=>s.poly)}));});
 for(const g of groups){const n=normal3(g.whole),project=p=>flattened([p],n)[0],whole2=flattened(g.whole,n),polys=g.pieces.map(p=>flattened(p,n)),cuts=receiverCutEdges(g.pieces,g.whole);receiversChecked++;
  for(const [a,b] of cuts){assert(norm(sub(a,b))>1e-6);const mid=a.map((v,i)=>(v+b[i])/2),perp=unit(cross3(n,sub(b,a))),offset=Math.min(.002,norm(sub(b,a))*.02),left=mid.map((v,i)=>v+offset*perp[i]),right=mid.map((v,i)=>v-offset*perp[i]);
   assert(inside(project(left),whole2)&&inside(project(right),whole2),'Cut extends outside receiver or retains physical perimeter');
   const isVisible=p=>polys.some(poly=>inside(project(p),poly));assert.notEqual(isVisible(left),isVisible(right),'Retained cut is only an internal fragment seam');cutsChecked++;
   for(const p of [left,right]){const d=sub(p,q),hit=firstHit3(q,unit(d),URBAN3.objects.map(f=>f.poly)),expected=hit.r>=norm(d)-1e-6;assert.equal(isVisible(p),expected,'Union cut does not separate actual first-hit visibility');independentChecks++;}
  }
 }
}
assert(cutsChecked>20,'Real-scene fixtures did not exercise enough cuts');console.log(JSON.stringify({fixtures:'triangle seam, T junction, winding, hole, tilt, tolerance, receiver clipping',receiversChecked,cutsChecked,independentChecks},null,2));
