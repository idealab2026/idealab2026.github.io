/* Fuente 13: contratos de publicación, identidad, historia y procedencia. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const html=read("la-telarana/index.html");
const workflow=read(".github/workflows/pages.yml");
const source=read("la-telarana/personas-fuentes-13.js");
const baseRaw=read("la-telarana/personas-fuentes-18-21.js");
const ctx={window:{}};
vm.runInNewContext(baseRaw,ctx);
vm.runInNewContext(source,ctx);
const lib=ctx.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const people=Object.entries(lib.profiles).filter(([_,v])=>Array.isArray(v.sources?.["13"]));
assert(people.length>=20,"La fuente 13 necesita al menos 20 perfiles con mención identificable");
for(const [name,p] of people){
 assert(typeof p.who==="string"&&p.who.length>=45,"Falta biografía "+name);
 assert(p.sources["13"].length>0&&p.sources["13"].every(s=>typeof s==="string"&&s.length>=65),"No consta lo que se dice de "+name);
}
assert(lib.profiles["Jesús Hernández"]?.sources["13"],"Historiador invitado no perfilado");
assert(!lib.profiles["Jesús Hernández Tomás"]?.sources?.["13"],"Homónimo histórico indebidamente asociado");
assert(html.includes('src="./personas-fuentes-13.js'),"No se carga el expediente");
assert(html.includes('"13":"f13-episodio"'),"No hay vínculo a la fuente 13");
const audited=(html.match(/\[("[0-9]+"(?:,"[0-9]+")*)\]\.forEach\(function\(order\)/)||[])[1];
assert(audited&&JSON.parse("["+audited+"]").includes("13"),"No audita la segunda capa de la fuente 13");
assert(workflow.includes("cp la-telarana/personas-fuentes-13.js dist/la-telarana/personas-fuentes-13.js"),"No se incluye el módulo en Pages");
assert(!workflow.includes("cp la-telarana/progreso-fuentes.json"),"Prohibido exponer inventario privado");
const historical=JSON.parse(read("linea-historia/estudios-telarana.json"));
const h13=historical.items.filter(v=>v.investigation?.sourceOrder===13);
const required=["study-f13-valquiria-1944","study-f13-pacto-germano-sovietico-1939","study-f13-invasion-alemana-polonia-1939","study-f13-operacion-barbarroja-1941"];
for(const id of required){
 const item=h13.find(v=>v.id===id);
 assert(item,"Falta evento "+id);
 assert(item.investigation.date.length===10&&!Number.isNaN(Date.parse(item.investigation.date)),"Fecha inválida "+id);
 assert(item.investigation.confirmedBy?.url?.startsWith("https://"),"Contraste institucional ausente "+id);
 assert(item.investigation.status==="hecho_documentado","Estado no documental "+id);
}
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const record=progress.inReview.find(v=>v.order===13);
assert(record&&record.reviewComplete===false,"No marcar completada sin revisar audio");
assert(record.personsProfiled>=20,"No está registrado el progreso");
assert(record.timelineVerifiedEventsCommitted===4,"Eventos de fuente 13 no cuadran");
assert(record.transcriptAudioMatched===false&&record.verifiedMinuteReferences===0,"No inventar cotejo de audio");
console.log("OK: F13 · "+people.length+" biografías y declaraciones, "+h13.length+" hitos, seguimiento privado, publicación y auditoría vinculadas");
