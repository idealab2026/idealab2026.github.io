/* Regresión sin dependencias de la vista 3D: grupos, zoom y regiones. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync('la-telarana/graph-3d.js','utf8');
const globals={
 window:{},requestAnimationFrame(fn){fn()},ResizeObserver:class{observe(){}},
 devicePixelRatio:1,Image:class{}
};
vm.runInNewContext(js,globals);
const Graph=globals.window.IdeaLabGraph3D;
assert(Graph&&Graph.topics.length===7);
const counts={inteligencia:44,oriente:25,espana:62,historia:28,tecnologia:9,finanzas:26,global:28};
const nodes=[];
for(const [topic,n] of Object.entries(counts)){
 for(let i=0;i<n;i++)nodes.push({id:topic+'-'+i,name:topic+' '+i,topic3d:topic,kind:'Persona'});
}
assert.equal(nodes.length,222);

for(const [width,height] of [[1600,900],[1280,720],[1000,660],[820,600],[600,540]]){
 let circles=[],regions=[],current=null,events={};
 const ctx=new Proxy({},{
  get(_t,key){
   if(key==='createRadialGradient')return()=>({addColorStop(){}});
   if(key==='beginPath')return()=>{current=null};
   if(key==='arc')return(x,y,r)=>{current={x,y,r}};
   if(key==='stroke')return()=>{if(current){circles.push(current);current=null}};
   if(key==='roundRect')return(x,y,w,h)=>{regions.push({x,y,w,h})};
   if(key==='measureText')return text=>({width:text.length*9});
   if(key==='setTransform')return()=>{circles=[];regions=[]};
   return()=>{};
  },
  set(target,key,value){target[key]=value;return true}
 });
 const canvas={
  getContext(){return ctx},
  getBoundingClientRect(){return{left:0,top:0,width,height}},
  addEventListener(name,fn){events[name]=fn},
  setPointerCapture(){},closest(){return null}
 };
 const app=Graph.create({canvas,tooltip:{hidden:true},getPhoto(){return null}});
 app.setData(nodes,[]);
 const fitted=app.fit();
 assert(Number.isFinite(fitted.zoom)&&fitted.zoom>0);
 assert.equal(regions.length,7,'one region per theme');
 assert.equal(circles.length,nodes.length,'one outline per node');
 for(const c of circles){
  assert(regions.some(r=>c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h),
   'all nodes must lie in a real projected region');
 }
 for(let i=0;i<circles.length;i++){
  for(let j=i+1;j<circles.length;j++){
   const a=circles[i],b=circles[j];
   assert(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-.02,
    'overlapping nodes at '+width+'x'+height);
  }
 }
 const prev=circles.map(c=>({...c}));
 let prevented=false;
 events.wheel({clientX:width/2,clientY:height/2,ctrlKey:true,metaKey:false,
  deltaMode:0,deltaY:-50,deltaX:0,preventDefault(){prevented=true}});
 assert(prevented,'pinch must prevent browser page zoom inside graph');
 assert(circles.some((c,i)=>Math.hypot(c.x-prev[i].x,c.y-prev[i].y)>.1),
  'pinch must move nodes by changing the zoom');
 events.gesturestart({scale:1,preventDefault(){}});
 events.gesturechange({scale:1.1,clientX:width/2,clientY:height/2,preventDefault(){}});
 events.gestureend({preventDefault(){}});
 app.setTheme('espana');assert(Number.isFinite(app.fit().zoom));
}
console.log('OK: 222 nodos, 7 regiones, 5 ventanas, 0 solapes, zoom trackpad Chrome/Safari');
