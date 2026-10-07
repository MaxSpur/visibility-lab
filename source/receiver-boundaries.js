/* DISPLAY helper: boundary of nonoverlapping coplanar visible receiver pieces.
 * Splits collinear edges at every endpoint before cancellation, so triangulation
 * seams and T junctions disappear. The receiver's physical perimeter is omitted.
 * Core shadow clipping and its surface areas are unchanged. */
function receiverCutEdges(polygons,whole){
 if(!whole||whole.length<3)return [];
 const minus=(a,b)=>a.map((v,i)=>v-b[i]),plus=(a,b)=>a.map((v,i)=>v+b[i]),times=(a,k)=>a.map(v=>v*k),dp=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=a=>Math.hypot(...a),cp=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
 if(!whole.flat().every(Number.isFinite))return [];
 const origin=whole[0],extent=Math.max(...whole.map(p=>length(minus(p,origin)))),tol=Math.max(1e-7,extent*1e-8);let u=null,n=null;
 for(let i=1;i<whole.length;i++){const d=minus(whole[i],origin);if(length(d)>tol){u=times(d,1/length(d));break;}}if(!u)return [];
 for(let i=1;i<whole.length;i++){const c=cp(u,minus(whole[i],origin));if(length(c)>tol){n=times(c,1/length(c));break;}}if(!n)return [];
 const v=cp(n,u),project=p=>{const d=minus(p,origin);return [dp(d,u),dp(d,v)];},lift=p=>plus(origin,plus(times(u,p[0]),times(v,p[1]))),signed=p=>p.reduce((s,a,i)=>s+cross2(a,p[(i+1)%p.length]),0)/2;
 let window=whole.map(project);if(signed(window)<0)window.reverse();
 function clipped(poly){for(let i=0;i<window.length&&poly.length;i++){const a=window[i],b=window[(i+1)%window.length],edge=minus(b,a),f=p=>cross2(edge,minus(p,a)),out=[];let p=poly[poly.length-1],fp=f(p);for(const q of poly){const fq=f(q);if((fp>=0)!==(fq>=0)){const t=fp/(fp-fq);out.push(plus(p,times(minus(q,p),t)));}if(fq>=0)out.push(q);p=q;fp=fq;}poly=out;}return poly;}
 const groups=[];
 for(const input of polygons){const source=input.poly||input;if(!source||source.length<3||!source.flat().every(Number.isFinite)||source.some(p=>Math.abs(dp(minus(p,origin),n))>tol*10))continue;let p=clipped(source.map(project));if(p.length<3||Math.abs(signed(p))<tol*tol)continue;if(signed(p)<0)p.reverse();
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=minus(b,a),len=length(d);if(len<=tol)continue;let direction=times(d,1/len),sign=1;if(direction[0]<-1e-10||Math.abs(direction[0])<=1e-10&&direction[1]<0){direction=times(direction,-1);sign=-1;}
   let group=groups.find(g=>Math.abs(cross2(g.direction,direction))<=1e-9&&Math.abs(cross2(g.direction,minus(a,g.origin)))<=tol&&Math.abs(cross2(g.direction,minus(b,g.origin)))<=tol);
   if(!group){group={origin:a,direction,intervals:[]};groups.push(group);}const ta=dp(minus(a,group.origin),group.direction),tb=dp(minus(b,group.origin),group.direction);group.intervals.push({lo:Math.min(ta,tb),hi:Math.max(ta,tb),sign});
  }
 }
 const onPerimeter=(a,b)=>window.some((p,i)=>{const q=window[(i+1)%window.length],d=minus(q,p),len=length(d);if(len<=tol)return false;const along=x=>dp(minus(x,p),d)/len;return Math.abs(cross2(d,minus(a,p)))/len<=tol&&Math.abs(cross2(d,minus(b,p)))/len<=tol&&along(a)>=-tol&&along(b)>=-tol&&along(a)<=len+tol&&along(b)<=len+tol;});
 const out=[];
 for(const g of groups){const sorted=g.intervals.flatMap(i=>[i.lo,i.hi]).sort((a,b)=>a-b),knots=[];for(const x of sorted)if(!knots.length||x-knots[knots.length-1]>tol)knots.push(x);else knots[knots.length-1]=(knots[knots.length-1]+x)/2;
  const intervals=[];for(let i=0;i<knots.length-1;i++){const lo=knots[i],hi=knots[i+1];if(hi-lo<=tol)continue;const mid=(lo+hi)/2,winding=g.intervals.reduce((s,e)=>s+(mid>e.lo-tol&&mid<e.hi+tol?e.sign:0),0);if(!winding)continue;const a=plus(g.origin,times(g.direction,lo)),b=plus(g.origin,times(g.direction,hi));if(onPerimeter(a,b))continue;const previous=intervals[intervals.length-1];if(previous&&lo-previous[1]<=tol)previous[1]=hi;else intervals.push([lo,hi]);}
  for(const [a,b] of intervals)out.push([lift(plus(g.origin,times(g.direction,a))),lift(plus(g.origin,times(g.direction,b)))]);
 }
 return out;
}
