import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/fuente-67-mandylion-20261124.js";
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{timeout:4000});
const d=ctx.window.IDEA_TELARANA_F67_MANDYLION_20261124;
assert.equal(d.metadata.sourceOrder,67);
assert(!d.metadata.audioVerified&&!d.metadata.timecodesAvailable&&!d.metadata.reviewComplete);
assert.equal(d.nodes.length,13);assert.equal(d.edges.length,15);
const n=new Map(d.nodes.map(x=>[x.id,x])),e=new Map(d.edges.map(x=>[x.id,x]));
assert.equal(n.size,d.nodes.length);assert.equal(e.size,d.edges.length);
for(const r of d.edges){assert(n.has(r.a)&&n.has(r.b));assert(/^https:\/\//.test(r.source));}
for(const id of ["f67m-mandylion-sudario","f67m-blachernae-sudario","f67m-mandylion-sainte"]){assert.equal(e.get(id).confidence,"hipotesis");assert.equal(e.get(id).claimStatus,"hipotesis");}
assert(n.get("f67m-chronicle").note.includes("83")&&n.get("f67m-chronicle").note.includes("92"));
assert(n.get("f67m-blachernae").note.includes("ignorar su destino"));
assert(n.get("f67m-1247").note.includes("un fragmento de sudario"));
assert(n.get("f67m-1247").note.includes("No se ha cotejado el original"));
assert(n.get("f67m-book").note.includes("no el libro completo"));
assert(n.get("f67m-guscin").note.includes("desacuerdo"));
assert.equal(e.get("f67m-chronicle-blachernae").claimStatus,"testimonio_textual_atribuido");
const html=fs.readFileSync("la-telarana/index.html","utf8"),wf=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(html.includes('src="./fuente-67-mandylion-20261124.js'));
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_F67_MANDYLION_20261124)"));
assert(wf.includes("cp "+path+" dist/"+path));
for(const r of [...d.nodes,...d.edges]) assert(html.includes('"'+new URL(r.source).hostname+'"'),"Fuente no autorizada "+r.source);
console.log("OK F67: tres objetos diferenciados, dos pasajes de Clari, destino parisino discutido y límites de lectura.");
