/** Cobertura de TODO el catálogo de La Telaraña (solo metadatos; no transcripciones privadas).
 * Reportes efímeros de CI, jamás publicados en GitHub Pages. No equivale a fact-check.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const rows=feed.sourceCatalog?.entries||[];
assert.equal(rows.length,69,"Inventario original alterado sin reconciliar");
const orders=new Map(rows.map(x=>[x.order,x]));
assert.equal(orders.size,rows.length,"Órdenes duplicados");
const uniq=rows.filter(e=>e.duplicateOf==null),dupes=rows.filter(e=>e.duplicateOf!=null);
assert.equal(uniq.length,66,"Número de fuentes únicas inconsistente");
assert.equal(dupes.length,3,"Revisar duplicados");
for(const d of dupes)assert(orders.has(d.duplicateOf)&&orders.get(d.duplicateOf).duplicateOf==null,"Duplicado no apunta a canónica: "+d.order);
const reviewed=new Map((feed.reviewed||[]).map(x=>[x.order,x]));
const pending=new Map((feed.inReview||[]).map(x=>[x.order,x]));
const stats={catalogEntries:rows.length,canonicalSources:uniq.length,duplicateEntries:dupes.length,
 publishedReviewed:0,inReview:0,notStarted:0,confirmedTranscript:0,documentWithoutTranscript:0,
 noTranscriptDoc:0,unverifiedAudio:0,youtubeWithoutFullTranscript:0,missingSourceUrl:0};
const report=[];
for(const row of rows){
 const t=row.tracking||{},closed=reviewed.has(row.order),ongoing=pending.has(row.order);
 const duplicate=row.duplicateOf!=null;
 const fullTranscript=t.transcriptContentImported===true;
 const docCreated=t.docTranscriptionCreated===true;
 const entry={
 order:row.order,shortTitle:String(row.title||"").slice(0,140),type:row.type,
 canonicalOrder:duplicate?row.duplicateOf:row.order,
 status:duplicate?"duplicado":closed?"cerrada_editorialmente":ongoing?"en_revision":"no_iniciada",
 sourceUrlAvailable:Boolean(row.sourceUrl),
 transcriptDocumentExists:docCreated,
 transcriptTextConfirmed:fullTranscript,
 audioVerified:Boolean(t.audioMatched||t.audioVerified),
 minuteReferencesVerified:Number(t.minuteReferencesVerified)||0,
 biographyAndClaimsExternallyVerified:closed?null:false,
 artworkVerified:Boolean(t.imageRuntimeVerified),
 nextAction:duplicate?"Vincular a entrada canónica y evitar duplicar"
 :row.type==="youtube"&&!docCreated?"Conservar transcripción íntegra en Drive privado"
 :row.type==="youtube"&&!fullTranscript?"Recuperar transcripción literal; documento o índice no basta"
 :fullTranscript&&!closed?"Diarizar hablantes, extraer entidades/afirmaciones y contrastar con documentación primaria"
 :!closed?"Revisar fuente primaria y referencias verificables"
 :"Conservar auditoría sin elevar testimonios a hechos"
 };
 if(!duplicate){
 stats[closed?"publishedReviewed":ongoing?"inReview":"notStarted"]++;
 if(fullTranscript){stats.confirmedTranscript++;assert(docCreated,"Documento íntegro sin Doc "+row.order);}
 else if(docCreated)stats.documentWithoutTranscript++;
 else stats.noTranscriptDoc++;
 if(row.type==="youtube"&&!fullTranscript)stats.youtubeWithoutFullTranscript++;
 if(!entry.audioVerified)stats.unverifiedAudio++;
 if(!entry.sourceUrlAvailable)stats.missingSourceUrl++;
 }
 report.push(entry);
}
assert.equal(stats.publishedReviewed,3,"Estados cerrados fuera de registro");
assert.equal(stats.inReview,25,"En revisión fuera de inventario");
assert.equal(stats.notStarted,38,"Pendientes canónicas fuera de inventario");
assert.equal(stats.confirmedTranscript,22,"Cambio en transcripciones comprobadas sin reconciliar");
assert.equal(stats.youtubeWithoutFullTranscript,40,"Faltan transcripciones o son inválidas; revisar conteo");
const p8=report.find(x=>x.order===8);
assert(!p8.transcriptTextConfirmed&&p8.transcriptDocumentExists,
 "F8 es solo una plantilla, no una transcripción");
for(const order of [3,4,7,25]){
 assert(report.find(x=>x.order===order)?.transcriptTextConfirmed,"Texto ASR íntegro validado ausente en F"+order);
}
for(const x of report.filter(x=>x.canonicalOrder===x.order&&x.order>25&&x.order<69)){
 assert(!x.transcriptTextConfirmed,"Nueva transcripción no auditada en fuente "+x.order);
}
assert(stats.canonicalSources===stats.publishedReviewed+stats.inReview+stats.notStarted);
assert(feed.counts.uniqueSources===66&&feed.counts.duplicateEntries===3);
assert(stats.publishedReviewed+dupes.length+stats.inReview+stats.notStarted===69);
const flagged=report.filter(e=>e.status!=="duplicado"&&!e.audioVerified&&e.transcriptTextConfirmed).map(e=>e.order);
const priority=[25,3,4,7,6,9,10,11,12,13,14,16,17,19,20,22,23,24,2,1,18,21].filter(o=>report.find(e=>e.order===o)?.transcriptTextConfirmed);
const output={generatedFrom:"la-telarana/progreso-fuentes.json",generatedAtCatalogDate:feed.updatedAt,
 warning:"Cobertura operacional; no valida la veracidad de las declaraciones, ni el audio o los minutajes.",
 summary:stats,transcriptAvailableButAudioUnverified:flagged,reviewQueue:priority,rows:report};
fs.mkdirSync("audit-results",{recursive:true});
fs.writeFileSync("audit-results/telarana-all-source-coverage.json",JSON.stringify(output,null,2)+"\n");
console.log("COBERTURA INTEGRAL FUENTES (no certificación de afirmaciones)");
console.log(JSON.stringify(stats,null,2));
console.log("ASR íntegro sin cotejo audiovisual:",flagged.join(", "));
console.log("OK: 69 entradas / 66 únicas / 3 duplicados / 22 transcripciones confirmadas / 25 fuentes en revisión.");
