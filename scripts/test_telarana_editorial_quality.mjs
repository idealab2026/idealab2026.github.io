/* Control editorial: una mención no es una relación; una frase genérica no es investigación. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const html=read("la-telarana/index.html");
const workflow=read(".github/workflows/pages.yml");
const w={};
vm.runInNewContext(read("la-telarana/personas-fuentes-18-21.js"),{window:w});
vm.runInNewContext(read("la-telarana/personas-fuentes-20.js"),{window:w});
vm.runInNewContext(read("la-telarana/relaciones-verificadas-hunter.js"),{window:w});
const hunter=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS.profiles["Hunter Biden"];
assert(hunter,"Falta Hunter Biden");
assert(hunter.who.includes("2014")&&hunter.who.includes("2019")&&hunter.who.includes("Burisma"),"Biografía sin trayectoria relevante");
assert(hunter.biographySources.length>=2&&hunter.biographySources.every(x=>x.url.startsWith("https://")),"Faltan referencias independientes de biografía");
const claim=hunter.sources["20"][0];
assert(claim&&typeof claim==="object","No admitir relleno genérico sin estructura para Hunter Biden");
for(const key of ["topic","speaker","statement","status"])assert(typeof claim[key]==="string"&&claim[key].length>=5,"Falta "+key);
assert(claim.speaker==="Lorenzo Ramírez"&&claim.statement.length>=180,"Falta contenido específico atribuido al entrevistado");
assert(claim.statement.includes("ordenador")&&claim.statement.includes("Burisma"),"No explica qué se afirmó en la fuente 20");
assert(claim.status==="alegacion_no_verificada","Se ha presentado una alegación como hecho");
assert(claim.audioVerified===false&&claim.minuteVerified===false,"Audio o minutos marcados sin verificar");
assert(!claim.statement.includes("La fuente lo menciona en relación con discusiones"),"Texto de relleno sin corregir");
assert(!html.includes('"La fuente "+order+" dice que "+claim'),"La interfaz sigue duplicando la atribución");
assert(html.includes('claim.statement||claim.text||""'),"La interfaz no interpreta nuevas declaraciones estructuradas");
assert(html.includes('function isSourceMentionEdge(edge)'),"No se distingue mención de relación");
assert(html.includes('var links=allLinks.filter(function(e){return !isSourceMentionEdge(e)});'),"Las menciones siguen inflando Relaciones");
assert(html.includes('Relaciones entre entidades ('),"No hay encabezado de relaciones distinguidas");
const verified=w.IDEA_TELARANA_HUNTER_VERIFIED;
assert(verified.nodes.some(n=>n.name==="Burisma Holdings"),"No se ha incluido Burisma");
assert(verified.edges.length===2,"Son dos relaciones verificadas, no menciones");
for(const edge of verified.edges){
 assert(edge.confidence==="documentado"&&edge.claimStatus==="hecho_verificado_independiente","Una relación no está clasificada como verificada");
 assert(/^https:\/\/(www\.cbsnews\.com|www\.factcheck\.org)\//.test(edge.source),"Falta respaldo independiente");
 assert(!/Podcast|Mención/.test(edge.type),"Falsa relación de podcast");
}
assert(html.includes('relaciones-verificadas-hunter.js'),"Falta cargar las relaciones verificadas");
assert(html.includes('mergeNewEpisode(window.IDEA_TELARANA_HUNTER_VERIFIED)'),"Relaciones acreditadas no están incorporadas al grafo");
assert(workflow.includes("cp la-telarana/relaciones-verificadas-hunter.js dist/la-telarana/relaciones-verificadas-hunter.js"),"El despliegue no contiene la capa verificada");
vm.runInNewContext(read("la-telarana/personas-fuentes-09-10.js"),{window:w});
const maduro=w.IDEA_TELARANA_PERSON_SOURCE_REPORTS.profiles["Nicolás Maduro"];
assert(maduro,"Falta Nicolás Maduro en las fuentes 9 y 10");
assert(maduro.who.includes("2026")&&!maduro.who.includes("presidente de Venezuela desde 2013 y sucesor"),"La biografía de Maduro ha vuelto a quedar desactualizada");
assert(maduro.biographySources?.some(r=>/commonslibrary\.parliament\.uk/.test(r.url)),"Maduro sin respaldo biográfico independiente");
assert(maduro.sources["9"].length===2&&maduro.sources["10"].length===1,"Desaparecen las tres declaraciones contextualizadas de Maduro");
for(const [order,claims] of Object.entries(maduro.sources))for(const record of claims){
 assert(record&&typeof record==="object"&&record.speaker&&record.topic&&record.statement.length>=170&&record.status,"Atribución genérica en la fuente "+order+" de Maduro");
 assert(record.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,"Falso cotejo audiovisual de Maduro");
}
const bioEnv={window:{}};vm.runInNewContext(read("la-telarana/person-biographies.js"),bioEnv);
const delcy=bioEnv.window.IDEA_TELARANA_BIOGRAPHIES.curated["on-delcy-rodriguez"];
assert(delcy?.text.includes("presidencia interina")&&delcy?.text.includes("2026"),"Biografía de Delcy desactualizada");
assert(delcy.source?.includes("commonslibrary.parliament.uk"),"Delcy sin fuente institucional");
assert(html.includes("Mención localizada · Falta extraer una declaración concreta"),"No se controla la vaguedad del legado editorial");
assert(html.includes("Mención sin afirmación específica extraída"),"Se muestran notas de podcast genéricas como investigación");
assert(html.includes("Abrir cerca de "),"Se presentan minutos aproximados como plenamente verificados");
assert(workflow.includes("audit_telarana_all_entities.mjs")&&workflow.includes("upload-artifact@v4"),"Falta barrido de todas las entidades");
console.log("OK: fichas Nicolás Maduro y Delcy Rodríguez actualizadas, declaraciones concretas y menciones vagas distinguidas");
console.log("OK: calidad editorial · Hunter Biden con atribución concreta, dos relaciones documentadas y menciones separadas del apartado Relaciones");
