/* Evitar que un nuevo episodio quede en GitHub pero desaparezca del sitio publicado. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("la-telarana/index.html","utf8");
const graph=fs.readFileSync("la-telarana/graph-3d.js","utf8");
const manifest=fs.readFileSync(".github/workflows/pages.yml","utf8");
const files=[
 ["18","fuente-18-epstein-lorenzo-editorial.js","IDEA_TELARANA_SOURCE18_EDITORIAL"],
 ["21","fuente-21-orden-mundial-editorial.js","IDEA_TELARANA_SOURCE21_EDITORIAL"]
];
let totalEntities=0;
for(const [order,file,key] of files){
 const window={};
 vm.runInNewContext(fs.readFileSync("la-telarana/"+file,"utf8"),{window});
 const episode=window[key];
 assert(episode&&episode.metadata.sourceOrder===Number(order),"Fuente ausente "+order);
 assert.equal(episode.metadata.transcriptAvailable,true,"Transcripción no incorporada a "+order);
 assert(episode.metadata.transcriptCharacters>100000,"No se ha leído el texto completo "+order);
 assert.equal(episode.metadata.transcriptAudioMatched,false,"No se puede afirmar cotejo de audio "+order);
 assert(episode.nodes.some(n=>n.name==="Lorenzo Ramírez"&&n.kind==="Persona"),"No aparece Lorenzo en "+order);
 const ids=new Set(episode.nodes.map(n=>n.id));
 assert.equal(ids.size,episode.nodes.length,"Nodos duplicados "+order);
 assert(episode.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"Relaciones huérfanas "+order);
 assert(episode.nodes.length>=20&&episode.edges.length>=19,"Expediente incompleto "+order);
 assert(html.includes(file)&&html.includes("mergeNewEpisode(window."+key+")"),"La página no carga "+file);
 assert(manifest.includes("cp la-telarana/"+file+" dist/la-telarana/"+file),"El despliegue excluye "+file);
 totalEntities+=episode.nodes.length;
}
assert(html.includes('id="search-results"'),"El buscador debe informar de coincidencias");
assert(html.includes("function searchCandidates(q)"),"Falta búsqueda por identidad");
assert(html.includes("focusOnSearchEntity"),"Falta selección y centrado");
assert(html.includes("Incorporaciones recientes"),"Faltan accesos directos");
assert(html.includes('data-recent-id="f18-lorenzo"'),"Falta acceso a Lorenzo");
assert(graph.includes("focusNode(id)"),"Falta centrado 3D");
for(const n of [9,10,11,12,13,14,16,17,19,20,22,23,24,25]){
 const filename=n===9?"fuente-09-villarejo-revision.js":"fuente-"+n+"-revision-inicial.js";
 assert(html.includes(filename),"La página no importa fuente "+n);
}
assert(!html.includes("progreso-fuentes.json"),"Nunca publicar inventario interno");
console.log("OK: Lorenzo en fuentes 18 y 21, "+totalEntities+" fichas fuente, buscador visible, acceso directo y distribución comprobada");
