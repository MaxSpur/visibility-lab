const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../source/';
vm.runInThisContext(['geometry','operation-counts','terrain-raster'].map(n=>fs.readFileSync(root+n+'.js','utf8')).join('\n')+String.raw`
const check=(v,m)=>{if(!v)throw Error(m);};
function heightField(nx,ny,z){const points=[];for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)points.push([100*x/nx,70*y/ny,z(100*x/nx,70*y/ny)]);const tris=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=points[y*(nx+1)+x],b=points[y*(nx+1)+x+1],c=points[(y+1)*(nx+1)+x],d=points[(y+1)*(nx+1)+x+1];tris.push([a,b,d],[a,d,c]);}return {tris};}
for(const z of [()=>0,(x,y)=>.1*x+.2*y])for(const N of [8,16,64]){const base=heightField(4,4,z),q=[13,31,z(13,31)+8],grid=prepareTerrainRaster(base,N),raw=terrainRasterVisibility(q,grid),sample=recoverTerrainRaster(raw,grid);check(raw.visible.every(Boolean),'A plane has no occluding terrain cells');const exact=base.tris.reduce((s,t)=>s+area3(t),0);check(Math.abs(sample.area-exact)<1e-6,'Texture recovery partitions the whole physical plane');check(sample.hidden.length===0,'No hidden cells on a plane');check(raw.stats.cellVisits>=raw.stats.queries,'Every grid query counts crossed cells');check(raw.work.rayPrimitiveTests===0,'Grid solver uses no triangle raycasts');}
const ridge=heightField(10,7,x=>x<=50?x*.4:(100-x)*.4),q=[10,35,12],grid=prepareTerrainRaster(ridge,20),raw=terrainRasterVisibility(q,grid),prepared=prepare3(ridge.tris);
for(let y=0;y<grid.ny;y++)for(let x=0;x<grid.N;x++){const p=[(x+.5)*grid.dx,(y+.5)*grid.dy];p.push(terrainRasterHeight(grid,...p));const hit=firstFast(q,sub(p,q),prepared,true),exact=hit.r>=1-1e-7;check(Boolean(raw.visible[y*grid.N+x])===exact,'Aligned piecewise planar ridge agrees with continuous sightline at texel centers');}
check(raw.visible.some(Boolean)&&raw.visible.some(v=>!v),'Ridge blocks part of the grid');
const sampled=terrainSurfaceRaster(q,ridge,20),total=ridge.tris.reduce((s,t)=>s+area3(t),0);check(Math.abs(sampled.area+sampled.hidden.reduce((s,f)=>s+area3(f.poly),0)-total)<1e-6,'Every surface texel piece is classified, with no angular holes');
// A bilinear saddle can rise above the chord inside a crossed cell even when
// both endpoints are below it. The quadratic interior maximum must be tested.
const saddle={N:2,ny:1,bounds:{lo:[0,0],hi:[2,1]},dx:1,dy:1,nodes:new Float64Array([0,10,0,10,0,0])},s=terrainRasterVisibility([.02,.02,1.5],saddle);check(s.visible[1]===0,'Interior saddle height blocks a sightline');
// Preserve the former three-height-evaluation traversal as an independent
// arithmetic oracle. The optimized coefficient traversal must classify exactly
// the same texels, including near-grid-line and steep sightlines.
function referenceRasterMask(q,grid){
 const {N,ny,bounds,dx,dy}=grid,out=new Uint8Array(N*ny),ox=(q[0]-bounds.lo[0])/dx,oy=(q[1]-bounds.lo[1])/dy;
 for(let ty=0;ty<ny;ty++)for(let tx=0;tx<N;tx++){
  const target=[bounds.lo[0]+(tx+.5)*dx,bounds.lo[1]+(ty+.5)*dy],tz=terrainRasterHeight(grid,...target),vx=tx+.5-ox,vy=ty+.5-oy,sx=Math.sign(vx),sy=Math.sign(vy),deltaX=vx?1/Math.abs(vx):Infinity,deltaY=vy?1/Math.abs(vy):Infinity;let x=clamp(Math.floor(ox),0,N-1),y=clamp(Math.floor(oy),0,ny-1),nextX=vx?((sx>0?x+1:x)-ox)/vx:Infinity,nextY=vy?((sy>0?y+1:y)-oy)/vy:Infinity,t0=0,clear=true;
  const excess=t=>terrainRasterHeight(grid,q[0]+(target[0]-q[0])*t,q[1]+(target[1]-q[1])*t,x,y)-(q[2]+(tz-q[2])*t);
  while(t0<1-1e-12){if(x<0||x>=N||y<0||y>=ny){clear=false;break;}const t1=Math.min(nextX,nextY,1),f0=excess(t0),fm=excess((t0+t1)/2),f1=excess(t1),A=2*(f1+f0-2*fm),B=f1-f0-A;let maximum=Math.max(f0,f1);if(A<0){const u=-B/(2*A);if(u>0&&u<1)maximum=Math.max(maximum,A*u*u+B*u+f0);}if(maximum>1e-7){clear=false;break;}if(t1>=1-1e-12)break;if(Math.abs(nextX-nextY)<1e-12){x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;}else if(nextX<nextY){x+=sx;nextX+=deltaX;}else{y+=sy;nextY+=deltaY;}t0=t1;
  }out[ty*N+tx]=clear?1:0;
 }return out;
}
for(const base of [heightField(6,4,(x,y)=>25*Math.sin(x*.13)*Math.cos(y*.17)),heightField(12,8,(x,y)=>.8*x-.6*y),makeTerrain3(12,8)])for(const N of [8,16,32]){
 const grid=prepareTerrainRaster(base,N);
 for(const xy of [[.01,.01],[50,35],[99.99,69.99],[25.125,52.3]]){const q=[...xy,terrainHeight(...xy,base.tris)+8],raw=terrainRasterVisibility(q,grid),reference=referenceRasterMask(q,grid);check(raw.visible.every((v,i)=>v===reference[i]),'Optimized traversal preserves every baseline texel classification');const sample=recoverTerrainRaster(raw,grid),area=sample.polys.reduce((s,f)=>s+area3(f.poly),0);check(Math.abs(area-sample.area)<1e-7,'Cached physical texel area matches original fragment areas');check(grid.coefficients.length===4*grid.cellCount&&grid.centers.length===grid.cellCount,'Reusable coefficient arrays cover every cell');}
}
check(terrainRasterVisibility([.02,.02,1.5],saddle).visible.every((v,i)=>v===referenceRasterMask([.02,.02,1.5],saddle)[i]),'Optimized interior saddle agrees with baseline traversal');
check(sampleResolution({dimension:'3d',variant:'raster',phase:1})===256,'Surface columns use their own range');check(sampleResolution({dimension:'3d',variant:'raycast',phase:1})===256,'Angular resolution has an explicit side range');
console.log('PASS: plane/ridge/saddle raster visibility; complete terrain texture partition; independent grid LOS; baseline-equivalent coefficient traversal and cached areas; explicit resolution ranges.');
`);
