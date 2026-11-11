/* F22: exactitud documental, biografías y mención no acreditada de pactos sobre Ceuta. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-22.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const persons=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["22"]));
assert(persons.length>=13,"Faltan biografías de F22");
for(const [name,p] of persons){assert(p.who?.length>=45,"No consta quién es "+name);assert(p.sources["22"].every(x=>typeof x==="string"?x.length>=65:typeof x?.statement==="string"&&x.statement.length>=180),"Declaración breve: "+name)}
for(const name of ["Pedro Baños","Rubén Gisbert","Pedro Sánchez","Gabriel Rufián","Juan Carlos I","Henry Kissinger","Benjamin Netanyahu"]){
 assert(lib.profiles[name]?.sources["22"],"Falta identidad mencionada: "+name);
}
assert(!lib.profiles["Benjamín Netanyahu"],"Se crea alias separado de Netanyahu");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-22.js'),"F22 no se carga en la web");
assert(html.includes('"22":"f22-episodio"'),"Fuente 22 no enlaza a perfiles");
assert(workflow.includes("cp la-telarana/personas-fuentes-22.js dist/la-telarana/personas-fuentes-22.js"),"Falta F22 en distribución");
assert(!workflow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Inventario interno expuesto");
const track=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const src=track.inReview.find(x=>x.order===22);
assert(src&&!src.reviewComplete&&src.personsProfiled===13,"Seguimiento F22 incorrecto");
assert(src.transcriptAudioMatched===false&&src.verifiedMinuteReferences===0,"Audio o tiempos inventados");
assert(track.nextSource.order>22,"La investigación no ha avanzado a la siguiente fuente");
const data=JSON.parse(read("linea-historia/estudios-telarana.json"));
const march=data.items.find(x=>x.id==="study-f22-marcha-verde-sahara-1975");
assert(march?.investigation?.date==="1975-11-06","Falta fecha de la Marcha Verde");
assert(march.investigation.confirmedBy.url.startsWith("https://eur-lex.europa.eu/"),"El contraste debe ser institucional");
assert(march.d.includes("Resolución 380"),"Falta contexto de la ONU");
assert(track.timeline.committedVerifiedEvents===data.items.length,"Descuadre histórico");
const expectedStatuses=new Set(["opinion_atribuida","alegacion_no_verificada","declaracion_de_parte","identidad_pendiente","mencion_contextual"]);
for(const [name,p] of Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["22"]))){
 const claims=p.sources["22"];
 assert(claims.length===1&&typeof claims[0]==="object","Ficha F22 sin estructurar: "+name);
 const c=claims[0];
 assert(c.topic?.length>=18&&c.speaker?.length>=18&&c.statement?.length>=180,"Falta atribución concreta: "+name);
 assert(c.transcriptAnchor?.length>=45,"Ancla documental demasiado breve: "+name);
 assert(c.transcriptVerified===true&&c.audioVerified===false&&c.minuteVerified===false,"Se falseó cotejo audiovisual: "+name);
 assert(expectedStatuses.has(c.status),"Estado probatorio desconocido: "+name);
}
console.log("OK: F22 · "+persons.length+" perfiles, Marcha Verde documental y atribuciones no probadas");
