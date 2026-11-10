/**
 * Auditoría editorial reproducible sobre las fichas de La Telaraña.
 * No infiere veracidad de testimonios ni consulta datos privados.
 * Los falsos positivos de lenguaje genérico son candidatos a revisión, no errores probados.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const dir="la-telarana/";
const files=[
 "personas-fuentes-18-21.js",
 "personas-fuentes-09-10.js",
 "personas-fuentes-11-12.js",
 "personas-fuentes-13.js",
 "personas-fuentes-14.js",
 "personas-fuentes-16.js",
 "personas-fuentes-17.js",
 "personas-fuentes-19.js",
 "personas-fuentes-20.js",
 "personas-fuentes-22.js",
 "personas-fuentes-23.js",
 "personas-fuentes-24.js"
];
const context=vm.createContext({window:{}});
for(const name of files){
 assert(fs.existsSync(dir+name),"No existe el módulo editorial "+name);
 vm.runInContext(fs.readFileSync(dir+name,"utf8"),context,{timeout:5000,filename:name});
}
const lib=context.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
assert(lib&&lib.profiles&&lib.sourceIds,"Falta índice de perfiles");
const vague=/(?:lo menciona|lo cita|se le menciona|es mencionado|se menciona|se cita|lo incluye|se incluye|aparece en una enumeraci[oó]n|en la conversación se|en el episodio se menciona|la fuente lo menciona)/i;
const nonspecific=/(?:discusiones sobre|habla de|en relación con|coment[ao] su|interpretaci[oó]n del|plantea interpretaciones|posiciones sobre|al analizar|se refiere a su|en el contexto de|a grandes rasgos)/i;
const controversy=/(supuest[oa]|acusa|acusaciones|presunt|imput|chantaje|conspiraci[oó]n|encubiert|delito|ilegal|fraude)/i;
const statements=[],sourceStats={};
for(const [name,p] of Object.entries(lib.profiles)){
 assert(typeof p.who==="string"&&p.who.length>25,"Biografía insuficiente en "+name);
 for(const [order,claims]of Object.entries(p.sources||{})){
  assert(lib.sourceIds[order]&&/^https:\/\//.test(lib.sourceUrls[order]||""),"Origen bibliográfico ausente: "+name+" F"+order);
  assert(Array.isArray(claims),"Declaración no es lista: "+name+" F"+order);
  for(let index=0;index<claims.length;index++){
   const claim=claims[index],structured=claim!==null&&typeof claim==="object"&&!Array.isArray(claim);
   const value=String(structured?(claim.statement||""):claim||"").trim();
   assert(value.length>=25,"Texto demasiado corto en "+name+" F"+order);
   const item={name,order,index,structured,value,
    candidate:vague.test(value)||nonspecific.test(value),
    controversy:controversy.test(value),
    biographyCitation:Array.isArray(p.biographySources)&&p.biographySources.length>0,
    briefBiography:p.who.length<70};
   statements.push(item);
   const stat=sourceStats[order]??={claims:0,unstructured:0,candidates:0,controversies:0};
   stat.claims++;stat.unstructured+=Number(!structured);
   stat.candidates+=Number(item.candidate);
   stat.controversies+=Number(item.controversy);
   if(structured){
    assert(claim.topic&&claim.speaker&&claim.status,"Declaración estructurada incompleta: "+name+" F"+order);
    if(claim.status==="alegacion_no_verificada")assert(claim.audioVerified===false||claim.transcriptVerified===true,"Alegación sin ámbito de corroboración: "+name+" F"+order);
   }
  }
 }
}
const flagged=statements.filter(x=>x.candidate);
const charged=statements.filter(x=>x.controversy);
const structured=statements.filter(x=>x.structured);
const oldSources=new Set(["9","10","11","12","13","14","16","17","18","19","20","21","22","23","24"]);
for(const item of statements){
 if(!oldSources.has(item.order))assert(item.structured,
  "Fuente nueva F"+item.order+" / "+item.name+": se exige estructura {topic,speaker,statement,status}, no resumen genérico");
}
assert(statements.length>=330,"La base editorial perdió comentarios registrados");
assert(flagged.length<=114,"Han aumentado los resúmenes potencialmente superficiales; revisar antes de publicar");
assert(structured.length>=1,"Se ha perdido el expediente estructurado de Hunter Biden");
assert(structured.length>=230,"Regresión: se han perdido expedientes con declarante, tema y estado");
const minimumStructuredBySource={"9":33,"11":28,"13":20,"18":36,"19":23,"21":35,"23":30,"24":23};
for(const order of ["9","11","13","18","19","21","23","24"]){
 const entries=statements.filter(x=>x.order===order);
 assert(entries.length===minimumStructuredBySource[order],"Número inesperado de fichas en F"+order);
 assert(entries.every(x=>x.structured),"Se ha reintroducido relleno editorial libre en F"+order);
}
for(const [order,minimum] of Object.entries(minimumStructuredBySource)){
 const dossiers=statements.filter(x=>x.order===order&&x.structured);
 assert(dossiers.length>=minimum,"Se ha perdido contenido estructurado de la fuente "+order);
 for(const item of dossiers){
  const record=lib.profiles[item.name].sources[order][item.index];
  if(order==="23"&&item.name==="Lorenzo Ramírez")continue;
  assert(record.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,
   "Fuente "+order+": no confundir transcripción con verificación audiovisual");
  if(order!=="9"||record.transcriptAnchor){
   assert(typeof record.transcriptAnchor==="string"&&record.transcriptAnchor.length>=12,
    "Falta pasaje ASR localizable en "+item.name+" F"+order);
  }
 }
}
for(const order of ["23","24"]){
 const dossiers=statements.filter(x=>x.order===order);
 const expected=order==="23"?30:23;
 assert(dossiers.length===expected,"Han variado las menciones sin reconciliar la revisión F"+order);
 assert(dossiers.every(x=>x.structured),"No reintroducir resúmenes libres en la fuente "+order);
}
const safeStatuses=new Set(["alegacion_no_verificada","opinion_atribuida","mencion_contextual","identidad_pendiente","declaracion_de_parte"]);
for(const order of ["23","24"]){
 for(const [name,p] of Object.entries(lib.profiles)){
  for(const record of p.sources?.[order]||[]){
   assert(safeStatuses.has(record.status),"Estado editorial indefinido en "+name+" F"+order);
   assert(record.speaker==="Lorenzo Ramírez"||record.speaker==="Asistente del público","Declarante sin identificar en "+name+" F"+order);
   assert(record.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,"Confusión entre transcripción y audio verificado en "+name+" F"+order);
   if(name!=="Lorenzo Ramírez")assert(typeof record.transcriptAnchor==="string"&&record.transcriptAnchor.length>=14,"No existe pasaje de origen localizable: "+name+" F"+order);
  }
 }
}

const hunter=lib.profiles["Hunter Biden"];
assert(hunter?.sources?.["20"]?.[0]?.topic,"Falta la reparación editorial de Hunter Biden");
const result={
 claims:statements.length,profiles:Object.keys(lib.profiles).length,
 structured:structured.length,legacy:statements.length-structured.length,
 potentialGeneric:flagged.length,controversyTerms:charged.length,
 withBiographyCitation:statements.filter(x=>x.biographyCitation).length,
 briefBiography:statements.filter(x=>x.briefBiography).length,
 perSource:sourceStats
};
console.log("AUDITORÍA EDITORIAL DE LA TELARAÑA (candidatos, no veredictos)");
console.log(JSON.stringify(result,null,2));
console.log("CANDIDATOS PRIORITARIOS (primeros 35):");
for(const item of flagged.slice(0,35))console.log(
 "F"+item.order+" · "+item.name+" · "+item.value.slice(0,110).replace(/\s+/g," ")+(item.value.length>110?"…":"")
);
console.log("OK: no pérdida de fichas; nuevo material requiere atribución y tema explícitos");
