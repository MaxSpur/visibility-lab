/* This demonstration uses only polygon boundaries, not the input triangulation. */
function wallShadowData(s){return memo('walls2:'+s.map+':'+keyq(s.q2),()=>subtract2(s.q2,SCENES[s.map]));}
function wallCandidateCuts(polys,scene){
 const lift=p=>[p[0],p[1],0],edges=receiverCutEdges(polys.map(p=>p.map(lift)),scene.outer.map(lift)).map(e=>e.map(p=>p.slice(0,2)));
 const walls=sceneEdges(scene).filter(e=>e.ring);
 return edges.filter(([a,b])=>!walls.some(e=>pointOnSegment(a,e.a,e.b)&&pointOnSegment(b,e.a,e.b)));
}
function drawWallShadows(s){
 const scene=SCENES[s.map],q=s.q2,a=wallShadowData(s),g=G(s),m=mapFit({x:g.x+12,y:60,w:g.w-24,h:780},scene.outer);
 stepCount=1+3*a.edges.length;
 const step=s.variant==='result'?stepCount-1:Math.min(stepCount-1,Math.floor(s.phase*stepCount)),initial=step===0;
 const id=initial?0:Math.floor((step-1)/3),part=initial?0:(step-1)%3,processed=initial?0:id+(part===2?1:0),finished=processed===a.edges.length;
 const pieces=a.snapshots[processed],shadow=a.shadows[id],edge=a.edges[id],stats=a.stats[processed];
 mapBase(scene,m);hitTargets.push({kind:'map2',rect:m.rect,point:m.p(q),m});
 pieces.forEach(p=>poly2(p.map(m.p),C.tealLight));
 if(!initial&&!finished&&part>=1){
  if(part===1&&shadow.poly.length)poly2(shadow.poly.map(m.p),rgba(C.orange,.17),C.orange,2.5);
  if(part===2)shadow.removed.forEach(p=>poly2(p.map(m.p),rgba(C.orange,.46),C.orange,2));
  for(const p of [edge.a,edge.b])line2(m.p(q),m.p(p),C.orange,2,[7,5]);
 }
 if(s.cuts){if(!a.cutCache)a.cutCache=new Map();if(!a.cutCache.has(processed))a.cutCache.set(processed,wallCandidateCuts(pieces,scene));for(const [p,z] of a.cutCache.get(processed))line2(m.p(p),m.p(z),C.teal,3);}
 // Solid buildings occlude the explanatory shadow fill in the plan.
 scene.holes.forEach(h=>poly2(h.map(m.p),C.wall,C.wallLine,2));walls(scene,m,s.labels);
 if(!initial&&!finished){line2(m.p(edge.a),m.p(edge.b),C.orange,6);for(const p of [edge.a,edge.b])dot2(m.p(p),5.5,C.orange);}
 observer2(q,m,s.labels);
 const title=initial?'Start with the free-space domain':finished?'The complete visible region':['Choose one opaque wall','Bound the shadow behind it','Subtract only the overlapping region'][part];
 const body=initial?'Start with the enclosing polygon minus the solid building footprints. All free space is still a candidate.':finished?'Every wall has contributed. The teal remainder contains exactly the points with an unobstructed straight connection to the observer.':['The orange segment is an opaque wall. Its endpoints set the limiting directions seen from the observer.','The orange region lies between those directions and beyond the wall. The third boundary preserves space in front of it.',shadow.area>1e-8?'Remove the orange overlap from the previous candidate. Teal shows the surviving polygons.':'This wall removes no further area: its shadow is already excluded or has zero area.'][part];
 setPanel({title,steps:s.variant==='result'?null:['Select a wall','Bound its shadow','Subtract the overlap'],active:part,body:[body],stats:[['Wall shadows processed',`${processed} / ${a.edges.length}`],['Remaining candidate area',number(stats.area)+' m²'],['Retained convex pieces',String(pieces.length)],['Polygon clips',String(stats.halfPlaneClips)]],legend:[[C.purple,'Observer'],[C.tealLight,finished?'Visible region':'Remaining candidate'],...(!finished?[[C.orange,part===2?'Current removed overlap':'Current wall / shadow']]:[]),[C.teal,'Retained shadow boundary']],note:'The observer stays fixed. Each wall contributes a continuous region; shared edges between retained pieces are omitted.'});
}
