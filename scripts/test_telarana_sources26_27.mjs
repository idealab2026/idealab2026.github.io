/** Fuente 26/27: contextualización con fuentes oficiales SIN atribuir citas de audio. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const load=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
for(const i of [26,27]){
 vm.runInNewContext(load(`la-telarana/fuente-${i}-revision-inicial.js`),ctx,{filename:String(i),timeout:7000});
}
const mods=[ctx.window.IDEA_TELARANA_F26_REVIEW,ctx.window.IDEA_TELARANA_F27_REVIEW];
assert.equal(mods.length,2);
let documented=0,mentions=0;
for(const [index,mod] of mods.entries()){
 const order=index+26;
 assert.equal(mod.metadata.sourceOrder,order);
 assert(mod.metadata.transcriptAvailable===true&&mod.metadata.audioVerified===false&&mod.metadata.verifiedMinuteReferences===0,
  "F"+order+": subtítulos recuperados no deben equipararse a audio cotejado");
 assert(mod.metadata.methodologicalNote.length>100);
 const ids=new Set(mod.nodes.map(n=>n.id));
 assert.equal(ids.size,mod.nodes.length,"IDs duplicados dentro de fuente "+order);
 for(const e of mod.edges){
  assert(ids.has(e.a)&&ids.has(e.b),"Relación huérfana "+e.id);
  assert(/^https:\/\//.test(e.source)&&e.note.length>=120,"Falta evidencia o límite probatorio "+e.id);
  if(e.claimStatus==="hecho_verificado_independiente"){
   documented++;assert(e.confidence==="documentado"&&!e.source.includes("youtube.com"),"Hecho sin contraste independiente "+e.id);
  }else{
   mentions++;
   assert(e.claimStatus==="mencion_editorial_no_equivale_a_relacion_sustantiva"&&e.confidence==="hipotesis","Mención convertida en vínculo sin prueba "+e.id);
  }
 }
 assert(mod.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec)).length===(order===26?18:2),
  "F"+order+": número de anclas de subtítulos inconsistente; no implica cotejo de audio");
}
assert.equal(mods[0].nodes.length,11);assert.equal(mods[0].edges.length,11);
assert.equal(mods[1].nodes.length,8);assert.equal(mods[1].edges.length,8);
assert.equal(documented,8);assert.equal(mentions,11);
const f26=mods[0];
assert.equal(f26.metadata.transcriptStoredPrivately,true,"El TXT se conserva en Drive privado");
assert.equal(f26.metadata.transcriptCharactersReadBack,134558);
assert(!f26.edges.some(e=>e.id==="f26-mention-ai"),"No atribuir mención del AI Act si no está en la transcripción");
for(const id of ["f26-thiel-palantir-sec","f26-karp-palantir-sec","f26-dgsi-palantir-senat"]){
 const e=f26.edges.find(e=>e.id===id);
 assert(e&&e.claimStatus==="hecho_verificado_independiente"&&e.confidence==="documentado");
}
const allegation=f26.nodes.find(n=>n.id==="f26-thiel").podcastNotes.find(n=>n.timeSec===2798);
assert(allegation&&allegation.status==="alegacion_no_verificada"&&allegation.text.toLowerCase().includes("no se aporta"));
const byId=new Map(mods[1].edges.map(e=>[e.id,e]));
assert(byId.get("f27-ukr-blackrock-mou")?.source.includes("kmu.gov.ua"));
assert(byId.get("f27-blackrock-udf")?.note.includes("pro bono"));
assert(!mods.some(m=>m.edges.some(e=>e.claimStatus==="hecho_verificado_independiente"&&(e.a==="f25-lorenzo"||e.b==="f25-lorenzo"))),
 "No documentar obediencia o financiación del invitado mediante la mera participación");
const html=load("la-telarana/index.html");
const wf=load(".github/workflows/pages.yml");
const m=/var modules=(\[[^\n]+\]);/.exec(html);assert(m,"No hay registro modular");
const registered=JSON.parse(m[1]);
for(const i of [26,27]){
 const file=`fuente-${i}-revision-inicial.js`;
 assert(html.includes(`src="./${file}?v=`),"Falta carga en HTML");
 assert(wf.includes(`cp la-telarana/${file} dist/la-telarana/${file}`),"Fuente no desplegada");
 assert(registered.some(x=>x.key===`IDEA_TELARANA_F${i}_REVIEW`&&x.label===`Fuente ${i}`),"No se integra en el grafo");
}
const prog=JSON.parse(load("la-telarana/progreso-fuentes.json"));
const hist=JSON.parse(load("linea-historia/estudios-telarana.json"));
assert(prog.counts.inReview>=25,"No perder la revisión de F26/27");
assert.equal(prog.counts.notStarted,69-prog.counts.reviewedPublished-prog.counts.inReview,"No confundir entradas originales con fuentes canónicas");
assert.equal(prog.timeline.committedVerifiedEvents,hist.items.length);
for(const i of [26,27]){
 const row=prog.sourceCatalog.entries.find(x=>x.order===i);
 assert(row.tracking.inReview&&row.tracking.initiated&&!row.tracking.complete,
  "Fuente nueva no abierta o cerrada indebidamente");
 assert(!row.tracking.transcriptContentImported&&!row.tracking.docTranscriptionCreated,
  "Conservar estado del expediente Google Doc anterior F"+i);
 assert(row.tracking.timecodedTranscriptStoredInDrive&&row.tracking.timecodedTranscriptReadbackVerified&&
  Number(row.tracking.timecodedTranscriptCharactersReadBack)>10000,"TXT con minutajes no importado/validado F"+i);
}
for(const id of ["study-f27-ukr-blackrock-mou-2022","study-f27-ukr-blackrock-udf-2023","study-f26-eu-ai-act-vigor-2024"]){
 const x=hist.items.find(x=>x.id===id);
 assert(x?.investigation.status==="hecho_documentado"&&x.investigation.confirmedBy.url.startsWith("https://"),
  "Hito no sustentado por fuente oficial "+id);
}
console.log("OK F26/27: 8 relaciones documentadas, 11 menciones, 20 anclas de subtítulos, 4 hitos; audio sin cotejar.");
