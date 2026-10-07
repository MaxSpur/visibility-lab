/* Explanations are HTML: selectable, accessible and independent of the diagram. */
function escapeHTML(s){return escapeSVG(s);}
function replaceHTML(el,html){if(el.innerHTML!==html)el.innerHTML=html;}
function panelBody(p){
  const metrics=p.metrics?'<div class="panel-metrics"><div class="metric-head"><span>Geometry</span><span>Samples</span></div>'+p.metrics.map(([name,geo,sampled,error])=>'<section class="metric-group"><h3>'+escapeHTML(name)+'</h3><div class="metric-values"><strong class="geometric">'+escapeHTML(geo)+'</strong><strong class="sampled">'+escapeHTML(sampled)+'</strong></div><p class="difference">Difference: '+escapeHTML(error)+'</p></section>').join('')+'</div>':'';
  const steps=p.steps?'<ol class="steps">'+p.steps.map((t,i)=>'<li'+(i===p.active?' aria-current="step"':'')+'><span class="step-index" data-svg-box>'+String(i+1)+'</span><span>'+escapeHTML(t)+'</span></li>').join('')+'</ol>':'';
  const body=(p.body||[]).map(t=>'<p>'+escapeHTML(t)+'</p>').join('');
  return metrics+steps+body;
}
function placeDemonstrationControl(showPanel){const control=document.querySelector('.demonstration-setting');if(!control)return;const target=showPanel?$('demonstrationControls'):$('controls');if(control.parentElement!==target){if(showPanel)target.append(control);else target.prepend(control);}}
function drawPanel(s){
  const p=panelData;
  $('explanation').hidden=!s.panel;
  if($('explanationTitle').textContent!==p.title)$('explanationTitle').textContent=p.title||'';
  replaceHTML($('explanationBody'),panelBody(p));
  const stats=p.stats?.length?'<dl class="stats">'+p.stats.map(([name,value])=>'<dt>'+escapeHTML(name)+'</dt><dd>'+escapeHTML(value)+'</dd>').join('')+'</dl>':'';
  replaceHTML($('explanationFooter'),stats+'<div class="legend">'+(p.legend||[]).map(([col,t])=>'<span class="legend-item"><span class="swatch" style="--swatch:'+escapeHTML(col)+'" data-svg-box></span><span>'+escapeHTML(t)+'</span></span>').join('')+'</div>'+(p.note?'<p class="panel-note">'+escapeHTML(p.note)+'</p>':''));
}
function updateLive(){const p=panelData,text=(p.body||[]).map(t=>'<p>'+escapeHTML(t)+'</p>').join('');const table=p.metrics?'<table><thead><tr><th>Displayed quantity</th><th>Geometry</th><th>Samples</th><th>Difference</th></tr></thead><tbody>'+p.metrics.map(r=>'<tr>'+r.map(v=>'<td>'+escapeHTML(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'';replaceHTML($('liveText'),text+table);}
function render(overrides={}){
  window.lastLabError=null;
  const s={...state,...overrides};hitTargets=[];panelData={};
  $('explanation').hidden=!s.panel;
  placeDemonstrationControl(s.panel);
  const rect=view.getBoundingClientRect();
  if(rect.width>0&&rect.height>0)W=H*rect.width/rect.height;
  view.setAttribute('viewBox',`0 0 ${svgNumber(W)} ${H}`);
  ctx.reset();ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  try{({shadows:drawShadows,expansion:drawExpansion,air:drawAir,terrain:drawTerrain,projection:drawProjection,metrics:drawMetrics,cost:drawCost,events:drawEvents}[s.scene])(s);drawPanel(s);}
  catch(e){console.error(e);setPanel({title:'This configuration could not be completed',body:[e.message,'Reset the scene or use a coarser terrain mesh.'],legend:[],note:'The calculation stopped; the result is incomplete.'});drawPanel(s);$('status').textContent=e.message;window.lastLabError=e.message;}
  ctx.commit();
  if(!exporting){syncTransport();updateLive();$('phase').value=state.phase;$('phaseVal').textContent=Math.round(state.phase*100)+'%';}
}
