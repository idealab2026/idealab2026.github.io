/* Fuente 02: evidencia de transcripción y seguridad de atribuciones. */
import assert from "node:assert/strict";
import fs from "node:fs";
const raw=fs.readFileSync("la-telarana/podcast-coronel-elecciones-2026-transcript-review.js","utf8");
const head="window.IDEA_TELARANA_CEUTA_TRANSCRIPT_REVIEW = ";
assert(raw.includes(head),"No se ha creado la revisión documental");
const study=JSON.parse(raw.slice(raw.indexOf(head)+head.length).trim().replace(/;$/,""));
const html=fs.readFileSync("la-telarana/index.html","utf8");
const hist=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const ep=progress.inReview.find(x=>x.order===2);
assert.equal(study.metadata.transcriptCheckedAgainstAudio,false,"No afirmar cotejo con audio sin haberlo hecho");
assert.equal(study.metadata.timecodesVerified,false,"No afirmar minutos exactos");
assert.equal(study.metadata.sourceWordCountApprox,15484);
assert.equal(study.nodes.length,33);
assert.equal(study.edges.length,34);
assert.equal(study.claims.length,18);
assert(study.pendingTimelineClaims.length>=5);
assert.equal(new Set(study.nodes.map(n=>n.id)).size,study.nodes.length);
assert.equal(new Set(study.edges.map(e=>e.id)).size,study.edges.length);
const ids=new Set(study.nodes.map(n=>n.id));
for(const n of study.nodes){
 assert(n.note&&n.note.length>=120,"Ficha insuficiente: "+n.id);
 assert(n.podcastNotes.every(x=>x.timeSec===null),"Se ha inventado tiempo para "+n.id);
}
for(const e of study.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Arista sin identidad: "+e.id);
 assert(["hipotesis","indicio","documentado"].includes(e.confidence));
 assert(e.podcastNotes.every(x=>x.timeSec===null),"Minuto artificial: "+e.id);
 if(e.confidence==="hipotesis")assert(/alega|acusaci[oó]n|presunt|supuest|no |sin |hip[oó]tesis|especula|rumor/i.test(e.note),"Hipótesis no advertida: "+e.id);
}
for(const c of study.claims){
 assert(c.finding&&c.finding.length>=20,"Falta valoración probatoria "+c.id);
}
assert.equal(ep.rawTranscriptAvailable,true);
assert.equal(ep.transcriptAnalyzedEntirety,true);
assert.equal(ep.transcriptAudioMatched,false);
assert.equal(ep.reviewComplete,false);
assert.equal(ep.verifiedMinuteReferences,0);
assert.equal(ep.structuredClaims,18);
assert.equal(ep.timelineVerifiedEventsCommitted,8);
assert.equal(hist.items.filter(x=>x.investigation.sourceOrder===2).length,8);
assert(!hist.items.some(e=>e.id.includes("reunion-marzo")),"La presunta reunión secreta NO debe figurar como hecho");
assert(html.includes("podcast-coronel-elecciones-2026-transcript-review.js?v="));
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_CEUTA_TRANSCRIPT_REVIEW)"));
assert(html.includes('timeSec:n.timeSec===null||n.timeSec===undefined?null:'));
assert(html.includes("minuto no verificado"),"La interfaz debe explicar la falta de minutaje");
const biographies=JSON.parse(fs.readFileSync("la-telarana/person-biographies.js","utf8").split("window.IDEA_TELARANA_BIOGRAPHIES = ")[1].trim().replace(/;$/,""));
for(const id of ["ce26-bolanos","ce26-robles","ce26-casteleiro","ce26-jose-bono","ce26-zapatero","ce26-jose-blanco","ce26-mohammed-vi","ce26-moulay-hassan","ce26-hassan-ii","ce26-pablo-iglesias"]){
 const b=biographies.curated[id];assert(b&&b.text.length>=230&&b.source.startsWith("https://"),"Bio incompleta "+id);
}
assert(study.claims.some(c=>c.id==="c-15"&&c.evidence.includes("europarl.europa.eu")),"Falta resolución de la Eurocámara");
assert(study.claims.some(c=>c.id==="c-16"&&c.evidence.includes("europa.eu")),"Falta contraste jurídico de devoluciones");
assert(study.claims.some(c=>c.id==="c-18"&&c.evidence.includes("ojp.gov")),"Falta contraste metodológico del PIB");
assert(study.nodes.some(n=>n.id==="ce26-resolucion-pe-2026"));
assert(study.nodes.some(n=>n.id==="ce26-retornos-garantias-ue"));
assert(hist.items.some(e=>e.id==="study-v2-ceuta-resolucion-parlamento-europeo-2026"));
console.log("OK: 33 entidades, 34 relaciones, 18 contrastes, 13 biografías y 8 hitos; sin minutos inventados ni acusaciones dadas por probadas");
