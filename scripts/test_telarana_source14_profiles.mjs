/* Fuente 14: atribución, biografías, contraste numérico y registro histórico. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const window={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window});
vm.runInNewContext(read("la-telarana/personas-fuentes-14.js"),{window});
const lib=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const people=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["14"]));
assert(people.length>=16,"Faltan perfiles de la fuente 14");
for(const [name,p]of people){
 assert(p.who?.length>=45,"Falta descripción biográfica: "+name);
 assert(p.sources["14"].every(s=>s.length>=65),"Versión atribuida escueta: "+name);
}
assert(lib.profiles["Mark Rossini"]?.sources["14"],"No se ha resuelto el nombre de Rossini");
assert(lib.profiles["Ron DiFrancesco"]?.sources["14"],"Falta Ron, el superviviente de la planta 84");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-14.js'),"Fuente de perfiles omitida en HTML");
assert(html.includes('"14":"f14-episodio"'),"No hay referencia del episodio en mapa de perfiles");
const audited=(html.match(/\[("[0-9]+"(?:,"[0-9]+")*)\]\.forEach\(function\(order\)/)||[])[1];
assert(audited&&JSON.parse("["+audited+"]").includes("14"),"Auditoría no contabiliza fuente 14");
assert(workflow.includes("cp la-telarana/personas-fuentes-14.js dist/la-telarana/personas-fuentes-14.js"),"No se incorpora a Pages");
assert(!workflow.includes("cp la-telarana/progreso-fuentes.json"),"Inventario privado expuesto");
const tracker=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const rec=tracker.inReview.find(x=>x.order===14);
assert(rec&&!rec.reviewComplete,"No se puede cerrar una fuente sin cotejo audiovisual");
assert(rec.numericDiscrepancy.officialVictims===2977,"Recuento histórico de víctimas no reconciliado");
assert(rec.verifiedMinuteReferences===0&&rec.transcriptAudioMatched===false,"Se inventaron minutos");
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
const bySource=timeline.items.filter(x=>x.investigation?.sourceOrder===14);
assert(bySource.some(x=>x.id==="study-f14-comision-11s-informe-2004"),"Falta publicación oficial del informe");
assert(bySource.length===2,"El seguimiento histórico de fuente 14 no coincide");
assert(tracker.timeline.committedVerifiedEvents===timeline.items.length,"Descuerdo entre cronología y progreso");
console.log("OK: F14 · "+people.length+" identidades, 2977 víctimas documentadas, "+bySource.length+" hitos y seguimiento privado");
