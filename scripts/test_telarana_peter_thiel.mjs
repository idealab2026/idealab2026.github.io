/* Regresión: Peter Thiel debe heredar las menciones de ambas entrevistas sin duplicarse. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const readStudy=(path)=>{
 const script=fs.readFileSync(path,"utf8");
 const match=script.match(/window\.[A-Z0-9_]+\s*=\s*/);
 assert(match,"Sin asignación de fuente: "+path);
 return JSON.parse(script.slice(match.index+match[0].length,script.lastIndexOf(";")));
};
const base=readStudy("la-telarana/one-note-seed.js");
const f18=readStudy("la-telarana/fuente-18-epstein-lorenzo-editorial.js");
const f21=readStudy("la-telarana/fuente-21-orden-mundial-editorial.js");
const code=fs.readFileSync("la-telarana/index.html","utf8");
const begin=code.indexOf("function sanitizePodcastNotes(value){"),end=code.indexOf("function mergeStudy(v){",begin);
assert(begin>0&&end>begin,"No se pueden aislar los ensambladores de relaciones");
const ctx={data:JSON.parse(JSON.stringify(base)),safePhoto:()=>""};
vm.runInNewContext(code.slice(begin,end),ctx);
ctx.f18=f18;ctx.f21=f21;
vm.runInNewContext("mergeNewEpisode(f18);mergeNewEpisode(f21);",ctx);
const peters=ctx.data.nodes.filter(n=>n.name==="Peter Thiel");
assert.equal(peters.length,1,"Persona duplicada");
assert.equal(peters[0].id,"on-peter-thiel","Se ha perdido el nodo canónico de OneNote");
const notes=peters[0].podcastNotes||[];
for(const label of ["idealab-f18-epstein-lorenzo","idealab-f21-orden-mundial"]){
 assert(notes.filter(n=>n.episodeId===label).length>=4,"No se han incorporado cuatro pasajes de "+label);
}
const edges=ctx.data.edges.filter(e=>e.a==="on-peter-thiel"||e.b==="on-peter-thiel");
assert(edges.some(e=>e.episodeId==="idealab-f18-epstein-lorenzo"),"Falta enlace documental con fuente 18");
assert(edges.some(e=>e.episodeId==="idealab-f21-orden-mundial"),"Falta enlace documental con fuente 21");
assert(edges.length>=5,"Se esperaban las tres conexiones originales y las dos menciones nuevas");
// Los subtitulos cronometrados permiten anclas precisas, pero no certifican el audio.
assert(notes.every(n=>n.timeSec===null||(Number.isFinite(n.timeSec)&&
 n.timeSec>=0&&/^https:\\/\\/www\\.youtube\\.com\\/watch\\?v=/.test(n.source||""))),
 "No aceptar minutajes sin enlace al video original");
assert(notes.some(n=>Number.isFinite(n.timeSec)),
 "Se han perdido las anclas de los subtitulos recuperados");
assert(ctx.data.edges.every(e=>ctx.data.nodes.some(n=>n.id===e.a)&&ctx.data.nodes.some(n=>n.id===e.b)),"Arista huérfana");
console.log("OK: Peter Thiel, un solo nodo, "+notes.length+" notas y "+edges.length+" relaciones incluyendo entrevistas 18 y 21");
