/* Source 07 · truthfulness, provenance and published graph integrity */
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
const parse=(path,mark)=>{const s=fs.readFileSync(path,"utf8");assert(s.includes(mark),mark+" missing");return JSON.parse(s.split(mark)[1].trim().replace(/;$/,""))};
const graph=parse("la-telarana/podcast-wild-312-chicote.js","window.IDEA_TELARANA_SOURCE07_PODCAST = ");
const bios=parse("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const photos=loadPhotoCatalog();
const history=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert.equal(graph.metadata.sourceOrder,7);
assert.equal(graph.metadata.publishedAt,"2025-01-23");
assert.equal(graph.metadata.durationMinutesApprox,314);
assert.equal(graph.metadata.transcriptPresentOnThirdPartySite,true);
assert.equal(graph.metadata.fullTranscriptImportedToDoc,true,"Ya existe Doc privado distinto del índice con texto íntegro");
assert.equal(graph.metadata.fullTranscriptCharacters,314815);
assert.equal(graph.metadata.transcriptAudioMatched,false);
assert(graph.metadata.transcriptIndexDocUrl.startsWith("https://docs.google.com/document/d/"));
assert(graph.metadata.transcriptLocation.includes("metacast.app"));
assert.equal(graph.nodes.length,24);
assert.equal(graph.edges.length,24);
const ids=new Set(graph.nodes.map(n=>n.id));
assert.equal(ids.size,graph.nodes.length);
for(const n of graph.nodes){
 assert(n.note.length>=160,"Need enough biographical context "+n.id);
 assert(Array.isArray(n.podcastNotes)&&n.podcastNotes.length>0);
 assert(n.podcastNotes.every(x=>x.timeSec===null||Number.isInteger(x.timeSec)),"Never fabricate exact timestamps for unknown chapter "+n.id);
}
for(const e of graph.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Unknown edge "+e.id);
 assert(e.confidence==="documentado","Only editorial subject connections or externally verified relations can be called documented");
 assert(e.note.length>=100,"Relation needs a caveat "+e.id);
 assert(/^https:\/\//.test(e.source),"Missing source "+e.id);
}
assert(graph.nodes.find(n=>n.id==="twp312-guantanamo").podcastNotes.every(x=>x.timeSec===null),"No invented Guantanamo timecodes");
for(const id of ["twp312-javier-chicote","twp312-luis-roldan","twp312-miguel-bernad","twp312-luis-pineda","twp312-francisco-correa","twp312-jose-luis-penas","twp312-jose-luis-abalos","twp312-delcy-rodriguez"]){
 assert(bios.curated[id]?.text.length>=260&&bios.curated[id]?.source.startsWith("https://"),"Missing biographical note "+id);
}
assert.equal(photos["twp312-javier-chicote"]?.title,"Javier Chicote");
assert(Object.keys(photos).filter(id=>id.startsWith("twp312-")).length>=9);
const events=history.items.filter(x=>x.investigation?.sourceOrder===7);
assert.equal(events.length,5);
assert(events.every(x=>x.investigation.status==="hecho_documentado"));
assert(events.every(x=>x.investigation.sourceUrl===graph.metadata.url));
assert(events.every(x=>x.investigation.relatedTelarana.every(id=>ids.has(id))));
assert(events.some(x=>x.investigation.date==="2020-10-14"&&/título lucrativo/i.test(x.t)));
assert(events.some(x=>x.investigation.date==="2024-03-15"&&/absuelve/i.test(x.t)));
const row=progress.sourceCatalog.entries.find(x=>x.order===7);
assert(row.tracking.docTranscriptionCreated===true&&row.tracking.transcriptContentImported===true);
assert(row.reviewComplete===false&&progress.inReview.find(x=>x.order===7)?.transcriptDocHasFullText===true,"El texto integral ahora está recuperado, pero el audio y las afirmaciones no están comprobados");
assert.equal(progress.timeline.committedVerifiedEvents,history.items.length,"Timeline global can grow when subsequent sources are reviewed");
assert.equal(progress.timeline.eventsBySource["7"].length,5);
assert(html.includes('podcast-wild-312-chicote.js?v='));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(html)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE07_PODCAST"&&m.kind==="mergeNewEpisode")&&html.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE07_PODCAST");
assert(!html.includes("source-review-rows")&&!html.includes("progreso-fuentes.json"),"Source tracker must not be on public site");
assert(workflow.includes("podcast-wild-312-chicote.js"),"Missing source in deployment allowlist");
console.log("OK: fuente07 · 24 nodos, 24 relaciones, 8 biografías, 9 fichas foto, 5 hitos; DOC índice sin transcripción íntegra");
