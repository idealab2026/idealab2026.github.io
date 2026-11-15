/* Regresión: subgrafo 2D de primer grado y navegación accesible. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync("la-telarana/index.html","utf8");
const script=fs.readFileSync("la-telarana/local-relations-2d.js","utf8");
const window={};
class FakeElement{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.classNames=new Set();this.hidden=false;this.textContent="";this.checked=false;this.disabled=false;this.classList={
  add:(x)=>this.classNames.add(x),
  remove:(x)=>this.classNames.delete(x),
  contains:(x)=>this.classNames.has(x),
  toggle:(x)=>{if(this.classNames.has(x)){this.classNames.delete(x);return false}this.classNames.add(x);return true}
 };}
 setAttribute(key,val){this.attrs[key]=String(val)}
 appendChild(value){this.children.push(value);return value}
 replaceChildren(...items){this.children=items}
 addEventListener(name,fn){this.listeners[name]=fn}
 dispatch(name,arg={}){assert(this.listeners[name],"No listener "+name);this.listeners[name].call(this,arg)}
}
const document={createElementNS:(ns,tag)=>{assert.equal(ns,"http://www.w3.org/2000/svg");return new FakeElement(tag)}};
vm.runInNewContext(script,{window,document,Map,Set,Array,String,Math}, {timeout:10000});
const service=window.IdeaLabLocalRelations;
assert(service?.buildNeighborhood&&service?.create&&service.PAGE_SIZE===12);
const nodes=[{id:"a",name:"Centro",kind:"Persona"},{id:"b",name:"Vecino B",kind:"Persona"},{id:"c",name:"Segundo salto",kind:"Organización"},{id:"d",name:"Vecino D",kind:"Organización"},{id:"f",name:"Podcast 1",kind:"Fuente"}];
const edges=[
 {id:"ab1",a:"a",b:"b",type:"Trabajo",confidence:"documentado",claimStatus:"hecho_verificado_independiente"},
 {id:"ab2",a:"a",b:"b",type:"Declaración",confidence:"hipotesis"},
 {id:"bc",a:"b",b:"c",type:"Segundo salto",confidence:"documentado"},
 {id:"ad",a:"d",b:"a",type:"Investigación",confidence:"indicio"},
 {id:"af",a:"a",b:"f",type:"Mención en fuente"},
 {id:"ghost",a:"a",b:"missing",type:"Arista huérfana"}
];
const mention=e=>e.type==="Mención en fuente";
const close=service.buildNeighborhood(nodes,edges,"a",false,mention);
assert.equal(close.totalEdges,3);
assert.equal(close.excludedMentions,1);
assert.equal(close.neighbors.length,2);
assert(close.neighbors.some(n=>n.node.id==="b"&&n.edges.length===2));
assert(!close.neighbors.some(n=>n.node.id==="c"),"Segundo grado incluido indebidamente");
const withMentions=service.buildNeighborhood(nodes,edges,"a",true,mention);
assert.equal(withMentions.neighbors.length,3);
assert.equal(withMentions.totalEdges,4);
assert.equal(service.relationTier(edges[0]),"verified");
assert.equal(service.relationTier(edges[1]),"hypothesis");
assert.equal(service.relationTier(edges[3]),"indication");
assert.equal(service.groupTier([edges[0],edges[1]]),"mixed");
const original=JSON.stringify({nodes,edges});
const $=()=>new FakeElement();
let clickedNode=null,clickedEdge=null;
const params={panel:$(),svg:$(),heading:$(),summary:$(),pageLabel:$(),prev:$(),next:$(),mentions:$(),minimize:$(),isSourceMention:mention,
 onSelectNode:id=>{clickedNode=id},onSelectEdge:id=>{clickedEdge=id}};
const panel=service.create(params);
panel.update(nodes,edges,{kind:"node",id:"a"});
assert.equal(params.panel.hidden,false);
assert.equal(params.heading.textContent,"Centro");
assert(params.summary.textContent.includes("2 vecinos directos"));
assert.equal(params.next.disabled,true);
assert.equal(params.svg.attrs["aria-label"].includes("2 entidades vecinas"),true);
const cards=params.svg.children.filter(x=>x.attrs.class?.startsWith("local-node"));
assert.equal(cards.length,3,"Centro más dos vecinos directos");
const neighbor=cards.find(g=>g.children.some(c=>c.tagName==="title"&&c.textContent.startsWith("Vecino B")));
neighbor.dispatch("click");
assert.equal(clickedNode,"b","Click en nodo vecino navega al controlador");
const pills=params.svg.children.filter(x=>x.attrs.class?.startsWith("local-edge-pill"));
assert.equal(pills.length,2);
pills.find(p=>p.children.some(c=>c.tagName==="title"&&c.textContent.includes("Trabajo"))).dispatch("click");
assert(clickedEdge==="ab1","Click en conexión abre la ficha de la relación");
panel.update(nodes,edges,{kind:"edge",id:"ab1"});
assert.equal(params.heading.textContent,"Centro","Seleccionar arista conserva el centro cuando es adyacente");
params.mentions.checked=true;params.mentions.dispatch("change");
assert(params.summary.textContent.includes("3 vecinos directos"),"Checkbox activa las menciones explícitamente");
params.minimize.dispatch("click");
assert(params.panel.classList.contains("is-collapsed")&&params.minimize.attrs["aria-expanded"]==="false","Contraer no borra selección");
panel.update([],[],null);
assert.equal(params.panel.hidden,true,"Sin selección no debe quedar esquema obsoleto");
// Caso real observado: Rubén Gisbert tiene únicamente menciones de fuente; no debe aparecer solo.
const mentionOnlyNodes=[
 {id:"gisbert",name:"Rubén Gisbert",kind:"Persona",subtitle:"Comunicador y abogado español"},
 {id:"source1",name:"Entrevista F18",kind:"Fuente"},
 {id:"source2",name:"Entrevista F16",kind:"Fuente"},
 {id:"source3",name:"Documento F18",kind:"Fuente"}
];
const mentionOnlyEdges=[1,2,3].map((n)=>({id:"mention"+n,a:"gisbert",b:"source"+n,type:"Mención en fuente"}));
const mentionEvidence=(edge)=>edge.type==="Mención en fuente";
const emptySubstantive=service.buildNeighborhood(mentionOnlyNodes,mentionOnlyEdges,"gisbert",false,mentionEvidence);
assert.equal(emptySubstantive.totalEdges,0,"El estado probatorio sigue sin incluir enlaces de mera mención");
const autoOpts={...params,mentions:new FakeElement(),minimize:new FakeElement(),panel:new FakeElement(),svg:new FakeElement(),heading:new FakeElement(),summary:new FakeElement(),pageLabel:new FakeElement(),prev:new FakeElement(),next:new FakeElement(),isSourceMention:mentionEvidence};
const autoPanel=service.create(autoOpts);
autoPanel.update(mentionOnlyNodes,mentionOnlyEdges,{kind:"node",id:"gisbert"});
assert.equal(autoOpts.mentions.checked,true,"La vista debe activar menciones automáticamente si no hay vínculos sustantivos");
assert.equal(autoOpts.svg.children.filter(c=>c.attrs.class?.startsWith("local-node")).length,4,"Centro + tres fuentes deben renderizarse");
assert(autoOpts.summary.textContent.includes("3 menciones en fuentes")&&autoOpts.summary.textContent.includes("sin vínculos sustantivos"),"No confundir mención y relación sustantiva");
assert.equal(autoOpts.svg.attrs.height,"307","El SVG debe ajustar su tamaño intrínseco al viewBox, sin huecos verticales");
assert(autoOpts.svg.children.some(c=>c.attrs.class?.includes("local-edge-pill mention")),"Las aristas de mera mención deben identificarse");
autoOpts.mentions.checked=false;autoOpts.mentions.dispatch("change");
assert(autoOpts.summary.textContent.includes("activa «Incluir menciones"),"Al desactivar las menciones, indicar cómo reactivar el esquema");
assert.equal(autoOpts.svg.children.filter(c=>c.attrs.class?.startsWith("local-node")).length,1);
autoPanel.update(nodes,edges,{kind:"node",id:"a"});
assert.equal(autoOpts.mentions.checked,false,"Al pasar a otro nodo con relaciones sustantivas vuelve el filtro normal");
assert.equal(autoOpts.svg.children.filter(c=>c.attrs.class?.startsWith("local-node")).length,3,"Las relaciones sustantivas siguen visibles");
// La anchura y altura del mapa responden a páginas con más filas; no quedan vacíos gigantes.
const many=[{id:"a",name:"Centro"}],manyEdges=[];
for(let i=0;i<29;i++){many.push({id:"node-"+i,name:"Vecino "+String(i).padStart(2,"0")});manyEdges.push({id:"e-"+i,a:"a",b:"node-"+i,type:"Vínculo"})}
params.mentions.checked=false;params.mentions.dispatch("change");
panel.update(many,manyEdges,{kind:"node",id:"a"});
assert.equal(params.svg.children.filter(x=>x.attrs.class?.startsWith("local-node")).length,13,"Página limitada a 12 vecinos + centro");
assert.equal(params.next.disabled,false);
params.next.dispatch("click");
assert(params.pageLabel.textContent.includes("13–24"),"Paginación no pierde la segunda docena");
params.next.dispatch("click");
assert(params.pageLabel.textContent.includes("25–29"),"Se debe poder visitar todos los vecinos");
assert.equal(params.next.disabled,true);
params.prev.dispatch("click");
assert.equal(params.next.disabled,false);
assert.equal(JSON.stringify({nodes,edges}),original,"Vista de solo lectura: no debe mutar el grafo");
assert(html.includes('id="local-relations"')&&html.includes('id="local-svg"')&&html.includes('id="local-mentions"'));
assert(html.includes("local-relations-2d.js?v=")&&html.includes("localDiagram.update(data.nodes,data.edges,selection)"));
assert(html.includes("function syncFullscreenLocal()")&&html.includes("syncFullscreenLocal();"));
assert(html.includes("graphPanel.appendChild(localPanel)")&&html.includes("localHome.insertBefore(localPanel,localNext)"));
assert(html.includes("var inspector=$(\"inspector\")")&&html.includes("syncFullscreenInspector();"),"Se conserva la ficha original");
assert(html.indexOf('class="graph-stack"')<html.indexOf('id="local-relations"')&&html.indexOf('id="local-relations"')<html.indexOf('id="inspector"'),"El esquema debe aparecer debajo del orbe y antes del inspector en el DOM");
assert(html.includes("Esquema 2D · un salto desde la selección"));
console.log("OK: esquema 2D de primer grado, 12 vecinos por página, plurivínculos, mención opcional, navegación de aristas, fullscreen y ficha derecha.");
