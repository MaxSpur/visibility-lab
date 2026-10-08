/* Finite angular-ray reconstruction on the physical input terrain.
 * A center hit seeds a connected terrain sheet inside that angular cell.
 * Crossing an actual mesh edge continues the sheet; observer-facing folds
 * stop at silhouettes. Miss cells and separate depth layers stay unresolved.
 * This is sampled reconstruction, not exact continuous visibility: boundaries
 * narrower than a cell may still be missed or overextended.
 */
function prepareRayReconstruction(tris){
 const start=NOW(),neighbors=tris.map(()=>[]),edges=new Map(),planes=tris.map(tri=>{let h=planeOf(tri);if(h.n[2]<0)h={n:mul(h.n,-1),d:-h.d};return h;});
 tris.forEach((tri,owner)=>tri.forEach((a,i)=>{const edge=[a,tri[(i+1)%3]],key=geometryEdgeKey(edge);if(!edges.has(key))edges.set(key,[]);edges.get(key).push({owner,edge});}));
 for(const entries of edges.values())if(entries.length===2){const [a,b]=entries;neighbors[a.owner].push({owner:b.owner,edge:a.edge});neighbors[b.owner].push({owner:a.owner,edge:a.edge});}
 return {tris,neighbors,planes,ms:NOW()-start};
}
function rayReconstructionClip(poly,h,work){
 if(!poly.length)return [];const out=[],n=h.n,nx=n[0],ny=n[1],nz=n[2],d=h.d;let a=poly[poly.length-1],fa=nx*a[0]+ny*a[1]+nz*a[2]-d;
 for(const b of poly){const fb=nx*b[0]+ny*b[1]+nz*b[2]-d;if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);}if(fb>=0)out.push(b);a=b;fa=fb;}
 const clean=[],hypot=Math.hypot;for(const p of out){const prev=clean[clean.length-1];if(!prev||hypot(p[0]-prev[0],p[1]-prev[1],p[2]-prev[2])>1e-8)clean.push(p);}if(clean.length>1){const first=clean[0],last=clean[clean.length-1];if(hypot(first[0]-last[0],first[1]-last[1],first[2]-last[2])<=1e-8)clean.pop();}return clean;
}
function rayReconstructionArea(poly){let area=0;const a=poly[0],hypot=Math.hypot;for(let i=1;i<poly.length-1;i++){const b=poly[i],c=poly[i+1],x=b[0]-a[0],y=b[1]-a[1],z=b[2]-a[2],u=c[0]-a[0],v=c[1]-a[1],w=c[2]-a[2];area+=hypot(y*w-z*v,z*u-x*w,x*v-y*u)/2;}return area;}
function rayReconstructionEdgeCrosses(edge,planes,work){
 let lo=0,hi=1;work.segmentClips++;
 for(const h of planes){work.halfPlaneTests+=2;const n=h.n,p=edge[0],q=edge[1],a=n[0]*p[0]+n[1]*p[1]+n[2]*p[2]-h.d,b=n[0]*q[0]+n[1]*q[1]+n[2]*q[2]-h.d;if(a<-1e-9&&b<-1e-9)return false;if(a<0||b<0){const t=a/(a-b);if(a<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(hi-lo<=1e-10)return false;}}
 return hi-lo>1e-10;
}
function rayReconstructionCellPlanes(frame,q,u0,u1,v0,v1){
 const f=frame.f,r=frame.r,u=frame.u,normals=[[r[0]-f[0]*u0,r[1]-f[1]*u0,r[2]-f[2]*u0],[f[0]*u1-r[0],f[1]*u1-r[1],f[2]*u1-r[2]],[u[0]-f[0]*v0,u[1]-f[1]*v0,u[2]-f[2]*v0],[f[0]*v1-u[0],f[1]*v1-u[1],f[2]*v1-u[2]]];return normals.map(n=>({n,d:n[0]*q[0]+n[1]*q[1]+n[2]*q[2]}));
}
function recoverRaySurface(result,prepared){
 const start=NOW(),{q,N,ids}=result,{tris,neighbors,planes:facePlanes}=prepared,polys=[],rays=[],work=emptySolverWork(),seen=new Int32Array(tris.length),facing=new Uint8Array(tris.length);let serial=0,k=0;
 facePlanes.forEach((h,i)=>{work.sideTests++;facing[i]=val3(h,q)>1e-9?1:0;});
 for(let fi=0;fi<6;fi++){const frame=CUBE_FRAMES[fi];for(let y=0;y<N;y++)for(let x=0;x<N;x++,k++){
  const owner=ids[k];if(owner<0||!facing[owner])continue;const u0=-1+2*x/N,u1=u0+2/N,v0=-1+2*y/N,v1=v0+2/N,planes=rayReconstructionCellPlanes(frame,q,u0,u1,v0,v1),stack=[owner];serial++;seen[owner]=serial;
  while(stack.length){const id=stack.pop();let poly=tris[id];for(const h of planes){if(poly.length<3)break;work.polygonClips++;work.halfPlaneTests+=poly.length+1;poly=rayReconstructionClip(poly,h,work);}if(poly.length<3||rayReconstructionArea(poly)<1e-10)continue;polys.push({poly,owner:id,kind:'terrain',cell:k});for(const next of neighbors[id])if(seen[next.owner]!==serial&&facing[next.owner]&&rayReconstructionEdgeCrosses(next.edge,planes,work)){seen[next.owner]=serial;stack.push(next.owner);}}
  const u=(u0+u1)/2,v=(v0+v1)/2,f=frame.f,r=frame.r,b=frame.u,t=result.depth[k];rays.push({p:[q[0]+(f[0]+(r[0]*u+b[0]*v))*t,q[1]+(f[1]+(r[1]*u+b[1]*v))*t,q[2]+(f[2]+(r[2]*u+b[2]*v))*t],id:owner,cell:k});
 }}
 return {...result,polys,rays,area:polys.reduce((n,p)=>n+rayReconstructionArea(p.poly),0),recoveryMs:NOW()-start,work:finishSolverWork(work),algorithm:'Connected angular ray sheets'};
}
/* Display-only compound paths: group by original face, cancel interior sample
 * edges, and trace remaining loops. Use an even-odd SVG fill for holes. The
 * raw polygons remain the authoritative numerical partition and area metric.
 * No triangles are invented between sampled hits or disconnected loops.
 */
function raySurfaceDisplayGroups(sample){
 const grouped=new Map();for(const face of sample.polys){if(!grouped.has(face.owner))grouped.set(face.owner,[]);grouped.get(face.owner).push(face.poly);}
 return [...grouped].map(([owner,polys])=>{const candidate=raySurfaceBoundaryLoops(outlineEdges(polys)),total=polys.reduce((s,p)=>s+area3(p),0),loopArea=candidate.reduce((s,p,i)=>s+area3(p)*(candidate.filter((other,j)=>j!==i&&inside(p[0].slice(0,2),other.map(v=>v.slice(0,2)))).length%2?-1:1),0),dissolved=Math.abs(loopArea-total)<=Math.max(1e-6,total*1e-7);return {owner,kind:'terrain',polys,loops:dissolved?candidate:polys,dissolved};});
}
function raySurfaceBoundaryLoops(edges){
 const key=p=>p.map(x=>Math.round(x*1e5)).join(','),adj=new Map(),remaining=new Set(edges.map((_,i)=>i));edges.forEach((e,i)=>e.forEach(p=>{const k=key(p);if(!adj.has(k))adj.set(k,[]);adj.get(k).push(i);}));const loops=[];
 while(remaining.size){const first=remaining.values().next().value,e=edges[first],loop=[e[0],e[1]];remaining.delete(first);const start=key(e[0]);let current=key(e[1]),closed=false;
  while(loop.length<=edges.length+1){if(current===start){closed=true;loop.pop();break;}const next=(adj.get(current)||[]).find(i=>remaining.has(i));if(next===undefined)break;remaining.delete(next);const edge=edges[next],p=key(edge[0])===current?edge[1]:edge[0];loop.push(p);current=key(p);}
  if(!closed||loop.length<3)continue;let changed=true;while(changed&&loop.length>3){changed=false;for(let i=0;i<loop.length;i++){const a=loop[(i+loop.length-1)%loop.length],b=loop[i],c=loop[(i+1)%loop.length],ab=sub(b,a),bc=sub(c,b);if(norm(cross3(ab,bc))<=1e-8*Math.max(1,norm(ab)*norm(bc))&&dot(ab,bc)>=0){loop.splice(i,1);changed=true;break;}}}loops.push(loop);
 }return loops;
}
