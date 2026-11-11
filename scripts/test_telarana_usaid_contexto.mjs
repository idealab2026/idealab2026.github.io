/** USAID: separar relaciones institucionales acreditadas de menciones de entrevistas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
vm.runInNewContext(read("la-telarana/usaid-relaciones-documentadas.js"),ctx);
const doc=ctx.window.IDEA_TELARANA_USAID_DOCUMENTED;
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(doc?.metadata?.id==="idealab-usaid-contexto-documentado");
assert(html.includes('src="./usaid-relaciones-documentadas.js?v='),"El HTML no carga el expediente de USAID");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_USAID_DOCUMENTED)'),"La carga no integra los vínculos de USAID");
assert(workflow.includes("cp la-telarana/usaid-relaciones-documentadas.js dist/la-telarana/usaid-relaciones-documentadas.js"),"Falta publicar el expediente");
const ids=new Set(doc.nodes.map(n=>n.id));
assert.equal(ids.size,doc.nodes.length,"IDs de entidades duplicados");
assert.equal(doc.edges.length,11,"Se perdió una relación documentada");
const edgeIds=new Set(doc.edges.map(e=>e.id));
assert.equal(edgeIds.size,doc.edges.length,"IDs de relaciones duplicados");
for(const e of doc.edges){
 assert(e.a==="f21-usaid"&&ids.has(e.b),"Arista sin nodo o no conectada a USAID: "+e.id);
 assert(e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente","No es una relación contrastada: "+e.id);
 assert(/^https:\/\//.test(e.source),"No consta documento de origen: "+e.id);
 assert(e.note.length>95&&e.type.length>10,"Relación sin detalle comprobable: "+e.id);
}
for(const name of ["Open Society Foundations","Palantir Technologies","Peter Thiel","George Soros"]){
 assert(!doc.edges.some(e=>doc.nodes.find(n=>n.id===e.b)?.name===name),
  "Se ha inferido un vínculo sin evidencia documental individual: "+name);
}
for(const id of ["f21-usaid","f21-worldbank","on-marco-rubio","on-donald-trump"]){
 assert(ids.has(id),"Falta reutilización del nodo existente: "+id);
}
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
const events=timeline.items.filter(x=>x.investigation?.relatedTelarana?.includes("f21-usaid"));
assert(events.length>=6,"USAID carece de hitos institucionales posteriores");
for(const e of events){
 assert(e.investigation.status==="hecho_documentado"&&/^https:\/\//.test(e.investigation.confirmedBy?.url||""),
 "Acontecimiento sin evidencia oficial: "+e.id);
}
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(progress.timeline.committedVerifiedEvents,timeline.items.length,"Descuadre del seguimiento histórico");
for(const id of ["study-f21-usaid-rubio-2025","study-f21-usaid-notificacion-2025","study-f21-usaid-transferencia-2025","study-f21-usaid-evaluacion-2026"]){
 assert(events.some(e=>e.id===id),"Falta un hito USAID: "+id);
}
console.log("OK USAID: 11 relaciones institucionales, 6 hitos y ninguna inferencia directa desde pódcasts.");
