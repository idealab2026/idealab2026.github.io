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
const usaPhase=audit.find(x=>x.label==="USAID · programas, financiación y procesos judiciales");
assert(usaPhase?.available&&usaPhase.edges===41,"El importador descartó aristas USAID: "+JSON.stringify(usaPhase));
const rkPhase=audit.find(x=>x.label==="USAID · Rockefeller y antecedentes históricos");
assert(rkPhase?.available&&rkPhase.edges===15,"Se han perdido eslabones de la cadena Rockefeller: "+JSON.stringify(rkPhase));
const rkSuccession=audit.find(x=>x.label==="USAID · Rockefeller, IBEC y cadena IIAA–FOA–ICA");
assert(rkSuccession?.available&&rkSuccession.edges===8,"Faltan aristas de la sucesión Rockefeller–USAID: "+JSON.stringify(rkSuccession));
const f26=audit.find(x=>x.label==="Fuente 26"),f27=audit.find(x=>x.label==="Fuente 27");
assert(f26?.available&&f27?.available&&f26.edges>=2&&f27.edges>=4,"El grafo no carga las fuentes 26/27 o pierde sus enlaces");
const f28=audit.find(x=>x.label==="Fuente 28");
assert(f28?.available&&f28.edges>=9,"La fuente 28 no ha cargado 14 relaciones documentales y editoriales");
const f29=audit.find(x=>x.label==="Fuente 29");
assert(f29?.available&&f29.edges>=11,"F29 no se ha incorporado íntegramente al grafo o se han eliminado enlaces institucionales");
const f30=audit.find(x=>x.label==="Fuente 30");
assert(f30?.available&&f30.edges>=11,"F30 no se ha cargado o sus relaciones institucionales están incompletas");
// Regresión F72/F73: cuando dos fuentes estudian una misma relación, no
// duplicar la arista ni perder el documento de corroboración del segundo caso.
for(const n of [72,73]){
 const stage=audit.find(x=>x.label==="Fuente "+n+" · Eric Frattini");
 assert(stage?.available,"F"+n+" no se incorpora al grafo público");
}
const pagerNotes=ctx.data.edges.filter(e=>Array.isArray(e.podcastNotes)&&e.podcastNotes.some(n=>
 n.episodeId==="idealab-f73-frattini"&&String(n.source||"").includes("reuters.com")&&/buscapersonas|explosiones/i.test(n.text||"")));
assert(pagerNotes.length>=1,"La evidencia del segundo episodio sobre buscapersonas se ha perdido durante la deduplicación");
assert(ctx.data.nodes.filter(n=>n.name==="Explosiones de buscapersonas en Líbano (2024)").length===1,
 "La misma operación histórica está duplicada en el grafo");
assert(ctx.data.nodes.filter(n=>n.name==="Shin Bet").length===1,
 "Shin Bet y Shabak no deben generar fichas independientes por grafía");

// Las dos entrevistas a Frattini sobre Hitler son fuentes distintas, pero no deben duplicar personas ni pruebas documentales.
for(const name of ["Adolf Hitler","Theodor Morell","Pervitin (metanfetamina)","Hugo Blaschke","Hugh Trevor-Roper","Identificación odontológica de Hitler"]){
 const matches=ctx.data.nodes.filter(x=>x.name===name);
 assert(matches.length===1,"Duplicación al cruzar F71 y F74: "+name+" ("+matches.length+")");
}
for(const name of ["Theodor Morell","Identificación odontológica de Hitler"]){
 const item=ctx.data.nodes.find(x=>x.name===name);
 const episodes=new Set((item.podcastNotes||[]).map(n=>n.episodeId));
 assert(episodes.has("idealab-f71-frattini")&&episodes.has("idealab-f74-frattini"),
  "Pérdida de aportaciones de F71/F74 por fusión: "+name);
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
const entities=new Map(ctx.data.nodes.map(n=>[n.id,n]));
const isMention=e=>{
 const status=String(e.claimStatus||"").toLowerCase();
 const type=String(e.type||"").toLowerCase();
 if(status.startsWith("mencion_")||/^menci[oó]n (de |en |a )/.test(type)||/^citado (en|por) la fuente/.test(type))return true;
 return [entities.get(e.a),entities.get(e.b)].some(n=>n&&
  (n.kind==="Fuente"||/^Podcast\s*[·:]/i.test(n.name||"")||/^Entrevista\s*[·:]/i.test(n.name||"")));
};
const mentionEdges=ctx.data.edges.filter(isMention);
const actualRelations=ctx.data.edges.filter(e=>!isMention(e));
const externallyClassified=actualRelations.filter(e=>e.claimStatus==="hecho_verificado_independiente");
const sourceOnlyDocumented=actualRelations.filter(e=>e.confidence==="documentado"&&
 /youtu(?:be\.com|\.be)/i.test(e.source||"")&&e.claimStatus!=="hecho_verificado_independiente");
console.log("AUDITORÍA DE PROCEDENCIA");
console.log(JSON.stringify({
 totalLinks:ctx.data.edges.length,
 mentionLinks:mentionEdges.length,
 otherRelationships:actualRelations.length,
 independentlyClassified:externallyClassified.length,
 youtubeSourcedMarkedDocumented:sourceOnlyDocumented.length
},null,2));
console.log("TOTAL: "+ctx.data.nodes.length+" entidades y "+ctx.data.edges.length+" enlaces (no todos son relaciones contrastadas); "+audit.length+" etapas.");
