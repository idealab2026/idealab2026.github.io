/* Fuente múltiple: registros de procedencia, UI, subgrafo y deselect en La Telaraña. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync("la-telarana/index.html","utf8");
const catalogCode=fs.readFileSync("la-telarana/source-catalog-public.js","utf8");
const filterCode=fs.readFileSync("la-telarana/source-filter.js","utf8");
const context={window:{},Set,Map,Array,Number,String,Math,document:null};
vm.runInNewContext(catalogCode,context,{timeout:3000});
vm.runInNewContext(filterCode,context,{timeout:5000});
const catalog=context.window.IDEA_TELARANA_PUBLIC_SOURCES;
const mod=context.window.IdeaLabSourceFilters;
assert.equal(catalog.length,74,"Catálogo público sin las 74 fuentes esperadas");
assert.equal(new Set(catalog.map(x=>x.order)).size,74);
assert(catalog.every(x=>typeof x.title==="string"&&!/docs.google.com|drive.google.com|transcripci[oó]n privada/i.test(x.title)));
assert.equal(mod.sourceForModule({key:"IDEA_TELARANA_PODCAST_150"}),"f69");
assert.equal(mod.sourceForModule({key:"IDEA_TELARANA_F18_REVIEW",label:"Fuente 18"}),"f18");
assert.equal(mod.sourceForModule({key:"IDEA_TELARANA_SOURCE03_EDITORIAL",label:"Fuente 03"}),"f3");
assert.equal(mod.sourceForModule({key:"IDEA_TELARANA_EPISODE_CEUTA_2026"}),"f2");
assert.equal(mod.sourceForModule({key:"IDEA_TELARANA_F49_CANDIDATE"}),"extra:f49-candidate");
const track=mod.createTracker(catalog);
const nodes0=[
 {id:"a",name:"Persona A"},{id:"b",name:"Persona B"},{id:"ref",name:"Archivo OneNote"}
],edges0=[{id:"base",a:"a",b:"ref",type:"Archivo"}];
track.register("archive:onenote","Base OneNote",{nodes:nodes0,edges:edges0},[],[],nodes0,edges0);
const nodes1=[...nodes0,{id:"c",name:"Persona C"}];
const edges1=[...edges0,{id:"e18",a:"a",b:"c",type:"Entrevista"}];
const raw18={nodes:[{id:"a18",name:"Persona A"},{id:"c",name:"Persona C"}],edges:[{id:"e18",a:"a18",b:"c",type:"Entrevista"}]};
track.register("f18","Fuente 18",raw18,nodes0.map(n=>n.id),edges0.map(e=>e.id),nodes1,edges1);
const nodes2=[...nodes1,{id:"d",name:"Organización D"}];
const edges2=[...edges1,{id:"e21",a:"a",b:"d",type:"Documento"}];
const raw21={nodes:[{id:"a21",name:"Persona A"},{id:"d",name:"Organización D"}],edges:[{id:"e21",a:"a21",b:"d",type:"Documento"}]};
track.register("f21","Fuente 21",raw21,nodes1.map(n=>n.id),edges1.map(e=>e.id),nodes2,edges2);
const all=track.filter(nodes2,edges2,null);
assert.equal(all.nodes.length,5);assert.equal(all.edges.length,3);
const only18=track.filter(nodes2,edges2,new Set(["f18"]));
assert.deepEqual([...only18.nodes.map(x=>x.id)].sort(),["a","c"]);
assert.deepEqual(only18.edges.map(x=>x.id),["e18"]);
const only21=track.filter(nodes2,edges2,new Set(["f21"]));
assert.deepEqual([...only21.nodes.map(x=>x.id)].sort(),["a","d"]);
assert.deepEqual(only21.edges.map(x=>x.id),["e21"]);
const both=track.filter(nodes2,edges2,new Set(["f18","f21"]));
assert.deepEqual([...both.nodes.map(x=>x.id)].sort(),["a","c","d"]);
assert.deepEqual(both.edges.map(x=>x.id),["e18","e21"]);
assert.equal(track.filter(nodes2,edges2,new Set()).nodes.length,0,"Deseleccionar todas oculta todo");
assert.equal(nodes2.length,5,"El filtrado no debe mutar el grafo canónico");
assert.equal(edges2.length,3);
const f18=track.entries().find(x=>x.id==="f18"),f22=track.entries().find(x=>x.id==="f22");
assert(f18.available&&f18.nodes===2&&f18.edges===1,"Fuente con datos debe ser seleccionable");
assert(!f22.available,"Fuente todavía sin módulo no puede mostrar entidades ficticias");
class Elem{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.value="";this.checked=false;this.disabled=false;this.hidden=false;this.attrs={};this.events={};this.className="";this.textContent="";}
 setAttribute(k,v){this.attrs[k]=String(v)}
 addEventListener(k,fn){this.events[k]=fn}
 contains(e){return e===this||this.children.includes(e)}
 appendChild(e){this.children.push(e);return e}
 replaceChildren(...e){this.children=e}
 append(...e){this.children.push(...e)}
 focus(){this.focused=true}
 event(k,v={}){assert(this.events[k],"Handler no encontrado: "+k);this.events[k].call(this,v)}
}
const document={events:{},createElement:t=>new Elem(t),addEventListener(k,fn){this.events[k]=fn}};
context.document=document;
const opts={engine:track,button:new Elem("button"),panel:new Elem("div"),search:new Elem("input"),list:new Elem(),summary:new Elem(),allButton:new Elem("button"),noneButton:new Elem("button"),onChange:()=>{changes++}};
let changes=0;
opts.panel.hidden=true;
const ui=mod.mount(opts);
assert.equal(ui.keys(),null,"Inicialmente todas las fuentes");
const find18=()=>opts.list.children.find(x=>x.children?.some(y=>y.value==="f18"));
const f18Row=find18();
assert(f18Row);
const checkbox=f18Row.children[0];
assert(checkbox.checked&&!checkbox.disabled);
const f22Row=opts.list.children.find(x=>x.children?.some(y=>y.value==="f22"));
assert(f22Row.children[0].disabled,"Deshabilitar entradas sin grafo");
checkbox.checked=false;checkbox.event("change");
assert(ui.isFiltering()&&!ui.keys().has("f18"));
assert.equal(changes,1);
opts.noneButton.event("click");
assert.equal(ui.keys().size,0);
opts.allButton.event("click");
assert.equal(ui.keys(),null);
opts.button.event("click");
assert.equal(opts.panel.hidden,false);assert.equal(opts.button.attrs["aria-expanded"],"true");
document.events.keydown({key:"Escape",stopPropagation(){}});
assert.equal(opts.panel.hidden,true);
opts.search.value="fuente 21";opts.search.event("input");
assert(opts.list.children.some(x=>x.children?.[0]?.value==="f21")===false,"Buscar por número F21 (no por prefijo fuente)");
opts.search.value="f21";opts.search.event("input");
assert.equal(opts.list.children.length,1,"Buscar por ID de fuente");
assert.equal(opts.list.children[0].children[0].value,"f21");
assert(html.includes('id="source-filter-toggle"')&&html.includes('id="source-filter-panel"'));
assert(html.includes('id="inspector-drawer-close"')&&html.includes('aria-label="Deseleccionar entidad o relación"'));
assert(html.includes('$("inspector-drawer-close").hidden=!selection'));
assert(html.includes('$("inspector-drawer-close").addEventListener("click",clearCurrentSelection)'));
assert(html.includes('sourceTracker.register(sourceKey,label,rawDocument'));
assert(html.includes('shownData=sourceTracker&&sourceControls?sourceTracker.filter('));
assert(html.includes('graph3d.setData(shownData.nodes,shownData.edges)'));
assert(html.includes('localDiagram.update(shownData.nodes,shownData.edges,selection)'));
assert(html.includes('engine.compute(shownData.nodes,shownData.edges'));
assert(html.includes("sourceControls=window.IdeaLabSourceFilters.mount"));
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.includes("var DEMO="));
assert.equal(inline.length,1,"Script inline principal único");
new vm.Script(inline[0],{filename:"la-telarana/index.html",timeout:5000});
console.log("OK: 74 fuentes, selección múltiple/ninguna/todas, provenance de nodos fusionados, no relaciones ajenas, cierre de ficha y sintaxis JS.");
