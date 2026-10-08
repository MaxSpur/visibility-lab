/* Vector DISPLAY only. Orthographic projected convex footprints carry affine
 * depth. Hidden face regions and hidden line intervals are clipped analytically;
 * this changes neither the continuous visibility solver nor its receiver geometry. */
let worldSVGSequence=0;
function worldSVG(cam,faces,lines=[]){
 const rect=cam.rect,eps=1e-7,number=n=>Number(n.toFixed(6)),id='world-clip-'+(++worldSVGSequence),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const signed=p=>p.reduce((s,a,i)=>s+a[0]*p[(i+1)%p.length][1]-a[1]*p[(i+1)%p.length][0],0)/2;
 function half(p,f){if(!p.length)return [];const out=[];let a=p[p.length-1],da=f(a);for(const b of p){const db=f(b);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(db>=0)out.push(b);a=b;da=db;}return out;}
 function intersect(p,cut){for(let i=0;i<cut.length&&p.length;i++){const a=cut[i],b=cut[(i+1)%cut.length];p=half(p,v=>(b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]));}return p;}
 function difference(subject,cut){if(cut.length<3||Math.abs(signed(cut))<1e-8)return [subject];const overlap=intersect(subject,cut);if(overlap.length<3||Math.abs(signed(overlap))<1e-8)return [subject];let rest=subject,out=[];for(let i=0;i<cut.length&&rest.length>=3;i++){const a=cut[i],b=cut[(i+1)%cut.length],f=v=>(b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]);const outside=half(rest,v=>-f(v));if(outside.length>=3&&Math.abs(signed(outside))>1e-8)out.push(outside);rest=half(rest,f);}return out;}
 const window=[[rect.x,rect.y],[rect.x+rect.w,rect.y],[rect.x+rect.w,rect.y+rect.h],[rect.x,rect.y+rect.h]],bounds=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))],overlaps=(a,b)=>a[0]<b[2]-eps&&a[2]>b[0]+eps&&a[1]<b[3]-eps&&a[3]>b[1]+eps;
 function projectFace(f,index){if(!f.poly||f.poly.length<3||!f.poly.flat().every(Number.isFinite))return null;const points=f.poly.map(cam.p),depths=f.poly.map(v=>cam.depth(v)+(f.bias||0)*220);let plane=null;
  for(let i=1;i<points.length-1&&!plane;i++){const a=points[0],b=points[i],c=points[i+1],det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);if(Math.abs(det)<1e-9)continue;const dx=((depths[i]-depths[0])*(c[1]-a[1])-(depths[i+1]-depths[0])*(b[1]-a[1]))/det,dy=((b[0]-a[0])*(depths[i+1]-depths[0])-(c[0]-a[0])*(depths[i]-depths[0]))/det;plane=[dx,dy,depths[0]-dx*a[0]-dy*a[1]];}
  if(!plane)return null;let footprint=signed(points)<0?[...points].reverse():points;footprint=intersect(footprint,window);if(footprint.length<3||Math.abs(signed(footprint))<1e-8)return null;
  let color=rgb(f.color||C.wall,f.alpha??1),alpha=f.alpha??color[3]??1;if(f.shade!==false){const lum=.84+.16*Math.abs(dot(normal3(f.poly),unit([-.3,-.5,1])));color=color.map((v,i)=>i<3?v*lum:v);}const fill='rgb('+color.slice(0,3).map(v=>number(clamp(v,0,1)*255)).join(',')+')';
  return {f,index,footprint,plane,bounds:bounds(footprint),alpha:clamp(alpha,0,1),fill,depth:cam.depth(centroid(f.poly))};
 }
 // Draped comparison textures can request a stable paint layer. Otherwise
 // transparent construction faces retain their physical far-to-near order.
 const projected=faces.map(projectFace).filter(Boolean),opaque=projected.filter(f=>f.alpha>=.999&&!f.f.loops),transparent=projected.filter(f=>f.alpha<.999||f.f.loops).sort((a,b)=>(a.f.paintLayer||0)-(b.f.paintLayer||0)||a.depth-b.depth||a.index-b.index),bin=Math.max(20,Math.min(96,Math.sqrt(rect.w*rect.h/Math.max(1,opaque.length))*2)),hash=new Map();
 function keys(box,visit){const x0=Math.max(0,Math.floor((box[0]-rect.x)/bin)),x1=Math.min(Math.floor(rect.w/bin),Math.floor((box[2]-rect.x)/bin)),y0=Math.max(0,Math.floor((box[1]-rect.y)/bin)),y1=Math.min(Math.floor(rect.h/bin),Math.floor((box[3]-rect.y)/bin));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)visit(x+','+y);}
 for(const f of opaque)keys(f.bounds,key=>{if(!hash.has(key))hash.set(key,[]);hash.get(key).push(f);});
 function candidates(box){const found=new Set();keys(box,key=>{for(const f of hash.get(key)||[])found.add(f);});return [...found].filter(f=>overlaps(box,f.bounds));}
 const at=(plane,p)=>plane[0]*p[0]+plane[1]*p[1]+plane[2],output=[];let faceCandidates=0,lineCandidates=0,faceFragments=0,lineFragments=0;
 for(const target of [...opaque,...transparent]){let pieces=[target.footprint];for(const blocker of candidates(target.bounds)){if(blocker===target)continue;faceCandidates++;const delta=p=>at(blocker.plane,p)-at(target.plane,p)+(target.alpha>=.999&&blocker.index>target.index?eps:-eps);
   if(Math.max(...target.footprint.map(delta))<=0)continue;
   // The depth inequality clips through either footprint when planes cross.
   let cut=intersect(target.footprint,blocker.footprint);cut=half(cut,delta);if(cut.length<3||Math.abs(signed(cut))<1e-8)continue;
   pieces=pieces.flatMap(p=>difference(p,cut));if(!pieces.length)break;
  }
  if(target.f.loops){
   // A texture's rings lie on this original convex face. Clip that face once
   // against opaque terrain, then mask the complete compound texture path.
   // Holes stay holes; the display does not invent triangles between samples.
   const path=polys=>polys.map(p=>'M'+p.map(v=>v.map(number).join(',')).join('L')+'Z').join(''),loops=target.f.loops.filter(p=>p.length>=3&&p.flat().every(Number.isFinite)).map(p=>p.map(cam.p));
   if(pieces.length&&loops.length){const mask=id+'-texture-'+target.index;output.push('<defs><clipPath id="'+mask+'"><path d="'+path(pieces)+'"/></clipPath></defs><path data-world-face="'+target.index+'" data-world-compound="true" d="'+path(loops)+'" fill-rule="evenodd" clip-path="url(#'+mask+')" fill="'+escape(target.fill)+'"'+(target.alpha<1?' fill-opacity="'+number(target.alpha)+'"':'')+'/>');faceFragments++;}
  }else for(const p of pieces){if(!p.flat().every(Number.isFinite))continue;output.push('<polygon data-world-face="'+target.index+'" points="'+p.map(v=>v.map(number).join(',')).join(' ')+'" fill="'+escape(target.fill)+'"'+(target.alpha<1?' fill-opacity="'+number(target.alpha)+'"':'')+'/>');faceFragments++;}
 }
 function restricted(interval,a,b,f){let [lo,hi]=interval;const da=f(a),db=f(b);if(da>=0&&db>=0)return [lo,hi];if(da<0&&db<0)return null;const t=da/(da-db);if(da<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);return hi>lo+1e-12?[lo,hi]:null;}
 lines.forEach((l,index)=>{if(!l.a||!l.b||![...l.a,...l.b].every(Number.isFinite))return;const a=cam.p(l.a),b=cam.p(l.b);if(![...a,...b].every(Number.isFinite)||Math.hypot(b[0]-a[0],b[1]-a[1])<1e-9)return;const za=cam.depth(l.a)+.066,zb=cam.depth(l.b)+.066;let visible=[[0,1]],lineBounds=bounds([a,b]);
  // Inflate degenerate horizontal/vertical bounds for broad-phase lookup.
  lineBounds=[lineBounds[0]-eps*2,lineBounds[1]-eps*2,lineBounds[2]+eps*2,lineBounds[3]+eps*2];
  // Inspection guides may deliberately stay above context. Their endpoints
  // still use the same physical camera and viewport clip as all world lines.
  for(const blocker of l.occlude===false?[]:candidates(lineBounds)){lineCandidates++;let hidden=[0,1];for(let i=0;i<blocker.footprint.length&&hidden;i++){const u=blocker.footprint[i],v=blocker.footprint[(i+1)%blocker.footprint.length];hidden=restricted(hidden,a,b,p=>(v[0]-u[0])*(p[1]-u[1])-(v[1]-u[1])*(p[0]-u[0]));}if(!hidden)continue;
   const da=at(blocker.plane,a)-za-eps,db=at(blocker.plane,b)-zb-eps;
   if(da<0&&db<0)continue;if(da<0||db<0){const t=da/(da-db);hidden=da<0?[Math.max(hidden[0],t),hidden[1]]:[hidden[0],Math.min(hidden[1],t)];}if(hidden[1]<=hidden[0]+1e-12)continue;
   visible=visible.flatMap(([lo,hi])=>{if(hidden[1]<=lo||hidden[0]>=hi)return [[lo,hi]];const out=[];if(hidden[0]>lo)out.push([lo,hidden[0]]);if(hidden[1]<hi)out.push([hidden[1],hi]);return out;});if(!visible.length)break;
  }
  for(const [lo,hi] of visible){const p=[a[0]+lo*(b[0]-a[0]),a[1]+lo*(b[1]-a[1])],q=[a[0]+hi*(b[0]-a[0]),a[1]+hi*(b[1]-a[1])],color=rgb(l.color||C.wallLine,l.alpha??1),stroke='rgb('+color.slice(0,3).map(v=>number(clamp(v,0,1)*255)).join(',')+')',meta=(l.occlude===false?' data-inspection-guide="true"':'')+((l.role||l.sourceRay)?' data-line-role="'+escape(l.role||(l.sourceRay?'source-ray':''))+'"':'')+(l.sampleCell!==undefined?' data-sample-ray="'+escape(l.sampleCell)+'"':'')+(l.receiver!==undefined?' data-tested-receiver="'+escape(l.receiver)+'"':l.candidate!==undefined?' data-tested-occluder="'+escape(l.candidate)+'"':'');output.push('<line data-world-line="'+index+'" x1="'+number(p[0])+'" y1="'+number(p[1])+'" x2="'+number(q[0])+'" y2="'+number(q[1])+'" stroke="'+escape(stroke)+'" stroke-opacity="'+number(clamp(l.alpha??color[3]??1,0,1))+'" stroke-width="'+number(Math.max(.1,l.width||1))+'"'+meta+'/>');lineFragments++;}
 });
 worldSVG.lastStats={inputFaces:faces.length,projectedFaces:projected.length,opaqueFaces:opaque.length,faceCandidates,lineCandidates,faceFragments,lineFragments,binSize:bin};
 return '<defs><clipPath id="'+id+'"><rect x="'+number(rect.x)+'" y="'+number(rect.y)+'" width="'+number(rect.w)+'" height="'+number(rect.h)+'"/></clipPath></defs><g clip-path="url(#'+id+')">'+output.join('')+'</g>';
}
