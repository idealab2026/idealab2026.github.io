import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/fuente-68-pilato-contrastes-20261124.js";
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{timeout:4000});
const d=ctx.window.IDEA_TELARANA_F68_PILATO_20261124;
assert.equal(d.metadata.sourceOrder,68);
assert(!d.metadata.audioVerified&&!d.metadata.reviewComplete&&!d.metadata.timecodesAvailable);
assert.equal(d.nodes.length,11);assert.equal(d.edges.length,13);
const ids=new Set(d.nodes.map(n=>n.id));
assert.equal(ids.size,d.nodes.length);
assert.equal(new Set(d.edges.map(e=>e.id)).size,d.edges.length);
for(const e of d.edges){assert(ids.has(e.a)&&ids.has(e.b));assert(/^https:\/\//.test(e.source));}
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
