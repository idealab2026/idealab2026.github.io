/* Fuente 20: perfiles citados, atribuciones y referencia no duplicada a Stargate. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-20.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const people=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["20"]));
assert(people.length>=16,"Faltan perfiles biográficos de F20");
for(const [name,p] of people){
 assert(p.who?.length>=50,"Biografía ausente: "+name);
 assert(p.sources["20"].length>=1&&p.sources["20"].every(s=>typeof s==="string"?s.length>=65:typeof s.statement==="string"&&s.statement.length>=65),"Falta declaración atribuida: "+name);
}
for(const name of ["Lorenzo Ramírez","Peter Thiel","Bill Gates","George Soros","Eric Schmidt","Sergey Brin","Larry Ellison","J. D. Vance","George Orwell"]){
 assert(lib.profiles[name]?.sources["20"],"Persona citada ausente: "+name);
}
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-20.js'),"No se carga la fuente 20");
assert(html.includes('"20":"f20-episodio"'),"Perfiles sin episodio de referencia");
assert(workflow.includes("cp la-telarana/personas-fuentes-20.js dist/la-telarana/personas-fuentes-20.js"),"Falta distribuir el módulo");
assert(!workflow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Se ha filtrado el control interno");
const track=JSON.parse(read("la-telarana/progreso-fuentes.json")),f20=track.inReview.find(e=>e.order===20);
assert(f20&&f20.personsProfiled>=16&&!f20.reviewComplete,"Revisión documental indebidamente cerrada");
assert(f20.transcriptAudioMatched===false&&f20.verifiedMinuteReferences===0,"Cotejo de audio inventado");
assert(f20.timelineVerifiedEventsCommitted===0,"Duplicación de fechas de otras fuentes");
assert(track.nextSource.order>20,"No se puede retroceder a una fuente ya revisada");
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
assert(!timeline.items.some(e=>e.investigation?.sourceOrder===20),"Una fuente sin hitos originales no debe crear duplicados");
const stargate=timeline.items.find(e=>e.id==="study-f21-stargate-2025");
assert(stargate&&stargate.investigation.otherSourceMentions?.some(e=>e.sourceOrder===20),"Falta referencia F20 al hecho F21");
assert(track.timeline.committedVerifiedEvents===timeline.items.length,"No cuadra el inventario de acontecimientos");
for(const name of ["Eric Schmidt","Donald Trump","Larry Ellison"]){
 const record=lib.profiles[name].sources["20"].find(x=>typeof x==="object"&&x.transcriptAnchor);
 assert(record?.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,"Ancla ASR o cotejo no documentado: "+name);
 assert(record.transcriptAnchor.length>=25&&record.topic&&record.speaker&&record.status,"Descripción concreta incompleta: "+name);
}
console.log("OK: F20 · "+people.length+" biografías, menciones atribuidas y Stargate sin duplicado");
