/* Fuente 16: biografías, atribución multivoz, prevención de homónimos y privacidad. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-16.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const people=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["16"]));
assert(people.length>=22,"Faltan perfiles de la fuente 16");
for(const [name,p] of people){
 assert(typeof p.who==="string"&&p.who.length>=45,"No consta quién es "+name);
 assert(p.sources["16"].every(x=>typeof x==="string"?x.length>=65:typeof x?.statement==="string"&&x.statement.length>=65),"Atribución insuficiente "+name);
}
assert(lib.profiles["Alberto Iturralde"]?.portrait===null,"Riesgo de retrato de Pedro Iturralde mal asignado");
assert(lib.profiles["Rubén Gisbert"]?.sources["16"].some(x=>(typeof x==="string"?x:x?.statement||"").includes("no participa")),"No está registrada la ausencia del participante");
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-16.js'),"No se carga el fichero de biografías");
assert(html.includes('"16":"f16-episodio"'),"No están vinculadas las personas al episodio");
const audited=(html.match(/\[("[0-9]+"(?:,"[0-9]+")*)\]\.forEach\(function\(order\)/)||[])[1];
assert(audited&&JSON.parse("["+audited+"]").includes("16"),"No se audita F16");
assert(flow.includes("cp la-telarana/personas-fuentes-16.js dist/la-telarana/personas-fuentes-16.js"),"Pages no incorpora F16");
const tracker=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const f16=tracker.inReview.find(x=>x.order===16);
assert(f16&&f16.reviewComplete===false&&f16.personsProfiled>=22,"Seguimiento editorial erróneo");
assert(f16.transcriptAudioMatched===false&&f16.verifiedMinuteReferences===0,"No inventar cotejo audio");
assert(f16.timelineVerifiedEventsCommitted===0,"No duplicar hitos Ceuta ya existentes");
assert(tracker.nextSource.order>16,"El inventario ha retrocedido a una fuente ya revisada");
for(const name of ["Pedro Baños","Rubén Gisbert","Alberto Iturralde","Marine Le Pen"]){
 const record=lib.profiles[name].sources["16"].find(x=>typeof x==="object"&&x.transcriptAnchor);
 assert(record?.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,"Ancla ASR o estado de audio incorrecto: "+name);
 assert(record.transcriptAnchor.length>=28&&record.topic&&record.speaker&&record.status,"Falta contenido atribuido: "+name);
}
console.log("OK: F16 · "+people.length+" biografías y atribuciones; Gisbert ausente, Iturralde sin homónimo ni falsas evidencias");
