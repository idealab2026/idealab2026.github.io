/* Registro editorial interno: inventario 74, controles dinámicos y privacidad. */
import assert from "node:assert/strict";
import fs from "node:fs";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const page=fs.readFileSync("la-telarana/index.html","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
const rows=feed.sourceCatalog.entries;
assert.equal(feed.originalCatalogTotal,33);
assert.equal(feed.total,74);
assert.equal(rows.length,74);
const orders=new Set(rows.map(e=>e.order));
assert.equal(orders.size,74,"Numeración duplicada");
const reviewed=new Set(feed.reviewed.map(e=>e.order));
const inReview=new Set(feed.inReview.map(e=>e.order));
assert.equal(reviewed.size,feed.reviewed.length);
assert.equal(inReview.size,feed.inReview.length);
for(const id of reviewed)assert(!inReview.has(id),"Fuente simultáneamente terminada y abierta "+id);
for(const id of [...reviewed,...inReview])assert(orders.has(id),"ID fuera del catálogo");
assert.equal(feed.counts.reviewedPublished,reviewed.size);
assert.equal(feed.counts.inReview,inReview.size);
assert.equal(feed.counts.notStarted,74-reviewed.size-inReview.size);
assert.equal(feed.counts.pending,74-reviewed.size);
assert.equal(feed.counts.missingOriginalUrl,rows.filter(e=>!e.originalUrl).length);
assert.equal(feed.counts.duplicateEntries,rows.filter(e=>e.duplicateOf!==null).length);
assert.equal(feed.counts.uniqueSources,71);
assert.equal(feed.inventory.notebooks.length,8);
assert.equal(feed.inventory.notebooks.reduce((n,x)=>n+x.count,0),67);
assert.equal(feed.inventory.recoveredOriginalEntries,33);
assert.equal(feed.inventory.recoveredIndividualLinks,64);
assert.equal(feed.inventory.uniqueUrlCountConfirmed,true);
assert(feed.workflowTracking.internalOnly&&feed.workflowTracking.publicSiteDisplay===false);
for(const e of rows){
 const t=e.tracking||{};
 assert.equal(typeof t.initiated,"boolean", "Sin iniciado: "+e.order);
 assert.equal(typeof t.docTranscriptionCreated,"boolean", "Sin control doc: "+e.order);
 assert.equal(typeof t.transcriptContentImported,"boolean", "Sin verificación texto: "+e.order);
 assert.equal(typeof t.complete,"boolean");
 assert.equal(typeof t.inReview,"boolean");
 assert.equal(typeof t.imageRuntimeVerified,"boolean");
 if(t.complete)assert(reviewed.has(e.order),"Marcado completo fuera de cierre "+e.order);
 if(t.inReview)assert(inReview.has(e.order),"En revisión fuera de seguimiento "+e.order);
 if(t.transcriptContentImported)assert(t.docTranscriptionCreated,"Texto sin documento "+e.order);
 // Puerta de cierre: una sinopsis, ficha editorial o ASR parcial no equivalen a una transcripción íntegra.
 if(t.complete||e.reviewComplete===true||reviewed.has(e.order)){
   assert(t.complete&&e.reviewComplete===true&&reviewed.has(e.order),
     "Cierre editorial desincronizado para F"+e.order);
   assert(t.docTranscriptionCreated===true&&t.transcriptContentImported===true,
     "Prohibido cerrar F"+e.order+" sin transcripción íntegra importada en Drive");
   assert(Number(t.transcriptCharactersReadBack)>10000,
     "Prohibido cerrar F"+e.order+" sin lectura de texto completo registrada");
 }
 const review=feed.inReview.find(x=>x.order===e.order);
 if(review){
   if(review.reviewComplete===true)assert.fail("F"+e.order+" abierta marcada como completada");
   if(review.transcriptDocHasFullText===true){
     assert(t.docTranscriptionCreated===true&&t.transcriptContentImported===true,
       "F"+e.order+": la ficha afirma transcripción completa, pero el catálogo la desmiente");
   }
   if(t.transcriptContentImported!==true){
     assert(review.transcriptDocHasFullText!==true&&
       (review.rawTranscriptAvailable!==true||t.timecodedTranscriptStoredInDrive===true||t.untimedTranscriptStoredInDrive===true),
       "F"+e.order+": documento antiguo parcial confundido con un TXT almacenado en Drive");
   }
 }
}
for(const order of [1,18,21]){
 const row=rows.find(e=>e.order===order);
 assert(reviewed.has(order)&&row.reviewComplete===true&&row.tracking.complete===true,"Revisión cerrada pero sin trazabilidad "+order);
 assert(row.tracking.transcriptContentImported===true);
 assert(row.tracking.imageRuntimeVerified===false,"No inventar QA visual");
}
for(const order of [3,4,7,9,10,11,12,13,14,16,17,19,20,22,23,24,25]){
 const row=rows.find(e=>e.order===order);
 assert(row.tracking.docTranscriptionCreated&&row.tracking.transcriptContentImported, "Falta transcripción recuperada "+order);
 assert(row.tracking.inReview&&!row.tracking.complete,"Análisis incompleto no puede cerrarse "+order);
 assert(Number(row.tracking.transcriptCharactersReadBack)>10000,"Documento sin lectura o texto insuficiente "+order);
}
for(const [order,minimum] of [[3,90000],[4,80000],[7,300000]]){
 const row=rows.find(e=>e.order===order),review=feed.inReview.find(e=>e.order===order);
 assert(row.tracking.driveReadbackVerified&&row.tracking.transcriptContentImported,"ASR no validado para fuente "+order);
 assert(row.tracking.transcriptCharactersReadBack>=minimum&&review.transcriptDocHasFullText===true,
 "Texto insuficiente o desincronizado F"+order);
}
// Regresión documental: los módulos F26-F30 pueden publicarse como contexto,
// pero nunca deben computarse como entrevistas transcritas ni como revisión cerrada.
for(const order of [26,27,28,29,30]){
 const row=rows.find(e=>e.order===order),review=feed.inReview.find(e=>e.order===order);
 assert(row&&review,"Falta seguimiento documental F"+order);
 if(row.tracking.transcriptContentImported===true){
   assert(row.tracking.docTranscriptionCreated===true&&Number(row.tracking.transcriptCharactersReadBack)>10000,
     "F"+order+": nueva transcripción sin documento y lectura íntegra verificados");
   assert(review.transcriptDocHasFullText===true,
     "F"+order+": actualizar ficha al recuperar el texto íntegro");
 }else{
   assert(row.tracking.complete===false&&row.reviewComplete===false,
     "F"+order+": fuente sin transcripción cerrada prematuramente");
   assert(review.transcriptDocHasFullText!==true&&review.reviewComplete!==true,
     "F"+order+": ficha afirma completitud sin respaldo");
 }
 assert(page.includes("fuente-"+order+"-revision-inicial.js"),
   "F"+order+": módulo público ausente; revisar catálogo y despliegue");
}
assert(feed.inReview.find(e=>e.order===29)?.externalASR,
  "F29: conservar referencia al ASR externo parcial, sin elevarlo a transcripción íntegra");
const f8=rows.find(e=>e.order===8),r8=feed.inReview.find(e=>e.order===8);
assert(f8.tracking.docTranscriptionCreated&&f8.tracking.transcriptContentImported===false,
 "F8 no tiene transcripción: no confundir ficha editorial con texto ASR");
assert(f8.tracking.transcriptCharactersReadBack===0&&r8.transcriptDocHasFullText===false,
 "Regresión: documento F8 falsamente marcado como transcripción íntegra");
for(const order of [5,15]){
 const row=rows.find(e=>e.order===order);
 assert(row.tracking.transcriptContentImported===false,"No tratar un PDF o web como transcripción de vídeo");
}
// Las cinco nuevas fuentes tienen documento manual vacío; no son entrevistas transcritas.
const freshIds=["rLGs5AXE5iQ","WPW8yHSduFA","z-0I92HGceY","KxrKZU9T_6I","82W2taMMsTo"];
for(let i=0;i<freshIds.length;i++){
 const f=rows.find(x=>x.order===70+i);
 assert(f&&f.videoId===freshIds[i]&&f.duplicateOf===null,"F"+(70+i)+": falta vídeo o identificador");
 assert(f.tracking.docTranscriptionCreated&&f.tracking.manualTranscriptTemplateCreated&&!f.tracking.manualTranscriptPending&&f.tracking.manualTranscriptReceived,"F"+f.order+": falta transcripción manual recibida");
 assert(f.tracking.transcriptContentImported&&f.tracking.manualTranscriptTimecodedInNativeDoc&&f.tracking.transcriptCharactersReadBack>100000&&f.tracking.manualTimestampMarkers>700&&f.tracking.inReview&&!f.tracking.complete,"F"+f.order+": falta lectura de vuelta de transcripción o se cerró indebidamente");
 assert(!f.tracking.audioVerified&&!f.tracking.timecodedTranscriptStoredInDrive&&!f.tracking.untimedTranscriptStoredInDrive,"F"+f.order+": no confundir Doc aportado con TXT independiente o audio verificado");
 assert(f.tracking.docTranscriptionUrl.startsWith("https://docs.google.com/document/d/"),"F"+f.order+": URL de Doc inválida");
 assert(!page.includes(f.videoId)&&!page.includes(f.tracking.docTranscriptionUrl),"El inventario privado no debe filtrarse a la web");
}
assert(rows.find(f=>f.order===34)?.videoId==="j_5Tj0kIj2c","F34 debe conservarse como la única entrada de su vídeo");
const duplicate=rows.find(e=>e.order===36);
assert.equal(duplicate.duplicateOf,4,"Conservar el vínculo a la fuente canónica");
const s2=rows.find(e=>e.order===2),s6=rows.find(e=>e.order===6);
assert(s2.tracking.docTranscriptionUrl.startsWith("https://docs.google.com/document/d/"));
assert.equal(s6.originalTranscriptSha256,"34e777038c189bf0ab64d64bc7ea220e954c5f55bc55ce32e1d5e7b50eab6bc6");
assert.equal(s6.transcriptSha256VerifiedDriveRoundTrip,true);
assert.equal(s6.reviewComplete,false);
assert.equal(feed.timeline.committedVerifiedEvents,JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8")).items.length);
assert(!page.includes('id="source-review-rows"')&&!page.includes('id="source-review-fill"'));
assert(!page.includes('progreso-fuentes.json')&&!page.includes('source-progress.js'));
assert(!workflow.includes('cp la-telarana/progreso-fuentes.json dist/'));
assert(!workflow.includes('cp la-telarana/source-progress.js dist/'));
for(const name of ["fuente-18-epstein-lorenzo-editorial.js","fuente-21-orden-mundial-editorial.js","fuente-09-villarejo-revision.js"]){
 assert(page.includes(name),"Falta importar fuente: "+name);
 assert(workflow.includes("cp la-telarana/"+name),"Falta fuente en la distribución pública: "+name);
}
// Nueva vía documental: TXT con minutajes en Drive, sin reemplazar ni dar por íntegro el Google Doc anterior.
const timed=rows.filter(e=>e.tracking?.timecodedTranscriptStoredInDrive===true);
assert.equal(timed.length,28,"Se esperan 28 vídeos únicos con TXT minutado en Drive");
assert.equal(new Set(timed.map(e=>e.videoId)).size,28,"Transcripciones minutadas duplicadas");
for(const e of timed){
 const t=e.tracking;
 assert(e.duplicateOf===null&&t.timecodedTranscriptContentImported===true,
  "F"+e.order+": TXT minutado no vinculado a fuente canónica");
 assert(t.timecodedTranscriptBytes>10000&&t.timecodedTranscriptSegments>100,
  "F"+e.order+": no hay respaldo suficiente de TXT/segmentos");
 assert(t.timecodedTranscriptAudioVerified===false&&t.complete===Boolean(reviewed.has(e.order)),
  "F"+e.order+": se ha confundido recuperación con cierre editorial");
}
for(const i of [8,26,27,28,29,30,31]){
 const e=rows.find(x=>x.order===i);
 assert(e.tracking.timecodedTranscriptReadbackVerified&&e.tracking.timecodedTranscriptCharactersReadBack>10000,
  "F"+i+": falta lectura de vuelta del TXT en Drive");
}
assert(inReview.has(31)&&page.includes('fuente-31-revision-inicial.js')&&
 workflow.includes('cp la-telarana/fuente-31-revision-inicial.js dist/'),
 "F31 debe figurar abierta y distribuida en Pages");
console.log("OK: 74 fuentes, "+reviewed.size+" revisadas, "+inReview.size+" en revisión; textos controlados y seguimiento fuera del sitio");
