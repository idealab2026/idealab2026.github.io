/* Regresión: Fotografías, buscador, Rankings y Fuentes comparten una sola barra, sin accesos recientes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync("la-telarana/index.html","utf8");
const navStart=html.indexOf('<div class="top-controls"');
const navEnd=html.indexOf('</div>\n<div id="search-results"',navStart);
assert(navStart>0&&navEnd>navStart,"Navegación principal agrupada antes de los resultados");
const nav=html.slice(navStart,navEnd+6);
for(const token of [
 'class="toolbar"','id="mode"','id="search"',
 'id="rankings-toggle"','id="sources-directory-toggle"'
])assert(nav.includes(token),"Falta "+token+" dentro de la fila única");
const position=[
 nav.indexOf('class="toolbar"'),nav.indexOf('id="rankings-toggle"'),nav.indexOf('id="sources-directory-toggle"')
];
assert(position.every((n,i)=>n>0&&(i===0||n>position[i-1])),"El orden debe ser fotografías/buscador, rankings y fuentes");
assert(!nav.includes('<details')&&!nav.includes('<br'),"Los paneles desplegados no van dentro de la franja");
assert(!html.includes('class="recent-links"')&&!html.includes("data-recent-id")&&!html.includes("Incorporaciones recientes"),"Los accesos recientes deben eliminarse del DOM y del código");
assert(nav.includes('role="group"')&&nav.includes('aria-controls="rankings-panel"')&&nav.includes('aria-controls="sources-directory"'));
for(const id of ["rankings-panel","sources-directory"]){
 assert(html.indexOf('id="'+id+'"')>navEnd&&html.indexOf('id="'+id+'"')<html.indexOf('id="graph-panel"'),"Los desplegables siguen debajo de la franja, antes del grafo");
}
const css=html.slice(html.indexOf("<style>"),html.indexOf("</style>"));
for(const x of [
 '.top-controls{display:flex;align-items:center',
 'flex-wrap:nowrap','overflow-x:auto',
 '.top-controls .toolbar{display:flex','flex-wrap:nowrap',
 '.top-controls-tab','aria-expanded="true"',
 '#rankings-panel:not([open]),#sources-directory:not([open]){display:none}',
 '#rankings-panel>summary,#sources-directory>summary{display:none!important}',
 '@media(max-width:800px)'
])assert(css.includes(x),"Falta regla responsive "+x);
const script=html.match(/<script>([\s\S]*?)<\/script><\/body><\/html>/)?.[1];
assert(script&&script.includes("var DEMO="));
new vm.Script(script,{filename:"la-telarana/index.html"});
const controls={};
class Element{
 constructor(){this.open=false;this.attributes={};this.events={};this.classes=new Set();
 this.classList={toggle:(name,state)=>state?this.classes.add(name):this.classes.delete(name)}}
 setAttribute(k,v){this.attributes[k]=String(v)}
 addEventListener(k,fn){this.events[k]=fn}
 click(){assert(this.events.click,"Falta listener");this.events.click()}
}
["rankings-panel","sources-directory","rankings-toggle","sources-directory-toggle"].forEach(k=>controls[k]=new Element());
const start=script.indexOf("function syncTopControls(){"),end=script.indexOf("load();fitGraph();",start);
assert(start>=0&&end>start,"El control de apertura debe registrarse antes de cargar el grafo");
vm.runInNewContext(script.slice(start,end),{$:k=>controls[k],syncProductHeader:()=>{}}, {timeout:3000});
const rankings=controls["rankings-panel"],sources=controls["sources-directory"],
 rButton=controls["rankings-toggle"],sButton=controls["sources-directory-toggle"];
assert.equal(rButton.attributes["aria-expanded"],"false");
assert.equal(sButton.attributes["aria-expanded"],"false");
rButton.click();
assert(rankings.open&&!sources.open,"Rankings abierto sin abrir Fuentes");
assert.equal(rButton.attributes["aria-expanded"],"true");
sButton.click();
assert(sources.open&&!rankings.open,"Fuentes sustituye Rankings, sin apilar dos paneles");
assert.equal(sButton.attributes["aria-expanded"],"true");
assert.equal(rButton.attributes["aria-expanded"],"false");
sButton.click();
assert(!sources.open&&!rankings.open,"El botón vuelve a cerrar la sección");
console.log("OK: fotografías, buscador, Rankings y Fuentes en una línea, sin enlaces recientes; paneles completos y excluyentes.");
