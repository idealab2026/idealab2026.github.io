/* F34 · Auditoría de la primera lectura de NotebookLM sin tiempos fiables. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const path="la-telarana/fuente-34-francisco-primera-revision.js";
const src=read(path),ctx={window:{}};
vm.runInNewContext(src,ctx,{timeout:6000});
const f34=ctx.window.IDEA_TELARANA_F34_REVIEW;
assert(f34,"F34: el módulo de primera revisión no se carga");
assert(f34.metadata.sourceOrder===34&&f34.metadata.url.includes("j_5Tj0kIj2c"),"F34: vídeo incorrecto");
assert(f34.metadata.verifiedMinuteReferences===0&&f34.metadata.transcriptAudioMatched===false&&f34.metadata.speakerDiarizationVerified===false,"F34: no inventar minutajes ni cotejo audiovisual");
assert(f34.metadata.manualEditableTranscriptDocStillBlank===true&&f34.metadata.sourceTextCompletenessVerified===false,"F34: Doc editable aún vacío / TXT no validado íntegramente");
assert(f34.nodes.length===14&&f34.edges.length===17,"F34: topología documental inesperada");
const ids=new Set(f34.nodes.map(n=>n.id));
assert(ids.size===14&&f34.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"F34: IDs repetidos o relaciones huérfanas");
const docs=f34.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente"),
      mention=f34.edges.filter(e=>e.confidence==="hipotesis");
assert(docs.length===9&&docs.every(e=>e.confidence==="documentado"&&e.source.startsWith("https://")&&!e.source.includes("youtube.com")),"F34: respaldo externo insuficiente");
assert(mention.length===8&&mention.every(e=>e.source.includes("youtube.com")&&e.confidence==="hipotesis"),"F34: alegaciones elevadas a hechos");
assert(f34.nodes.flatMap(n=>n.podcastNotes||[]).every(n=>n.timeSec===null),"F34: marcas de tiempo inventadas en módulo sin minutajes");
for(const id of ["f34-doc-francisco-cosea","f34-doc-cosea-yeo","f34-doc-francisco-praedicate",
 "f34-doc-praedicate-curia","f34-doc-francisco-carta-chile","f34-doc-francisco-barros",
 "f34-doc-francisco-petrini","f34-doc-petrini-gobernatorato","f34-doc-francisco-santa-sede"])
 assert(docs.some(e=>e.id===id),"F34: vínculo primario faltante "+id);
assert(mention.find(e=>e.id==="f34-mention-cosea")?.claimStatus==="alegacion_no_verificada",
 "F34: supuesto robo de informes de COSEA no debe considerarse probado");
const f70ctx={window:{}};
vm.runInNewContext(read("la-telarana/fuentes-70-74-frattini-inicial.js"),f70ctx,{timeout:7000});
const f70=f70ctx.window.IDEA_TELARANA_F70_REVIEW;
for(const [a,b] of [["francisco","papa-francisco"],["curia","curia"],["benedicto","benedicto"],["ior","ior"],["eric","eric"],["praedicate","praedicate"],["santa-sede","santa-sede"]]){
 assert(f34.nodes.find(n=>n.id==="f34-"+a)?.name===f70.nodes.find(n=>n.id==="f70-"+b)?.name,
  "La misma entidad cambia de nombre entre F34 y F70: "+a);
}
const tracking=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const x=tracking.sourceCatalog.entries.find(e=>e.order===34),q=tracking.inReview.find(e=>e.order===34);
assert(tracking.total===74&&tracking.counts.uniqueSources===71&&tracking.counts.inReview===37&&tracking.counts.notStarted===34,"F34: contadores del inventario incorrectos");
assert(x&&q&&x.videoId==="j_5Tj0kIj2c"&&!tracking.pendingSources.some(e=>e.order===34),"F34: sigue pendiente sin analizar o duplicada");
assert(x.tracking.untimedTranscriptStoredInDrive&&x.tracking.untimedTranscriptReadbackVerified&&x.tracking.manualTranscriptBlankConfirmed&&!x.tracking.transcriptContentImported,
 "F34: el TXT sin tiempos y el Doc vacío no están distinguidos");
assert(x.analysisCoverage.percent===22&&x.analysisCoverage.audioVerified===false&&q.verifiedMinuteReferences===0&&q.reviewComplete===false,
 "F34: porcentaje no es cobertura medida del audio");
assert(q.sourceNodesDocumented===14&&q.sourceRelationsDocumented===17&&q.verifiedIndependentChecks===9,
 "F34: métricas documentales sin reconciliar");
const hist=JSON.parse(read("linea-historia/estudios-telarana.json"));
assert(hist.items.length===120&&tracking.timeline.committedVerifiedEvents===120,"F34: historial no está sincronizado");
for(const [id,date] of [
 ["study-f34-coaea-2013","2013-07-18"],["study-f34-chile-carta-2018","2018-04-08"],
 ["study-f34-barros-renuncia-2018","2018-06-11"],["study-f34-raffaella-petrini-gobernacion-2025","2025-03-01"]]){
 const evt=hist.items.find(e=>e.id===id);
 assert(evt?.investigation?.date===date&&evt.investigation.sourceOrder===34&&evt.investigation.confirmedBy.url.startsWith("https://"),
  "F34: acontecimiento sin fecha o fuente primaria "+id);
}
for(const id of ["study-f70-praedicate-evangelium-2022","study-f70-benedicto-gabriele-indulto-2012"])
 assert(hist.items.find(e=>e.id===id)?.investigation?.otherSourceMentions?.some(m=>m.sourceOrder===34),
  "F34: no enlaza con el hito previo F70: "+id);
const base=JSON.parse(read("linea-historia/data.json"));
assert(base.items.some(e=>e.id==="a-38-8"&&/Francisco/.test(e.t)),
 "La muerte de Francisco ya consta en la historia general; no duplicarla");
assert(!hist.items.some(e=>e.id==="study-f34-papa-francisco-muerte-2025"),
 "Duplicación de fallecimiento de Francisco en la línea histórica");
const html=read("la-telarana/index.html"),wf=read(".github/workflows/pages.yml");
assert(html.includes('src="./fuente-34-francisco-primera-revision.js')&&html.includes('"key":"IDEA_TELARANA_F34_REVIEW"'),
 "F34: carga de módulo no integrada en la web");
assert(wf.includes("cp la-telarana/fuente-34-francisco-primera-revision.js dist/la-telarana/fuente-34-francisco-primera-revision.js"),
 "F34: no se copia al build de Pages");
assert(!src.includes("docs.google.com/document/d/")&&!src.includes("drive.google.com/file/d/"),
 "F34: URL privada en el paquete público");
console.log("OK: F34, 14 nodos, 17 relaciones, 9 vínculos primarios, 4 hitos nuevos, 0 minutos atribuidos, TXT privado no cronometrado y Doc pendiente.");
