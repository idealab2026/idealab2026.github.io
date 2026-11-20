/* F71/F74: archivos reales y dependencia bibliográfica, sin inferir efectos médicos. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/archivos-medicos-f71-f74-20261120.js";
const text=fs.readFileSync(path,"utf8");
const env={window:{}};
vm.runInNewContext(text,env,{timeout:2000});
const m=env.window.IDEA_TELARANA_ARCHIVOS_MEDICOS_F7174;
assert(m&&m.nodes.length===7&&m.edges.length===5,"Capa archivística incompleta");
assert.equal(m.metadata.transcriptAudioMatched,false);
assert.equal(m.metadata.verifiedMinuteReferences,0);
const ids=new Set(m.nodes.map(x=>x.id)),edgeIds=new Set(m.edges.map(x=>x.id));
assert.equal(ids.size,m.nodes.length,"Nodos repetidos");
assert.equal(edgeIds.size,m.edges.length,"Relaciones repetidas");
for(const e of m.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Extremo huérfano: "+e.id);
 assert(e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente","Arista sin calificación: "+e.id);
 assert(/^https:\/\//.test(e.source),"Fuente no HTTPS: "+e.id);
}
const byName=Object.fromEntries(m.nodes.map(x=>[x.id,x.name]));
assert(byName["f7174-schenck-ref"]==="Ernst Günther Schenck");
assert(m.edges.some(e=>e.id==="f7174-schenck-ndb"&&e.note.includes("no es una segunda fuente independiente")));
assert(m.nodes.find(x=>x.id==="f7174-acta-defuncion-1956").note.includes("no una pericia forense"));
assert(m.nodes.find(x=>x.id==="f7174-duquesne-morell-report").note.includes("no la veracidad"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
const wf=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(html.includes('src="./archivos-medicos-f71-f74-20261120.js'),"Módulo no importado");
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_ARCHIVOS_MEDICOS_F7174)"),"No fusionado en el grafo");
assert(wf.includes("cp la-telarana/archivos-medicos-f71-f74-20261120.js dist/la-telarana/archivos-medicos-f71-f74-20261120.js"),"No publicado en Pages");
console.log("OK: F71/F74, tres nuevas referencias archivísticas y cinco aristas cualificadas; independencia bibliográfica advertida");
