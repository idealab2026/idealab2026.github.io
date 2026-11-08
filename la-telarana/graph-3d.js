(function(){
"use strict";
const topics=[["inteligencia","Inteligencia","#76d0ec"],["oriente","Oriente Medio","#e6b978"],["espana","España","#b9a3ea"],["historia","Historia y nazismo","#ec8f89"],["tecnologia","Tecnología","#8bdbbd"],["finanzas","Finanzas y poder","#bbd68c"],["global","Política internacional","#e6ad91"]];
const groups={
inteligencia:"mossad kidón metsada shin-bet servicio-cni cia mi6 unidad-8200 dgst-marruecos dgse-francia si-australia policia-guardia-civil eric-frattini jorge-dezcallar meir-amit danny-yatom yossi-cohen meir-dagan david-barnea tamir-pardo roman-gofman alberto-saiz john-ratcliffe",
oriente:"david-ben-gurion golda-meir ali-hassan-salameh ilich-ramirez-sanchez ahmed-bouchiki shimon-peres hussein-jordania ahmed-yassin abdel-aziz-al-rantisi yitzhak-shamir mahmoud-abbas ehud-barak yasser-arafat ariel-sharon benjamin-netanyahu ali-khamenei mojtaba-khamenei gamal-abdel-nasser hamas hizbula septiembre-negro autoridad-palestina fuerzas-israel guardia-revolucionaria sayeret-matkal",
espana:"roberto-vaquero jose-maria-irujo alberto-martin-artajo david-rubio denis-paredes pau-botella alicia-sanz juan-carlos-gumucio fernando-grande-marlaska manuel-llamas pedro-sanchez begona-gomez pablo-iglesias hispantv",
historia:"meir-tobianski adolf-eichmann herbert-cukurs otto-skorzeny wolfgang-lotz josef-mengele benito-mussolini adolf-hitler francisco-franco leon-degrelle",
tecnologia:"elon-musk peter-thiel alex-karp sam-altman palantir tesla spacex x-twitter openai",
finanzas:"robert-maxwell ghislaine-maxwell jeffrey-epstein howard-lutnick george-soros scott-bessent larry-fink jamie-dimon open-society cantor-fitzgerald blackrock jpmorgan rothschild",
global:"donald-trump jd-vance marco-rubio felipe-gonzalez emmanuel-macron peter-magyar nicolas-maduro delcy-rodriguez angela-merkel bill-clinton george-w-bush agencia-alemania"
};
const tagged={};for(const [topic,names] of Object.entries(groups))for(const slug of names.split(" ")){tagged["on-"+slug]=topic;tagged["vf150-"+slug]=topic}
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
function make(options){
 const canvas=options.canvas,ctx=canvas.getContext("2d"),hint=options.tooltip;
 let nodes=[],edges=[],pos=new Map(),selection=null,hover=null,mode="focus",theme="todos",search="",yaw=-.45,pitch=.28,zoom=1,panX=0,panY=0,w=1000,h=700,dpr=1,drag=null,down=new Map(),hits=[],edgeHits=[],bandHits=[],cached=new Map(),queued=false,hoverEdge=null;
 const index=new Map(),PI=Math.PI;
 function group(n){
  if(tagged[n.id])return tagged[n.id];
  const s=(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLowerCase();
  return /mossad|inteligenc|espionaj|secreto/.test(s)?"inteligencia":/israel|iran|palestin|hamás|hamas|egipt/.test(s)?"oriente":/españ|congreso|gobierno español/.test(s)?"espana":/nazi|guerra mundial/.test(s)?"historia":/tecnol|software|digital/.test(s)?"tecnologia":/banc|financ|invers/.test(s)?"finanzas":"global";
 }
 function arrange(){
  pos=new Map();
  topics.forEach(([name],i)=>{
   const subset=nodes.filter(n=>group(n)===name).sort((a,b)=>{
    const degree=n=>edges.filter(e=>e.a===n.id||e.b===n.id).length;
    return degree(b)-degree(a)||a.name.localeCompare(b.name);
   });
   const a=-PI/2+2*PI*i/topics.length,arc=2*PI/topics.length;
   subset.forEach((n,j)=>{
    const col=j%9,row=Math.floor(j/9),angle=a+(col-4)*arc*.095+(row%2)*.03;
    const radius=590+row*275+(j%3)*36;
    pos.set(n.id,{x:radius*Math.cos(angle),y:(j%5-2)*150+row*70,z:radius*Math.sin(angle)});
   });
  });
 }
 function proj(v){
  const x=v.x*Math.cos(yaw)-v.z*Math.sin(yaw),z=v.x*Math.sin(yaw)+v.z*Math.cos(yaw);
  const y=v.y*Math.cos(pitch)-z*Math.sin(pitch),depth=v.y*Math.sin(pitch)+z*Math.cos(pitch);
  const scale=Math.min(w/1450,h/950)*zoom*2100/(2100+depth);
  return{x:w/2+panX+x*scale,y:h/2+panY+y*scale,depth,scale};
 }
 function color(hex,a){const v=parseInt(hex.slice(1),16);return "rgba("+((v>>16)&255)+","+((v>>8)&255)+","+(v&255)+","+a+")"}
 function render(){
  queued=false;const box=canvas.getBoundingClientRect();if(box.width<3||box.height<3)return;
  w=box.width;h=box.height;dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  let gradient=ctx.createRadialGradient(w*.5,h*.4,5,w*.5,h*.4,Math.max(w,h)*.85);
  gradient.addColorStop(0,"#1e2c39");gradient.addColorStop(1,"#0d161f");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(115,153,182,.055)";ctx.lineWidth=.7;
  for(let x=0;x<w;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  topics.forEach(([id,label,tint],i)=>{
   const base=-PI/2+i*2*PI/topics.length,half=PI/topics.length*.94;
   const selected=theme===id,fade=theme!=="todos"&&!selected;
   for(let j=0;j<14;j++){
    const a=base-half+(2*half*j)/14,b=base-half+(2*half*(j+1))/14;
    const pp=[420,1650].flatMap(r=>[a,b].map(theta=>proj({x:r*Math.cos(theta),y:-380,z:r*Math.sin(theta)})));
    ctx.beginPath();ctx.moveTo(pp[0].x,pp[0].y);ctx.lineTo(pp[2].x,pp[2].y);ctx.lineTo(pp[3].x,pp[3].y);ctx.lineTo(pp[1].x,pp[1].y);ctx.closePath();
    ctx.fillStyle=color(tint,selected?.26:fade?.017:.06);ctx.fill();
   }
   ctx.beginPath();for(let j=0;j<=16;j++){
    const a=base-half+2*half*j/16,p=proj({x:1680*Math.cos(a),y:-380,z:1680*Math.sin(a)});
    if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)
   }
   ctx.lineWidth=selected?3:1.2;ctx.strokeStyle=color(tint,selected?.9:fade?.09:.3);ctx.stroke();
   // El título temático se dibuja después de las entidades, dentro de la franja.
   // No desperdiciar el área del sector con rótulos diminutos en su perímetro.
  });
  const visible=nodes.filter(n=>!search||(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLocaleLowerCase("es").includes(search));
  const pr=new Map(visible.map(n=>[n.id,proj(pos.get(n.id)||{x:0,y:0,z:0})]));
  const focus=hover||(selection?.kind==="node"?selection.id:null);
  const selectedEdge=selection?.kind==="edge"?edges.find(e=>e.id===selection.id):null;
  const activeEndpoints=new Set(selectedEdge?[selectedEdge.a,selectedEdge.b]:[]);
  edgeHits=[];hits=[];bandHits=[];
  edges.filter(e=>pr.has(e.a)&&pr.has(e.b)).sort((a,b)=>(pr.get(b.a).depth+pr.get(b.b).depth)-(pr.get(a.a).depth+pr.get(a.b).depth)).forEach(e=>{
   const a=pr.get(e.a),b=pr.get(e.b),aNode=index.get(e.a),bNode=index.get(e.b),linked=focus&&(e.a===focus||e.b===focus),same=theme!=="todos"&&group(aNode)===theme&&group(bNode)===theme,selected=selection?.kind==="edge"&&selection.id===e.id,hot=hoverEdge===e.id;
   let alpha=focus&&mode==="focus"?(linked?.96:.04):theme!=="todos"?(same?.86:(group(aNode)===theme||group(bNode)===theme)?.3:.025):.36;
   if(selected||hot)alpha=1;
   const ink=selected?"#ffffff":hot?"#ffd48f":linked?"#f2c48b":same?topics.find(t=>t[0]===theme)[2]:e.confidence==="hipotesis"?"#e6a37f":"#9ac3dc";
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=selected?5:hot?4.3:linked?3.8:same?3:2.25;
   ctx.strokeStyle=color(ink,alpha);ctx.shadowColor=ink;ctx.shadowBlur=selected||hot||linked?13:0;ctx.stroke();ctx.shadowBlur=0;
   if(alpha>.13)edgeHits.push({id:e.id,a,b,alpha});
  });
  visible.sort((a,b)=>pr.get(b.id).depth-pr.get(a.id).depth).forEach(n=>{
   const p=pr.get(n.id),selected=selection?.kind==="node"&&selection.id===n.id,isHover=hover===n.id,isEndpoint=activeEndpoints.has(n.id),tint=topics.find(t=>t[0]===group(n))[2],onTheme=theme==="todos"||group(n)===theme;
   const rad=clip((selected||isHover||isEndpoint?31:22)*p.scale,11,selected||isEndpoint?34:24);
   ctx.globalAlpha=isEndpoint?1:(onTheme?focus&&mode==="focus"&&n.id!==focus?.58:1:.20);
   ctx.beginPath();ctx.arc(p.x,p.y,rad+3,0,2*PI);ctx.fillStyle="#1a2b39";ctx.fill();ctx.lineWidth=selected||isEndpoint?3.4:2;ctx.strokeStyle=isEndpoint?"#fff2cb":tint;ctx.stroke();
   const photo=options.getPhoto?.(n);
   if(photo){
    let entry=cached.get(photo);if(!entry){const img=new Image();entry={img,state:"loading"};cached.set(photo,entry);img.onload=()=>{entry.state="ok";redraw()};img.onerror=()=>{entry.state="error";redraw()};img.src=photo}
    if(entry.state==="ok"){const img=entry.img;ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,rad-1,0,2*PI);ctx.clip();const r=Math.max(2*rad/img.width,2*rad/img.height);ctx.drawImage(img,p.x-img.width*r/2,p.y-img.height*r/2,img.width*r,img.height*r);ctx.restore()}
    else{ctx.font="700 14px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(n.name.charAt(0),p.x,p.y+5)}
   }else{ctx.font="700 14px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(n.name.charAt(0),p.x,p.y+5)}
   if(selected||isHover||isEndpoint||theme!=="todos"&&onTheme){
    const name=n.name.length>25?n.name.slice(0,24)+"…":n.name;
    ctx.font="600 11px system-ui";let lw=Math.min(220,ctx.measureText(name).width+14);
    ctx.fillStyle="rgba(12,21,30,.94)";ctx.fillRect(p.x-lw/2,p.y+rad+6,lw,22);
    ctx.strokeStyle=color(tint,.8);ctx.lineWidth=1;ctx.strokeRect(p.x-lw/2,p.y+rad+6,lw,22);
    ctx.fillStyle="#f8faff";ctx.fillText(name,p.x,p.y+rad+21);
   }
   ctx.globalAlpha=1;hits.push({id:n.id,x:p.x,y:p.y,r:rad+8});
  });
  // Nombres grandes, centrados en cada franja 3D (no en el borde externo).
  // Conservan legibilidad aunque gire la cámara.
  topics.forEach(([id,label,tint],i)=>{
   const active=theme===id,muted=theme!=="todos"&&!active,angle=-PI/2+2*PI*i/topics.length;
   const projected=proj({x:1370*Math.cos(angle),y:-380,z:1370*Math.sin(angle)});
   const parts={"Historia y nazismo":["Historia","y nazismo"],"Finanzas y poder":["Finanzas","y poder"],"Política internacional":["Política","internacional"]}[label]||[label];
   const size=clip(Math.round(w/72),17,24),lineHeight=size+3;
   ctx.font="750 "+size+"px system-ui";
   const maxTextWidth=Math.max(...parts.map(part=>ctx.measureText(part).width));
   const count=nodes.filter(n=>group(n)===id).length;
   const boxWidth=clip(maxTextWidth+58,150,290),boxHeight=parts.length*lineHeight+44;
   const cx=clip(projected.x,boxWidth/2+10,w-boxWidth/2-10);
   const cy=clip(projected.y,boxHeight/2+45,h-boxHeight/2-65);
   ctx.save();ctx.globalAlpha=muted?.39:1;
   ctx.beginPath();ctx.roundRect(cx-boxWidth/2,cy-boxHeight/2,boxWidth,boxHeight,13);
   ctx.fillStyle=active?"rgba(17,34,48,.94)":"rgba(12,23,34,.82)";ctx.fill();
   ctx.strokeStyle=color(tint,active?.95:.66);ctx.lineWidth=active?2.1:1.3;ctx.stroke();
   ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=active?"#ffffff":tint;
   ctx.font="750 "+size+"px system-ui";
   parts.forEach((line,j)=>ctx.fillText(line,cx,cy-(parts.length-1)*lineHeight/2-11+j*lineHeight));
   ctx.fillStyle="#c1d1df";ctx.font="600 11px system-ui";ctx.fillText(count+" entidades",cx,cy+boxHeight/2-17);
   ctx.restore();
   bandHits.push({id,x:cx-boxWidth/2,y:cy-boxHeight/2,w:boxWidth,h:boxHeight});
  });
  const title=theme==="todos"?"Todas las comunidades":topics.find(t=>t[0]===theme)[1];
  ctx.textAlign="left";ctx.fillStyle="#d2e1ee";ctx.font="600 12px system-ui";
  ctx.fillText(title+" · "+(theme==="todos"?nodes.length:nodes.filter(n=>group(n)===theme).length)+" entidades",16,75);
  ctx.fillStyle="#93aabf";ctx.font="11px system-ui";ctx.fillText("Arrastra para rotar · dos dedos para mover · zoom solo con + / −",16,93);
 }
 function fitView(){
  // Ajuste real del contenido: usa todas las posiciones visibles tras la proyección.
  const box=canvas.getBoundingClientRect();
  if(box.width<10||box.height<10||!nodes.length)return;
  w=box.width;h=box.height;
  const shown=nodes.filter(n=>(theme==="todos"||group(n)===theme)&&(!search||(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLocaleLowerCase("es").includes(search)));
  const target=shown.length?shown:nodes;
  const projected=target.map(n=>proj(pos.get(n.id)||{x:0,y:0,z:0}));
  const xmin=Math.min(...projected.map(p=>p.x)),xmax=Math.max(...projected.map(p=>p.x));
  const ymin=Math.min(...projected.map(p=>p.y)),ymax=Math.max(...projected.map(p=>p.y));
  // El inspector en fullscreen cubre la parte derecha de la escena.
  const panel=canvas.closest(".graph-panel");
  const inspectorOpen=panel&&panel.classList.contains("drawer-open");
  const aside=inspectorOpen?panel.querySelector(".inspector"):null;
  const reserved=aside?Math.min(aside.getBoundingClientRect().width,w*.55):0;
  const left=36,right=w-reserved-36,top=h<530?92:115,bottom=h-(h<530?82:100);
  const usableX=Math.max(80,right-left),usableY=Math.max(80,bottom-top);
  const baseZoom=Math.max(.0001,zoom);
  const dx=Math.max(1,(xmax-xmin)/baseZoom),dy=Math.max(1,(ymax-ymin)/baseZoom);
  const fitZoom=clip(Math.min((usableX-55)/dx,(usableY-60)/dy),.08,7);
  // Ajuste + centrado exacto para la orientación de cámara actual.
  zoom=fitZoom;
  const center=proj({x:0,y:0,z:0});
  const expectedX=(xmin+xmax)/2-w/2-panX,expectedY=(ymin+ymax)/2-h/2-panY;
  panX=(left+right)/2-w/2-(expectedX/baseZoom)*fitZoom;
  panY=(top+bottom)/2-h/2-(expectedY/baseZoom)*fitZoom;
  redraw();
  return{zoom,visible:target.length,availableWidth:usableX,availableHeight:usableY};
 }
 function redraw(){if(queued)return;queued=true;requestAnimationFrame(render)}
 function hit(p){
  // Los nodos están por delante de las líneas; las líneas se detectan por
  // distancia real al segmento, no por el orden de dibujo.
  for(let i=hits.length-1;i>=0;i--){const n=hits[i];if(Math.hypot(p.x-n.x,p.y-n.y)<=n.r)return{kind:"node",id:n.id}}
  for(let i=bandHits.length-1;i>=0;i--){const b=bandHits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:"theme",id:b.id}}
  let nearest=null,nearestDistance=14;
  edgeHits.forEach(e=>{
   const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,t=clip(((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(dx*dx+dy*dy||1),0,1);
   const distance=Math.hypot(p.x-e.a.x-t*dx,p.y-e.a.y-t*dy);
   if(distance<nearestDistance){nearestDistance=distance;nearest={kind:"edge",id:e.id}}
  });
  return nearest;
 }
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 canvas.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);down.set(e.pointerId,point(e));drag={begin:point(e),moved:false,pan:e.shiftKey}});
 canvas.addEventListener("pointermove",e=>{
  const p=point(e);
  if(down.has(e.pointerId)){
   const last=down.get(e.pointerId),dx=p.x-last.x,dy=p.y-last.y;down.set(e.pointerId,p);if(!drag)return;
   drag.moved=drag.moved||Math.hypot(p.x-drag.begin.x,p.y-drag.begin.y)>5;
   if(down.size>1||drag.pan){panX+=dx;panY+=dy}else{yaw+=dx*.008;pitch=clip(pitch+dy*.005,-1.1,1.1)}redraw();
  }else{
   const found=hit(p),id=found?.kind==="node"?found.id:null,lineId=found?.kind==="edge"?found.id:null;
   if(id!==hover||lineId!==hoverEdge){hover=id;hoverEdge=lineId;redraw()}
   hint.hidden=!found;
   if(found){
    if(id){hint.textContent=index.get(id)?.name||""}
    else if(found.kind==="theme"){hint.textContent="Explorar tema: "+(topics.find(t=>t[0]===found.id)?.[1]||found.id)}
    else{const e=edges.find(e=>e.id===lineId);hint.textContent=e?(index.get(e.a)?.name||"Entidad")+" ↔ "+(index.get(e.b)?.name||"Entidad")+" · "+e.type:"Relación"}
    hint.style.left=clip(p.x+15,0,w-260)+"px";hint.style.top=clip(p.y-15,0,h-65)+"px";
   }
   canvas.style.cursor=found?"pointer":"grab";
  }
 });
 canvas.addEventListener("pointerup",e=>{const p=point(e),click=drag&&!drag.moved&&down.size===1;down.delete(e.pointerId);if(!down.size)drag=null;if(click){const entity=hit(p);if(entity)options.onSelect?.(entity)}redraw()});
 canvas.addEventListener("pointercancel",e=>{down.delete(e.pointerId);if(!down.size)drag=null});
 canvas.addEventListener("pointerleave",()=>{hover=null;hoverEdge=null;hint.hidden=true;redraw()});
 canvas.addEventListener("wheel",e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)return;const k=e.deltaMode===1?16:1;panX-=e.deltaX*k;panY-=e.deltaY*k;redraw()},{passive:false});
 for(const event of ["gesturestart","gesturechange","gestureend"])canvas.addEventListener(event,e=>e.preventDefault(),{passive:false});
 new ResizeObserver(redraw).observe(canvas);
 return {
  topics:topics.map(t=>({id:t[0],label:t[1]})),
  setData(a,b){nodes=a;edges=b;index.clear();for(const n of a)index.set(n.id,n);if(this.sig!==a.map(n=>n.id).join("|")+"#"+b.length){this.sig=a.map(n=>n.id).join("|")+"#"+b.length;arrange()}redraw()},
  setSelection(s){selection=s;redraw()},setQuery(s){search=s||"";redraw()},setEdgeMode(s){mode=s;redraw()},
  setTheme(s){theme=topics.some(t=>t[0]===s)?s:"todos";hover=null;hoverEdge=null;hint.hidden=true;
   if(theme!=="todos"){const i=topics.findIndex(t=>t[0]===theme),angle=-PI/2+2*PI*i/topics.length;yaw=-angle-PI/2;pitch=.25;zoom=1;panX=panY=0;fitView()}
   else this.reset()},
  zoom(f){zoom=clip(zoom*f,.08,7);redraw()},
  fit:fitView,
  reset(){yaw=-.45;pitch=.28;zoom=1;panX=panY=0;fitView()},
  organize(){arrange();this.reset()},redraw
 };
}
window.IdeaLabGraph3D={create:make,topics:topics.map(t=>({id:t[0],label:t[1]}))};
})();