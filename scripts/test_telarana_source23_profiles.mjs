/* F23 · Identidad, atribución documental, CECA y privacidad. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-23.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const found=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["23"]));
assert(found.length>=30,"La fuente 23 requiere al menos 30 biografías");
for(const [name,p] of found){
 assert(p.who?.length>=45,"Biografía incompleta "+name);
 assert(p.sources["23"].length&&p.sources["23"].every(x=>typeof x==="string"?x.length>=65:typeof x.statement==="string"&&x.statement.length>=65&&!!x.topic&&!!x.speaker&&!!x.status),"Sin declaración atribuida "+name);
}
for(const name of ["Lorenzo Ramírez","Jean Monnet","Robert Schuman","Konrad Adenauer","Friedrich Merz","Ursula von der Leyen","Emmanuel Macron","Mijaíl Gorbachov","Boris Yeltsin","Shepard Stone"]){
 assert(lib.profiles[name]?.sources?.["23"],"Persona ausente: "+name);
}
assert(lib.profiles["Jean Monnet"].sources["23"].some(x=>x.status==="alegacion_no_verificada"&&/Sostiene|afirma|alega/i.test(x.statement)&&x.speaker==="Lorenzo Ramírez"),"La interpretación de Monnet no se atribuye a la fuente");
assert(lib.profiles["Ursula von der Leyen"].sources["23"].some(x=>(typeof x==="string"?x:x.statement).includes("no se consideran hechos probados")),"No se ha separado la alegación personal");
assert(lib.profiles["Allen Dulles"].sources["23"][0].status==="identidad_pendiente","La referencia fonética Alenduls no puede darse por identificada");
assert(lib.profiles["Emmanuel Macron"].sources["23"][0].status==="alegacion_no_verificada","No debe presentarse influencia bancaria como hecho probado");
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-23.js'),"Módulo no enlazado al grafo");
assert(html.includes('"23":"f23-episodio"'),"Personas no conectadas al episodio 23");
assert(flow.includes("cp la-telarana/personas-fuentes-23.js dist/la-telarana/personas-fuentes-23.js"),"Módulo sin publicación Pages");
assert(!flow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Inventario editorial expuesto");
const tracker=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const src=tracker.inReview.find(s=>s.order===23);
assert(src?.personsProfiled===30&&!src.reviewComplete,"Seguimiento editorial erróneo");
assert(src.transcriptAudioMatched===false&&src.verifiedMinuteReferences===0,"No atribuir minutajes o cotejos no realizados");
assert(tracker.nextSource.order>23,"La investigación no avanza");
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
const event=timeline.items.find(e=>e.id==="study-f23-tratado-paris-ceca-1951");
assert(event?.investigation?.date==="1951-04-18","Fecha del Tratado de París incorrecta");
assert(event.investigation.confirmedBy.url.startsWith("https://historicalarchives.europarl.europa.eu/"),"Falta fuente institucional independiente");
assert(timeline.items.filter(e=>e.id==="study-f21-schuman-1950").length===1,"Declaración Schuman duplicada o ausente");
assert(timeline.items.filter(e=>e.investigation?.sourceOrder===23).length===1,"Hitos propios de F23 duplicados");
assert(tracker.timeline.committedVerifiedEvents===timeline.items.length,"Descuadre histórico");
console.log("OK: F23 · "+found.length+" fichas, Tratado de París 1951 y alegaciones atribuidas");
