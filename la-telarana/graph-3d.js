(function(){
"use strict";
const topics=[["inteligencia","Inteligencia","#76d0ec"],["oriente","Oriente Medio","#e6b978"],["espana","España","#b9a3ea"],["historia","Historia","#ec8f89"],["iglesia","Iglesia y Vaticano","#d4bbef"],["tecnologia","Tecnología","#8bdbbd"],["finanzas","Finanzas y poder","#bbd68c"],["global","Política internacional","#e6ad91"]];
const groups={
inteligencia:"mossad kidón metsada shin-bet servicio-cni cia mi6 unidad-8200 dgst-marruecos dgse-francia si-australia policia-guardia-civil eric-frattini jorge-dezcallar meir-amit danny-yatom yossi-cohen meir-dagan david-barnea tamir-pardo roman-gofman alberto-saiz john-ratcliffe",
oriente:"david-ben-gurion golda-meir ali-hassan-salameh ilich-ramirez-sanchez ahmed-bouchiki shimon-peres hussein-jordania ahmed-yassin abdel-aziz-al-rantisi yitzhak-shamir mahmoud-abbas ehud-barak yasser-arafat ariel-sharon benjamin-netanyahu ali-khamenei mojtaba-khamenei gamal-abdel-nasser hamas hizbula septiembre-negro autoridad-palestina fuerzas-israel guardia-revolucionaria sayeret-matkal",
espana:"roberto-vaquero jose-maria-irujo alberto-martin-artajo david-rubio denis-paredes pau-botella alicia-sanz juan-carlos-gumucio fernando-grande-marlaska manuel-llamas pedro-sanchez begona-gomez pablo-iglesias hispantv",
historia:"meir-tobianski adolf-eichmann herbert-cukurs otto-skorzeny wolfgang-lotz josef-mengele benito-mussolini adolf-hitler francisco-franco leon-degrelle",
iglesia:"vaticano santa-sede curia-romana benedicto-xvi francisco-papa leon-xiv paolo-gabriele jorge-mario-bergoglio iglesia-catolica instituto-obras-religion",
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
 let representation="orb",fittedZoom=1;
 const layouts=[{id:"orb",label:"Orbe 3D"},{id:"cloud",label:"Nube 3D"},{id:"galaxy",label:"Galaxia 3D"}];
 let extent=1080;
 const index=new Map(),PI=Math.PI;
 function group(n){
  if(n&&n.topic3d&&topics.some(t=>t[0]===n.topic3d))return n.topic3d;
  if(tagged[n.id])return tagged[n.id];
  const s=(n.name+" "+(n.subtitle||"")+" "+(n.note||"")).toLowerCase();
  return /mossad|inteligenc|espionaj|secreto/.test(s)?"inteligencia":/israel|iran|palestin|hamás|hamas|egipt/.test(s)?"oriente":/españ|congreso|gobierno español/.test(s)?"espana":/nazi|guerra mundial/.test(s)?"historia":/tecnol|software|digital/.test(s)?"tecnologia":/banc|financ|invers/.test(s)?"finanzas":"global";
 }
 // Orbe 3D: sectores temáticos dinámicos con centros repartidos por una esfera mediante
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
 // Nube: fuerzas entre centros temáticos (8), ponderadas por enlaces del subgrafo.
 // No se interpreta la cercanía como causalidad; no hay simulación O(N²) de entidades.
 function cloudCentres(degreeByTopic,pairs,counts){
  const active=topics.map(t=>t[0]).filter(id=>counts.get(id)>0);
  const c=new Map(active.map(id=>{const n=normals.get(id);return[id,{x:n.x*850,y:n.y*850,z:n.z*850}]}));
  for(let iter=0;iter<110;iter++){
   const forces=new Map(active.map(id=>[id,{x:0,y:0,z:0}]));
   for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j],p=c.get(a),q=c.get(b);
    const dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,d=Math.max(1,Math.hypot(dx,dy,dz));
    const links=pairs.get([a,b].sort().join("|"))||0;
    const strength=clip(links/Math.sqrt(Math.max(1,degreeByTopic.get(a))*Math.max(1,degreeByTopic.get(b))),0,1);
    const target=1450-640*Math.sqrt(strength);
    const force=(d-target)*(.013+.025*Math.sqrt(strength));
    const u=forces.get(a),v=forces.get(b);
    for(const [key,delta] of [["x",dx],["y",dy],["z",dz]]){u[key]+=delta/d*force;v[key]-=delta/d*force}
   }
   for(const id of active){
    const p=c.get(id),v=forces.get(id);
    for(const key of ["x","y","z"])p[key]+=clip(v[key]-p[key]*.003,-35,35);
   }
  }
  return c;
 }
 function arrange(){

  pos=new Map();caps.clear();
  const degree=new Map(nodes.map(n=>[n.id,0]));
  for(const e of edges){degree.set(e.a,(degree.get(e.a)||0)+1);degree.set(e.b,(degree.get(e.b)||0)+1)}
  const counts=new Map(topics.map(t=>[t[0],0])),degreeByTopic=new Map(topics.map(t=>[t[0],0])),pairs=new Map();
  for(const node of nodes)counts.set(group(node),counts.get(group(node))+1);
  for(const edge of edges){
   const a=index.get(edge.a),b=index.get(edge.b);if(!a||!b)continue;
   const x=group(a),y=group(b);degreeByTopic.set(x,degreeByTopic.get(x)+1);degreeByTopic.set(y,degreeByTopic.get(y)+1);
   if(x!==y){const key=[x,y].sort().join("|");pairs.set(key,(pairs.get(key)||0)+1)}
  }
  const centres=representation==="cloud"?cloudCentres(degreeByTopic,pairs,counts):null;
  extent=ORB_RADIUS;
  for(const [name] of topics){
   const subset=nodes.filter(n=>group(n)===name)
    .sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0)||a.name.localeCompare(b.name,"es"));
   const n=normals.get(name),{u,v}=basis(n);
   const cap=clip(.32+.035*Math.sqrt(subset.length),.35,.63);
   if(representation!=="orb"){
    const i=topics.findIndex(t=>t[0]===name),theta=i*2*PI/topics.length;
    const r=630+260*(i%2);
    const centre=representation==="cloud"?(centres.get(name)||{x:0,y:0,z:0}):{x:r*Math.cos(theta+.23*(i%2)),y:r*Math.sin(theta+.23*(i%2)),z:35*Math.sin(theta)};
    const spread=clip(155+10*Math.sqrt(subset.length),180,430);
    caps.set(name,{centre,count:subset.length});
    subset.forEach((node,j)=>{
     const f=(j+.5)/Math.max(1,subset.length),a=j*GOLDEN_ANGLE;
     let x,y,z;
     if(representation==="cloud"){
      const latitude=1-2*((j*.61803398875+.5)%1),ring=Math.sqrt(1-latitude*latitude),d=spread*Math.cbrt(f);
      x=d*ring*Math.cos(a);y=d*ring*Math.sin(a);z=d*latitude;
     }else{
      // Disco con brazos curvos y grosor variable; orden por conectividad dentro de cada tema.
      const d=spread*Math.sqrt(f),angle=a+.9*f,dx=d*Math.cos(angle)*1.12,dy=d*Math.sin(angle)*.70,twist=theta+.8;
      x=dx*Math.cos(twist)-dy*Math.sin(twist);y=dx*Math.sin(twist)+dy*Math.cos(twist);z=spread*.24*Math.sin(j*1.73)*Math.sqrt(f);
     }
     const p={x:centre.x+x,y:centre.y+y,z:centre.z+z};pos.set(node.id,p);extent=Math.max(extent,Math.hypot(p.x,p.y,p.z));
    });
    continue;
   }
   caps.set(name,{n,u,v,angle:cap+.065,count:subset.length,centre:{x:n.x*ORB_RADIUS,y:n.y*ORB_RADIUS,z:n.z*ORB_RADIUS}});
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
  // El tamaño sigue a la escala real del orbe. La densidad móvil SOLO
  // compacta la vista panorámica; al ampliar desaparece progresivamente.
  // Antes el máximo de 23px multiplicado por .36 impedía ver fotografías.
  const density=clip(Math.min(w/1600,h/900),.36,1);
  const detail=clip((p.scale-.16)/1.30,0,1);
  const multiplier=density+(1-density)*detail;
  const size=(emphasized?30:22)*p.scale*multiplier;
  return clip(size,1.5,emphasized?116:96);
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
 function drawBackdrop(){
  if(representation==="orb"){drawOrb();return}
  // La nube no tiene contorno esférico. La galaxia incluye pistas de su plano de giro.
  if(representation==="galaxy"){
   ctx.strokeStyle="rgba(115,176,213,.10)";ctx.lineWidth=.8;
   for(const radius of [400,730,1080]){
    ctx.beginPath();for(let j=0;j<=96;j++){
     const a=j*2*PI/96,p=proj({x:radius*Math.cos(a),y:radius*Math.sin(a),z:0});
     if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }ctx.stroke();
   }
   for(let arm=0;arm<3;arm++){
    ctx.beginPath();for(let j=0;j<=80;j++){
     const r=150+j*12,a=arm*2*PI/3+j*.035,p=proj({x:r*Math.cos(a),y:r*Math.sin(a),z:0});
     if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }ctx.stroke();
   }
  }
 }
 function drawRegions(visible,pr){
  bandHits=[];
  const middle={x:w/2+panX,y:h/2+panY};
  const radius=ORB_RADIUS*Math.min(w/1450,h/950)*zoom;
  const groups=topics.map(([id,label,tint])=>{
   const cap=caps.get(id),members=visible.filter(n=>group(n)===id&&pr.has(n.id));
   return{id,label,tint,cap,members,centre:cap?proj(cap.centre):null};
  }).filter(t=>t.cap&&t.members.length).sort((a,b)=>b.centre.depth-a.centre.depth);
  const labels=[];
  for(const t of groups){
   const active=theme===t.id,muted=theme!=="todos"&&!active;
   const near=clip(.67-t.centre.depth/(ORB_RADIUS*2.5),.17,1);
   const alpha=(active?1:muted?.17:1)*near;
   // Nube cromática proyectada sobre la superficie, sin bordes ni anillos temáticos.
   // La huella sigue la perspectiva del orbe y se desvanece suavemente hacia el exterior.
   const edgePoints=[];
   if(representation==="orb"){
    for(let j=0;j<64;j++){
     const world=surfacePoint(t.cap.n,t.cap.u,t.cap.v,j*2*PI/64,t.cap.angle,ORB_RADIUS+8);
     edgePoints.push(proj(world));
    }
   }else for(const node of t.members)edgePoints.push(pr.get(node.id));
   const bx=edgePoints.map(p=>p.x),by=edgePoints.map(p=>p.y);
   const left=Math.min(...bx),right=Math.max(...bx),top=Math.min(...by),bottom=Math.max(...by);
   const fogCx=(left+right)/2,fogCy=(top+bottom)/2;
   const fogRx=Math.max(22,(right-left)*.57),fogRy=Math.max(18,(bottom-top)*.57);
   ctx.save();
   ctx.globalAlpha=alpha;
   ctx.translate(fogCx,fogCy);
   ctx.scale(fogRx,fogRy);
   const fog=ctx.createRadialGradient(0,0,0,0,0,1);
   fog.addColorStop(0,color(t.tint,active?.28:.20));
   fog.addColorStop(.36,color(t.tint,active?.20:.14));
   fog.addColorStop(.72,color(t.tint,active?.075:.050));
   fog.addColorStop(1,color(t.tint,0));
   ctx.beginPath();ctx.arc(0,0,1,0,2*PI);
   ctx.fillStyle=fog;ctx.fill();
   ctx.restore();
   labels.push({...t,alpha,active});
  }
  return labels;
 }
 function drawLabels(labels,pr){
  // Spatial occupancy grid: label placement is cheap even with thousands of entities.
  const cell=24,grid=new Map(),points=Array.from(pr.values()).map(p=>({...p,r:visualRadius(p)+5}));
  for(const p of points){
   if(p.x<-p.r||p.x>w+p.r||p.y<-p.r||p.y>h+p.r)continue;
   for(let x=Math.floor((p.x-p.r)/cell);x<=Math.floor((p.x+p.r)/cell);x++)
    for(let y=Math.floor((p.y-p.r)/cell);y<=Math.floor((p.y+p.r)/cell);y++){
     const k=x+","+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);
    }
  }
  const middle={x:w/2+panX,y:h/2+panY},rects=[];
  const top=w<=600?125:105,bottom=h-55;
  const panel=canvas.closest(".graph-panel"),aside=panel&&panel.classList.contains("drawer-open")?panel.querySelector(".inspector"):null;
  const availableRight=w-(aside?Math.min(aside.getBoundingClientRect().width,w*.55):0)-10;
  function occupancy(b){
   const nearby=new Set();
   for(let x=Math.floor((b.x-6)/cell);x<=Math.floor((b.x+b.w+6)/cell);x++)
    for(let y=Math.floor((b.y-6)/cell);y<=Math.floor((b.y+b.h+6)/cell);y++)
     for(const p of grid.get(x+","+y)||[])nearby.add(p);
   let count=0;
   for(const p of nearby){
    const dx=p.x-clip(p.x,b.x-6,b.x+b.w+6),dy=p.y-clip(p.y,b.y-6,b.y+b.h+6);
    if(dx*dx+dy*dy<p.r*p.r)count++;
   }
   return count;
  }
  const ordered=labels.slice().sort((a,b)=>Number(b.active)-Number(a.active)||b.members.length-a.members.length||a.id.localeCompare(b.id));
  for(const t of ordered){
   const bw=clip(t.label.length*6.8+28,110,190),bh=40;
   if(availableRight-bw<10||bottom-top<bh)continue;
   const groupPoints=t.members.map(n=>pr.get(n.id));
   const anchor=groupPoints.reduce((a,p)=>({x:a.x+p.x/groupPoints.length,y:a.y+p.y/groupPoints.length}),{x:0,y:0});
   let dx=anchor.x-middle.x,dy=anchor.y-middle.y,len=Math.hypot(dx,dy);
   if(len<10){const angle=topics.findIndex(row=>row[0]===t.id)*GOLDEN_ANGLE;dx=Math.cos(angle);dy=Math.sin(angle);len=1}
   const vx=dx/len,vy=dy/len;
   const support=groupPoints.reduce((best,p)=>Math.max(best,(p.x-anchor.x)*vx+(p.y-anchor.y)*vy+visualRadius(p)),0);
   const desired={x:anchor.x+vx*(support+38+bw*.38),y:anchor.y+vy*(support+38+bh*.4)};
   const candidates=[];
   function add(cx,cy){
    const box={x:clip(cx-bw/2,10,availableRight-bw),y:clip(cy-bh/2,top,bottom-bh),w:bw,h:bh};
    if(rects.some(r=>box.x<r.x+r.w+6&&box.x+bw+6>r.x&&box.y<r.y+r.h+5&&box.y+bh+5>r.y))return;
    const overlap=occupancy(box);
    const distance=Math.hypot(box.x+bw/2-desired.x,box.y+bh/2-desired.y);
    candidates.push({...box,overlap,cost:overlap*1800+distance});
   }
   add(desired.x,desired.y);
   for(let i=0;i<16;i++){
    const a=i*2*PI/16,rx=Math.max(80,support+60);
    add(anchor.x+Math.cos(a)*(rx+bw*.4),anchor.y+Math.sin(a)*(rx+bh*.5));
   }
   // Rails at screen edges keep labels outside dense projections, including the rear hemisphere.
   for(let y=top+bh/2;y<=bottom-bh/2+1;y+=bh+7){add(10+bw/2,y);add(availableRight-bw/2,y)}
   for(let x=10+bw/2;x<=availableRight-bw/2+1;x+=Math.max(55,bw*.55)){add(x,top+bh/2);add(x,bottom-bh/2)}
   candidates.sort((a,b)=>a.cost-b.cost);
   const best=candidates[0];if(!best)continue;
   // At close zoom a clear label may not fit. Prefer omission to covering entity nodes.
   if(best.overlap>0&&zoom>fittedZoom*1.8&&!t.active)continue;
   const px=best.x,py=best.y;rects.push(best);
   const target={x:clip(anchor.x,px,px+bw),y:clip(anchor.y,py,py+bh)};
   ctx.save();ctx.globalAlpha=theme!=="todos"&&!t.active?.32:clip(t.alpha+.42,.67,1);
   ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(target.x,target.y);
   ctx.strokeStyle=color(t.tint,.64);ctx.lineWidth=.9;ctx.stroke();
   ctx.beginPath();ctx.roundRect(px,py,bw,bh,10);
   ctx.fillStyle="rgba(12,26,39,.96)";ctx.fill();
   ctx.strokeStyle=color(t.tint,t.active?.9:.65);ctx.lineWidth=t.active?1.7:1;ctx.stroke();
   ctx.textAlign="left";ctx.textBaseline="top";
   ctx.fillStyle=t.tint;ctx.font="700 12px system-ui";ctx.fillText(t.label,px+9,py+6,bw-18);
   ctx.fillStyle="#a9bbca";ctx.font="600 10px system-ui";ctx.fillText(t.members.length+" entidades",px+9,py+23);
   ctx.restore();bandHits.push({id:t.id,x:px,y:py,w:bw,h:bh});
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
  drawBackdrop();
  const queryKey=String(search||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim();
  const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
  const names=queryKey?nodes.filter(n=>normalize(n.name).includes(queryKey)):[];
  const matched=queryKey?(names.length?names:nodes.filter(n=>normalize((n.subtitle||"")+" "+(n.note||"")).includes(queryKey))):nodes;
  const seeds=new Set(matched.map(n=>n.id)),displayed=new Set(seeds);
  if(queryKey)edges.forEach(e=>{if(seeds.has(e.a)||seeds.has(e.b)){displayed.add(e.a);displayed.add(e.b)}});
  const visible=queryKey?nodes.filter(n=>displayed.has(n.id)):nodes;
  const pr=new Map(visible.map(n=>[n.id,proj(pos.get(n.id)||{x:0,y:0,z:0})]));
  const labels=drawRegions(visible,pr);
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
   const c=representation==="orb"?proj({x:joint.x*ORB_RADIUS*.89,y:joint.y*ORB_RADIUS*.89,z:joint.z*ORB_RADIUS*.89}):proj({x:(p1.x+p2.x)*.46,y:(p1.y+p2.y)*.46,z:(p1.z+p2.z)*.46});
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
   const detail=clip((p.scale-.16)/1.30,0,1);
   const ringDensity=density+(1-density)*detail;
   const visibleDepth=clip(.70-p.depth/(ORB_RADIUS*2.9),.27,1);
   ctx.globalAlpha=(isEndpoint?1:(onTheme?focus&&mode==="focus"&&n.id!==focus?.58:1:.20))*visibleDepth;
   ctx.beginPath();ctx.arc(p.x,p.y,rad+Math.max(1,2*ringDensity),0,2*PI);
   ctx.fillStyle="#1a2b39";ctx.fill();
   ctx.lineWidth=(selected||isEndpoint?3.4:2)*ringDensity;
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
    else{ctx.font="700 "+clip(rad*.82,8,38)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(options.getIcon?.(n)||"●",p.x,p.y+rad*.28)}
   }else{ctx.font="700 "+clip(rad*.82,8,38)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#d9e3ed";ctx.fillText(options.getIcon?.(n)||"●",p.x,p.y+rad*.28)}
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
  drawLabels(labels,pr);
  // Las etiquetas de los temas se muestran en las cabeceras de sus regiones.
  const title=theme==="todos"?"Todas las comunidades":topics.find(t=>t[0]===theme)[1];
  // En móvil la barra de controles ocupa una segunda fila; reservarle espacio.
  const headerY=w<=600?90:75;
  ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillStyle="#d2e1ee";ctx.font="600 12px system-ui";
  ctx.fillText(title+" · "+(theme==="todos"?nodes.length:nodes.filter(n=>group(n)===theme).length)+" entidades",16,headerY);
  ctx.fillStyle="#93aabf";ctx.font="11px system-ui";ctx.fillText("Arrastra para rotar · dos dedos para mover · zoom con pellizco o + / −",16,headerY+18);
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
  const outerRadius=extent*base*1.33;
  zoom=clip(Math.min(usableX/(2*outerRadius),usableY/(2*outerRadius)),.055,7);
  fittedZoom=zoom;
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
    !down.size&&!hover&&!hoverEdge&&time>=quietUntil&&canvas.getBoundingClientRect().width>4){
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
  // Labels are drawn last and therefore take precedence in their own rectangles.
  for(let i=bandHits.length-1;i>=0;i--){const b=bandHits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return{kind:"theme",id:b.id}}
  for(let i=hits.length-1;i>=0;i--){const n=hits[i];if(Math.hypot(p.x-n.x,p.y-n.y)<=n.r)return{kind:"node",id:n.id}}
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
 canvas.addEventListener("pointerdown",e=>{if(e.button!==0)return;markInteraction();e.preventDefault();canvas.setPointerCapture(e.pointerId);canvas.style.cursor="grabbing";down.set(e.pointerId,point(e));drag={begin:point(e),moved:false,pan:e.shiftKey}});
 canvas.addEventListener("pointermove",e=>{
  const p=point(e);
  if(down.has(e.pointerId)){markInteraction();canvas.style.cursor="grabbing";
   const last=down.get(e.pointerId),dx=p.x-last.x,dy=p.y-last.y;down.set(e.pointerId,p);if(!drag)return;
   drag.moved=drag.moved||Math.hypot(p.x-drag.begin.x,p.y-drag.begin.y)>5;
   if(down.size>1||drag.pan){panX+=dx;panY+=dy}else{yaw+=dx*.008;pitch=clip(pitch+dy*.005,-1.1,1.1);basePitch=pitch}redraw();
  }else{
   const found=hit(p),id=found?.kind==="node"?found.id:null,lineId=found?.kind==="edge"?found.id:null;
   if(id!==hover||lineId!==hoverEdge){hover=id;hoverEdge=lineId;if(found)markInteraction();redraw()}
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
 canvas.addEventListener("pointerup",e=>{markInteraction();const p=point(e),click=drag&&!drag.moved&&down.size===1;down.delete(e.pointerId);if(!down.size)drag=null;canvas.style.cursor=down.size?"grabbing":hit(p)?"pointer":"grab";if(click){const entity=hit(p);if(entity)options.onSelect?.(entity)}redraw()});
 canvas.addEventListener("pointercancel",e=>{down.delete(e.pointerId);if(!down.size)drag=null;canvas.style.cursor=down.size?"grabbing":"grab"});
 canvas.addEventListener("pointerleave",()=>{hover=null;hoverEdge=null;hint.hidden=true;if(!down.size)canvas.style.cursor="grab";redraw()});
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
  setData(a,b){
   nodes=a;edges=b;index.clear();for(const n of a)index.set(n.id,n);
   // Al cambiar el subgrafo, limpiar etiquetas y zonas de clic del estado previo.
   // Sin esto, un tooltip de una Publicación filtrada puede permanecer en pantalla.
   const signature=a.map(n=>n.id).join("|")+"#"+b.length;
   if(this.sig!==signature){
    this.sig=signature;hover=null;hoverEdge=null;hint.hidden=true;hint.textContent="";
    hits=[];edgeHits=[];bandHits=[];arrange()
   }else{
    if(hover&&!index.has(hover)){hover=null;hint.hidden=true}
    if(hoverEdge&&!edges.some(e=>e.id===hoverEdge)){hoverEdge=null;hint.hidden=true}
   }
   redraw();startMotion()
  },
  setSelection(s){selection=s;redraw()},setQuery(s){search=s||"";redraw()},setEdgeMode(s){mode=s;redraw()},
  setLayout(next){
   if(!layouts.some(x=>x.id===next))return false;
   if(next===representation)return true;
   representation=next;hover=null;hoverEdge=null;hint.hidden=true;hits=[];edgeHits=[];bandHits=[];
   arrange();this.reset();return true;
  },
  getLayout(){return representation},
  setTheme(s){markInteraction();theme=topics.some(t=>t[0]===s)?s:"todos";hover=null;hoverEdge=null;hint.hidden=true;
   yaw=-.45;pitch=.24;basePitch=.24;zoom=1;panX=panY=0;fitView()},
  focusNode(id){
   const p=pos.get(id);if(!p)return false;
   markInteraction();hover=null;hoverEdge=null;
   if(representation!=="orb"){zoom=Math.max(zoom,.65);panX=panY=0;const screen=proj(p);panX=w/2-screen.x;panY=h/2-screen.y;redraw();return true;}
   // Gira el hemisferio visible hacia el nodo y amplía la ficha seleccionada.
   yaw=Math.atan2(p.x,p.z);
   const r=Math.hypot(p.x,p.z);
   pitch=Math.atan2(p.y,r);basePitch=pitch;
   panX=0;panY=0;zoom=Math.max(zoom,.65);
   redraw();return true;
  },
  zoom(f){zoomAt(w/2,h/2,f)},
  fit:fitView,
  reset(){markInteraction();yaw=-.45;pitch=representation==="galaxy"?.46:.24;basePitch=pitch;zoom=1;panX=panY=0;fitView()},
  organize(){arrange();this.reset()},
  setMotion(enabled){motionEnabled=!!enabled;markInteraction();return motionEnabled},
  isMotionEnabled(){return motionEnabled},redraw
 };
}
window.IdeaLabGraph3D={create:make,topics:topics.map(t=>({id:t[0],label:t[1]}))};
})();
