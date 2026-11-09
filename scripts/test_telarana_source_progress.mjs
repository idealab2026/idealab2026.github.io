/* Regresión: las 33 fuentes originales más las nuevas, sin confundir pendientes y completas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const script=fs.readFileSync("la-telarana/source-progress.js","utf8");
const page=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(feed.total,34);
assert.equal(feed.originalCatalogTotal,33);
assert.equal(feed.pendingSources[0].videoId,"j_5Tj0kIj2c");
assert.equal(feed.counts.reviewedPublished,1);
assert.equal(feed.counts.inReview,1);
assert(page.includes('id="source-review-rows"'),"Tabla de progreso ausente");
assert(page.includes('id="source-review-fill"'),"Barra de progreso ausente");
assert(page.includes('source-progress.js?v='),"Script de progreso no conectado");
assert(page.includes('id="source-review-additional"'),"Falta apartado de fuentes complementarias");
class Element{
 constructor(tag){
  this.tag=tag;this.childNodes=[];this.className="";this.textContent="";
  this.style={};this.attributes={};this.classList={add:(s)=>{this.className+=" "+s}};
 }
 append(...items){for(const item of items){if(item.tag==="fragment")this.childNodes.push(...item.childNodes);else this.childNodes.push(item)}}
 replaceChildren(...items){this.childNodes=[];this.append(...items)}
 setAttribute(k,v){this.attributes[k]=String(v)}
}
async function render(record){
 const elements=new Map(["source-review-rows","source-review-summary","source-review-fill","source-review-additional"].map(id=>[id,new Element("div")]));
 const doc={
  getElementById:(id)=>elements.get(id),
  createElement:(tag)=>new Element(tag),
  createDocumentFragment:()=>new Element("fragment")
 };
 vm.runInNewContext(script,{
  document:doc,
  URL,
  fetch:async()=>({ok:true,json:async()=>record})
 });
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 return Object.fromEntries(elements);
}
const current=await render(feed);
const rows=current["source-review-rows"].childNodes;
assert.equal(rows.length,34,"Debe mostrar las 33 fuentes originales y la nueva");
assert.equal(rows[33].childNodes[2].childNodes[0].textContent,"○ Pendiente");
assert.equal(rows[33].childNodes[1].childNodes[0].href,"https://www.youtube.com/watch?v=j_5Tj0kIj2c&t=1535s");
assert.equal(rows[0].childNodes[2].childNodes[0].textContent,"✓ Completada");
assert.equal(rows[1].childNodes[2].childNodes[0].textContent,"◔ En revisión");
assert.equal(rows[2].childNodes[2].childNodes[0].textContent,"○ Pendiente");
assert.equal(current["source-review-fill"].style.width,"2.94%");
assert.equal(current["source-review-fill"].attributes["aria-valuenow"],"1");
assert.match(current["source-review-summary"].textContent,/1\/34 completas · 1 en revisión · 32 pendientes/);
assert.equal(current["source-review-additional"].childNodes.length,2,"Frattini debe seguir separado del inventario");
const falsified=structuredClone(feed);
falsified.reviewed[0].status="en_revision";
const rejected=await render(falsified);
assert.equal(rejected["source-review-rows"].childNodes[0].childNodes[2].childNodes[0].textContent,"◔ En revisión","Nunca marcar en verde si se retira el cierre documental");
assert.equal(rejected["source-review-fill"].style.width,"0.00%");
console.log("OK: 34 entradas (33 originales + 1), solo check verde con revisión cerrada, Frattini aparte");
