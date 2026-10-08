/* Scalar, allocation-light execution of the preserved first-hit ray solver.
 * Reusable triangle/BVH arrays change representation, not ray directions,
 * intersection tolerances, near-first traversal order, or winner semantics.
 */
function prepareRayQuery(prepared){
 const start=NOW(),count=prepared.fast.length,triangles=new Float64Array(count*9),tree=prepared.bvh,nodes=new Float64Array(tree.nodes*6),left=new Int32Array(tree.nodes).fill(-1),right=new Int32Array(tree.nodes).fill(-1),offsets=new Int32Array(tree.nodes).fill(-1),counts=new Int32Array(tree.nodes),leaf=[];
 prepared.fast.forEach((t,i)=>triangles.set([...t.a,...t.e1,...t.e2],i*9));
 function visit(n){nodes.set([...n.lo,...n.hi],n.id*6);if(n.ids){offsets[n.id]=leaf.length;counts[n.id]=n.ids.length;leaf.push(...n.ids);}else{left[n.id]=n.left.id;right[n.id]=n.right.id;visit(n.left);visit(n.right);}}
 visit(tree.root);return {triangles,nodes,left,right,offsets,counts,leaf:new Int32Array(leaf),root:tree.root.id,count,nodeCount:tree.nodes,ms:NOW()-start};
}
function traceRayCube(q,prepared,N,indexed=true){
 const start=NOW(),ids=new Int32Array(6*N*N).fill(-1),depth=new Float64Array(ids.length).fill(Infinity),stats={tests:0,boxes:0},abs=Math.abs,min=Math.min,max=Math.max,{triangles,nodes,left,right,offsets,counts,leaf,root,count}=prepared,stack=new Int32Array(prepared.nodeCount),qx=q[0],qy=q[1],qz=q[2];let dx=0,dy=0,dz=0,nearest=Infinity,winner=-1;
 function test(id){stats.tests++;const k=id*9,ex=triangles[k+3],ey=triangles[k+4],ez=triangles[k+5],fx=triangles[k+6],fy=triangles[k+7],fz=triangles[k+8],hx=dy*fz-dz*fy,hy=dz*fx-dx*fz,hz=dx*fy-dy*fx,det=ex*hx+ey*hy+ez*hz;if(abs(det)<1e-12)return;const sx=qx-triangles[k],sy=qy-triangles[k+1],sz=qz-triangles[k+2],u=(sx*hx+sy*hy+sz*hz)/det;if(u<-1e-9||u>1+1e-9)return;const rx=sy*ez-sz*ey,ry=sz*ex-sx*ez,rz=sx*ey-sy*ex,v=(dx*rx+dy*ry+dz*rz)/det;if(v<-1e-9||u+v>1+1e-9)return;const t=(fx*rx+fy*ry+fz*rz)/det;if(t>1e-7&&t<nearest){nearest=t;winner=id;}}
 function box(id){stats.boxes++;const k=id*6;let a=0,b=nearest,t,u;
  if(abs(dx)<1e-15){if(qx<nodes[k]-1e-8||qx>nodes[k+3]+1e-8)return Infinity;}else{t=(nodes[k]-qx)/dx;u=(nodes[k+3]-qx)/dx;if(t>u){const v=t;t=u;u=v;}a=max(a,t);b=min(b,u);if(a>b+1e-9)return Infinity;}
  if(abs(dy)<1e-15){if(qy<nodes[k+1]-1e-8||qy>nodes[k+4]+1e-8)return Infinity;}else{t=(nodes[k+1]-qy)/dy;u=(nodes[k+4]-qy)/dy;if(t>u){const v=t;t=u;u=v;}a=max(a,t);b=min(b,u);if(a>b+1e-9)return Infinity;}
  if(abs(dz)<1e-15){if(qz<nodes[k+2]-1e-8||qz>nodes[k+5]+1e-8)return Infinity;}else{t=(nodes[k+2]-qz)/dz;u=(nodes[k+5]-qz)/dz;if(t>u){const v=t;t=u;u=v;}a=max(a,t);b=min(b,u);if(a>b+1e-9)return Infinity;}return a;
 }
 let k=0;for(let face=0;face<6;face++)for(let y=0;y<N;y++)for(let x=0;x<N;x++,k++){const u=-1+(x+.5)*2/N,v=-1+(y+.5)*2/N;if(face===0){dx=1;dy=-u;dz=v;}else if(face===1){dx=-1;dy=u;dz=v;}else if(face===2){dx=u;dy=1;dz=v;}else if(face===3){dx=-u;dy=-1;dz=v;}else if(face===4){dx=u;dy=-v;dz=1;}else{dx=u;dy=v;dz=-1;}
  nearest=Infinity;winner=-1;if(!indexed){for(let id=0;id<count;id++)test(id);}else{let top=1;stack[0]=root;while(top){const node=stack[--top];if(box(node)===Infinity)continue;if(offsets[node]>=0){const end=offsets[node]+counts[node];for(let j=offsets[node];j<end;j++)test(leaf[j]);}else{const a=left[node],b=right[node],da=box(a),db=box(b);if(da<db){if(db!==Infinity)stack[top++]=b;if(da!==Infinity)stack[top++]=a;}else{if(da!==Infinity)stack[top++]=a;if(db!==Infinity)stack[top++]=b;}}}}
  ids[k]=winner;depth[k]=nearest;
 }
 const work=emptySolverWork();work.rayPrimitiveTests=stats.tests;work.rayBoxTests=stats.boxes;return {q,N,ids,depth,stats,work:finishSolverWork(work),ms:NOW()-start,algorithm:indexed?'Indexed rays':'Brute-force rays'};
}
