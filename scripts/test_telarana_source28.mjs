import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
vm.runInNewContext(read("la-telarana/fuente-28-revision-inicial.js"),ctx,{timeout:7000});
const mod=ctx.window.IDEA_TELARANA_F28_REVIEW;
assert.equal(mod.metadata.sourceOrder,28);
assert.equal(mod.metadata.transcriptAvailable,true);
assert.equal(mod.metadata.audioVerified,false);
assert.equal(mod.metadata.verifiedMinuteReferences,0);
assert.equal(mod.nodes.length,13);
assert.equal(mod.edges.length,14);
assert.equal(mod.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec)).length,2,
 "Solo notas atribuidas con minuto; el audio sigue sin cotejar");
const ids=new Set(mod.nodes.map(x=>x.id));assert.equal(ids.size,mod.nodes.length);
const documented=mod.edges.filter(x=>x.claimStatus==="hecho_verificado_independiente");
const mentions=mod.edges.filter(x=>x.claimStatus==="mencion_editorial_no_equivale_a_relacion_sustantiva");
assert.equal(documented.length,7);assert.equal(mentions.length,7);
for(const e of mod.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Arista huérfana "+e.id);
 assert(e.note.length>=115&&e.source.startsWith("https://"),"Descripción o fuente documental insuficiente: "+e.id);
 assert((e.confidence==="documentado")===documented.includes(e),"Mención promovida a hecho: "+e.id);
}
const edge=id=>mod.edges.find(x=>x.id==="f28-"+id);
assert(edge("thiel-pac")?.note.includes("no al comité oficial")===false||edge("thiel-pac")?.note.includes("No fue una donación personal"));
assert(edge("pac-vance")?.note.includes("super-PAC"));
assert(edge("aipac-udp")?.note.includes("independiente"));
assert(!mod.edges.some(e=>e.a==="f28-aipac"&&e.b==="on-donald-trump"||e.b==="f28-aipac"&&e.a==="on-donald-trump"),"No atribuir transferencia directa sin FEC");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./fuente-28-revision-inicial.js?v='));
assert(workflow.includes("cp la-telarana/fuente-28-revision-inicial.js dist/la-telarana/fuente-28-revision-inicial.js"));
const m=/var modules=(\[[^\n]+\]);/.exec(html);assert(m,"Registro modular ausente");
assert(JSON.parse(m[1]).some(x=>x.label==="Fuente 28"&&x.key==="IDEA_TELARANA_F28_REVIEW"));
const history=JSON.parse(read("linea-historia/estudios-telarana.json"));
const tracker=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(tracker.timeline.committedVerifiedEvents,history.items.length);
assert(tracker.inReview.some(s=>s.order===28&&!s.reviewComplete&&s.rawTranscriptAvailable===true));
const row=tracker.sourceCatalog.entries.find(s=>s.order===28);
assert(row.tracking.timecodedTranscriptStoredInDrive&&row.tracking.timecodedTranscriptReadbackVerified&&!row.tracking.timecodedTranscriptAudioVerified);
for(const id of ["study-f28-pov-thiel-vance-2022","study-f28-trump-vance-investidura-2025","study-f28-bessent-senado-2025"]){
const e=history.items.find(x=>x.id===id);
assert(e?.investigation.status==="hecho_documentado"&&e.investigation.confirmedBy?.url.startsWith("https://"));
}
console.log("OK F28: 7 vínculos documentados, 7 menciones editoriales, 3 hitos, 2 notas minutadas atribuidas.");
