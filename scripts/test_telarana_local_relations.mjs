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
assert.equal(pills.length,3,"Dos vínculos distintos con Vecino B deben tener etiquetas y accesos independientes");
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
// Etiquetas completas sin puntos suspensivos, con saltos de línea y acceso individual.
const fullLabels=[
 "Gobierno franquista en el exilio y antecedentes históricos documentados",
 "Investigación sobre las redes de acogida y protección diplomática",
 "Refugio en territorio extranjero durante la persecución política",
 "Protección oficial de las personas solicitantes de asilo"
];
const complexNodes=[{id:"root",name:"Entidad central"},{id:"n1",name:"Entidad relacionada 1"},{id:"n2",name:"Entidad relacionada 2"},{id:"n3",name:"Entidad relacionada 3"}];
const complexEdges=[
 {id:"full-1",a:"root",b:"n1",type:fullLabels[0],claimStatus:"hecho_verificado_independiente"},
 {id:"full-2",a:"root",b:"n1",type:fullLabels[1],confidence:"hipotesis"},
 {id:"full-3",a:"root",b:"n2",type:fullLabels[2],confidence:"indicio"},
 {id:"full-4",a:"root",b:"n3",type:fullLabels[3],confidence:"documentado"}
];
panel.update(complexNodes,complexEdges,{kind:"node",id:"root"});
const fullPills=params.svg.children.filter(g=>g.attrs.class?.startsWith("local-edge-pill"));
assert.equal(fullPills.length,4,"Cada relación debe tener un botón aunque dos conecten el mismo par");
for(let i=0;i<complexEdges.length;i++){
 const button=fullPills.find(g=>g.children.some(c=>c.tagName==="title"&&c.textContent.includes(fullLabels[i])));
 assert(button,"Relación completa ausente: "+fullLabels[i]);
 const lines=button.children.filter(c=>c.tagName==="text").map(c=>c.textContent);
 assert(lines.length>1,"El texto extenso debe representarse en varias líneas: "+fullLabels[i]);
 assert.equal(lines.join(" "),fullLabels[i],"Ningún fragmento del nombre puede omitirse ni sustituirse por elipsis");
 assert(lines.every(line=>!line.includes("…")),"No recortar palabras de las relaciones");
 assert(button.children.some(c=>c.tagName==="rect"&&Number(c.attrs.width)>=250&&Number(c.attrs.height)>31),"Ajustar el rectángulo a la longitud del texto");
 button.dispatch("click");assert.equal(clickedEdge,complexEdges[i].id,"Cada arista debe ser seleccionable por separado");
}
const labelRects=fullPills.map(g=>g.children.find(c=>c.tagName==="rect"));
const neighborCards=params.svg.children.filter(g=>g.attrs.class==="local-node");
assert.equal(neighborCards.length,3);
const firstCardY=Number(neighborCards[0].children.find(c=>c.tagName==="rect").attrs.y);
assert(labelRects.every(c=>Number(c.attrs.y)+Number(c.attrs.height)<firstCardY),"La etiqueta más larga no debe chocar con las tarjetas");
assert(Number(params.svg.attrs.height)>307,"La fila debe crecer dinámicamente al haber varias relaciones extensas");
const longWord="ContrarrevolucionariamenteSuperdocumentalmenteIdentificada";
assert.equal(service.wrapRelationLabel(longWord,18).join(""),longWord,"Palabra sin espacios: representar todos sus caracteres");

// Caso real del Duque de Lerma: los nombres y subtítulos largos deben verse completos en cada tarjeta.
const lermaCards=[
 {id:"f04-rey",name:"Felipe III",kind:"Persona",subtitle:"Rey de España (1598–1621)"},
 {id:"f04-compraventas",name:"Compraventas de propiedades de Lerma a la Corona (1601)",kind:"Acontecimiento",subtitle:"Documentación contractual en el Archivo General de Simancas"},
 {id:"f04-lerma",name:"Francisco Gómez de Sandoval y Rojas, duque de Lerma",kind:"Persona",subtitle:"Valido de Felipe III (1598–1618) · 1553–1625"},
 {id:"f04-corte",name:"Traslado de la Corte a Valladolid (1601–1606)",kind:"Acontecimiento",subtitle:"Cambio de sede de la Corte durante Felipe III"}
];
const lermaEdges=[
 {id:"f04-compraventas-edge",a:"f04-rey",b:"f04-compraventas",type:"Comprador por la Corona"},
 {id:"f04-lerma-edge",a:"f04-rey",b:"f04-lerma",type:"Valido del monarca"},
 {id:"f04-corte-edge",a:"f04-rey",b:"f04-corte",type:"Traslado de la Corte durante su reinado"}
];
panel.update(lermaCards,lermaEdges,{kind:"node",id:"f04-rey"});
const renderedCards=params.svg.children.filter(g=>g.attrs.class?.startsWith("local-node"));
assert.equal(renderedCards.length,4);
for(const node of lermaCards){
 const card=renderedCards.find(g=>g.children.some(child=>child.tagName==="title"&&child.textContent.includes(node.name)));
 assert(card,"Tarjeta ausente: "+node.name);
 const titleLines=card.children.filter(child=>child.attrs.class==="local-name").map(child=>child.textContent);
 const subtitleLines=card.children.filter(child=>child.attrs.class==="local-sub").map(child=>child.textContent);
 assert.equal(titleLines.join(" "),node.name,"El nombre debe aparecer completo dentro de la tarjeta: "+node.id);
 assert.equal(subtitleLines.join(" "),node.subtitle,"El subtítulo debe aparecer completo dentro de la tarjeta: "+node.id);
 assert(titleLines.every(line=>!line.includes("…"))&&subtitleLines.every(line=>!line.includes("…")),
  "No insertar elipsis en la tarjeta: "+node.id);
 const rect=card.children.find(child=>child.tagName==="rect");
 const lastBaseline=Math.max(...card.children.filter(child=>child.tagName==="text").map(child=>Number(child.attrs.y)));
 assert(lastBaseline<Number(rect.attrs.y)+Number(rect.attrs.height),
  "Todo el texto debe quedar dentro del borde inferior: "+node.id);
 if(node.id!=="f04-rey"){
  assert(subtitleLines.length>1,"Subtítulo extenso debe permitir varias líneas: "+node.id);
 }
}
const lermaNeighborCards=renderedCards.filter(card=>card.attrs.class==="local-node");
const firstRowY=Math.min(...lermaNeighborCards.map(card=>Number(card.children.find(c=>c.tagName==="rect").attrs.y)));
assert(lermaNeighborCards.every(card=>Number(card.children.find(c=>c.tagName==="rect").attrs.y)===firstRowY),
 "Las tres tarjetas vecinas deben conservar la misma alineación vertical");
