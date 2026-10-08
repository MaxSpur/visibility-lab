/* Continuous 2D wall-shadow subtraction on convex/disjoint obstacle footprints.
 * IEEE-754 clipping regularizes zero-area tangencies; no exact arithmetic claim.
 * Independent of the input free-space triangulation. */
function wallShadowPlanes2(q,edge,counter=null){const ab=sub(edge.b,edge.a),length=norm(ab);if(length<1e-12)return null;let n=[-ab[1]/length,ab[0]/length];const distance=dot(n,sub(q,edge.a));if(counter)counter.supportTests++;if(Math.abs(distance)<1e-9)return null;if(distance>0)n=mul(n,-1);
 const planes=[{n,d:dot(n,edge.a)}],mid=mul(add(edge.a,edge.b),.5),direction=sub(mid,q);
 for(const endpoint of [edge.a,edge.b]){const ray=sub(endpoint,q),r=norm(ray);if(r<1e-12)return null;let side=[-ray[1]/r,ray[0]/r];if(dot(side,direction)<0)side=mul(side,-1);planes.push({n:side,d:dot(side,q)});}return planes;}
function subtract2(q,scene,order){
 const stored=sceneEdges(scene).filter(e=>e.ring);let edges=stored;
 if(order==='reverse')edges=[...stored].reverse();else if(Array.isArray(order)){edges=order.map(v=>typeof v==='number'?stored[v]:v);if(edges.length!==stored.length||new Set(edges.map(e=>e?.id)).size!==stored.length||edges.some(e=>!e||!stored.some(s=>s.id===e.id)))throw Error('Wall order must contain every stored wall once (wall indices or edge objects).');}
 const count={supportTests:0,wallPiecesTested:0,halfPlaneClips:0,vertexTests:0,createdFragments:0,removedFragments:0},preprocessing={footprintPieceTests:0,halfPlaneClips:0,vertexTests:0,createdFragments:0,holes:scene.holes.length};
 function countedClip(p,h,positive,counter){counter.halfPlaneClips++;return clip(p,v=>{counter.vertexTests++;return dot(h.n,v)-h.d;},positive);}
 function intersectPlanes(p,planes,counter){for(const h of planes){if(p.length<3)return [];p=countedClip(p,h,true,counter);}return p.length>=3&&area(p)>1e-8?p:[];}
 function remove(p,planes,counter){const removed=intersectPlanes(p,planes,counter);if(!removed.length)return {pieces:[p],removed:[]};let rest=p,pieces=[];
  for(const h of planes){const outside=countedClip(rest,h,false,counter);if(outside.length>=3&&area(outside)>1e-8){pieces.push(outside);counter.createdFragments++;}rest=countedClip(rest,h,true,counter);if(rest.length<3)break;}return {pieces,removed};}
 // Remove solid footprints before processing shadows. Convex clipping planes
 // are normalized, so tolerances have consistent world-distance interpretation.
 let parts=[areaSigned(scene.outer)>0?scene.outer:[...scene.outer].reverse()];
 for(const hole of scene.holes){const ring=areaSigned(hole)>0?hole:[...hole].reverse(),planes=ring.map((a,i)=>{const d=sub(ring[(i+1)%ring.length],a),r=norm(d),n=[-d[1]/r,d[0]/r];return {n,d:dot(n,a)};});parts=parts.flatMap(p=>{preprocessing.footprintPieceTests++;return remove(p,planes,preprocessing).pieces;});}
 preprocessing.fragments=parts.length;const snapshots=[parts],shadows=[],stats=[{...count,wallsProcessed:0,fragments:parts.length,area:parts.reduce((s,p)=>s+area(p),0)}];
 for(let i=0;i<edges.length;i++){const edge=edges[i],planes=wallShadowPlanes2(q,edge,count),removed=[],next=[];
  // Display wedge clipping is excluded from solver work counts; it is not used
  // to determine the result. The same normalized half-planes define both.
  let poly=scene.outer;for(const h of planes||[]){poly=clip(poly,v=>dot(h.n,v)-h.d);if(poly.length<3)break;}if(!planes||poly.length<3||area(poly)<1e-8)poly=[];
  if(planes)for(const p of parts){count.wallPiecesTested++;const result=remove(p,planes,count);next.push(...result.pieces);if(result.removed.length){removed.push(result.removed);count.removedFragments++;}}else next.push(...parts);
  parts=next;snapshots.push(parts);shadows.push({edge,planes:planes||[],poly,removed,area:removed.reduce((s,p)=>s+area(p),0)});stats.push({...count,wallsProcessed:i+1,fragments:parts.length,area:parts.reduce((s,p)=>s+area(p),0)});
 }
 return {snapshots,edges,parts,shadows,stats,preprocessing,area:stats[stats.length-1].area};
}
