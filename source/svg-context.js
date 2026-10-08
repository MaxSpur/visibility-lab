/* Native SVG drawing primitives. Coordinates are illustration units, never pixels
   in a backing bitmap. The viewBox follows the available graphic's aspect ratio. */
let W=1600;
const H=900;
const C={ink:'#19344a',muted:'#748593',grid:'#e5ecef',wall:'#c8d2d9',wallLine:'#788b95',teal:'#087e82',green:'#52b4a6',tealLight:'#c4e5dd',orange:'#e17c18',orangeLight:'#f4c890',purple:'#7545a4',red:'#c55847'};
const view=document.getElementById('view');
const svgNumber=n=>Number.isFinite(n)?String(Math.round(n*10000)/10000):'0';
const escapeSVG=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rgb(c,a=1){if(Array.isArray(c))return c.length===4?c:[...c,a];c=c.replace('#','');return [parseInt(c.slice(0,2),16)/255,parseInt(c.slice(2,4),16)/255,parseInt(c.slice(4,6),16)/255,a];}
function rgba(c,a){const r=rgb(c);return `rgba(${r[0]*255},${r[1]*255},${r[2]*255},${a})`;}
const ctx={
  fillStyle:'#000',strokeStyle:'#000',lineWidth:1,font:'500 22px Arial,sans-serif',textAlign:'left',dash:[],parts:[],stack:[],path:[],
  reset(){this.parts=[];this.stack=[];this.path=[];this.dash=[];this.lineWidth=1;},
  raw(markup){this.parts.push(markup);},
  commit(){view.innerHTML=this.parts.join('');},
  save(){this.stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,font:this.font,textAlign:this.textAlign,dash:[...this.dash]});},
  restore(){if(this.stack.length)Object.assign(this,this.stack.pop());},
  setLineDash(d){this.dash=[...d];},
  beginPath(){this.path=[];},
  moveTo(x,y){this.path.push('M'+svgNumber(x)+' '+svgNumber(y));},
  lineTo(x,y){this.path.push('L'+svgNumber(x)+' '+svgNumber(y));},
  closePath(){this.path.push('Z');},
  fill(){this.raw('<path d="'+this.path.join(' ')+'" fill="'+escapeSVG(this.fillStyle)+'"/>');},
  stroke(){this.raw('<path d="'+this.path.join(' ')+'" fill="none" stroke="'+escapeSVG(this.strokeStyle)+'" stroke-width="'+svgNumber(this.lineWidth)+'" stroke-linejoin="round"'+(this.dash.length?' stroke-dasharray="'+this.dash.map(svgNumber).join(' ')+'"':'')+'/>');},
  fillRect(x,y,w,h){this.raw('<rect x="'+svgNumber(x)+'" y="'+svgNumber(y)+'" width="'+svgNumber(w)+'" height="'+svgNumber(h)+'" fill="'+escapeSVG(this.fillStyle)+'"/>');},
  strokeRect(x,y,w,h){this.raw('<rect x="'+svgNumber(x)+'" y="'+svgNumber(y)+'" width="'+svgNumber(w)+'" height="'+svgNumber(h)+'" fill="none" stroke="'+escapeSVG(this.strokeStyle)+'" stroke-width="'+svgNumber(this.lineWidth)+'"/>');},
  fillText(text,x,y){const f=this.font.match(/^(\d+) ([\d.]+)px (.+)$/),anchor={left:'start',center:'middle',right:'end'}[this.textAlign]||'start';this.raw('<text x="'+svgNumber(x)+'" y="'+svgNumber(y)+'" fill="'+escapeSVG(this.fillStyle)+'" font-size="'+(f?f[2]:22)+'" font-weight="'+(f?f[1]:500)+'" font-family="'+escapeSVG(f?f[3]:'Arial,sans-serif')+'" text-anchor="'+anchor+'">'+escapeSVG(text)+'</text>');}
};
function poly2(p,fill=null,stroke=null,width=2,dash=[]){if(p.length<2)return;ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}}
function line2(a,b,col=C.ink,w=2,dash=[]){ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function dot2(p,r=8,col=C.ink,stroke='#ffffff'){ctx.raw('<circle cx="'+svgNumber(p[0])+'" cy="'+svgNumber(p[1])+'" r="'+svgNumber(r)+'" fill="'+escapeSVG(col)+'"'+(stroke?' stroke="'+escapeSVG(stroke)+'" stroke-width="2.5"':'')+'/>');}
function text2(t,x,y,size=22,col=C.ink,align='left'){ctx.font=`500 ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif`;ctx.textAlign=align;ctx.fillStyle=col;ctx.fillText(t,x,y);}
function arrow2(a,b,col,w=3){line2(a,b,col,w);const d=unit(sub(b,a)),n=[-d[1],d[0]];poly2([b,add(sub(b,mul(d,12)),mul(n,6)),sub(sub(b,mul(d,12)),mul(n,6))],col);}
function mapFit(rect,outer){const xs=outer.map(v=>v[0]),ys=outer.map(v=>v[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(rect.w/(x1-x0),rect.h/(y1-y0)),x=rect.x+(rect.w-(x1-x0)*scale)/2,y=rect.y+(rect.h-(y1-y0)*scale)/2;return {p:v=>[x+(v[0]-x0)*scale,y+(y1-v[1])*scale],inverse:v=>[x0+(v[0]-x)/scale,y1-(v[1]-y)/scale],rect};}
function mapBase(scene,m){poly2(scene.outer.map(m.p),'#f8fafb',C.wallLine,2);for(let x=10;x<100;x+=10)line2(m.p([x,0]),m.p([x,65]),C.grid,1);for(let y=10;y<65;y+=10)line2(m.p([0,y]),m.p([100,y]),C.grid,1);scene.holes.forEach(h=>poly2(h.map(m.p),C.wall,C.wallLine,2));}
function walls(scene,m,labels=false){scene.holes.forEach((h,i)=>{poly2(h.map(m.p),null,C.wallLine,2.5);if(labels){const c=m.p(centroid(h));text2(String(i+1),c[0],c[1]+8,24,C.muted,'center');}});}
function observer2(q,m,labels=false){dot2(m.p(q),10,C.purple);if(labels){const p=m.p(q);text2('q',p[0]+16,p[1]-9,24,C.ink);}}
function camera3(rect,yaw=-.60,pitch=.66,center=[50,35,20],scale=null){const right=[Math.cos(yaw),Math.sin(yaw),0],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(yaw)*Math.sin(pitch),Math.cos(pitch)],toward=cross3(right,up);if(scale===null)scale=Math.min(rect.w/128,rect.h/95);return {rect,right,up,toward,scale,center,p:v=>{const d=sub(v,center);return [rect.x+rect.w/2+dot(d,right)*scale,rect.y+rect.h/2-dot(d,up)*scale];},depth:v=>dot(sub(v,center),toward),inverseZ:(p,z)=>{const a=(p[0]-rect.x-rect.w/2)/scale-right[2]*(z-center[2]),b=-(p[1]-rect.y-rect.h/2)/scale-up[2]*(z-center[2]),det=right[0]*up[1]-right[1]*up[0];return [center[0]+(a*up[1]-b*right[1])/det,center[1]+(b*right[0]-a*up[0])/det];}};}
function drawWorld(cam,faces,lines=[]){if(cam.main){const r=cam.rect,id='main-clip-'+[r.x,r.y,r.w,r.h].map(v=>Math.round(v)).join('-');ctx.raw(`<defs><clipPath id="${id}"><rect x="${svgNumber(r.x)}" y="${svgNumber(r.y)}" width="${svgNumber(r.w)}" height="${svgNumber(r.h)}"/></clipPath></defs><g clip-path="url(#${id})">`);}ctx.raw(worldSVG(cam,faces,lines));if(cam.main)ctx.raw('</g>');}
function edges3(poly,color=C.wallLine,alpha=1){return poly.map((a,i)=>({a,b:poly[(i+1)%poly.length],color,alpha}));}
function terrainFaces(model=TERRAIN3){return model.tris.map(poly=>({poly,color:'#d4dedb'}));}
function terrainLines(model=TERRAIN3){return model.tris.flatMap(p=>edges3(p,'#9cafa9',.7));}
function surfaceFaces(surfaces,color=C.green,alpha=1){return surfaces.map(f=>({poly:f.poly||f,color,alpha,bias:.00004}));}
function beamFaces(q,poly,color=C.orange,alpha=.12){return poly.map((a,i)=>({poly:[q,a,poly[(i+1)%poly.length]],color,alpha,shade:false}));}
function highlight3(p,cam,color=C.orange,w=4,dash=[]){p.forEach((a,i)=>line2(cam.p(a),cam.p(p[(i+1)%p.length]),color,w,dash));}
function observer3(q,cam,ground=0,label=false){line2(cam.p([q[0],q[1],ground]),cam.p(q),C.purple,3);dot2(cam.p(q),11,C.purple);if(label){const p=cam.p(q);text2('q',p[0]+16,p[1]-12,24,C.ink);}}
function boundLines(z=55){const v=boxSurface(0,100,0,70,0,z);return v.flatMap(f=>edges3(f.poly,'#bcc9d1',.35));}
