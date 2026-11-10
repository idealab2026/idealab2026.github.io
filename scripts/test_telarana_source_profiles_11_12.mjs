/* Garantiza que las fuentes 11/12 incorporan biografías, declaraciones y nuevas identidades sin duplicarlas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const parse=p=>{const s=read(p),m=s.match(/window\.[A-Z0-9_]+\s*=\s*/);assert(m,"Fuente no parseable "+p);return JSON.parse(s.slice(m.index+m[0].length,s.lastIndexOf(";")))};
const html=read("la-telarana/index.html"),workflow=read(".github/workflows/pages.yml");
for(const file of ["personas-fuentes-11-12.js","personas-fuentes-18-21.js","personas-fuentes-09-10.js"]){
 assert(html.includes(file),"No cargado en la interfaz: "+file);
 assert(workflow.includes("cp la-telarana/"+file),"Fuera de la distribución pública: "+file);
}
const base=parse("la-telarana/personas-fuentes-18-21.js"),context={window:{IDEA_TELARANA_PERSON_SOURCE_REPORTS:base}};
vm.runInNewContext(read("la-telarana/personas-fuentes-09-10.js"),context);
vm.runInNewContext(read("la-telarana/personas-fuentes-11-12.js"),context);
const lib=context.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const source11=Object.entries(lib.profiles).filter(([name,p])=>p.sources["11"]);
const source12=Object.entries(lib.profiles).filter(([name,p])=>p.sources["12"]);
assert(source11.length>=28&&source12.length>=6,"Han desaparecido personas de las fuentes");
for(const [name,p]of [...source11,...source12]){
 assert(p.who.length>=45,"Biografía corta: "+name);
 assert(p.portrait?.title||name==="Fernando Paz","Sin referencia de imagen ni sustituto: "+name);
 for(const [order,statements] of Object.entries(p.sources)){
  assert(statements.length>0&&statements.every(s=>typeof s==="string"?s.length>=65:typeof s?.statement==="string"&&s.statement.length>=65&&s.topic&&s.speaker&&s.status),"Versión del entrevistado insuficiente: "+name+" "+order);
 }
}
assert(lib.profiles["Jesús Hernández Tomás"],"Debe diferenciarse del historiador Jesús Hernández");
assert(!lib.profiles["Dolores Ibárruri"]?.sources?.["11"],"No añadir menciones no comprobadas");
assert(html.includes('"11":"f11-episodio"')&&html.includes('"12":"f12-episodio"'),"Falta enlazar estas fuentes");
assert(html.includes('mergeSourceProfiles(order)'),"La auditoría debe separar las altas de personas por fuente");
const f11=parse("la-telarana/fuente-11-revision-inicial.js"),f12=parse("la-telarana/fuente-12-revision-inicial.js");
assert(f11.metadata.transcriptAvailable&&f12.metadata.transcriptAvailable,"Transcripciones no registradas");
assert(f11.metadata.sourceOrder===11&&f12.metadata.sourceOrder===12);
const ids=new Set([...f11.nodes,...f12.nodes].map(n=>n.id));
assert([...f11.edges,...f12.edges].every(e=>ids.has(e.a)&&ids.has(e.b)),"Aristas huérfanas");
console.log("OK: "+source11.length+" perfiles F11, "+source12.length+" F12; biografías y fuentes atribuidas; IDs de episodio enlazados");
