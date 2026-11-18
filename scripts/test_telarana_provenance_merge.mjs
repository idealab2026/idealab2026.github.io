/* Regresión: procedencia de transcripción y biografías al fusionar F53 y F67. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=path=>fs.readFileSync(path,"utf8");
const html=read("la-telarana/index.html");
const isolate=(start,end)=>{
 const a=html.indexOf(start),b=html.indexOf(end,a);
 assert(a>=0&&b>a,"Falta el bloque: "+start);
 return html.slice(a,b);
};
const methods=isolate("function sanitizePodcastNotes(value){","function mergePodcastStudy(v){")+
 "\n"+isolate("function relationClaimRecord(edge,defaultEpisodeId){","function mergeStudy(v){");
const data={nodes:[{
 id:"f39-howard-carter",name:"Howard Carter",kind:"Persona",subtitle:"Arqueólogo",
 note:"Descripción previa preservada",source:"https://www.youtube.com/watch?v=example",
 podcastNotes:[]
}],edges:[]};
const normalizeEntityName=s=>String(s||"").normalize("NFD")
 .replace(/\p{M}/gu,"").trim().toLocaleLowerCase("es").replace(/[^a-z0-9]+/g," ");
const context={data,normalizeEntityName,safePhoto:x=>x||""};
vm.runInNewContext(methods,context);

const cleaned=context.sanitizePodcastNotes([{
 episodeId:"example",text:"Descripción localizable",source:"https://example.org/video",
 timeSec:"",minuteVerified:false,audioVerified:false,
 transcriptSearch:"construyeron la tumba",transcriptCharOffset:2237,
 speaker:"Tito Vivas",temporalStatus:"sin_minutaje_validado_en_archivo",
 transcriptVerified:true
},{
 episodeId:"example",text:"Una fecha orientativa",timeSec:"206",minuteVerified:false
}]);
assert.equal(cleaned[0].timeSec,null,"El tiempo vacío no se debe convertir en 0 segundos");
assert.equal(cleaned[1].timeSec,206,"El minuto orientativo no debe desaparecer");
assert.equal(cleaned[0].minuteVerified,false);
assert.equal(cleaned[0].audioVerified,false);
assert.equal(cleaned[0].transcriptVerified,true);
assert.equal(cleaned[0].transcriptSearch,"construyeron la tumba");
assert.equal(cleaned[0].transcriptCharOffset,2237);
assert.equal(cleaned[0].speaker,"Tito Vivas");
assert.equal(cleaned[0].temporalStatus,"sin_minutaje_validado_en_archivo");
assert.equal(context.sanitizePodcastNotes([{episodeId:"a",text:"b",timeSec:"desconocido"}])[0].timeSec,null);

const duplicate={podcastNotes:[{episodeId:"example",timeSec:null,text:"texto"}]};
assert.equal(context.appendPodcastNotes(duplicate,[{
 episodeId:"example",timeSec:null,text:"texto",audioVerified:false,transcriptSearch:"texto"
}]),0,"No duplicar notas por incorporar metadatos");
assert.equal(duplicate.podcastNotes.length,1);
assert.equal(duplicate.podcastNotes[0].audioVerified,false);
assert.equal(duplicate.podcastNotes[0].transcriptSearch,"texto");

assert.equal(context.sanitizeIndependentBiography({
 text:"Una frase larga de biografía ".repeat(5),source:"https://www.youtube.com/watch?v=a"
}),null,"Un vídeo no debe presentarse como fuente biográfica independiente");
assert(context.sanitizeIndependentBiography({
 text:"Una frase larga de biografía ".repeat(5),source:"https://tutankhamun.griffith.ox.ac.uk/people/howard-carter"
}));

const moduleRead=(path)=>{
 const text=read(path),p=text.indexOf("=",text.indexOf("window.IDEA_TELARANA_"));
 assert(p>=0);
 return JSON.parse(text.slice(p+1).trim().replace(/;\s*$/,""));
};
const f53=moduleRead("la-telarana/fuente-53-arqueologia.js");
const f67=moduleRead("la-telarana/fuente-67-reliquias.js");
assert.equal(f53.metadata.audioVerified,false);
assert.equal(f67.metadata.audioVerified,false);
const res53=context.mergeNewEpisode(f53);
assert(res53.nodes>=20&&res53.edges>=30);
const carter=data.nodes.find(x=>x.id==="f39-howard-carter");
assert.equal(carter.note,"Descripción previa preservada","No borrar descripciones anteriores automáticamente");
assert(carter.verifiedBiography?.source.includes("griffith.ox.ac.uk"));
assert(!/autismo|diagnóstico retrospectivo/i.test(carter.verifiedBiography.text),
 "La biografía independiente no debe incluir especulaciones clínicas");
for(const id of ["f39-howard-carter","f53-clavijo","f53-pedro-paez"]){
 const node=data.nodes.find(x=>x.id===id);
 assert(node?.verifiedBiography?.text.length>=180,"Sin biografía fiable "+id);
 assert(/^https:\/\//.test(node.verifiedBiography.source));
}
const res67=context.mergeNewEpisode(f67);
assert(res67.nodes>=20&&res67.edges>=25);
const carbon=data.nodes.find(x=>x.id==="f42-radiocarbono");
const note=carbon.podcastNotes.find(x=>x.transcriptSearch==="carbono 14");
assert(note,"No aparece el ancla de F67");
assert.equal(note.timeSec,null,"Sin audio cotejado el minuto orientativo debe estar vacío");
assert(Number.isInteger(note.transcriptCharOffset)&&note.transcriptCharOffset>=0,"El ancla F67 debe conservar su posición literal en la transcripción");
assert.equal(note.minuteVerified,false,"No marcar como cotejado un minuto orientativo");
assert.equal(note.audioVerified,false,"No marcar el audio sin escucharlo");
assert.equal(note.transcriptSearch,"carbono 14","No perder localizador del TXT");
assert(html.includes('Localizador en transcripción: «'),"Mostrar localizador al lector");
assert(html.indexOf("showPersonBiography(p,obj)")<html.indexOf("showPersonResearch(p,obj)"),
 "Presentar biografía antes que testimonios");
console.log("OK: F53/F67 conservan localizadores, estado de audio y biografías documentadas");
