/* Fuente 08: TXT con minutajes recuperado; documento antiguo parcial y alegaciones no corroboradas. */
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
assert.equal(ep.nodes.length,10);
assert.equal(ep.edges.length,9);
assert(ep.metadata.timecodedTranscriptAvailable&&ep.metadata.timecodedTranscriptSegments===2926,
 "F08: debe usar el TXT minutado independiente del antiguo Google Doc");
assert(ep.metadata.audioMatched===false&&ep.metadata.timecodesVerified===false,
 "Los subtitulos no se han cotejado con el audio");
const ids=new Set(ep.nodes.map(n=>n.id));
assert.equal(ids.size,ep.nodes.length);
for(const n of ep.nodes){
 assert(n.note.length>=150,"Missing contextual identity and caveats "+n.id);
 assert(n.podcastNotes.length>0);
 for(const p of n.podcastNotes){
  if(p.timeSec!==null){
   assert(Number.isFinite(p.timeSec)&&p.timeSec>=0&&p.timeSec<=ep.metadata.durationSeconds+5,
    "Minuto fuera de duracion "+n.id);
   assert(p.source.startsWith("https://www.youtube.com/watch?v=i4aTDf0yBac&t=")&&p.status&&p.text.length>=120,
    "Nota minutada sin fuente, atribucion o contexto "+n.id);
  }
 }
}
for(const edge of ep.edges){
 assert(ids.has(edge.a)&&ids.has(edge.b),"Unknown endpoint "+edge.id);
 assert(["documentado","hipotesis"].includes(edge.confidence));
 if(edge.confidence==="hipotesis")assert(edge.a==="f08-episode"&&edge.claimStatus==="mencion_temporizada_no_relacion_operativa",
  "No representar alegaciones como relaciones personales acreditadas");
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
assert.equal(events.length,2,"Dos hitos con referencia primaria externa");
const archived=events.find(e=>e.id==="study-v8-archivo-causa-financiacion-podemos-2022");
assert(archived?.investigation.date==="2022-06-27"&&archived.investigation.confirmedBy.url.includes("poderjudicial.es"));
assert(archived.investigation.sourceTitle.includes("contexto externo"));
const carvajal=events.find(e=>e.id==="study-f08-carvajal-declaracion-culpabilidad-2025");
assert(carvajal?.investigation.date==="2025-06-25"&&carvajal.investigation.confirmedBy.url.includes("justice.gov"));
assert(events.every(e=>e.investigation.relatedTelarana.every(id=>ids.has(id))),"Referencia de grafo ausente");
const source=progress.sourceCatalog.entries.find(s=>s.order===8);
assert(source.tracking.initiated&&source.tracking.docTranscriptionCreated&&source.tracking.inReview);
assert.equal(source.tracking.transcriptContentImported,false,"El documento F08 solo contiene índice y plantilla, no transcripción íntegra");
assert.equal(source.tracking.transcriptCharactersReadBack,0,"No atribuir a F08 una lectura ASR inexistente");
assert.equal(source.tracking.complete,false);
assert(source.tracking.timecodedTranscriptStoredInDrive===true&&source.tracking.timecodedTranscriptReadbackVerified===true);
assert.equal(source.tracking.timecodedTranscriptSegments,2926);
const timed=ep.nodes.flatMap(n=>n.podcastNotes).filter(n=>Number.isFinite(n.timeSec));
assert.equal(timed.length,15,"Se han perdido las 15 referencias cronometradas");
const hugo=ep.nodes.find(n=>n.id==="f08-hugo-carvajal");
assert(hugo?.source.includes("justice.gov")&&hugo.note.includes("no confirman")||hugo?.note.includes("no confirman"),"Ficha de Carvajal sin limitacion probatoria");
const tejero=ep.nodes.find(n=>n.id==="f08-antonio-tejero");
assert(tejero?.source.includes("congreso.es"),"Tejero sin contexto parlamentario");
assert.equal(source.tracking.imageRuntimeVerified,false);
assert(html.includes("podcast-vaquero-67-villarejo.js?v="));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(html)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE08_EDITORIAL"&&m.kind==="mergeNewEpisode")&&html.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE08_EDITORIAL");
assert(!html.includes("source-review-rows")&&!html.includes("progreso-fuentes.json"),"The private source tracking table must not be in the public web page");
console.log("OK F08: 10 nodos, 9 enlaces, 15 notas con tiempo; 2 hitos judiciales, ningún alegato promovido a hecho.");
