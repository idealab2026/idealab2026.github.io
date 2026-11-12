/* F06: 6.975 segmentos cronometrados preservados en Drive; el audio sigue sin cotejarse. */
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
const parse=(path,mark)=>{const raw=fs.readFileSync(path,"utf8");assert(raw.includes(mark),"Missing "+mark);return JSON.parse(raw.split(mark)[1].trim().replace(/;$/,""))};
const d=parse("la-telarana/podcast-wild-253-villarejo.js","window.IDEA_TELARANA_SOURCE06_PODCAST = ");
const bs=parse("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const imgs=loadPhotoCatalog();
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(d.metadata.publishedAt,"2024-01-04");
assert.equal(d.metadata.podcastReleaseDate,"2024-01-05");
assert.equal(d.metadata.originalNotebookSourceId,"21bd9782-b363-4992-bb5a-f945bcc6ca9c");
assert.equal(d.metadata.docCreated,true);
assert.equal(d.metadata.fullTranscriptImportedToDoc,true);
assert.equal(d.metadata.fullTranscriptSha256VerifiedAgainstOriginal,true);
assert.equal(d.metadata.originalTranscriptCharacters,257517);
assert.equal(d.metadata.originalTranscriptUtf8Bytes,262991);
assert.equal(d.metadata.originalTranscriptBlocks,170);
assert.equal(d.metadata.indexedTranscriptTopics,13);
assert.equal(d.metadata.originalTranscriptSha256,"34e777038c189bf0ab64d64bc7ea220e954c5f55bc55ce32e1d5e7b50eab6bc6");
assert(d.metadata.transcriptIndexDocUrl.includes("docs.google.com/document/d/"));
assert.equal(d.metadata.transcriptPresentOnThirdPartySite,true);
assert.equal(d.metadata.transcriptVerifiedAgainstAudio,false);
assert(d.metadata.transcriptLocation.includes("podcasts.happyscribe.com"));
assert(d.metadata.transcriptDocUrl.includes("docs.google.com/document/d/"));
assert.equal(d.nodes.length,10);
assert.equal(d.edges.length,10);
assert(d.metadata.timestampedTranscriptAvailable===true&&d.metadata.timestampedTranscriptSegments===6975);
assert.equal(d.metadata.timestampedTranscriptAudioVerified,false);
const ids=new Set(d.nodes.map(n=>n.id));
assert.equal(ids.size,10);
for(const n of d.nodes){
 assert(n.note.length>120,"No identity/context: "+n.id);
 assert(n.podcastNotes.some(x=>typeof x.timeSec==="number"),"Missing timed topic reference: "+n.id);
 assert(n.podcastNotes.every(x=>typeof x.timeSec==="number"||(x.timeSec===null&&x.status==="archivo_original_usuario"&&x.source.includes("docs.google.com"))),"Untimed notes must be explicitly identified as source document without verified minute: "+n.id);
}
for(const edge of d.edges){
 assert(ids.has(edge.a)&&ids.has(edge.b),"Unknown endpoint "+edge.id);
 assert(edge.podcastNotes.length>0);
 assert(["documentado","indicio","hipotesis"].includes(edge.confidence));
 assert(/no|sin |menciona|testimonio|tema|conversaci[oó]n|entrevistado|cita|entrevista|programa|p[oó]dcast|audi[oó]s/i.test(edge.note),"Risk of uncaveated relationship: "+edge.id);
}
const pn=d.edges.find(e=>e.id==="twp253-edge-nico-topic");
assert(pn&&pn.confidence==="documentado"&&pn.type.includes("mencionada"),"Do not invent a personal relationship with Nicolas");
for(const id of ["twp253-jordi-wild","twp253-pequeno-nicolas","twp253-jordi-pujol"]){
 assert(bs.curated[id]?.text.length>240 && bs.curated[id]?.source?.startsWith("https://"),"Missing biographical context "+id);
 assert(imgs[id]?.lang==="es","Missing photo lookup identity "+id);
}
const row=progress.sourceCatalog.entries.find(s=>s.order===6);
assert.equal(row.status,"en_revision");
assert.equal(row.tracking.docTranscriptionCreated,true);
assert.equal(row.tracking.transcriptContentImported,true);
assert.equal(row.transcriptSha256VerifiedDriveRoundTrip,true);
assert.equal(row.transcriptTopicIndexCount,13);
assert.equal(progress.inReview.find(x=>x.order===6)?.firstPassTopicIndexCount,13);
assert.equal(row.reviewComplete,false);
assert(row.tracking.timecodedTranscriptStoredInDrive&&row.tracking.timecodedTranscriptReadbackVerified,
 "F06: comprobar TXT original con minutajes en Drive");
assert(row.tracking.timecodedTranscriptEditorialReviewComplete===false,
 "F06: no marcar revisión exhaustiva sin cotejo de audio");
const counted=d.nodes.flatMap(x=>x.podcastNotes||[]).filter(x=>Number.isFinite(x.timeSec));
assert(counted.length>=21,"F06: se han perdido pasajes con marcas de tiempo");
const current=counted.filter(n=>n.title?.startsWith("F06 ·"));
assert.equal(current.length,13,"F06: se requieren 13 anotaciones nuevas con minutaje");
for(const n of current){
 assert(n.timeSec>=0&&n.timeSec<=18205&&n.source.startsWith("https://www.youtube.com/watch?v=fxvXXVrkRb4&t=")&&n.text.length>=120,
  "F06: nueva nota sin tiempo o fuente original");
}
// Conservar las notas antiguas de HappyScribe/Apple y sus referencias independientes: no son el nuevo TXT.
assert(counted.length>=current.length);
assert(d.nodes.some(x=>x.id==="twp253-11m")&&d.nodes.some(x=>x.id==="twp253-javier-de-la-rosa"),
 "F06: personajes o acontecimiento faltantes");
assert(d.edges.filter(e=>e.id.startsWith("twp253-edge-11m")||e.id.startsWith("twp253-edge-javier")).every(e=>e.confidence==="hipotesis"),
 "F06: hipótesis de 11-M o relación personal no acreditada");
assert(progress.counts.inReview>=6,"Other sources may start later; source06 must remain in review");
assert(html.includes("podcast-wild-253-villarejo.js?v="));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(html)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE06_PODCAST"&&m.kind==="mergeNewEpisode")&&html.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE06_PODCAST");
assert(html.includes("podcasts.happyscribe.com"),"Evidence link must be visible");
assert(!html.includes("source-review-rows"),"Internal tracker must never be public");
console.log("OK F06: transcripcion original Google Doc + 6975 subtitulos minutados en TXT; 10 nodos, 10 enlaces, atribuciones del 11-M no verificadas.");
