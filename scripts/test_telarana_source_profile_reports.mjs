/* QA fuentes 18 y 21: cada persona tiene biografía, versión de la fuente, enlace y nodo único. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const text=path=>fs.readFileSync(path,"utf8");
const parse=(path)=>{
 const str=text(path),m=str.match(/window\.[A-Z0-9_]+\s*=\s*/);
 assert(m, "Sin asignación en "+path);
 return JSON.parse(str.slice(m.index+m[0].length,str.lastIndexOf(";")));
};
const library=parse("la-telarana/personas-fuentes-18-21.js");
const f18=parse("la-telarana/fuente-18-epstein-lorenzo-editorial.js");
const f21=parse("la-telarana/fuente-21-orden-mundial-editorial.js");
const seed=parse("la-telarana/one-note-seed.js");
const page=text("la-telarana/index.html");
const workflow=text(".github/workflows/pages.yml");
const files=["personas-fuentes-18-21.js","fuente-18-epstein-lorenzo-editorial.js","fuente-21-orden-mundial-editorial.js"];
for(const file of files){
 assert(page.includes(file),"La web no importa "+file);
 assert(workflow.includes("cp la-telarana/"+file),"Pages omite "+file);
}
assert(page.includes("La fuente ")&&page.includes(" dice que "),"Falta atribución de afirmaciones");
assert(page.includes("function source")||page.includes("function personReport("),"No existe índice de identidades");
assert(page.includes("iconForEntity("),"No hay sustituto visual para fotos faltantes");
const profiles=library.profiles;
assert(Object.keys(profiles).length>=50,"Menos de 50 personas revisadas");
const bySource={"18":0,"21":0};
for(const [name,p] of Object.entries(profiles)){
 assert(name.length>4&&p.who.length>=35,"Falta identificación: "+name);
 assert(p.sources&&Object.keys(p.sources).length>=1,"Faltan fuentes: "+name);
 for(const [order,claims] of Object.entries(p.sources)){
  assert(["18","21"].includes(order),"Número de fuente inválido");
  bySource[order]++;
  assert(claims.length>=1&&claims.every(c=>c.length>=65),"Explicación insuficiente para "+name);
 }
}
assert(bySource["18"]>=30&&bySource["21"]>=30,"Cobertura insuficiente");
const begin=page.indexOf("function sanitizePodcastNotes(value){");
const end=page.indexOf("function mergeStudy(v){",begin);
assert(begin>0&&end>begin,"Falta sistema de fusionar");
const window={IDEA_TELARANA_PERSON_SOURCE_REPORTS:library};
const ctx={window,data:JSON.parse(JSON.stringify(seed)),safePhoto:()=>""};
vm.runInNewContext(page.slice(begin,end),ctx);
ctx.f18=f18;ctx.f21=f21;
vm.runInNewContext("mergeNewEpisode(f18);mergeNewEpisode(f21);mergeSourceProfiles();",ctx);
const normal=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/[^a-z0-9]+/g," ");
for(const name of Object.keys(profiles)){
 const key=normal(name);const alias=key==="j d vance"?"jd vance":key==="muamar el gadafi"?"muammar gaddafi":key;
 const found=ctx.data.nodes.filter(n=>n.kind==="Persona"&&(normal(n.name)===key||normal(n.name)===alias));
 assert.equal(found.length,1,"Identidad ausente o duplicada: "+name);
 for(const order of Object.keys(profiles[name].sources)){
  const episode=order==="18"?"f18-episodio":"f21-episodio";
  assert(ctx.data.edges.some(e=>(e.a===episode&&e.b===found[0].id)||(e.b===episode&&e.a===found[0].id)),
   "Falta enlace documental fuente "+order+": "+name);
 }
}
for(const e of ctx.data.edges){
 assert(ctx.data.nodes.some(n=>n.id===e.a)&&ctx.data.nodes.some(n=>n.id===e.b),"Relación huérfana: "+e.id);
}
console.log("OK: "+Object.keys(profiles).length+" personas, "+bySource["18"]+" fichas fuente 18, "+bySource["21"]+" fuente 21, identidades únicas y retratos de respaldo");
