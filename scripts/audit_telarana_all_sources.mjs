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
 publishedReviewed:0,inReview:0,notStarted:0,confirmedTranscript:0,timecodedTranscript:0,documentWithoutTranscript:0,
 noTranscriptDoc:0,unverifiedAudio:0,youtubeWithoutFullTranscript:0,missingSourceUrl:0,
 incompleteSourcePublished:0,externalAsrPartial:0,fullTranscriptUnverifiedAudio:0};
const report=[];
for(const row of rows){
 const t=row.tracking||{},closed=reviewed.has(row.order),ongoing=pending.has(row.order);
 const duplicate=row.duplicateOf!=null;
 const legacyFullTranscript=t.transcriptContentImported===true;
 const timedTranscript=t.timecodedTranscriptStoredInDrive===true;
 const fullTranscript=legacyFullTranscript||timedTranscript;
 const docCreated=t.docTranscriptionCreated===true;
 const documentAvailable=docCreated||timedTranscript;
 const review=pending.get(row.order)||{};
 const externalAsrPartial=Boolean(t.externalASRExcerptReviewed||review.externalASR)&&!fullTranscript;
 const publishedModule=Boolean(review.sourcePrimaryModule&&fs.existsSync(review.sourcePrimaryModule)&&fs.readFileSync("la-telarana/index.html","utf8").includes(review.sourcePrimaryModule.split("/").pop()));
 const transcriptStage=timedTranscript?"subtitulos_con_tiempos_en_drive_sin_cotejo":legacyFullTranscript?"texto_en_doc_sin_cotejo":externalAsrPartial?"asr_externo_parcial":docCreated?"documento_sin_texto_integro":"sin_transcripcion_registrada";
 if(closed){assert(docCreated&&fullTranscript&&Number(t.transcriptCharactersReadBack)>10000,"Fuente cerrada sin texto íntegro F"+row.order);}
 if(legacyFullTranscript)assert(docCreated,"Transcripción heredada importada sin Google Doc F"+row.order);
 if(timedTranscript)assert(t.timecodedTranscriptContentImported===true&&t.timecodedTranscriptBytes>10000&&t.timecodedTranscriptSegments>100,
  "TXT minutado sin archivo registrado F"+row.order);
 if(review.transcriptDocHasFullText===true)assert(legacyFullTranscript&&docCreated,"Ficha contradice el contenido del Google Doc heredado en F"+row.order);
 if(!fullTranscript)assert(review.rawTranscriptAvailable!==true,"ASR parcial se presenta como íntegro en F"+row.order);
 const entry={
 order:row.order,shortTitle:String(row.title||"").slice(0,140),type:row.type,
 canonicalOrder:duplicate?row.duplicateOf:row.order,
 status:duplicate?"duplicado":closed?"cerrada_editorialmente":ongoing?"en_revision":"no_iniciada",
 sourceUrlAvailable:Boolean(row.sourceUrl),
 transcriptDocumentExists:documentAvailable,
 transcriptTextConfirmed:fullTranscript,
 transcriptLegacyDocTextConfirmed:legacyFullTranscript,
 timecodedTranscriptStoredInDrive:timedTranscript,
 transcriptStage,externalAsrPartial,publishedModuleWithoutTranscript:publishedModule&&!fullTranscript,
 audioVerified:Boolean(t.audioMatched||t.audioVerified),
 minuteReferencesVerified:Number(t.minuteReferencesVerified)||0,
 biographyAndClaimsExternallyVerified:closed?null:false,
 artworkVerified:Boolean(t.imageRuntimeVerified),
 nextAction:duplicate?"Vincular a entrada canónica y evitar duplicar"
 :row.type==="youtube"&&!documentAvailable?"Conservar transcripción íntegra en Drive privado"
 :row.type==="youtube"&&!fullTranscript?"Recuperar transcripción literal; documento o índice no basta"
 :fullTranscript&&!closed?"Diarizar hablantes, extraer entidades/afirmaciones y contrastar con documentación primaria"
 :!closed?"Revisar fuente primaria y referencias verificables"
 :"Conservar auditoría sin elevar testimonios a hechos"
 };
 if(!duplicate){
 stats[closed?"publishedReviewed":ongoing?"inReview":"notStarted"]++;
 if(fullTranscript){stats.confirmedTranscript++;assert(documentAvailable,"Texto íntegro sin documento o TXT "+row.order);}
 if(timedTranscript)stats.timecodedTranscript++;
 else if(docCreated)stats.documentWithoutTranscript++;
 else stats.noTranscriptDoc++;
 if(row.type==="youtube"&&!fullTranscript)stats.youtubeWithoutFullTranscript++;
 if(!entry.audioVerified)stats.unverifiedAudio++;
 if(fullTranscript&&!entry.audioVerified)stats.fullTranscriptUnverifiedAudio++;
 if(externalAsrPartial)stats.externalAsrPartial++;
 if(publishedModule&&!fullTranscript)stats.incompleteSourcePublished++;
 if(!entry.sourceUrlAvailable)stats.missingSourceUrl++;
 }
 report.push(entry);
}
assert.equal(stats.publishedReviewed,3,"Estados cerrados fuera de registro");
assert.equal(stats.inReview,(feed.inReview||[]).filter(x=>orders.get(x.order)?.duplicateOf==null).length,"En revisión fuera de inventario");
assert.equal(stats.notStarted,66-stats.publishedReviewed-stats.inReview,"Pendientes canónicas fuera de inventario");
assert.equal(stats.confirmedTranscript,29,"22 Docs heredados + 7 TXT recuperados que antes faltaban");
assert.equal(stats.timecodedTranscript,28,"Los 28 vídeos cronometrados deben estar registrados");
assert.equal(stats.youtubeWithoutFullTranscript,33,"Vídeos sin transcripción íntegra en ninguno de los formatos");
const p8=report.find(x=>x.order===8);
assert(p8.transcriptTextConfirmed&&p8.timecodedTranscriptStoredInDrive&&p8.transcriptLegacyDocTextConfirmed===false,
 "F8: nuevo TXT con tiempos no debe transformar la plantilla antigua en transcripción");
