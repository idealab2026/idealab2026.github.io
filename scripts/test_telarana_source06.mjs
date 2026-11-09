/* Fuente06: referencia a transcripción completa externa y prosa probatoria; no fingir incorporación literal. */
import assert from "node:assert/strict";
import fs from "node:fs";
const parse=(path,mark)=>{const raw=fs.readFileSync(path,"utf8");assert(raw.includes(mark),"Missing "+mark);return JSON.parse(raw.split(mark)[1].trim().replace(/;$/,""))};
const d=parse("la-telarana/podcast-wild-253-villarejo.js","window.IDEA_TELARANA_SOURCE06_PODCAST = ");
const bs=parse("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const imgs=parse("la-telarana/photo-catalog.js","window.IDEA_TELARANA_WIKIPEDIA_PORTRAITS=");
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
assert.equal(d.nodes.length,8);
assert.equal(d.edges.length,8);
const ids=new Set(d.nodes.map(n=>n.id));
assert.equal(ids.size,8);
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
assert.equal(progress.counts.inReview,6);
assert(html.includes("podcast-wild-253-villarejo.js?v="));
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_SOURCE06_PODCAST)"));
assert(html.includes("podcasts.happyscribe.com"),"Evidence link must be visible");
assert(!html.includes("source-review-rows"),"Internal tracker must never be public");
console.log("OK: source06 transcripción nativa íntegra SHA-256 verificado, 13 temas indexados, 8 entidades y 8 vínculos cualificados; revisión pendiente");
