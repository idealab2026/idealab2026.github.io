/** F29: responsabilidad documental, atribución de declaraciones y separación de subvenciones. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const context={window:{}};
vm.runInNewContext(read("la-telarana/fuente-29-revision-inicial.js"),context,{filename:"fuente-29-revision-inicial.js",timeout:6000});
const mod=context.window.IDEA_TELARANA_F29_REVIEW;
assert.equal(mod.metadata.sourceOrder,29);
assert.equal(mod.nodes.length,16);
assert.equal(mod.edges.length,14);
assert(mod.metadata.transcriptAvailable===true&&mod.metadata.fullTranscriptAvailableExternally===true&&mod.metadata.fullTranscriptPreservedInDrive===true&&mod.metadata.transcriptSegments===1541,
 "TXT minutado presente en Drive; dossier Google Doc previo sigue siendo parcial");
assert(!mod.metadata.audioVerified&&!mod.metadata.minuteVerified);
assert.equal(mod.metadata.editorialDossierUrl,null,"El expediente privado no se publica");
const ids=new Set(mod.nodes.map(n=>n.id));
assert.equal(ids.size,mod.nodes.length);
const factual=mod.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente");
const mention=mod.edges.filter(e=>e.claimStatus==="mencion_editorial_no_equivale_a_relacion_sustantiva");
assert.equal(factual.length,8);assert.equal(mention.length,6);
for(const e of mod.edges){
 assert(ids.has(e.a)&&ids.has(e.b)&&e.a!==e.b,"Arista con referencia ausente "+e.id);
 assert(/^https:\/\//.test(e.source)&&e.note.length>=115,"Arista sin respaldo o límites: "+e.id);
 assert((e.confidence==="documentado")===factual.includes(e),"Mención promovida a hecho "+e.id);
}
for(const id of ["f29-subvencion-2017","f29-subvencion-2018"])assert(ids.has(id),"No fusionar ejercicios presupuestarios");
assert(factual.some(e=>e.a==="f29-foreign-office"&&e.b==="f29-subvencion-2017"));
assert(factual.some(e=>e.a==="f29-foreign-office"&&e.b==="f29-subvencion-2018"));
assert(factual.some(e=>e.a==="f29-cssf"&&e.b==="f29-integrity-initiative"));
assert(factual.some(e=>e.a==="f29-departamento-seguridad"&&e.b==="f29-ballesteros"));
assert(!mod.edges.some(e=>e.claimStatus==="hecho_verificado_independiente"&&(e.a==="f04-pedro-banos"||e.b==="f04-pedro-banos")),"No acreditar operación institucional contra Baños por mera alegación");
for(const id of ["on-george-soros","on-open-society"])assert(!mod.edges.some(e=>e.claimStatus==="hecho_verificado_independiente"&&(e.a===id||e.b===id)),"No inventar vínculo causal Soros/OSF");
const pedro=mod.nodes.find(n=>n.id==="f04-pedro-banos");
assert.equal(pedro?.podcastNotes?.length,4);
for(const n of pedro.podcastNotes.filter(n=>n.source.includes("podscan.fm"))){
 assert(n.timeSec===null,"ASR externo previo no dispone de cotejo de audio");
 assert(n.text.length>180&&["alegacion_no_verificada","opinion_atribuida","mencion_contextual"].includes(n.status));
}
assert(pedro.podcastNotes.some(n=>Number.isFinite(n.timeSec)&&n.source.includes("youtube.com/watch")),
 "La transcripción nueva debe aportar ancla propia sin sustituir ASR externo");
const html=read("la-telarana/index.html"),wf=read(".github/workflows/pages.yml");
assert(html.includes('src="./fuente-29-revision-inicial.js?v='),"HTML no importa F29");
assert(wf.includes("cp la-telarana/fuente-29-revision-inicial.js dist/la-telarana/fuente-29-revision-inicial.js"),"Pages no distribuye F29");
const match=/var modules=(\[[^\n]+\]);/.exec(html);assert(match);
assert(JSON.parse(match[1]).some(x=>x.key==="IDEA_TELARANA_F29_REVIEW"&&x.label==="Fuente 29"));
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const history=JSON.parse(read("linea-historia/estudios-telarana.json"));
assert.equal(history.items.length,progress.timeline.committedVerifiedEvents);
const tracker=progress.sourceCatalog.entries.find(s=>s.order===29);
assert(tracker.tracking.inReview&&!tracker.tracking.transcriptContentImported&&!tracker.tracking.docTranscriptionCreated,
 "El expediente previo continúa incompleto");
assert(tracker.tracking.timecodedTranscriptStoredInDrive&&tracker.tracking.timecodedTranscriptReadbackVerified&&
 tracker.tracking.timecodedTranscriptCharactersReadBack>10000,
 "F29: copia TXT cronometrada no verificada en Drive");
assert(tracker.tracking.editorialDossierCreated&&tracker.tracking.externalTranscriptUrl.startsWith("https://"));
for(const id of ["study-f29-ballesteros-dsn-2018","study-f29-fco-subsidies-2018","study-f29-commons-integrity-2018","study-f29-carlson-interview-2026","study-f29-banos-program-2026"]){
 const event=history.items.find(x=>x.id===id);
 assert(event?.investigation?.status==="hecho_documentado"&&event.investigation.confirmedBy.url.startsWith("https://"),"Hito documental ausente "+id);
}
console.log("OK F29: 8 relaciones documentales y 6 editoriales, 4 notas con minutajes adicionales, 5 hitos; audio pendiente.");
