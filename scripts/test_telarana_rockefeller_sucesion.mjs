/** Antecedentes federales Rockefeller; verificar cada extremo y separar empresa / filantropía. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
for(const file of ["la-telarana/usaid-rockefeller-antecedentes.js","la-telarana/usaid-rockefeller-segunda-fase.js"]){
 vm.runInNewContext(read(file),ctx,{filename:file,timeout:7000});
}
const a=ctx.window.IDEA_TELARANA_USAID_ROCKEFELLER,b=ctx.window.IDEA_TELARANA_USAID_ROCKEFELLER_V2;
assert.equal(a.edges.length,15);
assert.equal(b.nodes.length,11);
assert.equal(b.edges.length,8);
const ids=new Set(b.nodes.map(n=>n.id));
assert.equal(ids.size,b.nodes.length);
for(const e of b.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Referencia de nodo ausente: "+e.id);
 assert(e.claimStatus==="hecho_verificado_independiente"&&e.confidence==="documentado","Falta nivel probatorio "+e.id);
 assert(e.source.startsWith("https://")&&e.note.length>100,"Falta documento de origen o contexto: "+e.id);
}
function has(edges,a,b){return edges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));}
assert(has(b.edges,"usaid-iiaa","usaid-foa"),"IIAA→FOA debe estar documentada");
assert(has(b.edges,"usaid-foa","usaid-ica"),"FOA→ICA debe estar documentada");
assert(has(a.edges,"usaid-ica","f21-usaid"),"ICA→USAID debe mantenerse en fase 1");
assert(has(b.edges,"usaid-iiaa","usaid-ica"),"IIAA→ICA 1955 debe tener documento FRUS");
assert(has(b.edges,"usaid-nelson-rockefeller","usaid-ibec"),"Falta IBEC 1947");
assert(has(b.edges,"usaid-nelson-rockefeller","usaid-creole"),"Falta puesto documentado en Creole 1935");
assert(has(b.edges,"usaid-creole","usaid-standard-oil-nj"),"Falta empresa matriz documentada");
assert(has(b.edges,"usaid-aia-rockefeller","usaid-iica-agricultura"),"Falta cooperación AIA/IICA 1962");
for(const id of ["usaid-ibec","usaid-creole","usaid-standard-oil-nj","usaid-iica-agricultura","usaid-rbf"]){
 assert(!has(b.edges,id,"f21-usaid"),"Se inferiría financiación directa USAID: "+id);
}
const grant=a.edges.find(e=>e.id==="usaid-rk-rbf-aia");
assert(grant.note.includes("250.000")&&grant.note.includes("1.055.000")&&grant.source.endsWith("1962-AR-web-optimized.pdf"),"RBF-AIA carece de cifras y fuente de 1962");
const indirect=a.edges.find(e=>e.id==="usaid-rk-rockefeller-usaid");
assert(indirect.claimStatus==="relacion_historica_indirecta");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./usaid-rockefeller-segunda-fase.js?v='),"Falta importación en la página");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_USAID_ROCKEFELLER_V2)'),"Falta carga del módulo");
assert(workflow.includes("cp la-telarana/usaid-rockefeller-segunda-fase.js dist/la-telarana/usaid-rockefeller-segunda-fase.js"),"Falta publicación del módulo");
const history=JSON.parse(read("linea-historia/estudios-telarana.json"));
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(history.items.length,progress.timeline.committedVerifiedEvents,"Seguimiento histórico inconsistente");
for(const id of ["study-f21-iiaa-ley-federal-1947","study-f21-iiaa-foa-1953","study-f21-foa-ica-1955"]){
 const e=history.items.find(e=>e.id===id);
 assert(e?.investigation?.status==="hecho_documentado"&&e.investigation.confirmedBy.url.startsWith("https://"),"Falta evidencia para "+id);
}
console.log("OK: cadena IIAA→FOA→ICA→USAID, 8 vínculos adicionales, RBF→AIA $250.000 en 1962; sin financiación privada atribuida a USAID.");
