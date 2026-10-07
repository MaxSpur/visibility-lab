/* SVG is the master export. PNG is rasterized only when explicitly downloaded;
   neither the live view nor the SVG contains an embedded bitmap. */
function graphicSVG(){
  const copy=view.cloneNode(true);
  copy.removeAttribute('id');copy.removeAttribute('aria-label');
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  copy.setAttribute('width',svgNumber(W));copy.setAttribute('height',String(H));
  return new XMLSerializer().serializeToString(copy);
}
function panelTextSVG(root,origin){
  const parts=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode,parent=node.parentElement,style=getComputedStyle(parent);
    if(!node.textContent.trim()||style.display==='none'||style.visibility==='hidden')continue;
    const range=document.createRange();let run=null;
    function flush(){if(!run)return;const size=parseFloat(style.fontSize),baseline=run.bottom-size*.21;parts.push('<text x="'+svgNumber(run.x-origin.left)+'" y="'+svgNumber(baseline-origin.top)+'" font-family="'+escapeSVG(style.fontFamily)+'" font-size="'+svgNumber(size)+'" font-weight="'+escapeSVG(style.fontWeight)+'" font-style="'+escapeSVG(style.fontStyle)+'" fill="'+escapeSVG(style.color)+'" xml:space="preserve" textLength="'+svgNumber(run.right-run.x)+'" lengthAdjust="spacingAndGlyphs">'+escapeSVG(run.text)+'</text>');run=null;}
    for(let i=0;i<node.textContent.length;i++){
      range.setStart(node,i);range.setEnd(node,i+1);
      const r=range.getBoundingClientRect();if(!r.height)continue;
      if(run&&(Math.abs(r.top-run.top)>1||r.left<run.x-1||r.left>run.right+2))flush();
      if(!run)run={x:r.left,top:r.top,bottom:r.bottom,right:r.right,text:''};
      run.text+=node.textContent[i];run.right=Math.max(run.right,r.right);
    }
    flush();
  }
  return parts.join('');
}
function panelSVG(){
  const stage=$('stage').getBoundingClientRect(),graphic=view.getBoundingClientRect(),panel=$('explanation'),r=panel.getBoundingClientRect();
  const copy=view.cloneNode(true);copy.removeAttribute('id');copy.removeAttribute('aria-label');copy.removeAttribute('xmlns');
  copy.setAttribute('x',svgNumber(graphic.left-stage.left));copy.setAttribute('y',svgNumber(graphic.top-stage.top));copy.setAttribute('width',svgNumber(graphic.width));copy.setAttribute('height',svgNumber(graphic.height));
  const boxes=[...panel.querySelectorAll('[data-svg-box]')].map(el=>{const b=el.getBoundingClientRect(),c=getComputedStyle(el).backgroundColor;return '<rect x="'+svgNumber(b.left-stage.left)+'" y="'+svgNumber(b.top-stage.top)+'" width="'+svgNumber(b.width)+'" height="'+svgNumber(b.height)+'" fill="'+escapeSVG(c)+'"/>';}).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+svgNumber(stage.width)+'" height="'+svgNumber(stage.height)+'" viewBox="0 0 '+svgNumber(stage.width)+' '+svgNumber(stage.height)+'"><rect width="100%" height="100%" fill="white"/>'+new XMLSerializer().serializeToString(copy)+'<rect x="'+svgNumber(r.left-stage.left)+'" y="0" width="'+svgNumber(r.width)+'" height="'+svgNumber(stage.height)+'" fill="#f3f7f7"/><line x1="'+svgNumber(r.left-stage.left)+'" x2="'+svgNumber(r.left-stage.left)+'" y1="0" y2="'+svgNumber(stage.height)+'" stroke="#c8d5da"/>'+boxes+panelTextSVG(panel,stage)+'</svg>';
}
function svgForExport(mode=state.exportMode){
  try{render({panel:mode==='panel'});return mode==='panel'?panelSVG():graphicSVG();}
  finally{render();}
}
async function saveGraphic(format){
  if(exporting||benchmarkBusy)return;
  stopPlaying();exporting=true;lockControls(true);
  try{
    const markup=svgForExport(),blob=new Blob([markup],{type:'image/svg+xml;charset=utf-8'}),name=`${state.scene}-${state.variant}-v4`;
    if(format==='svg')download(blob,name+'.svg');
    else{
      const url=URL.createObjectURL(blob);
      try{
        const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('SVG could not be rasterized for PNG export.'));img.src=url;});
        const output=document.createElement('canvas');output.width=3840;output.height=Math.round(3840*img.height/img.width);
        const raster=output.getContext('2d');raster.fillStyle='white';raster.fillRect(0,0,output.width,output.height);raster.drawImage(img,0,0,output.width,output.height);
        const png=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!png)throw Error('PNG encoding failed.');download(png,name+'.png');
      }finally{URL.revokeObjectURL(url);}
    }
    $('status').textContent=`Saved ${format.toUpperCase()} · ${state.exportMode==='panel'?'graphic and explanation':'graphics only'}.`;
  }catch(e){$('status').textContent='Export failed: '+e.message;console.error(e);}
  finally{exporting=false;lockControls(false);render();}
}
