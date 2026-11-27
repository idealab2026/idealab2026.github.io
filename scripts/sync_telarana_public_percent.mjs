/* Sincroniza SOLO los porcentajes públicos estimados desde el inventario interno.
 * No exporta transcripciones, URLs de Drive, rutas locales, ni registros privados.
 * --check valida la paridad sin modificar archivos.
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const check=process.argv.includes("--check");
const registry=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const catalogPath="la-telarana/source-catalog-public.js";
const src=fs.readFileSync(catalogPath,"utf8");
const prefix="window.IDEA_TELARANA_PUBLIC_SOURCES = ";
const at=src.indexOf(prefix);
assert(at>=0,"No se encuentra el catálogo público");
const start=at+prefix.length;
const rows=JSON.parse(src.slice(start).trim().replace(/;\s*$/,""));
const internal=new Map(registry.sourceCatalog.entries.map(x=>[x.order,x]));
const publicByOrder=new Map(rows.map(x=>[x.order,x]));
assert(rows.length===74 && internal.size===74 && publicByOrder.size===74,"Inventario de fuentes desincronizado");
function progressV2(parent,registry){
 const s=parent.analysisCoverage?.signals||{},t=parent.tracking||{};
 const chars=Number(t.untimedTranscriptCharacters||t.transcriptCharactersReadBack||0);
 const segments=Number(t.timecodedTranscriptSegments||0);
 const targetEntities=Math.max(10,Number(s.expectedEntities)||Math.ceil(chars/6000)||Math.ceil(segments/340)||12);
 const targetStatements=Math.max(12,Number(s.expectedStatements)||Math.ceil(chars/3500)||Math.ceil(segments/170)||20);
 // Only a ledger of actually reviewed spans of the identified text earns coverage.
 const audit=parent.analysisCoverage?.textAudit;
 const hash=t.untimedTranscriptSha256||parent.originalTranscriptSha256;
 let textCoverage=null;
 if(audit&&hash&&audit.sha256===hash&&Number.isInteger(chars)&&chars>0&&audit.totalCharacters===chars&&Array.isArray(audit.reviewedRanges)){
  const ranges=audit.reviewedRanges;
  if(ranges.every(r=>Array.isArray(r)&&r.length===2&&Number.isInteger(r[0])&&Number.isInteger(r[1])&&r[0]>=0&&r[1]>r[0]&&r[1]<=chars)){
   let end=0,covered=0;
   for(const [a,b] of ranges.slice().sort((x,y)=>x[0]-y[0])){covered+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b)}
   textCoverage=Math.round(1000*covered/chars)/10;
  }
 }
 const closed=parent.reviewComplete===true&&t.complete===true&&registry.reviewed.some(r=>r.order===parent.order);
 const audio=t.audioVerified===true||t.audioMatched===true||t.timecodedTranscriptAudioVerified===true||t.untimedTranscriptAudioVerified===true;
 return {version:2,targetEntities,targetStatements,targetReferences:Math.max(5,Math.ceil(targetStatements/3)),textCoverage,closed,audioVerified:audio,recordedStatements:Math.max(0,Number(s.statements)||0),recordedChecks:Math.max(0,Number(s.independentChecks)||0),originalUnavailable:parent.order===48||parent.order===49};
}
const mismatches=[];
for(const row of rows){
 const ref=internal.get(row.order);
 assert(ref && row.duplicateOf===(ref.duplicateOf??null),"Identidad/duplicado desincronizado: F"+row.order);
 const parentOrder=row.duplicateOf??row.order;
 const parent=internal.get(parentOrder);
 const target=parent?.analysisCoverage?.percent;
 if(!Number.isInteger(target))continue;
 assert(target>=0&&target<=100,"Porcentaje de inventario inválido F"+parentOrder);
 if(row.percent!==target){
  mismatches.push({order:row.order,from:row.percent,to:target});
  if(!check)row.percent=target;
 }
 const next=progressV2(parent,registry);
 if(JSON.stringify(row.progressV2)!==JSON.stringify(next)){
  mismatches.push({order:row.order,from:"v2",to:"v2 actualizado"});
  if(!check)row.progressV2=next;
 }
 assert(Boolean(row.percentInherited)===Boolean(row.duplicateOf),"Indicador de duplicado incorrecto F"+row.order);
}
if(check){
 assert.equal(mismatches.length,0,"Desfase entre porcentajes publicados y registro: "+JSON.stringify(mismatches));
 console.log("OK: 74 entradas, porcentajes públicos sincronizados con inventario");
}else{
 if(mismatches.length)fs.writeFileSync(catalogPath,src.slice(0,start)+JSON.stringify(rows,null,2)+";\n");
 console.log("Sync: "+mismatches.length+" indicadores actualizados (sin datos privados): "+mismatches.map(x=>"F"+x.order+" "+x.from+"→"+x.to).join(", "));
}
