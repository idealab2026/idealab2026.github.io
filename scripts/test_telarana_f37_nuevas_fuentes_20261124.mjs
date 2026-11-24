/* F37, 24/11/2026: validar arqueología, glaciación, filosofía y delimitación probatoria. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("la-telarana/fuente-37-contrastes-20261124.js","utf8");
const ctx={window:{}};
vm.runInNewContext(js,ctx,{timeout:5000});
const m=ctx.window.IDEA_TELARANA_F37_2026_CONTRASTES;
assert(m&&m.metadata?.sourceOrder===37,"No se vinculó a F37");
assert(m.metadata.audioVerified===false&&m.metadata.reviewComplete===false&&m.metadata.timecodesAvailable===false,"Se simuló verificación audiovisual");
assert.equal(m.nodes.length,13);assert.equal(m.edges.length,12);
const ids=new Set(m.nodes.map(n=>n.id)),edges=new Set(m.edges.map(e=>e.id));
assert.equal(ids.size,m.nodes.length,"ID de nodo duplicado");
assert.equal(edges.size,m.edges.length,"ID de relación duplicado");
for(const e of m.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Relación huérfana "+e.id);
 assert(/^https:\/\//.test(e.source),"Fuente externa ausente "+e.id);
 if(e.id==="f37x-paper-hipotesis"){
  assert(e.confidence==="hipotesis"&&e.claimStatus==="hipotesis_cientifica_no_cerrada","Inferencia tafonómica elevada a hecho");
 }else{
  assert(e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente","Categoría probatoria incorrecta "+e.id);
 }
}
const byId=id=>m.nodes.find(n=>n.id===id);
assert(byId("f37x-plos2026")?.note.includes("22/09/2026")&&byId("f37x-plos2026").source.includes("10.1371/journal.pone.0358979"),"Publicación científica F37 incompleta");
assert(byId("f37x-dr1")?.note.includes("al menos tres")&&byId("f37x-l0965")?.note.includes("2022"),"Dos enterramientos confundidos");
assert(byId("f37x-redeposicion")?.note.includes("inferencia plausible"),"Hipótesis de erosión elevada a certeza");
assert(byId("f37x-glaciar-superficie")?.note.includes("7.075,51 km²")&&byId("f37x-glaciar-superficie").note.includes("no necesariamente simultáneos"),"No se distinguen máximos glaciares locales");
assert(byId("f37x-discours")?.note.includes("no acredita una cita del entrevistado"),"Rousseau falsamente atribuido a la entrevista");
assert(!m.edges.some(e=>e.a==="f37x-episodio"||e.b==="f37x-episodio"),"No atribuir a F37 declaraciones no cotejadas");
const page=fs.readFileSync("la-telarana/index.html","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(page.includes('src="./fuente-37-contrastes-20261124.js'),"Módulo no importado");
assert(page.includes('mergeNewEpisode(window.IDEA_TELARANA_F37_2026_CONTRASTES)'),"Módulo no fusionado");
assert(workflow.includes("cp la-telarana/fuente-37-contrastes-20261124.js dist/la-telarana/fuente-37-contrastes-20261124.js"),"Módulo omitido de GitHub Pages");
assert(["journals.plos.org","www.miteco.gob.es","athena.unige.ch"].every(x=>page.includes('"'+x+'"')),"Fuente documental oculta por allowlist");
console.log("OK: F37, 13 referencias, 12 relaciones y tres bloques contrastados sin atribuir audio no verificado");
