/* Registro editorial interno: inventario 69, controles dinámicos y privacidad. */
import assert from "node:assert/strict";
import fs from "node:fs";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const page=fs.readFileSync("la-telarana/index.html","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
const rows=feed.sourceCatalog.entries;
assert.equal(feed.originalCatalogTotal,33);
assert.equal(feed.total,69);
assert.equal(rows.length,69);
const orders=new Set(rows.map(e=>e.order));
assert.equal(orders.size,69,"Numeración duplicada");
const reviewed=new Set(feed.reviewed.map(e=>e.order));
const inReview=new Set(feed.inReview.map(e=>e.order));
assert.equal(reviewed.size,feed.reviewed.length);
assert.equal(inReview.size,feed.inReview.length);
for(const id of reviewed)assert(!inReview.has(id),"Fuente simultáneamente terminada y abierta "+id);
for(const id of [...reviewed,...inReview])assert(orders.has(id),"ID fuera del catálogo");
assert.equal(feed.counts.reviewedPublished,reviewed.size);
assert.equal(feed.counts.inReview,inReview.size);
assert.equal(feed.counts.notStarted,69-reviewed.size-inReview.size);
assert.equal(feed.counts.pending,69-reviewed.size);
assert.equal(feed.counts.missingOriginalUrl,rows.filter(e=>!e.sourceUrl).length);
assert.equal(feed.counts.duplicateEntries,rows.filter(e=>e.duplicateOf!==null).length);
assert.equal(feed.counts.uniqueSources,66);
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
}
for(const order of [1,18,21]){
 const row=rows.find(e=>e.order===order);
 assert(reviewed.has(order)&&row.reviewComplete===true&&row.tracking.complete===true,"Revisión cerrada pero sin trazabilidad "+order);
 assert(row.tracking.transcriptContentImported===true);
 assert(row.tracking.imageRuntimeVerified===false,"No inventar QA visual");
}
for(const order of [3,4,7,8,9,10,11,12,13,14,16,17,19,20,22,23,24,25]){
 const row=rows.find(e=>e.order===order);
 assert(row.tracking.docTranscriptionCreated&&row.tracking.transcriptContentImported, "Falta transcripción recuperada "+order);
 assert(row.tracking.inReview&&!row.tracking.complete,"Análisis incompleto no puede cerrarse "+order);
 assert(Number(row.tracking.transcriptCharactersReadBack)>10000,"Documento sin lectura o texto insuficiente "+order);
}
for(const order of [5,15]){
 const row=rows.find(e=>e.order===order);
 assert(row.tracking.transcriptContentImported===false,"No tratar un PDF o web como transcripción de vídeo");
}
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
console.log("OK: 69 fuentes, "+reviewed.size+" revisadas, "+inReview.size+" en revisión; textos controlados y seguimiento fuera del sitio");
