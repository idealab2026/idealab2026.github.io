/* Pruebas de integridad de la fuente08: sin transcripción, no se infieren conductas ilícitas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

/* The photo catalogue is a trusted JS asset: an initial JSON assignment
   followed by editorial Object.assign extensions. Parse all entries, without
   treating the complete source text as one JSON document. */
function loadPhotoCatalog(){
 const source=fs.readFileSync("la-telarana/photo-catalog.js","utf8");
 const sandbox={window:{}};
 vm.runInNewContext(source,sandbox,{filename:"photo-catalog.js",timeout:1500});
 const entries=sandbox.window.IDEA_TELARANA_WIKIPEDIA_PORTRAITS;
 assert(entries&&typeof entries==="object"&&!Array.isArray(entries),"Missing photo catalogue object");
 return entries;
}
const parse=(path,prefix)=>{const text=fs.readFileSync(path,"utf8");assert(text.includes(prefix),"Missing "+prefix);return JSON.parse(text.split(prefix)[1].trim().replace(/;$/,""));};
const ep=parse("la-telarana/podcast-vaquero-67-villarejo.js","window.IDEA_TELARANA_SOURCE08_EDITORIAL = ");
const biographies=parse("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const images=loadPhotoCatalog();
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const timeline=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(ep.metadata.order,8);
assert.equal(ep.metadata.durationSeconds,7093);
assert.equal(ep.metadata.dateShownIvoox,"2025-10-22");
assert.equal(ep.metadata.docCreated,true);
assert.equal(ep.metadata.docContainsTranscript,false);
assert.equal(ep.metadata.fullTranscriptImportedToDoc,false);
assert.equal(ep.metadata.timecodesVerified,false);
assert.equal(ep.metadata.unverifiedAllegationsNotLinked,true);
assert.equal(ep.nodes.length,8);
assert.equal(ep.edges.length,7);
const ids=new Set(ep.nodes.map(n=>n.id));
assert.equal(ids.size,ep.nodes.length);
for(const n of ep.nodes){
 assert(n.note.length>=150,"Missing contextual identity and caveats "+n.id);
 assert(n.podcastNotes.length>0);
 assert(n.podcastNotes.every(p=>p.timeSec===null),"Cannot invent source08 timestamps "+n.id);
}
for(const edge of ep.edges){
 assert(ids.has(edge.a)&&ids.has(edge.b),"Unknown endpoint "+edge.id);
 assert(edge.confidence==="documentado");
 assert(edge.note.length>120);
 assert(edge.podcastNotes.every(p=>p.timeSec===null));
}
const titleMentionEdges=ep.edges.filter(e=>["f08-maduro","f08-zapatero","f08-iglesias"].includes(e.a)||["f08-maduro","f08-zapatero","f08-iglesias"].includes(e.b));
assert.equal(titleMentionEdges.length,3);
assert(titleMentionEdges.every(e=>e.a==="f08-episode"||e.b==="f08-episode"),"Do not infer connections among the political actors from the title");
for(const actor of ["f08-roberto-vaquero","f08-villarejo","f08-maduro","f08-zapatero","f08-iglesias"]){
 assert(biographies.curated[actor]?.text.length>=270);
 assert(biographies.curated[actor]?.source.startsWith("https://"));
 assert(images[actor]?.lang==="es");
}
const events=timeline.items.filter(e=>e.investigation?.sourceOrder===8);
assert.equal(events.length,1);
assert.equal(events[0].investigation.date,"2022-06-27");
assert(events[0].investigation.confirmedBy.url.includes("poderjudicial.es"));
assert(events[0].investigation.sourceTitle.includes("contexto externo"));
assert(events[0].investigation.relatedTelarana.every(id=>ids.has(id)));
const source=progress.sourceCatalog.entries.find(s=>s.order===8);
assert(source.tracking.initiated&&source.tracking.docTranscriptionCreated&&source.tracking.inReview);
assert.equal(source.tracking.transcriptContentImported,false,"El documento F08 solo contiene índice y plantilla, no transcripción íntegra");
assert.equal(source.tracking.transcriptCharactersReadBack,0,"No atribuir a F08 una lectura ASR inexistente");
assert.equal(source.tracking.complete,false);
assert.equal(source.tracking.imageRuntimeVerified,false);
assert(html.includes("podcast-vaquero-67-villarejo.js?v="));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(html)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE08_EDITORIAL"&&m.kind==="mergeNewEpisode")&&html.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE08_EDITORIAL");
assert(!html.includes("source-review-rows")&&!html.includes("progreso-fuentes.json"),"The private source tracking table must not be in the public web page");
console.log("OK: source08 · 8 nodes, 7 non-accusatory links, 5 bios, 1 court-history event, transcript pending");
