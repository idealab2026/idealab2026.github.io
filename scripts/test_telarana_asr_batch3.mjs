/** Trazabilidad editorial F10, F12, F17 y F22.
 * Confirma forma y custodia de la atribución, NO verifica la verdad de los relatos.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const root="la-telarana/";
const ctx={window:{}};
for(const name of ["personas-fuentes-18-21.js","personas-fuentes-09-10.js","personas-fuentes-11-12.js","personas-fuentes-17.js","personas-fuentes-22.js"]){
 vm.runInNewContext(fs.readFileSync(root+name,"utf8"),ctx,{filename:name,timeout:7000});
}
const lib=ctx.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const expectations={
 "10":["Pedro Sánchez","Luis Carrero Blanco","Francisco Franco","Pedro Baños","Juan Manuel de Prada","Agustín Muñoz Grandes","Adolf Hitler","Iósif Stalin","Nikita Jrushchov","Winston Churchill","Donald Trump","Javier Milei","Vladímir Putin","José Antonio Primo de Rivera"],
 "12":["Francisco Franco","Adolf Hitler","Iósif Stalin","Juan Manuel de Prada","Gregorio Marañón","Ramón Serrano Suñer"],
 "17":["José Manuel García-Margallo","Pedro Sánchez","Donald Trump","Vladímir Putin","Benjamin Netanyahu","Barack Obama","Mariano Rajoy","François Hollande","Jean-Claude Juncker","Miguel Arias Cañete","Ursula von der Leyen","Mao Zedong","Richard Nixon","Henry Kissinger","Viktor Orbán"],
 "22":["Pedro Baños","Rubén Gisbert","Pedro Sánchez","Gabriel Rufián","Emilio Romero","Juan Carlos I","Henry Kissinger","Felipe González","Benjamin Netanyahu","Donald Trump","Francisco Marhuenda","Jorge Buxadé","Francisco Franco"]
};
const states=new Set(["mencion_contextual","opinion_atribuida","declaracion_de_parte","alegacion_no_verificada","identidad_pendiente"]);
let checked=0;
for(const [source,names] of Object.entries(expectations)){
 assert(lib.sourceUrls[source]?.startsWith("https://www.youtube.com/"),"Source URL F"+source);
 for(const name of names){
  const p=lib.profiles[name];
  const records=p?.sources?.[source]||[];
  assert(p?.who?.length>=40,"Biografía insuficiente: "+name);
  assert(records.length===1&&typeof records[0]==="object","No está estructurada F"+source+" "+name);
  const record=records[0];
  assert(record.topic?.length>=18&&record.speaker?.length>=18&&record.statement?.length>=170,"Atribución superficial: "+name);
  assert(record.transcriptAnchor?.length>=55,"Ancla ASR insuficiente: "+name);
  assert(states.has(record.status),"Estado probatorio sin clasificar: "+name);
  assert(record.transcriptVerified===true&&record.audioVerified===false&&record.minuteVerified===false,"Se inventó cotejo de audio: "+name);
  assert(!/^(?:la fuente lo menciona|en el episodio se menciona)/i.test(record.statement),"Descripción genérica: "+name);
  checked++;
 }
}
assert(checked===48,"Regresión del inventario de fichas F10/F12/F17/F22: "+checked);
console.log("OK: 48 fichas F10/F12/F17/F22 con atribuciones y anclas documentales sin audio cotejado.");
