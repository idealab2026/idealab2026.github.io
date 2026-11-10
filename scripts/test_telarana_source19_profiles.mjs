/* F19: biografías, atribución impersonal, ASR ambiguo y cronología sin duplicados. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-19.js"),{window:w});
const lib=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const profiles=Object.entries(lib.profiles).filter(([_,p])=>Array.isArray(p.sources?.["19"]));
assert(profiles.length>=23,"Faltan perfiles F19");
for(const [name,p] of profiles){
 assert(p.who?.length>=55,"Falta biografía de "+name);
 assert(p.sources["19"].length&&p.sources["19"].every(x=>typeof x==="string"?x.length>=65:typeof x?.statement==="string"&&x.statement.length>=65&&x.topic&&x.speaker&&x.status&&x.transcriptAnchor),"Falta atribución "+name);
}
for(const name of ["Fernando Díaz Villanueva","Lorenzo Ramírez","Juan Francisco Calero","Borja Fernández","Peter Thiel","Larry Fink"]){
 assert(lib.profiles[name]?.sources?.["19"],"Falta persona citada: "+name);
}
assert(lib.profiles["Peter Thiel"].sources["19"].some(x=>x.status==="identidad_pendiente"&&x.transcriptAnchor.includes("Peter Z")&&x.audioVerified===false),"No se marca ambigüedad de ASR Peter Z");
assert(lib.profiles["Alexander Haig"].sources["19"].some(x=>x.status==="identidad_pendiente"),"No se marca el nombre fonético Alexander Hey");
assert(Object.entries(lib.profiles).filter(([n,p])=>p.sources?.["19"]).every(([n,p])=>p.sources["19"].every(c=>c.speaker.includes("sin diarizar")&&c.minuteVerified===false)),"No inventar turnos o minutos de la mesa");
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-19.js'),"No se carga capa F19");
assert(html.includes('"19":"f19-episodio"'),"No se conecta al episodio F19");
assert(flow.includes("cp la-telarana/personas-fuentes-19.js dist/la-telarana/personas-fuentes-19.js"),"No se distribuye módulo F19");
assert(!flow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Inventario privado expuesto");
const track=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const f19=track.inReview.find(x=>x.order===19);
assert(f19?.personsProfiled===23&&!f19.reviewComplete,"Estado F19 inconsistente");
assert(f19.verifiedMinuteReferences===0&&!f19.transcriptAudioMatched,"No inventar audio/minutos");
assert(f19.ambiguousASRIdentifications.some(x=>x.raw==="Peter Z"&&x.status==="probable_awaiting_audio"),"Sin control de homónimo fonético");
assert(track.nextSource.order>19,"El inventario ha retrocedido a la fuente 19");
const feed=JSON.parse(read("linea-historia/estudios-telarana.json"));
const events=feed.items.filter(x=>x.investigation?.sourceOrder===19);
assert(events.length===2,"F19 debe tener exactamente dos hitos contrastados");
assert(events.some(x=>x.id==="study-f19-asalto-capitolio-2021"&&x.investigation?.date==="2021-01-06"),"Falta 6 de enero");
assert(events.some(x=>x.id==="study-f19-china-omc-2001"&&x.investigation?.date==="2001-12-11"),"Falta China-OMC o fecha");
assert(track.timeline.committedVerifiedEvents===feed.items.length,"Contabilidad histórica incoherente");
console.log("OK: fuente 19 · "+profiles.length+" perfiles, 2 hitos, ASR ambiguo protegido, inventario privado");
