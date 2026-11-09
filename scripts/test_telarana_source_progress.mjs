/* Regresión: la tabla presenta 33 fuentes y nunca da por completa una revisión parcial. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const script=fs.readFileSync("la-telarana/source-progress.js","utf8");
const page=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(feed.total,33);
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
assert.equal(rows.length,33,"Debe mostrar exactamente los 33 números originales");
assert.equal(rows[0].childNodes[2].childNodes[0].textContent,"✓ Completada");
assert.equal(rows[1].childNodes[2].childNodes[0].textContent,"◔ En revisión");
assert.equal(rows[2].childNodes[2].childNodes[0].textContent,"○ Pendiente");
assert.equal(current["source-review-fill"].style.width,"3.03%");
assert.equal(current["source-review-fill"].attributes["aria-valuenow"],"1");
assert.match(current["source-review-summary"].textContent,/1\/33 completas · 1 en revisión · 31 pendientes/);
assert.equal(current["source-review-additional"].childNodes.length,2,"Frattini debe seguir separado del inventario");
const falsified=structuredClone(feed);
falsified.reviewed[0].status="en_revision";
const rejected=await render(falsified);
assert.equal(rejected["source-review-rows"].childNodes[0].childNodes[2].childNodes[0].textContent,"◔ En revisión","Nunca marcar en verde si se retira el cierre documental");
assert.equal(rejected["source-review-fill"].style.width,"0.00%");
console.log("OK: tabla de 33 fuentes, check único por revisión publicada, Frattini aparte y contador auditable");
