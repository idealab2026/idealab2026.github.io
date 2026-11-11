/** Segunda tanda de trazabilidad editorial sobre F14, F16 y F20.
 * El texto original completo continúa en Drive privado; estas comprobaciones
 * garantizan estructura, atribución y que no se simula cotejo audiovisual.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const dir="la-telarana/";
const env={window:{}};
for(const f of ["personas-fuentes-18-21.js","personas-fuentes-14.js","personas-fuentes-16.js","personas-fuentes-20.js"]){
 vm.runInNewContext(fs.readFileSync(dir+f,"utf8"),env,{filename:f,timeout:7000});
}
const lib=env.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
const expected={
 "14":["Ron DiFrancesco","Mark Rossini","Larry Silverstein","Wesley Clark","Paul Wolfowitz","John Bolton","Donald Rumsfeld","James Bamford","Kenneth Williams","Saddam Hussein","George W. Bush"],
 "16":["Pedro Baños","Rubén Gisbert","Alberto Iturralde","Marine Le Pen","Pedro Sánchez","Nizar Baraka","Giorgia Meloni","Alice Weidel","Volodímir Zelenski","Benjamin Netanyahu","Vladímir Putin","Felipe González"],
 "20":["Eric Schmidt","Donald Trump","Larry Ellison","Peter Thiel","Bill Gates","George Soros","Sergey Brin","J. D. Vance","Joe Biden","Henry Kissinger","George Orwell"]
};
const safeStatuses=new Set(["mencion_contextual","declaracion_de_parte","opinion_atribuida","alegacion_no_verificada","identidad_pendiente"]);
let seen=0;
for(const [order,names] of Object.entries(expected)){
 assert(lib.sourceUrls[order]?.startsWith("https://www.youtube.com/"),"URL de fuente inexistente: F"+order);
 for(const name of names){
  const p=lib.profiles[name],records=p?.sources?.[order]||[];
  assert(p?.who?.length>=45,"Biografía sin contenido: "+name);
  assert(records.length>=1,"Falta expediente: "+name+" F"+order);
  const claim=records.find(c=>c&&typeof c==="object"&&typeof c.transcriptAnchor==="string");
  assert(claim,"Falta ancla ASR literal: "+name+" F"+order);
  assert(claim.topic.length>=18&&claim.speaker.length>=14&&claim.statement.length>=180,
   "Expediente poco descriptivo: "+name+" F"+order);
  assert(claim.transcriptAnchor.length>=37,"Ancla excesivamente corta: "+name);
  assert(safeStatuses.has(claim.status),"Estado editorial indefinido: "+name);
  assert(claim.transcriptVerified===true&&claim.audioVerified===false&&claim.minuteVerified===false,
   "Se afirma falsamente cotejo audiovisual: "+name);
  assert(!/^(?:se menciona|es mencionado|la fuente lo menciona|la fuente lo cita)/i.test(claim.statement),
   "No se acepta relleno genérico: "+name);
  seen++;
 }
}
const html=fs.readFileSync(dir+"index.html","utf8");
for(const order of Object.keys(expected)){
 assert(html.includes('src="./personas-fuentes-'+order+'.js'),"No se carga F"+order);
}
assert(seen===34,"Recuento de anclas de la segunda tanda cambiado: "+seen);
console.log("OK: "+seen+" fichas F14/F16/F20 con transcripción, declarante/turno prudente, estado y sin audio fingido.");
