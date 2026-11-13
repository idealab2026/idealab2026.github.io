/* F69: impedir la precisión temporal inventada y conservar pruebas externas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/podcast-vaquero-150.js", src=fs.readFileSync(path,"utf8");
const ctx={window:{}};
vm.runInNewContext(src,ctx,{timeout:8000});
const data=ctx.window.IDEA_TELARANA_PODCAST_150;
assert(data?.metadata?.sourceOrder===69,"Módulo y fuente F69 no reconciliados");
assert(data.nodes.length===80&&data.edges.length===99,"La revisión no debe perder entidades ni relaciones");
assert(data.metadata.transcriptAudioMatched===false&&data.metadata.verifiedMinuteReferences===0&&data.metadata.speakerDiarizationVerified===false,"No se ha cotejado el audio");
const notes=data.nodes.flatMap(n=>n.podcastNotes||[]);
assert.equal(notes.length,80,"Esperados 80 resúmenes heredados");
assert(notes.every(n=>n.timeSec===null),"F69 contiene tiempos ficticios de audio");
assert(notes.every(n=>n.temporalStatus==="sin_minutaje_validado_en_archivo_f69"),"Faltan avisos de proveniencia en notas");
assert(!data.nodes.some(n=>/REHYGPW0c8k[&?]t=/.test(n.source||"")),"Nodos con enlaces temporales ficticios");
assert(!data.edges.some(e=>/REHYGPW0c8k[&?]t=/.test(e.source||"")),"Aristas con enlaces temporales ficticios");
assert(!notes.some(n=>/REHYGPW0c8k[&?]t=/.test(n.source||"")),"Notas con enlaces temporales ficticios");
const ids=new Set(data.nodes.map(n=>n.id));
assert(ids.size===80&&data.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"Duplicados o aristas huérfanas");
const docs=data.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente");
assert.equal(docs.length,8,"Solo 8 vínculos cuentan con evidencia externa independiente");
assert(docs.every(e=>e.confidence==="documentado"&&/^https:\/\//.test(e.source)&&!e.source.includes("youtube.com")),"Vínculo oficial sin fuente externa");
const evidenceHosts=["wwv.yadvashem.org","www.regjeringen.no","mossad.gov.il"];
assert(docs.every(e=>evidenceHosts.some(h=>e.source.includes(h))),"Fuente documental ajena al expediente revisado");
for(const id of ["vf150-adolf-eichmann","vf150-david-ben-gurion","vf150-meir-amit","vf150-golda-meir","vf150-ahmed-bouchiki","vf150-ali-hassan-salameh","vf150-danny-yatom","vf150-meir-dagan","vf150-tamir-pardo","vf150-yossi-cohen","vf150-mossad"]){
 const n=data.nodes.find(e=>e.id===id);
 assert(n?.note?.length>140&&/^https:\/\//.test(n.biographyEvidenceUrl||""),"Biografía o prueba ausente: "+id);
}
const progression=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const record=progression.sourceCatalog.entries.find(e=>e.order===69),review=progression.inReview.find(e=>e.order===69);
assert(record?.analysisCoverage?.percent===61&&review?.sourceNodesDocumented===80&&review?.sourceRelationsDocumented===99,"F69 no conciliado");
assert(record?.tracking?.docTranscriptionCreated===true&&record?.tracking?.transcriptContentImported===false&&record?.tracking?.manualTranscriptBlankConfirmed===true,"Documento manual no se debe confundir con transcripción");
assert(review.verifiedMinuteReferences===0&&record.analysisCoverage.audioVerified===false,"La medición heurística no es cobertura real");
const history=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
assert(history.items.length===125&&progression.timeline.committedVerifiedEvents===125,"Cronología no sincronizada");
for(const [id,date] of [["study-f69-eichmann-juicio-1961","1961-04-11"],["study-f69-lillehammer-condenas-1974","1974-02-01"]]){
 const e=history.items.find(x=>x.id===id);
 assert(e?.investigation?.date===date&&e.investigation.sourceOrder===69&&e.investigation.status==="hecho_documentado","Evento no validado "+id);
}
assert.equal(history.items.filter(e=>e.id==="study-vf150-lillehammer-1973").length,1,"Evento base de 1973 perdido");
assert(!src.includes("drive.google.com/file/d/")&&!src.includes("docs.google.com/document/d/"),"Material privado en el paquete público");
console.log("OK: F69 conserva 80 entidades y 99 relaciones, 80 tiempos anulados, 11 biografías, 8 vínculos documentados y 125 hitos.");
