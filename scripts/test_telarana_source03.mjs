/* Auditoría de la fuente 03: metadatos confirmados, transcripción aún pendiente. */
import assert from "node:assert/strict";
import fs from "node:fs";
const load=(path,marker)=>{
 const s=fs.readFileSync(path,"utf8");
 assert(s.includes(marker), "No encontrado "+marker);
 return JSON.parse(s.split(marker)[1].trim().replace(/;$/,""));
};
const third=load("la-telarana/podcast-vaquero-145-editorial.js","window.IDEA_TELARANA_SOURCE03_EDITORIAL = ");
const ceuta=load("la-telarana/podcast-coronel-elecciones-2026-transcript-review.js","window.IDEA_TELARANA_CEUTA_TRANSCRIPT_REVIEW = ");
const frattini=load("la-telarana/podcast-vaquero-150.js","window.IDEA_TELARANA_PODCAST_150 = ");
const bios=load("la-telarana/person-biographies.js","window.IDEA_TELARANA_BIOGRAPHIES = ");
const catalog=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
const times=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8"));
assert.equal(third.metadata.id,"vaquero-145-joaquin-abad-2026-09-10");
assert.equal(third.metadata.publishedAt,"2026-09-10");
assert.equal(third.metadata.transcriptAvailable,false);
assert.equal(third.metadata.timecodesVerified,false);
assert.equal(third.nodes.length,5);
assert.equal(third.edges.length,5);
assert(third.nodes.every(x=>x.note.length>100));
const ids=new Set(third.nodes.map(x=>x.id));
for(const edge of third.edges){
 assert(ids.has(edge.a)&&ids.has(edge.b),"Fuente03: arista sin nodo "+edge.id);
 assert(edge.podcastNotes.every(n=>n.timeSec===null),"Fuente03: hora inventada");
}
const royalEdges=third.edges.filter(e=>e.a==="rv145-felipe-vi"||e.b==="rv145-felipe-vi");
assert.equal(royalEdges.length,1,"No establecer vínculos íntimos o delictivos no acreditados con el rey");
assert.equal(royalEdges[0].type,"Mención en el título editorial");
assert(!third.nodes.some(n=>n.kind==="Persona"&&/suegro|menores|personas privadas/i.test(n.name)));
const photos=[
frattini.nodes.find(n=>n.id==="vf150-roberto-vaquero")?.photo,
ceuta.nodes.find(n=>n.id==="ce26-joaquin-abad")?.photo,
third.nodes.find(n=>n.id==="rv145-felipe-vi")?.photo
];
assert(photos.every(s=>s?.startsWith("https://")),"Faltan las fotos verificadas de las tres personas principales");
for(const p of ["vf150-roberto-vaquero","ce26-joaquin-abad","rv145-felipe-vi"])assert(bios.curated[p]?.text.length>200,"Falta biografía "+p);
const row=catalog.sourceCatalog.entries.find(s=>s.order===3);
assert.equal(row.status,"en_revision");
assert.equal(row.tracking.docTranscriptionCreated,true);
assert.equal(row.tracking.transcriptContentImported,true);
assert.equal(row.tracking.imageAtGraphNode,"configurada");
assert.equal(row.reviewComplete,false);
assert(!times.items.some(e=>e.investigation?.sourceOrder===3),"No inventar acontecimientos históricos de una sinopsis");
assert(html.includes("podcast-vaquero-145-editorial.js"));
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_SOURCE03_EDITORIAL)"));
assert(!html.includes("source-review-rows"),"Control interno no debe publicarse");
console.log("OK: fuente03 iniciada, 3 protagonistas con imágenes, 5 entidades, 5 relaciones verificables, doc preparado sin transcripción ni minutos ficticios");
