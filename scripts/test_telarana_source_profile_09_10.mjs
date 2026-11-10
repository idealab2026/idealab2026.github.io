/* Regresión de transcripciones 09 y 10: identidades, biografías, atribución e integración en Pages. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
function parse(path){const s=read(path),m=s.match(/window\.[A-Z0-9_]+\s*=\s*/);assert(m,"Falta objeto en "+path);return JSON.parse(s.slice(m.index+m[0].length,s.lastIndexOf(";")))}
const page=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
const lib=parse("la-telarana/personas-fuentes-18-21.js");
const ctx={window:{IDEA_TELARANA_PERSON_SOURCE_REPORTS:lib}};
vm.runInNewContext(read("la-telarana/personas-fuentes-09-10.js"),ctx);
const spec=ctx.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
assert.equal(spec.sourceUrls["9"],"https://www.youtube.com/watch?v=10vGOskN6hY");
assert.equal(spec.sourceUrls["10"],"https://www.youtube.com/watch?v=_pK1VQpH5X4");
for(const file of ["personas-fuentes-09-10.js","personas-fuentes-18-21.js"]){
 assert(page.includes(file),"Script omitido en HTML: "+file);
 assert(workflow.includes("cp la-telarana/"+file),"Falta en Pages: "+file);
}
for(const [order,expected] of [["9",32],["10",15]]){
 const found=Object.entries(spec.profiles).filter(([name,p])=>p.sources[order]);
 assert(found.length>=expected,"Menos personas de las revisadas en fuente "+order);
 for(const [name,profile] of found){
  assert(profile.who.length>=40,"Biografía demasiado breve: "+name);
  assert(profile.sources[order].every(s=>typeof s==="string"?s.length>=65:typeof s?.statement==="string"&&s.statement.length>=65),"Testimonio insuficiente: "+name);
  assert(profile.sources[order].every(s=>typeof s!=="string"||!s.startsWith("La fuente ")),"La atribución corresponde a la UI");
  assert(profile.sources[order].every(s=>typeof s==="string"||(s.topic&&s.speaker&&s.status)),"Expediente estructurado sin tema, declarante o estado: "+name);
 }
}
assert(page.includes('"9":"f09-episodio"')&&page.includes('"10":"f10-episodio"'),"No enlaza entrevistas con las personas");
assert(page.includes("library.sourceLabels"),"La interfaz no muestra los títulos de origen");
assert(page.includes("source-report-text")&&page.includes("Declarante: ")&&page.includes("source-claim-caution"),"Falta estructura de atribución en fichas");
const seed=parse("la-telarana/one-note-seed.js"),f09=parse("la-telarana/fuente-09-villarejo-revision.js"),f10=parse("la-telarana/fuente-10-revision-inicial.js"),f18=parse("la-telarana/fuente-18-epstein-lorenzo-editorial.js"),f21=parse("la-telarana/fuente-21-orden-mundial-editorial.js");
const first=page.indexOf("function sanitizePodcastNotes(value){"),last=page.indexOf("function mergeStudy(v){",first);assert(first>0&&last>first);
const graph={window:ctx.window,data:JSON.parse(JSON.stringify(seed)),safePhoto:()=>{},f09,f10,f18,f21};
vm.runInNewContext(page.slice(first,last)+"\nmergeNewEpisode(f09);mergeNewEpisode(f10);mergeNewEpisode(f18);mergeNewEpisode(f21);mergeSourceProfiles();",graph);
const normalize=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const keyed=new Map(graph.data.nodes.filter(n=>n.kind==="Persona").map(n=>[normalize(n.name),n]));
for(const [name,p] of Object.entries(spec.profiles)){
 const k=normalize(name),alias=k==="j d vance"?"jd vance":k==="muamar el gadafi"?"muammar gaddafi":k;
 const target=keyed.get(k)||keyed.get(alias);
 assert(target,"Persona ausente del grafo: "+name);
 for(const order of Object.keys(p.sources)){
  const id=({"9":"f09-episodio","10":"f10-episodio","18":"f18-episodio","21":"f21-episodio"})[order];
  assert(graph.data.edges.some(e=>(e.a===target.id&&e.b===id)||(e.b===target.id&&e.a===id)),"Mención sin enlace: "+name+" en "+order);
 }
}
const nodeIDs=new Set(graph.data.nodes.map(n=>n.id)),edgeIDs=new Set(graph.data.edges.map(e=>e.id));
assert.equal(nodeIDs.size,graph.data.nodes.length,"Nodos con ID duplicado");
assert.equal(edgeIDs.size,graph.data.edges.length,"Relaciones con ID duplicado");
assert(graph.data.edges.every(e=>nodeIDs.has(e.a)&&nodeIDs.has(e.b)),"Relaciones con extremos ausentes");
assert(graph.data.edges.filter(e=>e.id.startsWith("sf")).every(e=>e.a.startsWith("f")&&e.b),"Las relaciones añadidas solo deben ser menciones de episodio a persona");
console.log("OK: "+Object.keys(spec.profiles).length+" perfiles, 32 F09, 15 F10, identidades fusionadas y referencias publicables");
