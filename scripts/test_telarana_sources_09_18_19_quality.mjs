/** Control editorial de las fuentes 9, 18 y 19: no se simula diarización, verificación o relaciones. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={window:{}};
for(const n of ["personas-fuentes-18-21.js","personas-fuentes-09-10.js","personas-fuentes-19.js"]){
 vm.runInNewContext(read("la-telarana/"+n),w,{timeout:10000,filename:n});
}
const lib=w.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const expectations={"9":{total:33,anchored:25},"18":{total:36,anchored:36},"19":{total:23,anchored:23}};
const all={};
for(const [order,rule]of Object.entries(expectations)){
 const allClaims=Object.entries(lib.profiles).flatMap(([name,p])=>(p.sources?.[order]||[]).map(c=>({name,c})));
 assert.equal(allClaims.length,rule.total,"Número de testimonios F"+order);
 assert(allClaims.every(({c})=>typeof c==="object"&&c?.topic&&c?.speaker&&c?.statement?.length>=70&&c?.status),"F"+order+": reaparece un resumen genérico");
 const anchored=allClaims.filter(({c})=>typeof c.transcriptAnchor==="string"&&c.transcriptAnchor.length>=13);
 assert(anchored.length>=rule.anchored,"F"+order+": se han perdido anclas de transcripción");
 for(const {name,c}of allClaims){
  assert(c.audioVerified===false&&c.minuteVerified===false,"F"+order+": se declara audio/minuto no cotejado para "+name);
  if(c.status==="identidad_pendiente")assert(/transcripci[oó]n|audio|identificaci[oó]n|fon[eé]tic/i.test(c.statement),"F"+order+": identidad dudosa sin advertencia "+name);
  if(c.status==="alegacion_no_verificada")assert(/no (se |queda |est[aá] )|sin |alega|sostiene|afirma|versi[oó]n|acusa|interpreta/i.test(c.statement),"F"+order+": acusación sin lenguaje de incertidumbre "+name);
  if(order==="19")assert(c.speaker.includes("sin diarizar"),"F19: no se puede inventar quién habló "+name);
 }
 all[order]={total:allClaims.length,anchored:anchored.length,provisionalIdentities:allClaims.filter(({c})=>c.status==="identidad_pendiente").length};
}
for(const name of ["Pedro Baños"]){
 assert(lib.profiles[name].sources["9"][0].status==="identidad_pendiente","F09: nombre fonético no verificado");
}
for(const name of ["Peter Thiel","Serguéi Gláziev","Alexander Haig"]){
 assert(lib.profiles[name].sources["19"][0].status==="identidad_pendiente","F19: homónimo o nombre fonético prematuramente confirmado "+name);
}
for(const name of ["Peter Thiel","Klaus Schwab","Kenneth F. McKenzie Jr."]){
 assert(lib.profiles[name].sources["18"][0].status==="identidad_pendiente","F18: identificación fonética no advertida "+name);
}
const html=read("la-telarana/index.html");
assert(html.includes("identificacion_no_verificada")&&html.includes("Mención contextual"),"La interfaz no distingue identidades no contrastadas");
const flow=read(".github/workflows/pages.yml");
assert(!flow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Exposición de control privado en Pages");
console.log("OK: expedientes F9/F18/F19; "+JSON.stringify(all)+"; audio y turnos no inventados");
