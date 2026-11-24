/* F61 tercera revisión: distinguir finanzas verificadas, autodeclaraciones y limitaciones del clip. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const file="la-telarana/fuente-61-fec-jstreet-20261124.js";
const source=fs.readFileSync(file,"utf8"),ctx={window:{}};
vm.runInNewContext(source,ctx,{timeout:5000});
const m=ctx.window.IDEA_TELARANA_F61_2026_CONTRASTES;
assert(m?.metadata?.sourceOrder===61);
assert(!m.metadata.audioVerified&&!m.metadata.transcriptComplete&&!m.metadata.reviewComplete&&!m.metadata.timecodesAvailable);
assert.equal(m.nodes.length,13);assert.equal(m.edges.length,16);
const ids=new Set(m.nodes.map(n=>n.id)),eids=new Set(m.edges.map(e=>e.id));
assert.equal(ids.size,m.nodes.length);assert.equal(eids.size,m.edges.length);
const declared=["f61v3-jstreet-pac","f61v3-jstreet-fund","f61v3-statement-author","f61v3-claim-aipac","f61v3-fund-statement","f61v3-pac-criteria"];
for(const e of m.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Extremo ausente "+e.id);
 assert(e.confidence==="documentado"&&/^https:\/\//.test(e.source),"Evidencia o grado incorrecto "+e.id);
 assert.equal(e.claimStatus,declared.includes(e.id)?"hecho_documentado_por_portavoz_citado":"hecho_verificado_independiente","Declaración de parte confundida con hecho "+e.id);
}
assert(!m.edges.some(e=>e.a==="f61-episodio"||e.b==="f61-episodio"),"No atribuir al clip datos externos");
const doc=id=>m.nodes.find(n=>n.id===id);
for(const [id,uri] of [["f61v3-udp","C00799031"],["f61v3-pac","C00441949"],["f61v3-fund","C00815753"]]){
 assert(doc(id)?.subtitle.includes(uri)&&doc(id)?.source.endsWith(uri+"/"),"Identidad FEC incorrecta "+id);
}
assert(doc("f61v3-udp-summary")?.note.includes("53.603.927,44")&&doc("f61v3-udp-summary")?.note.includes("14/10/2026"),"Gasto independiente UDP mal clasificado");
assert(doc("f61v3-pac-summary")?.note.includes("8.965.116,43")&&doc("f61v3-pac-summary")?.note.includes("otros comités"),"JStreetPAC no separa flujos");
assert(doc("f61v3-fund-summary")?.note.includes("1.313.510,63"),"J Street Action Fund no separa gasto independiente");
assert(doc("f61v3-statement")?.note.includes("Se prueba la existencia de la declaración"),"J Street convertida en fuente neutral sobre sí misma");
assert(doc("f61v3-independent")?.note.includes("no demuestra por sí solo coordinación"),"Gasto independiente confundido con coordinación ilícita");
assert(doc("f61v3-jstreet")?.note.includes("su propia declaración"),"Causalidad o resultados atribuidos como verificados");
const page=fs.readFileSync("la-telarana/index.html","utf8"),workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(page.includes('src="./fuente-61-fec-jstreet-20261124.js'),"Falta importación F61");
assert(page.includes("mergeNewEpisode(window.IDEA_TELARANA_F61_2026_CONTRASTES)"),"Falta fusión F61");
assert(workflow.includes("cp la-telarana/fuente-61-fec-jstreet-20261124.js dist/la-telarana/fuente-61-fec-jstreet-20261124.js"),"F61 no se publica en Pages");
assert(["www.fec.gov","jstreet.org","jstreetpac.org"].every(h=>page.includes('"'+h+'"')),"Se ocultan fuentes oficiales en el inspector");
const reg=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
assert.equal(reg.sourceCatalog.entries.find(r=>r.order===61)?.analysisCoverage.percent,20,"No inflar el avance de un audio sin cotejar");
console.log("OK: F61 - 13 nodos de referencia, 16 relaciones; finanzas, declaraciones de parte y tipos de comité separados");
