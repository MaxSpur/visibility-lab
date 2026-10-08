/* Inspection is a display operation: pointer movement updates a small SVG
 * overlay without rebuilding plots, recomputing statistics or running tests. */
const benchmarkPlots=new Map();
let benchmarkPinnedCurve=null,benchmarkHover=null;
function benchmarkCurveKey(plotId,row){return plotId+':'+row.methodId+(plotId==='detail-accuracy'?':'+row.meshTriangles:'');}
function benchmarkPlotStart(id,rect,points){
 const curves=new Map();for(const point of points){const key=benchmarkCurveKey(id,point.row);if(!curves.has(key))curves.set(key,[]);curves.get(key).push(point);}
 benchmarkPlots.set(id,{id,rect,points,curves});
 ctx.raw(`<rect data-benchmark-plot-background="${id}" x="${svgNumber(rect.x)}" y="${svgNumber(rect.y)}" width="${svgNumber(rect.w)}" height="${svgNumber(rect.h)}" fill="transparent" pointer-events="all"/>`);
}
function benchmarkCurve(sequence,plotId,width=2,dash=[]){
 if(!sequence.length)return;const key=benchmarkCurveKey(plotId,sequence[0].row),path=sequence.map((p,i)=>(i?'L':'M')+p.p.map(svgNumber).join(' ')).join(' '),color=benchmarkRowColor(sequence[0].row);
 ctx.raw(`<g data-benchmark-curve="${key}" data-benchmark-method="${sequence[0].row.methodId}"><path d="${path}" fill="none" stroke="${color}" stroke-width="${width}"${dash.length?` stroke-dasharray="${dash.join(' ')}"`:''}/><path data-benchmark-curve-hit="${key}" d="${path}" fill="none" stroke="transparent" stroke-width="14" pointer-events="stroke" tabindex="0" role="button" aria-label="${escapeSVG('Highlight '+sequence[0].row.label)}"/></g>`);
}
function benchmarkInspectionTarget(el,position=null){
 const point=el.closest('[data-benchmark-point]'),curve=el.closest('[data-benchmark-curve]');
 if(point){const plotId=point.dataset.benchmarkPlot,plot=benchmarkPlots.get(plotId);if(!plot){const row=benchmarkInspectableRows().find(r=>benchmarkRowKey(r)===point.dataset.benchmarkPoint);return row?{curve:null,plotId:null,point:{row}}:null;}const p=position?[...plot.points].sort((a,b)=>Math.hypot(a.p[0]-position[0],a.p[1]-position[1])-Math.hypot(b.p[0]-position[0],b.p[1]-position[1]))[0]:plot.points.find(p=>benchmarkRowKey(p.row)===point.dataset.benchmarkPoint);return p?{curve:benchmarkCurveKey(plotId,p.row),plotId,point:p}:null;}
 if(curve){const key=curve.dataset.benchmarkCurve,plotId=[...benchmarkPlots.keys()].find(id=>key.startsWith(id+':'));return {curve:key,plotId};}return null;
}
function benchmarkInspect(target,pin=false){
 if(pin){benchmarkPinnedCurve=target?.curve||null;const point=target?.point||benchmarkPlots.get(target?.plotId)?.curves.get(target?.curve)?.at(-1);benchmarkSelected=point?benchmarkRowKey(point.row):null;benchmarkHover=null;render();}
 else{benchmarkHover=target;benchmarkRefreshInspection();}
}
function benchmarkInspectionState(){return {curve:benchmarkPinnedCurve,hover:benchmarkHover?.curve||null,point:benchmarkSelected};}
function benchmarkRefreshInspection(){
 if(state.scene!=='cost')return;
 let overlay=$('benchmarkInspectionLabels');if(!overlay){overlay=document.createElementNS(view.namespaceURI,'g');overlay.id='benchmarkInspectionLabels';overlay.setAttribute('pointer-events','none');view.append(overlay);}
 const targets=[];
 for(const plot of benchmarkPlots.values())if(plot.curves.has(benchmarkPinnedCurve))targets.push({plot,points:plot.curves.get(benchmarkPinnedCurve),pinned:true});
 if(!benchmarkPinnedCurve&&benchmarkHover){const plot=benchmarkPlots.get(benchmarkHover.plotId);if(plot)targets.push({plot,points:benchmarkHover.point?[benchmarkHover.point]:plot.curves.get(benchmarkHover.curve)||[],pinned:false});}
 let markup='';
 for(const target of targets){const first=target.points[0];if(!first)continue;const name=BENCHMARK_SHORT[first.row.methodId]+(target.plot.id==='detail-accuracy'?' · '+first.row.meshTriangles+' triangles':'');markup+=`<text data-benchmark-inspection-caption x="${svgNumber(target.plot.rect.x+8)}" y="${svgNumber(target.plot.rect.y+19)}" font-family="Futura,Helvetica Neue,Helvetica,sans-serif" font-size="15" font-weight="600" fill="${benchmarkRowColor(first.row)}" stroke="#fff" stroke-width="4" paint-order="stroke">${escapeSVG(name)}</text>`;const points=target.points.map(p=>({...p,row:{...p.row,pointCaption:benchmarkPointLabel(p.row)+' · '+benchmarkValue(p.row.total,2)+' ms'+(p.row.error!==null?' · '+benchmarkValue(p.row.error,2)+'%':'')}}));
  for(const label of benchmarkLabelPositions(points,{...target.plot.rect,y:target.plot.rect.y+26,h:target.plot.rect.h-26},target.plot.points)){const b=label,p=label.point.p,q=[clamp(p[0],b.x,b.x+b.w),clamp(p[1],b.y,b.y+b.h)],color=benchmarkRowColor(label.point.row);markup+=`<g data-benchmark-inline-label="${benchmarkRowKey(label.point.row)}" data-pinned="${target.pinned}"><path d="M${p.map(svgNumber).join(' ')} L${q.map(svgNumber).join(' ')}" stroke="${color}" stroke-width="1" fill="none"/><rect x="${svgNumber(b.x-3)}" y="${svgNumber(b.y-1)}" width="${svgNumber(b.w+6)}" height="22" fill="#fff" fill-opacity=".96" stroke="${color}" stroke-opacity=".3"/><text data-benchmark-label="${benchmarkRowKey(label.point.row)}" x="${svgNumber(b.x+2)}" y="${svgNumber(b.y+15)}" font-family="Futura,Helvetica Neue,Helvetica,sans-serif" font-size="14" font-weight="600" fill="${color}">${escapeSVG(label.text)}</text></g>`;}
 }
 overlay.innerHTML=markup;
 const selectedMethod=benchmarkPinnedCurve?[...benchmarkPlots.values()].flatMap(p=>[...p.curves.entries()]).find(([key])=>key===benchmarkPinnedCurve)?.[1][0]?.row.methodId:null;
 view.querySelectorAll('[data-benchmark-curve]').forEach(el=>{const selected=el.dataset.benchmarkCurve===benchmarkPinnedCurve;el.classList.toggle('is-highlighted',selected);el.style.opacity=benchmarkPinnedCurve&&!selected?'.28':'1';});
 view.querySelectorAll('[data-benchmark-series]').forEach(el=>{const selected=el.dataset.benchmarkSeries===selectedMethod;el.classList.toggle('is-highlighted',selected);el.querySelector('[data-benchmark-legend-highlight]')?.setAttribute('fill-opacity',selected?'.13':'0');el.querySelector('text')?.setAttribute('font-weight',selected?'700':'500');});
}
