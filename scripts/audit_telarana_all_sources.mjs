/** Cobertura de TODO el catálogo de La Telaraña (solo metadatos; no transcripciones privadas).
 * Reportes efímeros de CI, jamás publicados en GitHub Pages. No equivale a fact-check.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
const feed=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const rows=feed.sourceCatalog?.entries||[];
assert.equal(rows.length,74,"Inventario original alterado sin reconciliar");
const orders=new Map(rows.map(x=>[x.order,x]));
assert.equal(orders.size,rows.length,"Órdenes duplicados");
const uniq=rows.filter(e=>e.duplicateOf==null),dupes=rows.filter(e=>e.duplicateOf!=null);
assert.equal(uniq.length,71,"Número de fuentes únicas inconsistente");
assert.equal(dupes.length,3,"Revisar duplicados");
for(const d of dupes)assert(orders.has(d.duplicateOf)&&orders.get(d.duplicateOf).duplicateOf==null,"Duplicado no apunta a canónica: "+d.order);
const reviewed=new Map((feed.reviewed||[]).map(x=>[x.order,x]));
const pending=new Map((feed.inReview||[]).map(x=>[x.order,x]));
const stats={catalogEntries:rows.length,canonicalSources:uniq.length,duplicateEntries:dupes.length,
 publishedReviewed:0,inReview:0,notStarted:0,textRecorded:0,timecodedTranscript:0,untimedTranscript:0,
 noTextRecorded:0,audioVerificationNotRecorded:0,youtubeWithoutTextRecorded:0,missingSourceUrl:0,
 publishedModuleWithoutText:0,externalAsrPartial:0,textWithoutAudioVerification:0};
const report=[];
for(const row of rows){
 const t=row.tracking||{},closed=reviewed.has(row.order),ongoing=pending.has(row.order);
 const duplicate=row.duplicateOf!=null;
 const legacyFullTranscript=t.transcriptContentImported===true;
 const timedTranscript=t.timecodedTranscriptStoredInDrive===true;
 const untimedTranscript=t.untimedTranscriptStoredInDrive===true;
 // Importar o leer un archivo no prueba su integridad frente al audiovisual.
 const textRecorded=legacyFullTranscript||timedTranscript||untimedTranscript;
 const docCreated=t.docTranscriptionCreated===true;
 const documentAvailable=docCreated||timedTranscript||untimedTranscript;
 const review=pending.get(row.order)||{};
 const externalAsrPartial=Boolean(t.externalASRExcerptReviewed||review.externalASR)&&!textRecorded;
 const publishedModule=Boolean(review.sourcePrimaryModule&&fs.existsSync(review.sourcePrimaryModule)&&fs.readFileSync("la-telarana/index.html","utf8").includes(review.sourcePrimaryModule.split("/").pop()));
 const transcriptStage=timedTranscript?"subtitulos_con_tiempos_en_drive_sin_cotejo":untimedTranscript?"notebooklm_sin_minutajes_integridad_por_verificar":legacyFullTranscript?"texto_en_doc_integridad_por_verificar":externalAsrPartial?"asr_externo_parcial":docCreated?"documento_sin_texto_registrado":"sin_transcripcion_registrada";
 if(closed){assert(docCreated&&textRecorded&&Number(t.transcriptCharactersReadBack)>10000,"Fuente cerrada sin texto registrado F"+row.order);}
 if(legacyFullTranscript)assert(docCreated,"Transcripción heredada importada sin Google Doc F"+row.order);
 if(timedTranscript)assert(t.timecodedTranscriptContentImported===true&&t.timecodedTranscriptBytes>10000&&t.timecodedTranscriptSegments>100,
  "TXT minutado sin archivo registrado F"+row.order);
 if(review.transcriptDocHasFullText===true)assert(legacyFullTranscript&&docCreated,"Ficha contradice el contenido del Google Doc heredado en F"+row.order);
 if(!textRecorded)assert(review.rawTranscriptAvailable!==true,"Texto indicado pero no registrado en F"+row.order);
 const entry={
 order:row.order,shortTitle:String(row.title||"").slice(0,140),type:row.type,
 canonicalOrder:duplicate?row.duplicateOf:row.order,
 status:duplicate?"duplicado":closed?"cerrada_editorialmente":ongoing?"en_revision":"no_iniciada",
 sourceUrlAvailable:Boolean(row.sourceUrl),
 transcriptDocumentExists:documentAvailable,
 transcriptTextRecorded:textRecorded,
 transcriptLegacyDocTextRecorded:legacyFullTranscript,
 sourceIntegrityVerified:t.transcriptCompletenessVerified===true||t.untimedTranscriptCompletenessVerified===true,
 timecodedTranscriptStoredInDrive:timedTranscript,
 untimedTranscriptStoredInDrive:untimedTranscript,
 transcriptStage,externalAsrPartial,publishedModuleWithoutText:publishedModule&&!textRecorded,
 audioVerified:Boolean(t.audioMatched||t.audioVerified),
 minuteReferencesVerified:Number(t.minuteReferencesVerified)||0,
 biographyAndClaimsExternallyVerified:closed?null:false,
 artworkVerified:Boolean(t.imageRuntimeVerified),
 nextAction:duplicate?"Vincular a entrada canónica y evitar duplicar"
 :row.type==="youtube"&&!documentAvailable?"Conservar transcripción íntegra en Drive privado"
 :row.type==="youtube"&&!textRecorded?"Recuperar texto; un documento o índice vacío no basta"
 :textRecorded&&!closed?"Verificar integridad y audio; extraer entidades/afirmaciones y contrastar con documentación primaria"
 :!closed?"Revisar fuente primaria y referencias verificables"
 :"Conservar auditoría sin elevar testimonios a hechos"
 };
 if(!duplicate){
 stats[closed?"publishedReviewed":ongoing?"inReview":"notStarted"]++;
 if(textRecorded){stats.textRecorded++;assert(documentAvailable,"Texto sin documento o TXT registrado "+row.order);}
 if(timedTranscript)stats.timecodedTranscript++;
 if(untimedTranscript)stats.untimedTranscript++;
 if(!textRecorded)stats.noTextRecorded++;
 if(row.type==="youtube"&&!textRecorded)stats.youtubeWithoutTextRecorded++;
 if(!entry.audioVerified)stats.audioVerificationNotRecorded++;
 if(textRecorded&&!entry.audioVerified)stats.textWithoutAudioVerification++;
 if(externalAsrPartial)stats.externalAsrPartial++;
 if(publishedModule&&!textRecorded)stats.publishedModuleWithoutText++;
 if(!entry.sourceUrlAvailable)stats.missingSourceUrl++;
 }
 report.push(entry);
}
assert.equal(stats.publishedReviewed,3,"Estados cerrados fuera de registro");
assert.equal(stats.inReview,(feed.inReview||[]).filter(x=>orders.get(x.order)?.duplicateOf==null).length,"En revisión fuera de inventario");
assert.equal(stats.notStarted,71-stats.publishedReviewed-stats.inReview,"Pendientes canónicas fuera de inventario");
assert.equal(stats.timecodedTranscript,28,"Los 28 vídeos cronometrados deben estar registrados");
const p8=report.find(x=>x.order===8);
assert(p8.transcriptTextRecorded&&p8.timecodedTranscriptStoredInDrive&&p8.transcriptLegacyDocTextRecorded===false,
 "F8: nuevo TXT con tiempos no debe transformar la plantilla antigua en transcripción");
for(const order of [3,4,7,25]){
 assert(report.find(x=>x.order===order)?.transcriptTextRecorded,"Texto ASR registrado ausente en F"+order);
}
for(const x of report.filter(x=>x.canonicalOrder===x.order&&x.order>25&&x.order<69)){
 if([26,27,28,29,30,31].includes(x.order))assert(x.timecodedTranscriptStoredInDrive&&x.transcriptTextRecorded,
   "F"+x.order+": TXT con minutajes no registrado");
}
assert(report.find(x=>x.order===33)?.transcriptTextRecorded&&!report.find(x=>x.order===33)?.sourceIntegrityVerified,
 "F33: el TXT existe, pero su integridad respecto al vídeo sigue sin verificar");
assert(!report.find(x=>x.order===25)?.sourceIntegrityVerified,"F25 no debe darse por íntegra por el mero archivo");
assert(stats.canonicalSources===stats.publishedReviewed+stats.inReview+stats.notStarted);
assert(feed.counts.uniqueSources===71&&feed.counts.duplicateEntries===3);
assert(stats.publishedReviewed+dupes.length+stats.inReview+stats.notStarted===74);
const flagged=report.filter(e=>e.status!=="duplicado"&&!e.audioVerified&&e.transcriptTextRecorded).map(e=>e.order);
const priority=report.filter(e=>e.status!=="duplicado").sort((a,b)=>({no_iniciada:0,en_revision:1,cerrada_editorialmente:2}[a.status]-{no_iniciada:0,en_revision:1,cerrada_editorialmente:2}[b.status])||a.order-b.order).map(e=>e.order);
const withoutTextPublished=report.filter(e=>e.publishedModuleWithoutText).map(e=>e.order);
const partialASR=report.filter(e=>e.externalAsrPartial).map(e=>e.order);
const output={publishedWithoutTextOrders:withoutTextPublished,partialExternalAsrOrders:partialASR,generatedFrom:"la-telarana/progreso-fuentes.json",generatedAtCatalogDate:feed.updatedAt,
 warning:"Registro operativo: la presencia de texto no acredita integridad, audio, minutajes ni veracidad de declaraciones.",
 summary:stats,transcriptAvailableButAudioUnverified:flagged,reviewQueue:priority,rows:report};
fs.mkdirSync("audit-results",{recursive:true});
fs.writeFileSync("audit-results/telarana-all-source-coverage.json",JSON.stringify(output,null,2)+"\n");
console.log("COBERTURA INTEGRAL FUENTES (no certificación de afirmaciones)");
console.log(JSON.stringify(stats,null,2));
console.log("Texto registrado sin cotejo audiovisual:",flagged.join(", "));
console.log("Módulos publicados sin texto registrado:",withoutTextPublished.join(", ")||"ninguno");
console.log("ASR externos parciales:",partialASR.join(", ")||"ninguno");
console.log("OK: 74 entradas / 71 únicas / 3 duplicados / "+stats.textRecorded+" textos registrados sin garantía de integridad / "+stats.timecodedTranscript+" con minutajes registrados / "+stats.inReview+" fuentes en revisión.");
