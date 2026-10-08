/* A terrain-surface raster, independent of camera rays and depth-buffer pixels.
 * Raster nodes sample the input height field. Each XY texel targets its center
 * on that bilinear height grid. A DDA walk tests the entire sightline against
 * the bilinear surface in each crossed cell, not just occasional height samples.
 * The classified texel is draped onto the original triangles for physical area.
 */
const TERRAIN_SURFACE_COLUMNS={min:8,max:256};
const ANGULAR_GRID_SIDE={min:2,max:256};
function sampleResolutionRange(s){return s.dimension==='3d'?(s.variant==='raster'?TERRAIN_SURFACE_COLUMNS:ANGULAR_GRID_SIDE):{min:8,max:s.variant==='raster'?128:1024};}
function sampleResolution(s){const {min,max}=sampleResolutionRange(s);return Math.round(min+(max-min)*s.phase);}
function prepareTerrainRaster(input,N){
 const start=NOW(),tris=input.tris||input;if(!Number.isInteger(N)||N<2)throw Error('Terrain raster columns must be an integer of at least 2');
 const bounds=bboxOf(tris.flat().map(p=>p.slice(0,2)),2),ny=Math.max(1,Math.round(N*(bounds.hi[1]-bounds.lo[1])/(bounds.hi[0]-bounds.lo[0]))),dx=(bounds.hi[0]-bounds.lo[0])/N,dy=(bounds.hi[1]-bounds.lo[1])/ny,nodes=new Float64Array((N+1)*(ny+1)).fill(NaN),patches=Array.from({length:N*ny},()=>[]),cellAreas=new Float64Array(N*ny),stats={nodeCandidates:0,nodeWrites:0,texturePieces:0};
 const point=(i,j)=>[bounds.lo[0]+i*dx,bounds.lo[1]+j*dy],range=(tri)=>{const b=bboxOf(tri,3);return {x0:clamp(Math.floor((b.lo[0]-bounds.lo[0])/dx),0,N-1),x1:clamp(Math.floor((b.hi[0]-bounds.lo[0])/dx),0,N-1),y0:clamp(Math.floor((b.lo[1]-bounds.lo[1])/dy),0,ny-1),y1:clamp(Math.floor((b.hi[1]-bounds.lo[1])/dy),0,ny-1),b};};
 tris.forEach((tri,owner)=>{const [a,b,c]=tri,det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-12)throw Error('Terrain raster requires a single-valued height field');const r=range(tri),ix0=clamp(Math.ceil((r.b.lo[0]-bounds.lo[0])/dx-1e-9),0,N),ix1=clamp(Math.floor((r.b.hi[0]-bounds.lo[0])/dx+1e-9),0,N),iy0=clamp(Math.ceil((r.b.lo[1]-bounds.lo[1])/dy-1e-9),0,ny),iy1=clamp(Math.floor((r.b.hi[1]-bounds.lo[1])/dy+1e-9),0,ny);
  for(let j=iy0;j<=iy1;j++)for(let i=ix0;i<=ix1;i++){stats.nodeCandidates++;const [x,y]=point(i,j),u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/det;if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9){nodes[j*(N+1)+i]=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);stats.nodeWrites++;}}
  for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){const [xx,yy]=point(x,y),poly=clipByPlanes(tri,[{n:[1,0,0],d:xx},{n:[-1,0,0],d:-xx-dx},{n:[0,1,0],d:yy},{n:[0,-1,0],d:-yy-dy}]);const patchArea=poly.length>=3?area3(poly):0;if(patchArea>1e-9){cellAreas[y*N+x]+=patchArea;patches[y*N+x].push({poly,owner,cell:y*N+x,kind:'terrain'});stats.texturePieces++;}}
 });
 if(nodes.some(v=>!Number.isFinite(v)))throw Error('Terrain raster contains an uncovered elevation node');
 const grid={N,ny,bounds,dx,dy,nodes,patches,cellAreas,stats,cellCount:N*ny};terrainRasterCoefficients(grid);grid.ms=NOW()-start;return grid;
}
function terrainRasterHeight(grid,x,y,cellX=null,cellY=null){
 const gx=(x-grid.bounds.lo[0])/grid.dx,gy=(y-grid.bounds.lo[1])/grid.dy,i=cellX??clamp(Math.floor(gx),0,grid.N-1),j=cellY??clamp(Math.floor(gy),0,grid.ny-1),u=clamp(gx-i,0,1),v=clamp(gy-j,0,1),k=j*(grid.N+1)+i,n=grid.nodes;
 return (1-u)*(1-v)*n[k]+u*(1-v)*n[k+1]+(1-u)*v*n[k+grid.N+1]+u*v*n[k+grid.N+2];
}
// Each reusable cell stores h(u,v)=a+b*u+c*v+d*u*v and its center height.
// Along a sightline this is quadratic; evaluate its endpoints and exact interior
// maximum with scalars, avoiding three coordinate conversions per crossed cell.
function terrainRasterCoefficients(grid){
 if(grid.coefficients)return grid.coefficients;
 const {N,ny,nodes}=grid,c=new Float64Array(N*ny*4),centers=new Float64Array(N*ny);
 for(let y=0;y<ny;y++)for(let x=0;x<N;x++){const k=y*(N+1)+x,p=(y*N+x)*4,a=nodes[k],b=nodes[k+1]-a,d=nodes[k+N+2]-nodes[k+1]-nodes[k+N+1]+a,e=nodes[k+N+1]-a;c[p]=a;c[p+1]=b;c[p+2]=e;c[p+3]=d;centers[y*N+x]=a+.5*(b+e)+.25*d;}
 grid.coefficients=c;grid.centers=centers;return c;
}
function terrainRasterVisibility(q,grid){
 const start=NOW(),{N,ny,bounds,dx,dy}=grid,coefficients=terrainRasterCoefficients(grid),centers=grid.centers,visible=new Uint8Array(N*ny),stats={queries:N*ny,cellVisits:0,heightTests:0,blocked:0},ox=(q[0]-bounds.lo[0])/dx,oy=(q[1]-bounds.lo[1])/dy,originX=Math.max(0,Math.min(N-1,Math.floor(ox))),originY=Math.max(0,Math.min(ny-1,Math.floor(oy))),qz=q[2];
 function clear(tx,ty){const tz=centers[ty*N+tx],vz=tz-qz,vx=tx+.5-ox,vy=ty+.5-oy,sx=Math.sign(vx),sy=Math.sign(vy),deltaX=vx?1/Math.abs(vx):Infinity,deltaY=vy?1/Math.abs(vy):Infinity;let x=originX,y=originY,nextX=vx?((sx>0?x+1:x)-ox)/vx:Infinity,nextY=vy?((sy>0?y+1:y)-oy)/vy:Infinity,t0=0;
  while(t0<1-1e-12){if(x<0||x>=N||y<0||y>=ny)return false;stats.cellVisits++;stats.heightTests+=2;const next=nextX<nextY?nextX:nextY,t1=next<1?next:1,span=t1-t0,k=(y*N+x)*4,a=coefficients[k],b=coefficients[k+1],c=coefficients[k+2],d=coefficients[k+3],u=ox+vx*t0-x,v=oy+vy*t0-y,du=vx*span,dv=vy*span,f0=a+b*u+c*v+d*u*v-(qz+vz*t0),A=d*du*dv,B=b*du+c*dv+d*(u*dv+v*du)-vz*span,f1=f0+A+B;let maximum=f0>f1?f0:f1;
   if(A<0){const t=-B/(2*A);if(t>0&&t<1){stats.heightTests++;const interior=A*t*t+B*t+f0;if(interior>maximum)maximum=interior;}}
   if(maximum>1e-7)return false;if(t1>=1-1e-12)return true;if(nextX-nextY<1e-12&&nextY-nextX<1e-12){x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;}else if(nextX<nextY){x+=sx;nextX+=deltaX;}else{y+=sy;nextY+=deltaY;}t0=t1;
  }return true;
 }
 for(let y=0;y<ny;y++)for(let x=0;x<N;x++){const k=y*N+x;visible[k]=clear(x,y)?1:0;if(!visible[k])stats.blocked++;}
 const work=emptySolverWork();work.rasterDepthTests=stats.heightTests;return {q:[...q],N,ny,visible,cellCount:N*ny,count:N*ny,stats,work:finishSolverWork(work),ms:NOW()-start,algorithm:'Bilinear terrain-grid visibility'};
}
function recoverTerrainRaster(raw,grid){
 const start=NOW(),polys=[],hidden=[];let area=0;for(let k=0;k<grid.cellCount;k++){const target=raw.visible[k]?polys:hidden;for(const patch of grid.patches[k])target.push(patch);if(raw.visible[k])area+=grid.cellAreas?grid.cellAreas[k]:grid.patches[k].reduce((s,f)=>s+area3(f.poly),0);}return {...raw,polys,hidden,area,grid,recoveryMs:NOW()-start};
}
function terrainSurfaceRaster(q,base,N){const grid=prepareTerrainRaster(base,N),raw=terrainRasterVisibility(q,grid);return recoverTerrainRaster(raw,grid);}
