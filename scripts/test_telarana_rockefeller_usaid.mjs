/** Verificar antecedentes Rockefeller, sin fusionar IIAA público, AIA privada ni USAID. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const win={window:{}};
vm.runInNewContext(read("la-telarana/usaid-rockefeller-antecedentes.js"),win,{timeout:10000});
const mod=win.window.IDEA_TELARANA_USAID_ROCKEFELLER;
assert(mod?.metadata?.id==="idealab-usaid-rockefeller-historia");
const nodes=new Map(mod.nodes.map(n=>[n.id,n]));
assert.equal(nodes.size,12,"La cadena debe tener 11 altas y la referencia a USAID");
assert.equal(mod.edges.length,15,"El expediente histórico ha perdido relaciones");
for(const e of mod.edges){
 assert(nodes.has(e.a)&&nodes.has(e.b)&&e.a!==e.b,"Arista huérfana: "+e.id);
 assert(e.source.startsWith("https://")&&e.note.length>=95,"Falta documento de respaldo o límite explicativo: "+e.id);
}
const direct=mod.edges.filter(e=>new Set([e.a,e.b]).has("f21-usaid")&&new Set([e.a,e.b]).has("usaid-nelson-rockefeller"));
assert.equal(direct.length,1,"La conexión histórica debe ser visible y única");
assert(direct[0].claimStatus==="relacion_historica_indirecta","No etiquetar vínculo indirecto como control o propiedad probada");
assert(/no control org[aá]nico|no.*control org[aá]nico/i.test(direct[0].note),"Falta advertencia sobre ausencia de control");
assert.equal(mod.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length,14,"La síntesis histórica no cuenta como hecho directo");
const pair=(a,b)=>mod.edges.some(e=>[e.a,e.b].includes(a)&&[e.a,e.b].includes(b));
for(const [a,b] of [["usaid-nelson-rockefeller","usaid-iiaa"],["usaid-nelson-rockefeller","usaid-ociaa"],["usaid-iiaa","f21-usaid"],["usaid-point-four","f21-usaid"],["usaid-ica","f21-usaid"],["usaid-john-f-kennedy","f21-usaid"],["usaid-nelson-rockefeller","usaid-aia-rockefeller"],["usaid-rbf","usaid-aia-rockefeller"]]){
 assert(pair(a,b),"Falta eslabón de la cadena histórica: "+a+" "+b);
}
for(const id of ["usaid-aia-rockefeller","usaid-rbf","usaid-rockefeller-foundation"]){
 assert(!pair(id,"f21-usaid"),"Se ha inventado financiación/relación directa USAID–"+id);
}
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./usaid-rockefeller-antecedentes.js?v='),"La página no carga el módulo");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_USAID_ROCKEFELLER)'),"Módulo no integrado");
assert(html.includes("Vínculo histórico indirecto")&&html.includes("Historia, antecedentes y Rockefeller"),"El inspector no diferencia antecedentes");
assert(workflow.includes("cp la-telarana/usaid-rockefeller-antecedentes.js dist/la-telarana/usaid-rockefeller-antecedentes.js"),"Archivo no desplegado");
const bioText=read("la-telarana/person-biographies.js");assert(bioText.includes('"usaid-nelson-rockefeller"'),"Biografía sin contraste");
const history=JSON.parse(read("linea-historia/estudios-telarana.json"));
const tracking=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(history.items.length,tracking.timeline.committedVerifiedEvents);
for(const id of ["study-f21-rockefeller-ociaa-1940","study-f21-rockefeller-iiaa-peru-1942","study-f21-rockefeller-truman-1950","study-f21-rockefeller-partners-progress-1951"]){
 const event=history.items.find(x=>x.id===id);
 assert(event&&event.investigation?.status==="hecho_documentado"&&event.investigation.confirmedBy.url.startsWith("https://"),"Falta hito con fuente primaria: "+id);
 assert(event.investigation.methodologicalLimits.includes("no una relación orgánica"),"Falta alcance metodológico: "+id);
}
console.log("OK Rockefeller-USAID: 15 vínculos (14 documentados + 1 síntesis indirecta), 4 hitos, sin propiedad ni financiación inventadas.");
