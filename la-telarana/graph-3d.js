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
 let nodes=[],edges=[],pos=new Map(),selection=null,hover=null,mode="focus",theme="todos",search="",yaw=-.45,pitch=.24,basePitch=.24,zoom=1,panX=0,panY=0,w=1000,h=700,dpr=1,drag=null,down=new Map(),hits=[],edgeHits=[],bandHits=[],cached=new Map(),queued=false,hoverEdge=null;
 let motionEnabled=!(typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 let motionStarted=false,quietUntil=0,lastMotionFrame=0;
 const index=new Map(),PI=Math.PI;
 function group(n){
  if(n&&n.topic3d&&topics.some(t=>t[0]===n.topic3d))return n.topic3d;
  if(tagged[n.id])return tagged[n.id];
  const s=(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLowerCase();
  return /mossad|inteligenc|espionaj|secreto/.test(s)?"inteligencia":/israel|iran|palestin|hamás|hamas|egipt/.test(s)?"oriente":/españ|congreso|gobierno español/.test(s)?"espana":/nazi|guerra mundial/.test(s)?"historia":/tecnol|software|digital/.test(s)?"tecnologia":/banc|financ|invers/.test(s)?"finanzas":"global";
 }
 // Orbe 3D: siete lóbulos con centros repartidos por una esfera mediante
 // una espiral de Fibonacci; las posiciones son deterministas e idempotentes.
 const ORB_RADIUS=1080,GOLDEN_ANGLE=PI*(3-Math.sqrt(5));
 const normals=new Map(),caps=new Map();
 function unit(v){const d=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/d,y:v.y/d,z:v.z/d}}
 function cross(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}}
 function basis(n){
  const ref=Math.abs(n.y)<.87?{x:0,y:1,z:0}:{x:1,y:0,z:0};
  const u=unit(cross(ref,n));return{u,v:unit(cross(n,u))};
 }
 topics.forEach(([name],i)=>{
  const y=1-2*(i+.5)/topics.length,r=Math.sqrt(1-y*y),a=i*GOLDEN_ANGLE;
  normals.set(name,unit({x:Math.cos(a)*r,y,z:Math.sin(a)*r}));
 });
 function surfacePoint(n,u,v,theta,angle,radius){
  const c=Math.cos(theta),t=Math.sin(theta),ca=Math.cos(angle),sa=Math.sin(angle);
  return{x:radius*(n.x*ca+(u.x*c+v.x*t)*sa),
   y:radius*(n.y*ca+(u.y*c+v.y*t)*sa),
   z:radius*(n.z*ca+(u.z*c+v.z*t)*sa)};
 }
 function arrange(){
  pos=new Map();caps.clear();
  const degree=new Map(nodes.map(n=>[n.id,0]));
  for(const e of edges){degree.set(e.a,(degree.get(e.a)||0)+1);degree.set(e.b,(degree.get(e.b)||0)+1)}
  for(const [name] of topics){
   const subset=nodes.filter(n=>group(n)===name)
    .sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0)||a.name.localeCompare(b.name,"es"));
   const n=normals.get(name),{u,v}=basis(n);
   const cap=clip(.32+.035*Math.sqrt(subset.length),.35,.63);
   caps.set(name,{n,u,v,angle:cap+.065,count:subset.length});
   subset.forEach((node,j)=>{
    const f=Math.sqrt((j+.55)/Math.max(1,subset.length));
    const theta=j*GOLDEN_ANGLE;
    const angle=cap*f+(Math.sin(j*2.33)*.007);
    const radius=ORB_RADIUS+24*Math.sin(j*1.92)+12*Math.cos(j*.91);
    pos.set(node.id,surfacePoint(n,u,v,theta,angle,radius));
   });
  }
 }
 function proj(v){
  const x=v.x*Math.cos(yaw)-v.z*Math.sin(yaw),z=v.x*Math.sin(yaw)+v.z*Math.cos(yaw);
  const y=v.y*Math.cos(pitch)-z*Math.sin(pitch),depth=v.y*Math.sin(pitch)+z*Math.cos(pitch);
  // Perspectiva 3D moderada: cerca más grande, hemisferio posterior atenuado.
  const scale=Math.min(w/1450,h/950)*zoom*2600/(2600+depth*.62);
  return{x:w/2+panX+x*scale,y:h/2+panY+y*scale,depth,scale};
 }
 function color(hex,a){const v=parseInt(hex.slice(1),16);return "rgba("+((v>>16)&255)+","+((v>>8)&255)+","+(v&255)+","+a+")"}
 function visualRadius(p,emphasized=false){
  // Vista general: densidad adaptativa. En pantallas estrechas, los nodos
  // se representan como puntos pequeños y mantienen un área táctil amplia.
  const density=clip(Math.min(w/1600,h/900),.36,1);
  return clip((emphasized?30:22)*p.scale,emphasized?7.5:4.3,emphasized?32:23)*density;
 }
 function drawOrb(){
  const cx=w/2+panX,cy=h/2+panY,rr=ORB_RADIUS*Math.min(w/1450,h/950)*zoom;
  const aura=ctx.createRadialGradient(cx-rr*.18,cy-rr*.23,rr*.08,cx,cy,rr*1.17);
  aura.addColorStop(0,"rgba(77,160,210,.17)");
  aura.addColorStop(.58,"rgba(45,107,160,.09)");
  aura.addColorStop(.9,"rgba(81,137,172,.05)");
  aura.addColorStop(1,"rgba(81,137,172,0)");
  ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,rr*1.17,0,2*PI);ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,rr,0,2*PI);
  ctx.strokeStyle="rgba(144,196,226,.22)";ctx.lineWidth=1.15;ctx.stroke();
  // Meridianos/ecuador muy tenues: ofrecen pistas de volumen sin parecer rejilla.
  ctx.strokeStyle="rgba(115,176,213,.055)";ctx.lineWidth=.8;
  for(let ring=0;ring<3;ring++){
   ctx.beginPath();
   for(let j=0;j<=90;j++){
    const t=j*2*PI/90,lat=(ring-1)*.45;
    const p=proj({x:ORB_RADIUS*Math.cos(lat)*Math.cos(t),
      y:ORB_RADIUS*Math.sin(lat),z:ORB_RADIUS*Math.cos(lat)*Math.sin(t)});
    if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }
   ctx.stroke();
  }
 }
 function drawRegions(visible,pr){
  bandHits=[];
  const middle={x:w/2+panX,y:h/2+panY};
  const radius=ORB_RADIUS*Math.min(w/1450,h/950)*zoom;
  const groups=topics.map(([id,label,tint])=>{
   const cap=caps.get(id),members=visible.filter(n=>group(n)===id&&pr.has(n.id));
   return{id,label,tint,cap,members,centre:cap?proj({
    x:cap.n.x*ORB_RADIUS,y:cap.n.y*ORB_RADIUS,z:cap.n.z*ORB_RADIUS}):null};
  }).filter(t=>t.cap&&t.members.length).sort((a,b)=>b.centre.depth-a.centre.depth);
  const labels=[];
  for(const t of groups){
   const active=theme===t.id,muted=theme!=="todos"&&!active;
   const near=clip(.67-t.centre.depth/(ORB_RADIUS*2.5),.17,1);
   const alpha=(active?1:muted?.17:1)*near;
   ctx.save();ctx.globalAlpha=alpha;
   ctx.beginPath();
   for(let j=0;j<=64;j++){
    const world=surfacePoint(t.cap.n,t.cap.u,t.cap.v,
      j*2*PI/64,t.cap.angle,ORB_RADIUS+8);
    const p=proj(world);
    if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }
   ctx.closePath();
   ctx.fillStyle=color(t.tint,active?.13:.072);ctx.fill();
   ctx.strokeStyle=color(t.tint,active?.9:.52);
   ctx.lineWidth=active?2.3:1.4;ctx.stroke();
   ctx.restore();
   const dx=t.centre.x-middle.x,dy=t.centre.y-middle.y,len=Math.hypot(dx,dy);
   const d=len>22?len:radius*.7;
   const vx=len>22?dx/len:Math.cos(topics.findIndex(row=>row[0]===t.id)*GOLDEN_ANGLE);
   const vy=len>22?dy/len:Math.sin(topics.findIndex(row=>row[0]===t.id)*GOLDEN_ANGLE);
   const labelR=Math.max(radius*.70,Math.min(radius*1.18,d+46));
   labels.push({...t,alpha,active,x:middle.x+vx*labelR,y:middle.y+vy*labelR});
  }
  // Etiquetas flotantes, compactas, sin rectángulos temáticos sobre las neuronas.
  const rects=[];
  for(const t of labels){
   const bw=clip(t.label.length*7.15+38,118,215),bh=43;
   let px=clip(t.x-bw/2,12,w-bw-12),py=clip(t.y-bh/2,108,h-bh-15);
   for(let iteration=0;iteration<18;iteration++){
    const collide=rects.find(r=>px<r.x+r.w+8&&px+bw+8>r.x&&py<r.y+r.h+7&&py+bh+7>r.y);
    if(!collide)break;
    py=clip(py+(py+bh/2<collide.y+collide.h/2?-15:15),108,h-bh-15);
    if(iteration===9)px=clip(px+35,12,w-bw-12);
   }
   rects.push({x:px,y:py,w:bw,h:bh});
   ctx.save();ctx.globalAlpha=theme!=="todos"&&!t.active?.25:clip(t.alpha+.20,.4,1);
   ctx.beginPath();ctx.roundRect(px,py,bw,bh,13);
   ctx.fillStyle="rgba(12,26,39,.89)";ctx.fill();
   ctx.strokeStyle=color(t.tint,t.active?.9:.55);ctx.lineWidth=t.active?1.7:1;ctx.stroke();
   ctx.textAlign="left";ctx.textBaseline="top";
   ctx.fillStyle=t.tint;ctx.font="700 12px system-ui";
   ctx.fillText(t.label,px+11,py+7,bw-22);
   ctx.fillStyle="#a9bbca";ctx.font="600 10px system-ui";
   ctx.fillText(t.members.length+" entidades",px+11,py+25);
   ctx.restore();
   bandHits.push({id:t.id,x:px,y:py,w:bw,h:bh});
  }
 }
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
  drawOrb();
  const visible=nodes.filter(n=>!search||(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLocaleLowerCase("es").includes(search));
  const pr=new Map(visible.map(n=>[n.id,proj(pos.get(n.id)||{x:0,y:0,z:0})]));
  drawRegions(visible,pr);
  const focus=hover||(selection?.kind==="node"?selection.id:null);
  const selectedEdge=selection?.kind==="edge"?edges.find(e=>e.id===selection.id):null;
  const activeEndpoints=new Set(selectedEdge?[selectedEdge.a,selectedEdge.b]:[]);
  edgeHits=[];hits=[];
  edges.filter(e=>pr.has(e.a)&&pr.has(e.b)).sort((a,b)=>(pr.get(b.a).depth+pr.get(b.b).depth)-(pr.get(a.a).depth+pr.get(a.b).depth)).forEach(e=>{
   const a=pr.get(e.a),b=pr.get(e.b),aNode=index.get(e.a),bNode=index.get(e.b),linked=focus&&(e.a===focus||e.b===focus),same=theme!=="todos"&&group(aNode)===theme&&group(bNode)===theme,selected=selection?.kind==="edge"&&selection.id===e.id,hot=hoverEdge===e.id;
   let alpha=focus&&mode==="focus"?(linked?.94:.022):theme!=="todos"?(same?.75:(group(aNode)===theme||group(bNode)===theme)?.25:.022):.23;
   const depthFade=clip(.70-(a.depth+b.depth)/(ORB_RADIUS*5),.22,1);
   alpha*=depthFade;if(selected||hot)alpha=1;
   const ink=selected?"#ffffff":hot?"#ffd48f":linked?"#f2c48b":same?topics.find(t=>t[0]===theme)[2]:e.confidence==="hipotesis"?"#e6a37f":"#9ac3dc";
   // Arco suave cercano a la superficie de la esfera: apariencia neuronal.
   const p1=pos.get(e.a),p2=pos.get(e.b),joint=unit({
    x:p1.x+p2.x,y:p1.y+p2.y,z:p1.z+p2.z});
   const c=proj({x:joint.x*ORB_RADIUS*.89,y:joint.y*ORB_RADIUS*.89,
    z:joint.z*ORB_RADIUS*.89});
   ctx.beginPath();ctx.moveTo(a.x,a.y);
   ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);
   ctx.lineWidth=selected?3.8:hot?3:linked?2.6:same?2:1.3;
   ctx.strokeStyle=color(ink,alpha);ctx.shadowColor=ink;
   ctx.shadowBlur=selected||hot||linked?9:0;
   if(e.confidence==="hipotesis")ctx.setLineDash([3,7]);
   ctx.stroke();ctx.shadowBlur=0;ctx.setLineDash([]);
   if(alpha>.11)edgeHits.push({id:e.id,a,b,c,alpha});
  });
  visible.sort((a,b)=>pr.get(b.id).depth-pr.get(a.id).depth).forEach(n=>{
   const p=pr.get(n.id),selected=selection?.kind==="node"&&selection.id===n.id,isHover=hover===n.id,isEndpoint=activeEndpoints.has(n.id),tint=topics.find(t=>t[0]===group(n))[2],onTheme=theme==="todos"||group(n)===theme;
   const rad=visualRadius(p,selected||isHover||isEndpoint);
   const density=clip(Math.min(w/1600,h/900),.36,1);
   const visibleDepth=clip(.70-p.depth/(ORB_RADIUS*2.9),.27,1);
   ctx.globalAlpha=(isEndpoint?1:(onTheme?focus&&mode==="focus"&&n.id!==focus?.58:1:.20))*visibleDepth;
   ctx.beginPath();ctx.arc(p.x,p.y,rad+2*density*density,0,2*PI);
   ctx.fillStyle="#1a2b39";ctx.fill();
   ctx.lineWidth=(selected||isEndpoint?3.4:2)*density;
   ctx.strokeStyle=isEndpoint?"#fff2cb":tint;ctx.stroke();
   if(rad<5){
    // En la vista panorámica los avatares y letras diminutas se vuelven ilegibles.
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,rad*.72),0,2*PI);
    ctx.fillStyle=tint;ctx.fill();
   }else{
   const photo=options.getPhoto?.(n);
   if(photo){
    let entry=cached.get(photo);if(!entry){const img=new Image();entry={img,state:"loading"};cached.set(photo,entry);img.onload=()=>{entry.state="ok";redraw()};img.onerror=()=>{entry.state="error";redraw()};img.src=photo}
    if(entry.state==="ok"){const img=entry.img;ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,rad-1,0,2*PI);ctx.clip();const r=Math.max(2*rad/img.width,2*rad/img.height);ctx.drawImage(img,p.x-img.width*r/2,p.y-img.height*r/2,img.width*r,img.height*r);ctx.restore()}
    else{ctx.font=clip(rad*1.15,7,14)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(n.name.charAt(0),p.x,p.y+rad*.33)}
   }else{ctx.font=clip(rad*1.15,7,14)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(n.name.charAt(0),p.x,p.y+rad*.33)}
   }
   if(selected||isHover||isEndpoint){
    const name=n.name.length>25?n.name.slice(0,24)+"…":n.name;
    ctx.font="600 11px system-ui";let lw=Math.min(220,ctx.measureText(name).width+14);
    ctx.fillStyle="rgba(12,21,30,.94)";ctx.fillRect(p.x-lw/2,p.y+rad+6,lw,22);
    ctx.strokeStyle=color(tint,.8);ctx.lineWidth=1;ctx.strokeRect(p.x-lw/2,p.y+rad+6,lw,22);
    ctx.fillStyle="#f8faff";ctx.fillText(name,p.x,p.y+rad+21);
   }
   ctx.globalAlpha=1;hits.push({id:n.id,x:p.x,y:p.y,r:Math.max(12,rad+6)});
  });
  // Las etiquetas de los temas se muestran en las cabeceras de sus regiones.
  const title=theme==="todos"?"Todas las comunidades":topics.find(t=>t[0]===theme)[1];
  ctx.textAlign="left";ctx.fillStyle="#d2e1ee";ctx.font="600 12px system-ui";
  ctx.fillText(title+" · "+(theme==="todos"?nodes.length:nodes.filter(n=>group(n)===theme).length)+" entidades",16,75);
  ctx.fillStyle="#93aabf";ctx.font="11px system-ui";ctx.fillText("Arrastra para rotar · dos dedos para mover · zoom con pellizco o + / −",16,93);
 }
 function fitView(){
  // Centrar todo el ORBE, no la caja de los nodos. Así la rotación no altera
  // el encuadre ni recorta el hemisferio oculto o los rótulos flotantes.
  const box=canvas.getBoundingClientRect();
  if(box.width<10||box.height<10||!nodes.length)return;
  w=box.width;h=box.height;
  const panel=canvas.closest(".graph-panel");
  const aside=panel&&panel.classList.contains("drawer-open")?
   panel.querySelector(".inspector"):null;
  const reserved=aside?Math.min(aside.getBoundingClientRect().width,w*.55):0;
  const left=30,right=w-reserved-30,top=h<530?76:105,bottom=h-(h<530?58:80);
  const usableX=Math.max(70,right-left),usableY=Math.max(70,bottom-top);
  const base=Math.min(w/1450,h/950);
  const outerRadius=ORB_RADIUS*base*1.33;
  zoom=clip(Math.min(usableX/(2*outerRadius),usableY/(2*outerRadius)),.055,7);
  panX=(left+right)/2-w/2;
  panY=(top+bottom)/2-h/2;
  redraw();
  return{zoom,visible:nodes.length,availableWidth:usableX,availableHeight:usableY};
 }
 function now(){return typeof performance!=="undefined"?performance.now():Date.now()}
 function markInteraction(){quietUntil=now()+3200}
 function motionFrame(time){
  // ~22 fotogramas/segundo; pausa si la pestaña está oculta o se interactúa.
  if(time-lastMotionFrame>=45){
   const dt=Math.min(time-lastMotionFrame,85);lastMotionFrame=time;
   if(motionEnabled&&typeof document!=="undefined"&&!document.hidden&&
    !down.size&&time>=quietUntil&&canvas.getBoundingClientRect().width>4){
    yaw+=dt*.000023;
    pitch=basePitch+Math.sin(time*.00015)*.027;
    redraw();
   }
  }
  requestAnimationFrame(motionFrame);
 }
 function startMotion(){
  if(motionStarted||typeof document==="undefined")return;
  motionStarted=true;lastMotionFrame=now();requestAnimationFrame(motionFrame);
 }
 function redraw(){if(queued)return;queued=true;requestAnimationFrame(render)}
 function hit(p){
  // Los nodos están por delante de las líneas; las líneas se detectan por
  // distancia real al segmento, no por el orden de dibujo.
  for(let i=hits.length-1;i>=0;i--){const n=hits[i];if(Math.hypot(p.x-n.x,p.y-n.y)<=n.r)return{kind:"node",id:n.id}}
  for(let i=bandHits.length-1;i>=0;i--){const b=bandHits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:"theme",id:b.id}}
  let nearest=null,nearestDistance=14;
  edgeHits.forEach(e=>{
   let previous=e.a;
   // Distancia al arco cuadrático, no a la antigua recta.
   for(let i=1;i<=12;i++){
    const t=i/12,u=1-t;
    const q={x:u*u*e.a.x+2*u*t*e.c.x+t*t*e.b.x,
     y:u*u*e.a.y+2*u*t*e.c.y+t*t*e.b.y};
    const dx=q.x-previous.x,dy=q.y-previous.y;
    const fraction=clip(((p.x-previous.x)*dx+(p.y-previous.y)*dy)/(dx*dx+dy*dy||1),0,1);
    const distance=Math.hypot(p.x-previous.x-fraction*dx,p.y-previous.y-fraction*dy);
    if(distance<nearestDistance){nearestDistance=distance;nearest={kind:"edge",id:e.id}}
    previous=q;
   }
  });
  return nearest;
 }
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 canvas.addEventListener("pointerdown",e=>{if(e.button!==0)return;markInteraction();e.preventDefault();canvas.setPointerCapture(e.pointerId);down.set(e.pointerId,point(e));drag={begin:point(e),moved:false,pan:e.shiftKey}});
 canvas.addEventListener("pointermove",e=>{
  const p=point(e);
  if(down.has(e.pointerId)){markInteraction();
   const last=down.get(e.pointerId),dx=p.x-last.x,dy=p.y-last.y;down.set(e.pointerId,p);if(!drag)return;
   drag.moved=drag.moved||Math.hypot(p.x-drag.begin.x,p.y-drag.begin.y)>5;
   if(down.size>1||drag.pan){panX+=dx;panY+=dy}else{yaw+=dx*.008;pitch=clip(pitch+dy*.005,-1.1,1.1);basePitch=pitch}redraw();
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
 canvas.addEventListener("pointerup",e=>{markInteraction();const p=point(e),click=drag&&!drag.moved&&down.size===1;down.delete(e.pointerId);if(!down.size)drag=null;if(click){const entity=hit(p);if(entity)options.onSelect?.(entity)}redraw()});
 canvas.addEventListener("pointercancel",e=>{down.delete(e.pointerId);if(!down.size)drag=null});
 canvas.addEventListener("pointerleave",()=>{hover=null;hoverEdge=null;hint.hidden=true;redraw()});
 // El zoom mantiene fijo el punto situado bajo el cursor / los dedos.
 function zoomAt(px,py,factor){
  markInteraction();const next=clip(zoom*factor,.06,10),ratio=next/zoom;
  if(Math.abs(ratio-1)<.00001)return;
  panX=px-w/2-(px-w/2-panX)*ratio;
  panY=py-h/2-(py-h/2-panY)*ratio;
  zoom=next;redraw();
 }
 // Chrome/Edge en macOS: un pellizco en el trackpad emite ctrl+wheel.
 // La rueda normal y el desplazamiento con dos dedos siguen moviendo el grafo.
 canvas.addEventListener("wheel",e=>{
  markInteraction();e.preventDefault();
  const p=point(e),k=e.deltaMode===1?16:e.deltaMode===2?h:1;
  if(e.ctrlKey||e.metaKey)zoomAt(p.x,p.y,Math.exp(-clip(e.deltaY*k,-320,320)*.008));
  else{panX-=e.deltaX*k;panY-=e.deltaY*k;redraw()}
 },{passive:false});
 // Safari emite eventos gesture*; aplicar solo el incremento del gesto.
 let lastGestureScale=1;
 canvas.addEventListener("gesturestart",e=>{markInteraction();e.preventDefault();lastGestureScale=e.scale||1},{passive:false});
 canvas.addEventListener("gesturechange",e=>{
  markInteraction();e.preventDefault();
  const current=e.scale||1;
  const p=point(e);zoomAt(p.x,p.y,current/(lastGestureScale||1));
  lastGestureScale=current;
 },{passive:false});
 canvas.addEventListener("gestureend",e=>{e.preventDefault();lastGestureScale=1},{passive:false});
 new ResizeObserver(redraw).observe(canvas);
 return {
  topics:topics.map(t=>({id:t[0],label:t[1]})),
  setData(a,b){nodes=a;edges=b;index.clear();for(const n of a)index.set(n.id,n);if(this.sig!==a.map(n=>n.id).join("|")+"#"+b.length){this.sig=a.map(n=>n.id).join("|")+"#"+b.length;arrange()}redraw();startMotion()},
  setSelection(s){selection=s;redraw()},setQuery(s){search=s||"";redraw()},setEdgeMode(s){mode=s;redraw()},
  setTheme(s){markInteraction();theme=topics.some(t=>t[0]===s)?s:"todos";hover=null;hoverEdge=null;hint.hidden=true;
   yaw=-.45;pitch=.24;basePitch=.24;zoom=1;panX=panY=0;fitView()},
  zoom(f){zoomAt(w/2,h/2,f)},
  fit:fitView,
  reset(){markInteraction();yaw=-.45;pitch=.24;basePitch=.24;zoom=1;panX=panY=0;fitView()},
  organize(){arrange();this.reset()},
  setMotion(enabled){motionEnabled=!!enabled;markInteraction();return motionEnabled},
  isMotionEnabled(){return motionEnabled},redraw
 };
}
window.IdeaLabGraph3D={create:make,topics:topics.map(t=>({id:t[0],label:t[1]}))};
})();