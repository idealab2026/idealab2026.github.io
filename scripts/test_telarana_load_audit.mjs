/**
 * Reconstruye la carga real de La Telaraña usando los scripts publicados,
 * contabiliza altas netas por fuente y detecta módulos ausentes.
 * No lee las transcripciones ni el inventario interno.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const siteDir="la-telarana";
const html=fs.readFileSync(siteDir+"/index.html","utf8");
const scriptPaths=[...html.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
const ignored=new Set(["photo-catalog.js","person-biographies.js","layout-seed-v2.js","graph-3d.js"]);
const scripts=scriptPaths.filter(name=>!ignored.has(name));
const ctx=vm.createContext({
 window:{},
 data:{nodes:[],edges:[]},
 demo:false,
 seedError:false,
 document:{getElementById:()=>null},
 safePhoto:s=>typeof s==="string"&&/^https?:\/\//.test(s)?s:"",
 console
});
for(const name of scripts){
 const file=siteDir+"/"+name;
 assert(fs.existsSync(file),"Falta script referenciado: "+file);
 vm.runInContext(fs.readFileSync(file,"utf8"),ctx,{filename:file,timeout:5000});
}
const inner=html.slice(html.lastIndexOf("<script>")+8,html.lastIndexOf("</script>"));
const start=inner.indexOf("function sanitizePodcastNotes(value){");
const end=inner.indexOf("function mergeStudy(v){",start);
const loadStart=inner.indexOf("var loadAudit=[]");
const loadEnd=inner.indexOf("function safePhoto(",loadStart);
assert(start>=0&&end>start&&loadStart>=0&&loadEnd>loadStart,"No se identifican las funciones de carga");
vm.runInContext(inner.slice(start,end),ctx,{timeout:5000});
vm.runInContext(inner.slice(loadStart,loadEnd),ctx,{timeout:5000});
vm.runInContext("load()",ctx,{timeout:10000});

const audit=Array.from(ctx.loadAudit||[]);
assert(audit.length>=27,"Se ha reducido inesperadamente el número de módulos");
const missing=audit.filter(r=>!r.available).map(r=>r.label);
assert.equal(missing.length,0,"Fuentes omitidas: "+missing.join(", "));
assert.equal(audit.at(-1).total,ctx.data.nodes.length,"El último total no coincide con el grafo");
assert(audit.every(r=>r.added>=0&&r.edges>=0&&r.total===r.before+r.added),"Delta inválido");
assert(audit.every((r,i)=>i===0||r.before===audit[i-1].total),"Fallo de continuidad de los totales");
// Cada lote de perfiles ha de contabilizar solo identidades mencionadas por esa fuente.
assert(html.includes("Object.prototype.hasOwnProperty.call(p.sources,orderFilter)"),"Los perfiles se atribuyen a la primera fuente en vez de a su fuente original");
for(const order of Object.keys(ctx.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS?.sourceIds||{})){
 const matching=audit.filter(r=>r.label==="Perfiles de la fuente "+order);
 assert.equal(matching.length,1,"Debe existir exactamente una etapa de perfiles para fuente "+order);
 assert(matching[0].available,"No se han cargado los perfiles de fuente "+order);
}
const summary=audit.reduce((n,r)=>n+r.added,0);
assert.equal(summary,ctx.data.nodes.length,"Las altas de cada etapa no cuadran con el total");
const ids=new Set(ctx.data.nodes.map(n=>n.id));
assert.equal(ids.size,ctx.data.nodes.length,"Identificadores de entidad duplicados");
assert(ctx.data.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"Existen relaciones huérfanas");
console.log("AUDITORÍA DE ENTIDADES");
for(const r of audit){
 console.log([r.label,String(r.before),String(r.added>=0?"+"+r.added:r.added),String(r.total),String("+"+r.edges)].join(" | "));
}
console.log("TOTAL: "+ctx.data.nodes.length+" entidades y "+ctx.data.edges.length+" relaciones; "+audit.length+" etapas.");
