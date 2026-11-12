/** Revisión incremental F18/F21: subtítulos cronometrados con atribuciones prudentes y contrastes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const ctx={window:{}};
const specs=[
 {num:18,file:"la-telarana/fuente-18-epstein-lorenzo-editorial.js",key:"IDEA_TELARANA_SOURCE18_EDITORIAL",minNotes:19,extraNode:"f18-marruecos",extraEdge:"f18-mencion-marruecos",videoId:"MljyjDGTxkk"},
 {num:21,file:"la-telarana/fuente-21-orden-mundial-editorial.js",key:"IDEA_TELARANA_SOURCE21_EDITORIAL",minNotes:28,extraNode:"f21-christine-lagarde",extraEdge:"f21-bce-lagarde-cargo",videoId:"DRgeXx3rJl0"}
];
for(const spec of specs){
 vm.runInNewContext(fs.readFileSync(spec.file,"utf8"),ctx,{filename:spec.file,timeout:6000});
 const mod=ctx.window[spec.key];
 assert.equal(mod.metadata.sourceOrder,spec.num);
 assert.equal(mod.metadata.transcriptAvailable,true);
 assert.equal(mod.metadata.transcriptAudioMatched,false,"Prohibido certificar audio no comprobado");
 assert(mod.nodes.some(n=>n.id===spec.extraNode),"Falta nueva entidad con identidad propia");
 assert(mod.edges.some(e=>e.id===spec.extraEdge),"Falta vinculo identificado y clasificado");
 const ids=new Set(mod.nodes.map(n=>n.id));
 assert.equal(ids.size,mod.nodes.length,"IDs de nodo repetidos");
 for(const edge of mod.edges)assert(ids.has(edge.a)&&ids.has(edge.b),"Arista huerfana: "+edge.id);
 const notes=mod.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec));
 assert(notes.length>=spec.minNotes,"Reduccion de anclas temporales F"+spec.num);
 for(const note of notes){
  assert(note.timeSec>=0&&note.source.includes("youtube.com/watch?v="+spec.videoId),
   "Minutaje sin fuente original F"+spec.num);
  assert(note.status&&note.text.length>120,"Anotacion insuficiente o sin estado");
 }
 const timeKeys=notes.map(n=>String(n.episodeId)+"|"+n.timeSec+"|"+n.title);
 assert.equal(new Set(timeKeys).size,timeKeys.length,"Duplicado de nota en F"+spec.num);
}
const f18=ctx.window.IDEA_TELARANA_SOURCE18_EDITORIAL;
const f21=ctx.window.IDEA_TELARANA_SOURCE21_EDITORIAL;
assert(f18.nodes.find(n=>n.id==="f18-vox")?.podcastNotes.some(n=>n.timeSec===3497&&n.status.includes("politica")),
 "F18: valoracion sobre Vox mal clasificada");
assert(f18.edges.find(e=>e.id==="f18-mencion-marruecos")?.confidence==="hipotesis",
 "F18: mencion no puede convertirse en relacion sustantiva documentada");
const euro=f21.nodes.find(n=>n.id==="f21-digital-euro");
assert(euro?.podcastNotes.some(n=>n.timeSec===6659&&n.text.includes("BCE")&&n.status.includes("documental")),
 "F21: falta contraste de afirmacion sobre tipos negativos");
const lagarde=f21.nodes.find(n=>n.id==="f21-christine-lagarde");
assert(lagarde?.podcastNotes.some(n=>n.timeSec===2728&&n.text.includes("negligencia")&&n.text.includes("no se impuso pena")),
 "F21: no se ha corregido la imputacion imprecisa sobre Tapie");
assert(f21.edges.find(e=>e.id==="f21-bce-lagarde-cargo")?.source.includes("ecb.europa.eu"),
 "F21: falta referencia primaria para presidencia del BCE");
const index=fs.readFileSync("la-telarana/index.html","utf8");
for(const spec of specs)assert(index.includes(spec.file.split("/").pop()),"Fuente ausente de la web F"+spec.num);
console.log("OK F18/F21: notas cronometradas, nuevas entidades y contrastes sobre euro digital y Lagarde; audio pendiente.");
