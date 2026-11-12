/** Fuente 30: 17/02/2022 y contaminación temporal por hechos posteriores. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
vm.runInNewContext(read("la-telarana/fuente-30-revision-inicial.js"),ctx,{filename:"fuente-30-revision-inicial.js",timeout:7000});
const mod=ctx.window.IDEA_TELARANA_F30_REVIEW;
assert.equal(mod.metadata.sourceOrder,30);
assert.equal(mod.metadata.publishedAt,"2022-02-17");
assert(mod.metadata.transcriptAvailable===true&&mod.metadata.audioVerified===false&&mod.metadata.minuteVerified===false&&mod.metadata.transcriptSegments===4462);
assert(mod.metadata.transcriptFullTextPreserved===true);
assert.equal(mod.nodes.length,16);
assert.equal(mod.edges.length,18);
assert(mod.metadata.editorialDossierUrl.startsWith("https://docs.google.com/document/d/"));
assert.equal(mod.nodes.flatMap(n=>n.podcastNotes||[]).filter(n=>Number.isFinite(n.timeSec)).length,4,
 "4 notas cronometradas, atribuidas y sin cotejo del audio");
const ids=new Set(mod.nodes.map(n=>n.id));
assert.equal(ids.size,mod.nodes.length,"ID de nodo duplicado");
const facts=mod.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente");
const mentions=mod.edges.filter(e=>e.claimStatus==="mencion_editorial_no_equivale_a_relacion_sustantiva");
assert.equal(facts.length,11);assert.equal(mentions.length,7);
for(const e of mod.edges){
 assert(ids.has(e.a)&&ids.has(e.b)&&e.a!==e.b,"Arista huérfana: "+e.id);
 assert(e.note.length>=120&&/^https:\/\//.test(e.source),"Falta explicación y fuente: "+e.id);
 assert((e.confidence==="documentado")===facts.includes(e),"Mención indebidamente convertida en hecho: "+e.id);
}
for(const e of facts){
 assert(!e.source.includes("youtube.com")&&!e.source.includes("podcasts.apple.com"),"Afirmación institucional basada solo en podcast: "+e.id);
}
for(const e of mentions){
 assert(e.source.includes("podcasts.apple.com"),"Mención de fuente sin descripción editorial verificable: "+e.id);
}
const post=facts.filter(e=>e.temporalContext==="posterior_a_entrevista");
assert.equal(post.length,4);
for(const e of post){
 assert(/posterior|despu[eé]s|24\/02\/2022|29\/06\/2022/i.test(e.note),"Hecho posterior sin temporalidad: "+e.id);
}
assert(facts.filter(e=>e.temporalContext!=="posterior_a_entrevista").length===7);
assert(facts.some(e=>e.id==="f30-soros-osf"&&e.a==="on-george-soros"&&e.b==="on-open-society"));
assert(!facts.some(e=>(e.a==="on-george-soros"||e.b==="on-george-soros")&&(e.a==="f30-russia"||e.b==="f30-russia"||e.a==="f30-ukraine"||e.b==="f30-ukraine")),"No inventar Soros-Rusia/Ucrania");
const html=read("la-telarana/index.html"),wf=read(".github/workflows/pages.yml");
assert(html.includes('src="./fuente-30-revision-inicial.js?v='),"Fuente 30 no cargada en HTML");
assert(html.includes('Contexto posterior a la entrevista: no atribuir al invitado'),"La ficha debe señalar hechos posteriores");
assert(html.includes('posterior a la entrevista'),"La línea histórica debe mostrar posterioridad de los hitos");
assert(wf.includes("cp la-telarana/fuente-30-revision-inicial.js dist/la-telarana/fuente-30-revision-inicial.js"),"Fuente 30 no copiada a Pages");
const m=/var modules=(\[[^\n]+\]);/.exec(html);assert(m,"Registro modular ausente");
assert(JSON.parse(m[1]).some(x=>x.label==="Fuente 30"&&x.key==="IDEA_TELARANA_F30_REVIEW"));
const tracking=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const hist=JSON.parse(read("linea-historia/estudios-telarana.json"));
assert.equal(tracking.timeline.committedVerifiedEvents,hist.items.length);
assert(tracking.inReview.some(s=>s.order===30&&s.reviewComplete===false&&s.rawTranscriptAvailable===true));
const cat=tracking.sourceCatalog.entries.find(x=>x.order===30);
assert(cat.tracking.editorialDossierCreated&&cat.tracking.docTranscriptionCreated===false&&cat.tracking.transcriptContentImported===false);
assert(cat.tracking.timecodedTranscriptStoredInDrive&&cat.tracking.timecodedTranscriptReadbackVerified&&
 cat.tracking.timecodedTranscriptCharactersReadBack>10000,
 "F30: TXT completo con minutajes no verificado en Drive");
for(const id of ["study-f30-osce-minsk-2015","study-f30-un-minsk-2015","study-f30-nato-proposals-2022","study-f30-episode-published-2022","study-f30-invasion-2022","study-f30-nato-concept-2022"]){
 const h=hist.items.find(x=>x.id===id);
 assert(h?.investigation?.status==="hecho_documentado"&&h.investigation.confirmedBy?.url.startsWith("https://"),"Hito ausente o sin referencia "+id);
 assert(h.investigation.temporalRelationToSource,"Hito sin temporalidad relativa "+id);
}
for(const id of ["study-f30-invasion-2022","study-f30-nato-concept-2022"]){
 assert.equal(hist.items.find(x=>x.id===id).investigation.temporalRelationToSource,"posterior_al_episodio","Hecho posterior imputado a la fuente");
}
console.log("OK F30: 11 relaciones primarias, 7 menciones, 4 posteriores separados, 6 hitos y 4 notas minutadas atribuidas.");
