/** QA: expedientes editoriales F39 y F50 sobre TXT NotebookLM sin tiempo. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const specs=[
 {order:39,file:"la-telarana/fuente-39-egiptologia-revision.js",key:"IDEA_TELARANA_F39_REVIEW",nodes:29,edges:33,notes:28,video:"tPZ8wXGmSgA",event:"study-f39-descubrimiento-tumba-tutankamon-1922",score:29},
 {order:50,file:"la-telarana/fuente-50-miguel-de-lys-revision.js",key:"IDEA_TELARANA_F50_REVIEW",nodes:27,edges:32,notes:26,video:"H841XyN9B_4",event:"study-f50-juicios-salem-1692",score:27}
];
const ctx={window:{}};
const html=fs.readFileSync("la-telarana/index.html","utf8");
const pages=fs.readFileSync(".github/workflows/pages.yml","utf8");
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const events=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8")).items;
for(const s of specs){
 vm.runInNewContext(fs.readFileSync(s.file,"utf8"),ctx,{filename:s.file,timeout:10000});
 const obj=ctx.window[s.key];
 assert(obj&&obj.metadata.sourceOrder===s.order,"Falta módulo F"+s.order);
 assert(obj.metadata.transcriptAvailable&&obj.metadata.timecodesAvailable===false&&obj.metadata.audioVerified===false,
  "No equiparar NotebookLM a transcripción minutada ni a audio cotejado");
 assert.equal(obj.nodes.length,s.nodes,"Regresión en fichas F"+s.order);
 assert.equal(obj.edges.length,s.edges,"Regresión en relaciones F"+s.order);
 const ids=new Set(obj.nodes.map(n=>n.id)),edgeIds=new Set(obj.edges.map(e=>e.id));
 assert.equal(ids.size,obj.nodes.length,"ID de nodo duplicado");
 assert.equal(edgeIds.size,obj.edges.length,"ID de arista duplicado");
 for(const edge of obj.edges){
  assert(ids.has(edge.a)&&ids.has(edge.b),"Arista huérfana "+edge.id);
  if(edge.claimStatus==="mencion_editorial_no_vinculo_causal")
   assert(edge.confidence==="hipotesis","Mención de entrevista contabilizada como relación causal acreditada");
 }
 const notes=obj.nodes.flatMap(n=>n.podcastNotes||[]);
 assert.equal(notes.length,s.notes,"Notas fuente F"+s.order+" perdidas");
 for(const n of notes){
  assert(n.timeSec===null,"Nota sin tiempo se ha convertido en un minutaje ficticio");
  assert(n.source===`https://www.youtube.com/watch?v=${s.video}`,"Nota sin enlace original");
  assert(/carácter aproximado \d+/.test(n.text),"No se conserva ancla por posición textual");
  assert(n.text.length>180,"Descripción breve o incompleta en "+n.title);
 }
 assert(html.includes(s.file.split("/").pop())&&html.includes(s.key),"Carga HTML no configurada");
 assert(pages.includes("cp "+s.file+" dist/"+s.file),"Módulo fuera de dist público");
 const r=progress.sourceCatalog.entries.find(x=>x.order===s.order);
 assert(r.tracking.untimedTranscriptStoredInDrive&&!r.tracking.untimedTranscriptAudioVerified&&!r.tracking.untimedTranscriptTimecodesAvailable);
 assert(r.analysisCoverage.percent===s.score&&r.analysisCoverage.state==="en_revision"&&!r.reviewComplete);
 const review=progress.inReview.find(x=>x.order===s.order);
 assert(review&&!review.reviewComplete&&review.verifiedMinuteReferences===0);
 const event=events.find(x=>x.id===s.event);
 assert(event&&event.investigation.status==="hecho_documentado"&&event.investigation.sourceOrder===s.order&&event.investigation.confirmedBy.url.startsWith("https://"));
 assert(event.investigation.relatedTelarana.every(id=>ids.has(id)),"Hito histórico refiere IDs ausentes de F"+s.order);
}
assert.equal(events.length,progress.timeline.committedVerifiedEvents,"Diferencia en contador de cronología");
console.log("OK F39 F50: 56 fichas, 65 enlaces, 54 anclas por caracteres sin minutajes inventados y 2 hitos documentados.");
