/** F20 Lorenzo Ramírez: pistas temporales ASR y contraste institucional limitado. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync("la-telarana/fuente-20-revision-inicial.js","utf8"),ctx,{timeout:7000});
const m=ctx.window.IDEA_TELARANA_F20_REVIEW;
assert(m&&m.metadata.sourceOrder===20&&m.metadata.transcriptAudioMatched===false);
assert.equal(m.metadata.verifiedMinuteReferences,0,"Audio cotejado no debe inventarse");
assert.equal(m.metadata.timecodedTranscriptSegments,4005);
const ids=new Set(m.nodes.map(n=>n.id));
assert.equal(ids.size,m.nodes.length,"Nodos repetidos F20");
assert.equal(m.nodes.length,22);
assert.equal(m.edges.length,25);
for(const e of m.edges)assert(ids.has(e.a)&&ids.has(e.b),"Arista sin nodos: "+e.id);
const notes=m.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec));
assert.equal(notes.length,16,"F20: faltan 16 anclas temporales");
for(const n of notes){
 assert(n.timeSec>=0&&n.timeSec<=7845&&n.source.startsWith("https://www.youtube.com/watch?v=meEH-MaGn24&t="),"Minuto sin fuente");
 assert(n.text?.length>=120&&n.status&&n.status!=="hecho_verificado_independiente","Alegación elevada a hecho o nota vaga");
}
const verified=m.edges.filter(x=>x.claimStatus==="hecho_verificado_independiente");
assert.equal(verified.length,5,"Se esperan cinco hechos externos documentados");
assert(verified.some(x=>x.source.includes("cia.gov/tech/tech-collaboration")),"Sin evidencia institucional sobre In-Q-Tel");
assert(verified.some(x=>x.source.includes("sec.gov/Archives/edgar")),"Sin respaldo SEC para mandato de Schmidt");
assert(m.edges.filter(x=>x.id.startsWith("f20-mencion-")||x.id.startsWith("f20-mention-")).every(x=>x.claimStatus.startsWith("mencion_")),"Menciones convertidas en vínculos causales");
assert(verified.some(x=>x.id==="f20-doc-reg1183-wallet"&&x.source.includes("eur-lex.europa.eu")&&/voluntario/i.test(x.note)),"No consta la voluntariedad del reglamento");
assert(m.metadata.timecodedTranscriptDriveUrl===undefined,"No publicar URL del documento de transcripción privado");
const p=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const row=p.sourceCatalog.entries.find(e=>e.order===20);
assert(row.analysisCoverage.percent===47&&row.tracking.timecodedTranscriptNewEditorialAnnotations===16);
assert(row.tracking.timecodedTranscriptAudioVerified===false);
console.log("OK F20: dieciséis pasajes con subtítulos, cinco relaciones documentales, resto atribuido.");
