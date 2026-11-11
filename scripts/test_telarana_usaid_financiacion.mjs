/* Control estructural de expediente USAID: financiación, programas y expedientes judiciales. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
for(const p of ["la-telarana/fuente-21-orden-mundial-editorial.js","la-telarana/usaid-relaciones-documentadas.js","la-telarana/usaid-programas-financiacion.js"]){
 vm.runInNewContext(read(p),ctx,{filename:p,timeout:10000});
}
const dossier=ctx.window.IDEA_TELARANA_USAID_PROGRAMAS;
const previous=ctx.window.IDEA_TELARANA_USAID_DOCUMENTED;
const originals=ctx.window.IDEA_TELARANA_SOURCE21_EDITORIAL;
assert(dossier?.metadata?.id==="idealab-usaid-evidencia-segunda-fase");
assert.equal(dossier.edges.length,41,"Faltan relaciones de los expedientes financieros y judiciales");
assert.equal(dossier.nodes.length,32,"Inventario no reconciliado");
assert.equal(previous.edges.length,11,"Se han alterado las relaciones institucionales anteriores");
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
assert(html.includes('src="./usaid-programas-financiacion.js?v='),"La web no importa el expediente");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_USAID_PROGRAMAS)'),"Expediente sin integración");
assert(workflow.includes("cp la-telarana/usaid-programas-financiacion.js dist/la-telarana/usaid-programas-financiacion.js"),"Expediente ausente del despliegue");
assert(html.includes("Contratación y contratistas")&&html.includes("Auditorías y procedimientos judiciales"),"No se agruparon las relaciones en el panel");
const known=new Set([...dossier.nodes,...previous.nodes,...originals.nodes].map(n=>n.id));
const ids=new Set();
for(const e of dossier.edges){
 assert(!ids.has(e.id),"ID de arista duplicada: "+e.id);ids.add(e.id);
 assert(known.has(e.a)&&known.has(e.b)&&e.a!==e.b,"Relación huérfana: "+e.id);
 assert(e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente","Relación sin clasificación probatoria: "+e.id);
 assert(/^https:\/\//.test(e.source)&&e.note?.length>=95,"Falta fuente o contexto en "+e.id);
}
const direct=dossier.edges.filter(e=>e.a==="f21-usaid"||e.b==="f21-usaid");
assert(direct.length>=23,"USAID continúa demasiado poco conectada");
const acq=dossier.edges.filter(e=>e.type.startsWith("Contratación · socio de adquisición"));
const assist=dossier.edges.filter(e=>e.type.startsWith("Financiación y asistencia · socio"));
assert.equal(acq.length,8);assert.equal(assist.length,8);
assert(!dossier.edges.some(e=>e.a==="f21-usaid"&&e.b==="usaid-ned"||e.b==="f21-usaid"&&e.a==="usaid-ned"),"No inventar financiación directa USAID-NED");
assert(dossier.edges.some(e=>e.a==="usaid-departamento-estado"&&e.b==="usaid-ned"),"Falta distinguir la financiación de NED vía Departamento de Estado");
const verified=(id)=>dossier.edges.find(e=>e.id==="usaid-v2-"+id);
for(const k of ["ghsc","peacemandate","fraud-case","audit2025","stock-belgium","settlement","ned-state"])assert(verified(k),"Arista documental indispensable ausente: "+k);
const usa=originals.nodes.find(x=>x.id==="f21-usaid");
assert(usa?.podcastNotes?.length===4&&usa.podcastNotes.every(n=>n.status==="alegacion"),"Alegaciones del pódcast confundidas con datos oficiales");
const history=JSON.parse(read("linea-historia/estudios-telarana.json"));
const progress=JSON.parse(read("la-telarana/progreso-fuentes.json"));
assert.equal(progress.timeline.committedVerifiedEvents,history.items.length);
assert(history.items.length>=71,"Hitos oficiales perdidos");
const historyIds=progress.timeline.eventsBySource["21"];
for(const evt of ["study-f21-usaid-ghsc-2015","study-f21-usaid-sobornos-2025","study-f21-usaid-ukraine-gao-2025","study-f21-usaid-financial-audit-2026"]){
 assert(historyIds.includes(evt),"No registrado en seguimiento: "+evt);
 const e=history.items.find(v=>v.id===evt);
 assert(e?.investigation?.status==="hecho_documentado"&&/^https:\/\//.test(e.investigation.confirmedBy?.url||""),"Hito sin referencia: "+evt);
}
console.log("OK USAID ampliado: 41 enlaces + 11 institucionales, 16 socios FY2024, casos y programas documentados; 71 hitos globales.");
