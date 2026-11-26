import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/fuente-68-pilato-contrastes-20261124.js";
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{timeout:4000});
const d=ctx.window.IDEA_TELARANA_F68_PILATO_20261124;
assert.equal(d.metadata.sourceOrder,68);
assert(!d.metadata.audioVerified&&!d.metadata.reviewComplete&&!d.metadata.timecodesAvailable);
// Preserve the original baseline while allowing independently documented extensions.
const baselineNodes=["pilato","inscripcion","filon","embajada","tiberio","josefo","ant18","war2","vitellio","taylor","paper"].map(x=>"f68x-"+x);
const baselineEdges=["piedra-pilato","filon-obra","embajada-pilato","embajada-tiberio","josefo-ant","josefo-war","ant-pilato","war-pilato","ant-vitellio","taylor-paper","paper-piedra","paper-embajada","paper-pilato"].map(x=>"f68x-"+x);
for(const id of baselineNodes) assert(d.nodes.some(n=>n.id===id),"Missing baseline node "+id);
for(const id of baselineEdges) assert(d.edges.some(e=>e.id===id),"Missing baseline edge "+id);
assert(d.nodes.length>=baselineNodes.length);assert(d.edges.length>=baselineEdges.length);
const ids=new Set(d.nodes.map(n=>n.id));
assert.equal(ids.size,d.nodes.length);
assert.equal(new Set(d.edges.map(e=>e.id)).size,d.edges.length);
// Cross-module endpoints must exist in the actual earlier source files, not a permissive prefix.
const externalIds=new Set();
for(const file of ["la-telarana/fuente-42-jesus-arqueologia.js","la-telarana/fuente-68-pasion.js"]){
 const ext={window:{}};
 vm.runInNewContext(fs.readFileSync(file,"utf8"),ext,{timeout:4000});
 for(const doc of Object.values(ext.window))if(Array.isArray(doc?.nodes))for(const n of doc.nodes)externalIds.add(n.id);
}
for(const e of d.edges){
 assert(ids.has(e.a)||externalIds.has(e.a),"Unknown endpoint "+e.a);
 assert(ids.has(e.b)||externalIds.has(e.b),"Unknown endpoint "+e.b);
 assert(e.a!==e.b);assert(/^https:\/\//.test(e.source));
}
for(const n of d.nodes){assert(/^https:\/\//.test(n.source));}

const nodes=new Map(d.nodes.map(n=>[n.id,n]));
const edges=new Map(d.edges.map(e=>[e.id,e]));
assert(nodes.get("f68x-inscripcion").note.includes("No menciona a Jesús"));
assert(nodes.get("f68x-war2").note.includes("autor independiente"));
assert(edges.get("f68x-paper-pilato").confidence==="indicio");
assert(edges.get("f68x-paper-pilato").claimStatus==="interpretacion_academica");
for(const id of ["f68x-embajada-pilato","f68x-embajada-tiberio","f68x-ant-pilato","f68x-war-pilato","f68x-ant-vitellio"]){assert.equal(edges.get(id).claimStatus,"testimonio_textual_atribuido");}
const html=fs.readFileSync("la-telarana/index.html","utf8"),wf=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(html.includes('src="./fuente-68-pilato-contrastes-20261124.js'));
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_F68_PILATO_20261124)"));
assert(wf.includes("cp "+path+" dist/"+path));
console.log("OK F68: epigrafía, testimonios atribuidos y crítica de dependencia textual.");