const tallestCard=Math.max(...lermaNeighborCards.map(card=>Number(card.children.find(c=>c.tagName==="rect").attrs.height)));
assert(tallestCard>90,"La fila debe aumentar su altura para mostrar contenido completo");
const edgePillsForLerma=params.svg.children.filter(g=>g.attrs.class?.startsWith("local-edge-pill"));
const cardsStartY=Number(lermaNeighborCards[0].children.find(c=>c.tagName==="rect").attrs.y);
assert(edgePillsForLerma.every(g=>{
 const rect=g.children.find(c=>c.tagName==="rect");
 return Number(rect.attrs.y)+Number(rect.attrs.height)<cardsStartY;
}),"Las etiquetas de relaciones no deben solaparse con tarjetas extendidas");
const extraNode={id:"f04-otro",name:"Otro vecino",kind:"Persona",subtitle:"Descripción breve"};
const extraEdges=[...lermaEdges,{id:"f04-otro-edge",a:"f04-rey",b:"f04-otro",type:"Relación adicional"}];
panel.update([...lermaCards,extraNode],extraEdges,{kind:"node",id:"f04-rey"});
const allCardRects=params.svg.children.filter(g=>g.attrs.class?.startsWith("local-node")&&g.attrs.class!=="local-node is-center")
 .map(g=>g.children.find(c=>c.tagName==="rect"));
const rowYs=[...new Set(allCardRects.map(rect=>Number(rect.attrs.y)))].sort((a,b)=>a-b);
assert.equal(rowYs.length,2,"Cuatro vecinos deben generar dos filas");
const row1Bottom=Math.max(...allCardRects.filter(rect=>Number(rect.attrs.y)===rowYs[0])
 .map(rect=>Number(rect.attrs.y)+Number(rect.attrs.height)));
assert(rowYs[1]>row1Bottom,"La segunda fila no puede montarse sobre tarjetas de altura variable");
const veryLongName="ExtraordinariamenteDocumentalmenteLarguísimoSinEspacios";
panel.update([{id:"longcenter",name:"Centro"},{id:"long",name:veryLongName,subtitle:"Nombre sin espacios"}],
 [{id:"longedge",a:"longcenter",b:"long",type:"Vínculo"}],{kind:"node",id:"longcenter"});
const unbroken=params.svg.children.find(g=>g.attrs.class==="local-node");
assert(unbroken);
const fragments=unbroken.children.filter(c=>c.attrs.class==="local-name").map(c=>c.textContent);
assert.equal(fragments.join(""),veryLongName,"Tampoco cortar palabras largas sin espacios");
assert(fragments.every(line=>!line.includes("…")),"No sustituir el final de una palabra larga por elipsis");

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
assert(html.includes("local-relations-2d.js?v=")&&html.includes("localDiagram.update(shownData.nodes,shownData.edges,selection)"),"El esquema debe recibir solamente los nodos y vínculos de las fuentes visibles");
assert(html.includes("function syncFullscreenLocal()")&&html.includes("syncFullscreenLocal();"));
assert(html.includes("graphPanel.appendChild(localPanel)")&&html.includes("localHome.insertBefore(localPanel,localNext)"));
assert(html.includes("var inspector=$(\"inspector\")")&&html.includes("syncFullscreenInspector();"),"Se conserva la ficha original");
assert(html.indexOf('class="graph-stack"')<html.indexOf('id="local-relations"')&&html.indexOf('id="local-relations"')<html.indexOf('id="inspector"'),"El esquema debe aparecer debajo del orbe y antes del inspector en el DOM");
assert(html.includes("Esquema 2D · un salto desde la selección"));
console.log("OK: relaciones completas multilínea sin elipsis, plurivínculos seleccionables, filas variables, 12 vecinos por página, fullscreen y ficha derecha.");
