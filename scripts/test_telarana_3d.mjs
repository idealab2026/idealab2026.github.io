/* Prueba del orbe 3D y gestos. Sin dependencias ni red. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('la-telarana/graph-3d.js','utf8');
const page=fs.readFileSync('la-telarana/index.html','utf8');
const fullPanel=page.match(/\.graph-panel > #stage3d,\s*\.graph-panel > #network\{([^}]*)\}/);
assert(fullPanel,'3D stage and SVG must share full-panel CSS sizing');
assert(/position:\s*absolute;/.test(fullPanel[1]),'stage must be positioned within its panel');
assert(/height:\s*100%;/.test(fullPanel[1]),'stage height must equal panel height');
const canvasFill=page.match(/\.graph-panel > #stage3d canvas\{([^}]*)\}/);
assert(canvasFill&&/height:\s*100%;/.test(canvasFill[1]),'3D canvas must fill its stage');
let time=0;
const frames=[];
const env={
 window:{matchMedia(){return{matches:false}}},
 document:{hidden:false},
 performance:{now:()=>time},
 requestAnimationFrame(fn){frames.push(fn);return frames.length},
 ResizeObserver:class{observe(){}},
 devicePixelRatio:1,
 Image:class{}
};
vm.runInNewContext(source,env);
const Graph=env.window.IdeaLabGraph3D;
assert.equal(Graph.topics.length,8);
assert.equal(Graph.topics.find(x=>x.id==="iglesia")?.label,"Iglesia y Vaticano","Falta sector Vaticano");
assert.equal(Graph.topics.find(x=>x.id==='historia')?.label,'Historia','la categoría no debe nombrarse Historia y nazismo');

function flush(t){
 time=t;
 const pending=frames.splice(0);
 pending.forEach(fn=>fn(t));
}
const populations={
 inteligencia:50,oriente:25,espana:64,historia:28,iglesia:20,
 tecnologia:9,finanzas:26,global:20
};
const nodes=[];
for(const [topic,total] of Object.entries(populations)){
 for(let j=0;j<total;j++){
  nodes.push({id:topic+'-'+j,name:topic+' '+j,
   topic3d:topic,kind:'Persona',note:''});
 }
}
assert.equal(nodes.length,242);
const edges=nodes.slice(1).map((n,i)=>({
 id:'edge'+i,a:nodes[i].id,b:n.id,
 confidence:i%4===0?'hipotesis':'documentado',type:'Prueba'
}));
const tint=new Set(Graph.topics.map(({id})=>({
 inteligencia:'#76d0ec',oriente:'#e6b978',espana:'#b9a3ea',
 historia:'#ec8f89',iglesia:'#d4bbef',tecnologia:'#8bdbbd',
 finanzas:'#bbd68c',global:'#e6ad91'}[id])));

for(const [width,height] of [[1600,900],[1280,720],[1000,660],[820,600],[600,540],[390,844]]){
 let rings=[],pillBoxes=[],sphere=[],labels=[],lastArc=null,photoRequests=0,gradients=0;
 const events={};
 const ctx=new Proxy({},{
  get(target,key){
   if(key==='createRadialGradient')return()=>{gradients++;return{addColorStop(){}}};
   if(key==='beginPath')return()=>{lastArc=null};
   if(key==='arc')return(x,y,r)=>{lastArc={x,y,r}};
   if(key==='stroke')return()=>{
    if(lastArc){
     if(tint.has(target.strokeStyle))rings.push(lastArc);
     if(lastArc.r>70)sphere.push(lastArc);
    }
    lastArc=null;
   };
   if(key==='roundRect')return(x,y,w,h)=>pillBoxes.push({x,y,w,h});
   if(key==='measureText')return value=>({width:value.length*8});
   if(key==='fillText')return(text,x,y)=>labels.push({text,x,y});
   if(key==='setTransform')return()=>{rings=[];sphere=[];pillBoxes=[];labels=[]};
   return()=>{};
  },
  set(target,key,value){target[key]=value;return true}
 });
 const canvas={
  getContext(){return ctx},
  getBoundingClientRect(){return{width,height,left:0,top:0}},
  addEventListener(name,fn){events[name]=fn},
  setPointerCapture(){},closest(){return null},style:{}
 };
 const graph=Graph.create({canvas,tooltip:{hidden:true,style:{}},
  getPhoto(){photoRequests++;return null}});
 graph.setData(nodes,edges);
 const fitted=graph.fit();
 assert(Number.isFinite(fitted.zoom)&&fitted.zoom>0);
 flush(time);
 if(width===390){
  const title=labels.find(x=>String(x.text).startsWith('Todas las comunidades'));
  const hint=labels.find(x=>String(x.text).startsWith('Arrastra para rotar'));
  assert.equal(title?.y,90,'La cabecera debe quedar bajo la barra móvil');
  assert.equal(hint?.y,108,'La ayuda debe quedar debajo de la cabecera');
  assert(/@media\(max-width:600px\)\{\.fullscreen-search-bar\{top:121px\}\}/.test(page),
   'El buscador móvil debe comenzar por debajo de la ayuda del grafo');
 }
 assert.equal(rings.length,242,'all entity nodes visible');
 assert.equal(sphere.length,1,'one coherent spherical body');
 assert.equal(pillBoxes.length,8,'one compact label per lobe');
 assert(gradients>=10,'each thematic region must use a radial fading gradient');
 assert.equal(rings.length,242,'thematic outlines must not add circular strokes');
 assert(pillBoxes.every(b=>b.h<=50),'no large rectangular theme panels');
 const body=sphere[0],cx=width/2,cy=height/2;
 assert(rings.every(p=>Math.hypot(p.x-cx,p.y-cy)<body.r*1.36),
  'nodes must stay near the sphere, not on a flat external grid');
 const xs=rings.map(p=>p.x),ys=rings.map(p=>p.y);
 const widthRatio=(Math.max(...xs)-Math.min(...xs))/
  Math.max(1,Math.max(...ys)-Math.min(...ys));
 assert(widthRatio>.58&&widthRatio<1.65,'orbe must be roughly circular');
 const initialRadius=body.r;
 events.wheel({clientX:width/2,clientY:height/2,
  ctrlKey:true,metaKey:false,deltaX:0,deltaY:-45,deltaMode:0,
  preventDefault(){}});
 flush(time+60);
 assert(sphere[0].r>initialRadius,'trackpad pinch must enlarge the orb');
 events.gesturestart({scale:1,preventDefault(){}});
 events.gesturechange({scale:1.1,clientX:width/2,clientY:height/2,preventDefault(){}});
 flush(time+60);
 assert(sphere[0].r>initialRadius,'Safari gesture must enlarge the orb');
 events.gestureend({preventDefault(){}});
 // Regresión del bug móvil: antes los avatares se quedaban anclados a
 // 23px × densidad de pantalla incluso al seguir ampliando el orbe.
 const overviewSize=Math.max(...rings.map(p=>p.r));
 const previousPhotoRequests=photoRequests;
 graph.zoom(2.8);flush(time+60);
 const firstZoomSize=Math.max(...rings.map(p=>p.r));
 assert(firstZoomSize>overviewSize*1.35,'node rings must enlarge after zoom');
 assert(photoRequests>previousPhotoRequests,
  'zoomed-in nodes must request their portraits and icons');
 graph.zoom(2.2);flush(time+60);
 const secondZoomSize=Math.max(...rings.map(p=>p.r));
 assert(secondZoomSize>firstZoomSize*1.12,
  'node size must keep growing at medium-high zoom, not freeze at mobile cap');
 graph.zoom(1.65);flush(time+60);
 const thirdZoomSize=Math.max(...rings.map(p=>p.r));
 assert(thirdZoomSize>secondZoomSize*1.08,
  'photos and icons must continue to grow at high zoom');
 // El cursor debe expresar que se está agarrando el mapa, no permanecer abierto.
 events.pointerdown({button:0,pointerId:7,clientX:width/2,clientY:height/2,shiftKey:false,preventDefault(){}});
 assert.equal(canvas.style.cursor,'grabbing','la mano no se cierra al pulsar');
 events.pointermove({pointerId:7,clientX:width/2+36,clientY:height/2+18});
 assert.equal(canvas.style.cursor,'grabbing','la mano debe seguir cerrada durante el arrastre');
 events.pointerup({pointerId:7,clientX:width/2+36,clientY:height/2+18});
 assert.notEqual(canvas.style.cursor,'grabbing','la mano debe abrirse al soltar');
 assert(graph.setMotion(false)===false,'motion pause control');
 graph.setTheme('espana');
 flush(time+60);
 assert(graph.isMotionEnabled()===false);
 assert(Number.isFinite(graph.fit().zoom));
 flush(time+60);
 // Control de reanudación, disponible independientemente del sistema operativo.
 assert(graph.setMotion(true)===true);
}
console.log('OK: 8 zonas difuminadas sin círculos perimetrales, Historia e Iglesia, mano agarrando, 242 nodos, 5 resoluciones y zoom');
