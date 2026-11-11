/** F25: nueve relaciones verificables, cinco menciones y nueve notas ASR atribuidas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
vm.runInNewContext(read("la-telarana/fuente-25-conexiones-contrastadas.js"),ctx,{timeout:7000});
const dossier=ctx.window.IDEA_TELARANA_F25_CONEXIONES;
assert.equal(dossier.metadata.sourceOrder,25);
assert(dossier.metadata.transcriptVerified===true&&dossier.metadata.audioVerified===false&&dossier.metadata.minuteVerified===false);
assert.equal(dossier.nodes.length,18);
assert.equal(dossier.edges.length,14);
const byId=new Map(dossier.nodes.map(n=>[n.id,n]));
for(const e of dossier.edges)assert(byId.has(e.a)&&byId.has(e.b),"Arista con extremo ausente: "+e.id);
const docEdges=dossier.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente");
const mentionEdges=dossier.edges.filter(e=>e.claimStatus==="mencion_transcripcion_no_prueba_de_hechos");
assert.equal(docEdges.length,9);
assert.equal(mentionEdges.length,5);
for(const e of docEdges)assert(e.source.startsWith("https://")&&e.note.length>=95&&e.type.length>=16,"Falta justificante documental "+e.id);
for(const e of mentionEdges)assert(e.source.includes("youtube.com/watch?v=MTGBx3z8pCI"),"Una mención no es un contrato: "+e.id);
const notes=dossier.nodes.flatMap(n=>n.podcastNotes||[]);
assert.equal(notes.length,9);
for(const note of notes)assert(note.status==="alegacion"&&note.timeSec===null&&note.text.includes("audio no cotejado"),"Se ha simulado verificación audiovisual");
const does=(a,b)=>docEdges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
for(const pair of [
 ["f25-david-rockefeller","f25-trilateral"],
 ["f25-david-rockefeller","f25-cfr"],
 ["usaid-rockefeller-foundation","f25-g30"],
 ["f25-fed","f25-bis"],
 ["f25-ecb","f25-bis"],
 ["f25-fed","f25-fed-act"],
 ["f25-fmi","f25-bretton-woods"],
 ["f25-worldbank","f25-bretton-woods"],
 ["usaid-nelson-rockefeller","f25-david-rockefeller"]]){
 assert(does(...pair),"Relación documental omitida "+pair.join("→"));
}
assert(!does("f25-david-rockefeller","f21-usaid"),"No inventar financiación o mando USAID por David Rockefeller");
assert(!does("f25-rockefeller","f25-g30"),"Familia Rockefeller no equivale a Rockefeller Foundation");
const federalNote=(byId.get("f25-fed").podcastNotes||[])[0]?.text||"";
assert(federalNote.includes("Congreso")&&federalNote.includes("1913"),"No se ha advertido del error histórico sobre el Congreso");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./fuente-25-conexiones-contrastadas.js?v='),"F25 no cargada en HTML");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_F25_CONEXIONES)'),"No se integra módulo F25");
assert(workflow.includes("cp la-telarana/fuente-25-conexiones-contrastadas.js dist/la-telarana/fuente-25-conexiones-contrastadas.js"),"F25 fuera de Pages");
const timeline=JSON.parse(read("linea-historia/estudios-telarana.json"));
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(timeline.items.length,progress.timeline.committedVerifiedEvents);
for(const id of ["study-f25-fed-law-1913","study-f25-bretton-woods-1944","study-f25-rockefeller-cfr-1970","study-f25-trilateral-1973","study-f25-g30-rockefeller-1978"]){
 const evt=timeline.items.find(x=>x.id===id);
 assert(evt?.investigation?.status==="hecho_documentado"&&evt.investigation.confirmedBy.url.startsWith("https://"),"Falta hito F25 "+id);
}
assert(progress.inReview.find(x=>x.order===25)?.reviewComplete===false,"No se ha cotejado el audio de F25");
console.log("OK F25: 9 vínculos oficiales, 5 menciones, 9 alegaciones atribuidas, 5 hitos y sin confundir David con Nelson Rockefeller.");
