/* F24: personas documentadas, acontecimientos de 2023 y alegaciones atribuidas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-24.js"),{window:w});
const data=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const found=Object.entries(data.profiles).filter(([_,p])=>Array.isArray(p.sources?.["24"]));
assert(found.length>=23,"Debe haber 23 fichas de fuente 24");
for(const [name,p]of found){
 assert(p.who?.length>=50,"Biografía insuficiente "+name);
 assert(p.sources["24"].length&&p.sources["24"].every(x=>x.length>=60),"Sin comentario atribuido "+name);
}
for(const person of ["Lorenzo Ramírez","Donald Trump","Xi Jinping","Benjamin Netanyahu","Peter Thiel","Alex Karp","Tim Cook","Jeff Bezos","James M. Buchanan","Halford Mackinder","Mario Draghi","Kaja Kallas"]){
 assert(data.profiles[person]?.sources?.["24"],"Falta el perfil de "+person);
}
assert(data.profiles["Benjamin Netanyahu"].sources["24"].some(x=>x.includes("no se acreditan intenciones")),"Falta distinguir afirmaciones de pruebas");
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-24.js'),"Falta el fichero F24 en la web");
assert(html.includes('"24":"f24-episodio"'),"Sin enlace a la fuente 24");
assert(flow.includes("cp la-telarana/personas-fuentes-24.js dist/la-telarana/personas-fuentes-24.js"),"No se publica F24");
assert(!flow.includes("cp la-telarana/progreso-fuentes.json dist/"),"No exponer investigación interna");
const p=JSON.parse(read("la-telarana/progreso-fuentes.json")),f=p.inReview.find(x=>x.order===24);
assert(f&&f.personsProfiled===23&&!f.reviewComplete,"Cierre documental F24 injustificado");
assert(!f.transcriptAudioMatched&&f.verifiedMinuteReferences===0,"Audio o tiempos no comprobados");
assert(p.nextSource.order>24,"No se ha avanzado en el inventario");
const history=JSON.parse(read("linea-historia/estudios-telarana.json")),events=history.items.filter(x=>x.investigation?.sourceOrder===24);
assert(events.length===2,"La F24 requiere dos hitos fechados");
const diplomatic=events.find(e=>e.id==="study-f24-iran-arabia-beijing-2023");
const attack=events.find(e=>e.id==="study-f24-ataques-hamas-israel-2023");
assert(diplomatic?.investigation?.date==="2023-03-10","Fecha diplomática incorrecta");
assert(diplomatic.investigation.confirmedBy.url.startsWith("https://www.fmprc.gov.cn/"),"Falta declaración oficial tripartita");
assert(attack?.investigation?.date==="2023-10-07","Ataques no fechados");
assert(attack.investigation.confirmedBy.url.startsWith("https://www.un.org/"),"Falta fuente ONU");
assert(attack.investigation.methodologicalLimits.includes("no se infiere"),"No se ha separado causalidad inferida y hechos");
assert(p.timeline.committedVerifiedEvents===history.items.length,"Descuadre de acontecimientos");
console.log("OK: F24 · "+found.length+" biografías, 2 hechos contrastados, causalidad no inventada");
