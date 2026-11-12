/** Fuente 10: revisión parcial de subtítulos con tiempo, sin cotejo de audio ni ascenso probatorio. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const path="la-telarana/fuente-10-revision-inicial.js";
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{filename:path,timeout:7000});
const mod=ctx.window.IDEA_TELARANA_F10_REVIEW;
assert(mod?.metadata?.sourceOrder===10&&mod.metadata.transcriptAvailable===true);
assert(mod.metadata.transcriptAudioMatched===false);
assert(mod.metadata.timecodedTranscriptSegments===2294);
assert(mod.nodes.length>=7&&mod.edges.length===6,"No alterar vínculos sin nueva evidencia independiente");
const ids=new Set(mod.nodes.map(n=>n.id));
assert.equal(ids.size,mod.nodes.length);
assert(mod.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"Referencias de relaciones huérfanas");
const notes=mod.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec));
assert.equal(notes.length,12,"Se esperan 12 referencias con minutaje de F10");
const keys=new Set();
for(const n of notes){
 assert(n.timeSec>=0&&n.timeSec<=5495,"Minuto fuera de la duración de F10");
 assert(n.source===`https://www.youtube.com/watch?v=_pK1VQpH5X4&t=${n.timeSec}s`,"Fuente/timecode incompatible");
 assert(n.status&&n.status!=="hecho_verificado_independiente"&&n.text.length>=120,
  "Afirmación editorial confundida con hecho comprobado");
 const key=n.episodeId+"|"+n.timeSec+"|"+n.title;
 assert(!keys.has(key),"Anotación duplicada: "+key);
 keys.add(key);
}
for(const id of ["f10-banos","f10-prada","f10-division-azul","f10-franco","f10-hitler","f10-rusia"]){
 assert(mod.nodes.find(n=>n.id===id)?.podcastNotes.some(n=>Number.isFinite(n.timeSec)),
  "Sin testimonio temporal para "+id);
}
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const entry=progress.sourceCatalog.entries.find(e=>e.order===10);
assert(entry.tracking.timecodedTranscriptStoredInDrive&&entry.tracking.timecodedTranscriptNotesReviewed===12);
assert(entry.tracking.complete===false&&entry.tracking.timecodedTranscriptAudioVerified===false);
console.log("OK F10: 12 pasajes minutados para 6 actores y temas, sin añadir relaciones causales ni verificar audio.");
