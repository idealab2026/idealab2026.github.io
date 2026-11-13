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
assert(found.length>=31,"La fuente 23 requiere al menos 30 biografías");
for(const [name,p] of found){
 assert(p.who?.length>=45,"Biografía incompleta "+name);
 assert(p.sources["23"].length&&p.sources["23"].every(x=>typeof x==="string"?x.length>=65:typeof x.statement==="string"&&x.statement.length>=65&&!!x.topic&&!!x.speaker&&!!x.status),"Sin declaración atribuida "+name);
}
for(const name of ["Lorenzo Ramírez","Jean Monnet","Robert Schuman","Konrad Adenauer","Friedrich Merz","Ursula von der Leyen","Emmanuel Macron","Mijaíl Gorbachov","Boris Yeltsin","Shepard Stone"]){
 assert(lib.profiles[name]?.sources?.["23"],"Persona ausente: "+name);
}
assert(lib.profiles["Jean Monnet"].sources["23"].some(x=>x.status==="alegacion_no_verificada"&&/Sostiene|afirma|alega/i.test(x.statement)&&x.speaker==="Lorenzo Ramírez"),"La interpretación de Monnet no se atribuye a la fuente");
assert(lib.profiles["Ursula von der Leyen"].sources["23"].some(x=>x.status==="alegacion_no_verificada"&&x.speaker==="Lorenzo Ramírez"&&/no quedan demostradas|no se acreditan|no se consideran hechos probados/i.test(x.statement)),"No se ha separado la alegación personal");
assert(lib.profiles["Allen Dulles"].sources["23"][0].status==="identidad_pendiente","La referencia fonética Alenduls no puede darse por identificada");
assert(lib.profiles["Emmanuel Macron"].sources["23"][0].status==="alegacion_no_verificada","No debe presentarse influencia bancaria como hecho probado");
vm.runInNewContext(read("la-telarana/fuente-23-revision-inicial.js"),{window:w});
const f23=w.IDEA_TELARANA_F23_REVIEW;
assert(f23.nodes.length===20&&f23.edges.length===24,"Los vínculos añadidos de F23 no están cargados");
assert(f23.metadata.transcriptTimecodedSegments===4123&&f23.metadata.subtitleEvidenceAnchors===12,"Falta trazabilidad de subtítulos F23");
assert(f23.metadata.verifiedMinuteReferences===0&&f23.metadata.transcriptAudioMatched===false,"No confundir subtítulos con audio cotejado");
const ids=new Set(f23.nodes.map(x=>x.id));
assert(f23.edges.every(e=>ids.has(e.a)&&ids.has(e.b)),"Aristas de F23 huérfanas");
const verified=f23.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente");
assert(verified.length===7&&verified.every(e=>e.confidence==="documentado"&&!/youtube\.com/.test(e.source)),"La prueba independiente exige fuentes externas a YouTube");
assert(f23.edges.some(e=>e.id==="f23-alega-macron-control"&&e.claimStatus==="alegacion_no_verificada"),"Alegación sobre Macron presentada como hecho");
assert(f23.edges.some(e=>e.id==="f23-doc-merz-blackrock"&&/supervisi[oó]n/i.test(e.note)),"Merz no fue identificado por su cargo real");
const baud=lib.profiles["Jacques Baud"]?.sources?.["23"]?.[0];
assert(baud?.status==="identidad_probable_documentada_no_cotejada_audio"&&baud.timeSec===289&&baud.minuteVerified===false,"Jacques Baud falsamente identificado con audio");
for(const name of ["Jean Monnet","Robert Schuman","Emmanuel Macron","Friedrich Merz","Ursula von der Leyen","Shepard Stone"]){
 const note=lib.profiles[name]?.sources?.["23"]?.[0];
 assert(Number.isInteger(note?.timeSec)&&note.audioVerified===false&&note.minuteVerified===false,"Marca de subtítulos inexistente en "+name);
}
const html=read("la-telarana/index.html"),flow=read(".github/workflows/pages.yml");
assert(html.includes('src="./personas-fuentes-23.js'),"Módulo no enlazado al grafo");
assert(html.includes('"23":"f23-episodio"'),"Personas no conectadas al episodio 23");
assert(flow.includes("cp la-telarana/personas-fuentes-23.js dist/la-telarana/personas-fuentes-23.js"),"Módulo sin publicación Pages");
assert(!flow.includes("cp la-telarana/progreso-fuentes.json dist/"),"Inventario editorial expuesto");
const tracker=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const src=tracker.inReview.find(s=>s.order===23);
assert(src?.personsProfiled===31&&!src.reviewComplete,"Seguimiento editorial erróneo");
assert(src.transcriptAudioMatched===false&&src.verifiedMinuteReferences===0,"No atribuir minutajes o cotejos no realizados");
assert(tracker.nextSource.order>23,"La investigación no avanza");
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
const event=timeline.items.find(e=>e.id==="study-f23-tratado-paris-ceca-1951");
assert(event?.investigation?.date==="1951-04-18","Fecha del Tratado de París incorrecta");
assert(event.investigation.confirmedBy.url.startsWith("https://historicalarchives.europarl.europa.eu/"),"Falta fuente institucional independiente");
assert(timeline.items.filter(e=>e.id==="study-f21-schuman-1950").length===1,"Declaración Schuman duplicada o ausente");
assert(timeline.items.filter(e=>e.investigation?.sourceOrder===23).length===2,"Hitos propios de F23 duplicados");
const euro=timeline.items.find(e=>e.id==="study-f23-jacques-baud-sancion-ue-2025");
assert(euro?.investigation?.date==="2025-12-15"&&/eur-lex.europa.eu/.test(euro.investigation.confirmedBy.url),"Falta contrastar la sanción UE a Baud");
assert(tracker.timeline.committedVerifiedEvents===timeline.items.length,"Descuadre histórico");
console.log("OK: F23 · "+found.length+" fichas, Tratado de París 1951, sanción Baud 2025 y alegaciones atribuidas");
