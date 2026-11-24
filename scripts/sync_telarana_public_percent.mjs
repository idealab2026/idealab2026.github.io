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
 assert(Boolean(row.percentInherited)===Boolean(row.duplicateOf),"Indicador de duplicado incorrecto F"+row.order);
}
if(check){
 assert.equal(mismatches.length,0,"Desfase entre porcentajes publicados y registro: "+JSON.stringify(mismatches));
 console.log("OK: 74 entradas, porcentajes públicos sincronizados con inventario");
}else{
 if(mismatches.length)fs.writeFileSync(catalogPath,src.slice(0,start)+JSON.stringify(rows,null,2)+";\n");
 console.log("Sync: "+mismatches.length+" indicadores actualizados (sin datos privados): "+mismatches.map(x=>"F"+x.order+" "+x.from+"→"+x.to).join(", "));
}