for(const order of [3,4,7,25]){
 assert(report.find(x=>x.order===order)?.transcriptTextConfirmed,"Texto ASR íntegro validado ausente en F"+order);
}
for(const x of report.filter(x=>x.canonicalOrder===x.order&&x.order>25&&x.order<69)){
 if([26,27,28,29,30,31].includes(x.order))assert(x.timecodedTranscriptStoredInDrive&&x.transcriptTextConfirmed,
   "F"+x.order+": TXT con minutajes no registrado");
 else assert(!x.transcriptTextConfirmed,"Transcripción no recibida o no auditada F"+x.order);
}
assert(stats.canonicalSources===stats.publishedReviewed+stats.inReview+stats.notStarted);
assert(feed.counts.uniqueSources===66&&feed.counts.duplicateEntries===3);
assert(stats.publishedReviewed+dupes.length+stats.inReview+stats.notStarted===69);
const flagged=report.filter(e=>e.status!=="duplicado"&&!e.audioVerified&&e.transcriptTextConfirmed).map(e=>e.order);
const priority=[31,30,29,28,27,26,8,25,3,4,7,6,9,10,11,12,13,14,16,17,19,20,22,23,24,2,1,18,21].filter(o=>report.find(e=>e.order===o)?.transcriptTextConfirmed);
const incompletePublished=report.filter(e=>e.publishedModuleWithoutTranscript).map(e=>e.order);
const partialASR=report.filter(e=>e.externalAsrPartial).map(e=>e.order);
const output={publishedIncompleteSourceOrders:incompletePublished,partialExternalAsrOrders:partialASR,generatedFrom:"la-telarana/progreso-fuentes.json",generatedAtCatalogDate:feed.updatedAt,
 warning:"Cobertura operacional; no valida la veracidad de las declaraciones, ni el audio o los minutajes.",
 summary:stats,transcriptAvailableButAudioUnverified:flagged,reviewQueue:priority,rows:report};
fs.mkdirSync("audit-results",{recursive:true});
fs.writeFileSync("audit-results/telarana-all-source-coverage.json",JSON.stringify(output,null,2)+"\n");
console.log("COBERTURA INTEGRAL FUENTES (no certificación de afirmaciones)");
console.log(JSON.stringify(stats,null,2));
console.log("ASR íntegro sin cotejo audiovisual:",flagged.join(", "));
console.log("Módulos publicados sin transcripción íntegra:",incompletePublished.join(", ")||"ninguno");
console.log("ASR externos parciales:",partialASR.join(", ")||"ninguno");
console.log("OK: 69 entradas / 66 únicas / 3 duplicados / "+stats.confirmedTranscript+" textos completos en algún formato / "+stats.timecodedTranscript+" con minutajes / "+stats.inReview+" fuentes en revisión.");
