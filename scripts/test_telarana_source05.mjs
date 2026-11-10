/* La fuente 05 es un portal partidista: no imputar delitos por agregación. */
import assert from "node:assert/strict";
import fs from "node:fs";
const raw=fs.readFileSync("la-telarana/source05-psoe-map-context.js","utf8");
const mark="window.IDEA_TELARANA_SOURCE05_EDITORIAL = ";
const data=JSON.parse(raw.split(mark)[1].trim().replace(/;$/,""));
const p=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(data.metadata.type,"web_page");
assert.equal(data.metadata.transcriptNeeded,false);
assert.equal(data.metadata.publisher,"Partido Popular");
assert.equal(data.metadata.individualCaseFactsVerified,false);
assert.equal(data.metadata.officialJudicialFilesReviewed,0);
assert.equal(data.nodes.length,4);
assert.equal(data.edges.length,3);
assert.equal(data.nodes.filter(n=>n.kind==="Persona").length,0,"No publicar personas imputadas mediante este catálogo sin autos judiciales");
assert(data.nodes.every(n=>n.note.length>=150));
const ids=new Set(data.nodes.map(n=>n.id));
assert.equal(ids.size,4);
for(const edge of data.edges){
 assert(edge.confidence==="documentado");
 assert(ids.has(edge.a)&&ids.has(edge.b));
 assert(/^https:\/\//.test(edge.source));
 assert(/no|únicamente|partido|fuente|necesidad|portal/i.test(edge.note));
}
const s=p.sourceCatalog.entries.find(x=>x.order===5);
assert.equal(s.status,"en_revision");
assert.equal(s.tracking.initiated,true);
assert.equal(s.tracking.complete,false);
assert.equal(s.tracking.docTranscriptionCreated,false);
assert.equal(s.tracking.transcriptContentImported,false);
assert.equal(s.individualCasesVerified,0);
assert(html.includes("source05-psoe-map-context.js?v="));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(html)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE05_EDITORIAL"&&m.kind==="mergeNewEpisode")&&html.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE05_EDITORIAL");
assert(!html.includes("source-review-rows"));
console.log("OK: fuente05 iniciada, procedencia partidista identificada, sin imputaciones añadidas como hechos");
