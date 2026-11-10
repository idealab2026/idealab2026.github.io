/* Fuente 17: comprobación de identidades, declaraciones de Margallo y fecha de la declaración bilateral. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-17.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const people=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["17"]));
assert(people.length>=15,"Faltan perfiles de la fuente 17");
for(const [name,p]of people){
 assert(p.who?.length>=45,"Falta quién es "+name);
 assert(p.sources["17"].length>0&&p.sources["17"].every(s=>s.length>=65),"Atribución insuficiente "+name);
}
assert(lib.profiles["José Manuel García-Margallo"]?.sources["17"],"Falta el exministro entrevistado");
assert(lib.profiles["François Hollande"]?.sources["17"],"No se ha normalizado ASR Orlán");
assert(lib.profiles["Ursula von der Leyen"]?.sources["17"],"No se ha identificado el nombre fonético");
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-17.js'),"No se carga el módulo");
assert(html.includes('"17":"f17-episodio"'),"Falta enlace del episodio");
assert(flow.includes("cp la-telarana/personas-fuentes-17.js dist/la-telarana/personas-fuentes-17.js"),"Pages no publica el módulo");
const prog=JSON.parse(read("la-telarana/progreso-fuentes.json")),r=prog.inReview.find(x=>x.order===17);
assert(r?.personsProfiled>=15&&r.reviewComplete===false,"Fuente cerrada sin audio");
assert(r.verifiedMinuteReferences===0&&r.transcriptAudioMatched===false,"Minutajes sin verificar");
assert(prog.nextSource.order>17,"El inventario retrocede a una fuente ya revisada");
const hist=JSON.parse(read("linea-historia/estudios-telarana.json"));
const event=hist.items.find(e=>e.id==="study-f17-espana-marruecos-declaracion-2022");
assert(event?.investigation?.date==="2022-04-07","Falta declaración bilateral fechada");
assert(event.investigation.confirmedBy.url.startsWith("https://www.lamoncloa.gob.es/"),"El hito debe basarse en el texto oficial");
assert(event.d.includes("no")&&event.d.includes("soberanía"),"No diferenciar el contenido del acuerdo de un reconocimiento de soberanía");
assert(prog.timeline.committedVerifiedEvents===hist.items.length,"Progreso histórico incoherente");
console.log("OK: F17 · "+people.length+" perfiles, un hito oficial de 2022 y controles de atribución");
