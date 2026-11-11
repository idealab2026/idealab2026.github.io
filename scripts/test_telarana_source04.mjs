/* CI: La fuente 04 no incorpora transcripciones ni atribuciones inventadas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

/* The photo catalogue is a trusted JS asset: an initial JSON assignment
   followed by editorial Object.assign extensions. Parse all entries, without
   treating the complete source text as one JSON document. */
function loadPhotoCatalog(){
 const source=fs.readFileSync("la-telarana/photo-catalog.js","utf8");
 const sandbox={window:{}};
 vm.runInNewContext(source,sandbox,{filename:"photo-catalog.js",timeout:1500});
 const entries=sandbox.window.IDEA_TELARANA_WIKIPEDIA_PORTRAITS;
 assert(entries&&typeof entries==="object"&&!Array.isArray(entries),"Missing photo catalogue object");
 return entries;
}
function load(path,marker){
 const raw=fs.readFileSync(path,"utf8");
 assert(raw.includes(marker),"Missing expected source marker: "+marker);
 return JSON.parse(raw.split(marker)[1].trim().replace(/;$/,""));
}
const src=load("la-telarana/podcast-duque-lerma-historia.js","window.IDEA_TELARANA_SOURCE04_HISTORICAL = ");
const bio=load("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const photos=loadPhotoCatalog();
const hist=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
const p=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const page=fs.readFileSync("la-telarana/index.html","utf8");
assert.equal(src.metadata.id,"canal-coronel-margarita-torres-lerma-2024-04-04");
assert.equal(src.metadata.transcriptAvailable,true,"La transcripción privada de 84.334 caracteres fue comprobada en Drive");
assert.equal(src.metadata.transcriptCharacters,84334);
assert.equal(src.metadata.transcriptVerifiedAgainstAudio,false,"No fabricated audio verification");
assert.equal(src.metadata.chapterTimecodesVerifiedFromDescription,true);
assert.equal(src.nodes.length,18);
assert.equal(src.edges.length,23);
assert.equal(src.metadata.chapters.length,7);
assert.equal(src.unresolved.length,1);
assert.equal(src.unresolved[0].timeSec,1790);
assert(src.nodes.find(x=>x.id==="f04-villamizar-epigrafe")?.kind==="Persona","El ASR identifica a Pedro de Villamizar, aunque la identidad exacta sigue en revisión");
assert(src.nodes.find(x=>x.id==="f04-villamizar-epigrafe")?.note.includes("identificación"),"Debe mantenerse cautela documental Villamizar");
const ids=new Set(src.nodes.map(n=>n.id));
assert.equal(ids.size,18);
for(const n of src.nodes){
 assert(n.note.length>=100,"Need historical identity and context: "+n.id);
 assert(n.podcastNotes.every(note=>(typeof note.timeSec==="number" && /no es una cita literal/i.test(note.title))||(note.timeSec===null&&note.status==="alegacion"&&/audio/i.test(note.text))),"No confundir comienzos de capítulos con citas minutadas: "+n.id);
}
for(const e of src.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Unknown edge identity: "+e.id);
 assert(e.confidence==="documentado","Historical edges must be externally documented: "+e.id);
 assert(/^https:\/\//.test(e.source),"Missing documentary link: "+e.id);
}
const portraits=src.nodes.filter(n=>n.photo);
assert.equal(portraits.length,3);
assert(portraits.some(n=>n.id==="f04-lerma"&&n.photo.includes("wikimedia.org")));
assert(Object.keys(photos).some(id=>id==="f04-antonio-perez"),"Missing identifiable Wikimedia portrait");
for(const id of ["f04-margarita-torres","f04-antonio-perez","f04-felipe-ii","f04-lerma","f04-felipe-iii","f04-maria-cristina","f04-fernando-munoz","f04-daniel-strauss","f04-alejandro-lerroux"]){
 const b=bio.curated[id];
 assert(b&&b.text.length>=250&&/^https:\/\//.test(b.source),"Missing biographical source: "+id);
}
const events=hist.items.filter(e=>e.investigation?.sourceOrder===4);
assert.equal(events.length,7,"Seven independently sourced timeline events required");
assert(events.some(e=>e.id==="study-v4-lerma-compra-valladolid-1600"));
assert(events.some(e=>e.id==="study-v4-lerma-venta-corona-1601"));
assert(events.every(e=>e.investigation.status==="hecho_documentado"&&e.investigation.sourceUrl===src.metadata.url));
assert(events.every(e=>e.investigation.relatedTelarana.every(id=>ids.has(id))),"Timeline points to unknown identities");
const row=p.sourceCatalog.entries.find(x=>x.order===4);
assert(row.tracking.initiated&&row.tracking.docTranscriptionCreated&&row.tracking.inReview);
assert.equal(row.tracking.transcriptContentImported,true);
assert.equal(row.tracking.complete,false);
assert.equal(row.tracking.imageRuntimeVerified,false);
assert.equal(p.timeline.committedVerifiedEvents,hist.items.length);
assert(page.includes("podcast-duque-lerma-historia.js?v="));
const modules=JSON.parse((/var modules=(\[[^\n]+\]);/.exec(page)||[])[1]||"[]");
assert(modules.some(m=>m.key==="IDEA_TELARANA_SOURCE04_HISTORICAL"&&m.kind==="mergeNewEpisode")&&page.includes("mergeNewEpisode(doc)"),"La fuente no se carga mediante el registro modular: IDEA_TELARANA_SOURCE04_HISTORICAL");
assert(!page.includes("source-review-rows")&&!page.includes("progreso-fuentes.json"),"No publish internal source tracker");
console.log("OK: fuente04, ASR íntegro en Drive, 4 atribuciones nuevas, Villamizar parcial y Fernando VII corregido; sin audio validado");
