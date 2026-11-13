/* F70–F74 · auditoría de textos privados recibidos, fichas atribuidas y sector eclesial. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=p=>fs.readFileSync(p,"utf8");
const ctx={window:{}};
const file="la-telarana/fuentes-70-74-frattini-inicial.js";
const source=read(file);
vm.runInNewContext(source,ctx,{timeout:7000});
const reg=JSON.parse(read("la-telarana/progreso-fuentes.json"));
const feed=JSON.parse(read("linea-historia/estudios-telarana.json"));
const html=read("la-telarana/index.html");
const graph3d=read("la-telarana/graph-3d.js");
const wf=read(".github/workflows/pages.yml");
const videos=["rLGs5AXE5iQ","WPW8yHSduFA","z-0I92HGceY","KxrKZU9T_6I","82W2taMMsTo"];
const expectedNodes=[13,14,14,16,13],expectedEdges=[17,18,16,21,16],
      expectedMarkers=[777,1006,1483,840,1019];
assert(reg.total===74&&reg.counts.uniqueSources===71&&reg.counts.inReview===36,
  "El inventario 74/71/36 está desincronizado");
assert(!source.includes("docs.google.com/document/d/"),
  "Los documentos privados no deben entrar al bundle de La Telaraña");
assert(html.includes('src="./fuentes-70-74-frattini-inicial.js'),
  "No se importa la primera revisión de Frattini en la web");
assert(wf.includes("cp la-telarana/fuentes-70-74-frattini-inicial.js dist/la-telarana/fuentes-70-74-frattini-inicial.js"),
  "No se distribuyen las fichas F70–F74 en GitHub Pages");
assert(graph3d.includes('["iglesia","Iglesia y Vaticano"'),
  "No se ha creado el sector eclesial del orbe");
assert(html.includes('<option value="iglesia">Iglesia y Vaticano</option>'),
  "La nueva categoría no está disponible para seleccionar");
let totalNotes=0,totalExternal=0;
for(let i=0;i<videos.length;i++){
 const n=i+70,mod=ctx.window["IDEA_TELARANA_F"+n+"_REVIEW"];
 assert(mod,"No existe el módulo F"+n);
 assert(mod.metadata.sourceOrder===n&&mod.metadata.url.includes(videos[i]),"Fuente mezclada F"+n);
 assert(mod.nodes.length===expectedNodes[i]&&mod.edges.length===expectedEdges[i],"Conteo modular no reconciliado F"+n);
 const ids=new Set(mod.nodes.map(x=>x.id));
 assert(ids.size===mod.nodes.length&&mod.edges.every(x=>ids.has(x.a)&&ids.has(x.b)),"Aristas huérfanas o IDs repetidos F"+n);
 assert(mod.metadata.timecodeMarkersDetected===expectedMarkers[i],
   "Los marcadores de F"+n+" no coinciden con la transcripción");
 assert(mod.metadata.transcriptAudioMatched===false&&mod.metadata.verifiedMinuteReferences===0,
   "No dar por cotejados los turnos y minutajes de F"+n);
 const row=reg.sourceCatalog.entries.find(x=>x.order===n),review=reg.inReview.find(x=>x.order===n);
 assert(row&&review&&row.videoId===videos[i],"Falta seguimiento de F"+n);
 assert(row.tracking.docTranscriptionCreated&&row.tracking.manualTranscriptReceived&&row.tracking.transcriptContentImported,
   "La transcripción manual de F"+n+" no está registrada como recibida");
 assert(row.tracking.transcriptCharactersReadBack>100000&&row.tracking.manualTimestampMarkers===expectedMarkers[i],
   "F"+n+": texto insuficiente o marcadores no reconciliados");
 assert(row.tracking.timecodedTranscriptStoredInDrive===false&&row.tracking.manualTranscriptTimecodedInNativeDoc,
   "No confundir Google Doc manual con archivo TXT separado de NotebookLM");
 assert(row.tracking.audioVerified===false&&row.tracking.complete===false&&row.tracking.inReview===true,
   "F"+n+" no puede cerrarse por el solo hecho de disponer de texto");
 assert(review.transcriptDocHasFullText&&review.verifiedMinuteReferences===0&&!review.reviewComplete,
   "El expediente editorial de F"+n+" contradice el estado del audio");
 assert(row.analysisCoverage.percent>0&&row.analysisCoverage.percent<30,
   "Se ha tratado una primera lectura como revisión exhaustiva F"+n);
 assert(mod.nodes.some(x=>x.name==="Eric Frattini"),"F"+n+" carece de ficha del entrevistado");
 const notes=mod.nodes.flatMap(x=>x.podcastNotes||[]);
 assert(notes.length>=6&&notes.every(x=>Number.isInteger(x.timeSec)&&x.timeSec>=0&&x.source.includes("youtube.com/watch?v=")&&x.status),
   "F"+n+": faltan notas con tiempos y estado probatorio");
 const documented=mod.edges.filter(x=>x.claimStatus==="hecho_verificado_independiente"||x.claimStatus==="hecho_documentado_por_portavoz_citado");
 assert(documented.every(x=>x.confidence==="documentado"&&x.source.startsWith("https://")&&!x.source.includes("youtube.com")),
   "F"+n+": se ha elevado un testimonio a vínculo contrastado");
 const remaining=mod.edges.filter(x=>x.claimStatus!=="hecho_verificado_independiente"&&x.claimStatus!=="hecho_documentado_por_portavoz_citado");
 assert(remaining.every(x=>x.confidence==="hipotesis"),
   "F"+n+": mención en entrevista codificada como relación probada");
 totalNotes+=notes.length;totalExternal+=documented.length;
}
assert(totalNotes===78&&totalExternal===29,
  "No cuadran las notas ni los vínculos independientes de F70–F74");
const history70=feed.items.find(x=>x.id==="study-f70-benedicto-gabriele-indulto-2012"),
      history72=feed.items.find(x=>x.id==="study-f72-presentacion-archivo-nuclear-iran-2018");
assert(history70?.investigation?.date==="2012-12-22"&&history70.investigation.confirmedBy.url.startsWith("https://press.vatican.va/"),
  "Sin prueba primaria del indulto Vatileaks");
assert(history72?.investigation?.date==="2018-04-30"&&history72.investigation.confirmedBy.url.startsWith("https://2017-2021.state.gov/"),
  "Sin fuente pública para presentación del archivo nuclear 2018");
assert(history72.investigation.otherSourceMentions.some(x=>x.sourceOrder===73),
  "F73 requiere vínculo cruzado con el hito F72, no duplicación");

const f70=ctx.window.IDEA_TELARANA_F70_REVIEW;
assert(f70.metadata.explicitContradictionReviews===3&&f70.metadata.transcriptAudioMatched===false,
 "F70: conservar tres contrastes documentales sin atribuir escucha del audio");
assert(f70.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===7,
 "F70: siete relaciones con evidencia oficial, no confundir las menciones");
for(const e of ["f70-doc-archive-access","f70-doc-archive-rename-2019","f70-doc-pio-xii-open-2020",
 "f70-doc-francisco-praedicate","f70-doc-praedicate-curia","f70-doc-ior-2025-report"]){
 const link=f70.edges.find(x=>x.id===e);
 assert(link&&link.source.startsWith("https://")&&!link.source.includes("youtube.com"),
  "Falta respaldo institucional de "+e);
}
for(const e of [
 ["study-f70-vatican-archive-renamed-2019","2019-10-28"],
 ["study-f70-pius-xii-archive-open-2020","2020-03-02"],
 ["study-f70-praedicate-evangelium-2022","2022-06-05"]]){
 const entry=feed.items.find(x=>x.id===e[0]);
 assert(entry&&entry.investigation.date===e[1]&&entry.investigation.sourceOrder===70,
 "Falta hito de archivo o reforma romana: "+e[0]);
}
assert(reg.sourceCatalog.entries.find(e=>e.order===70)?.analysisCoverage.percent===29,
 "El porcentaje editorial F70 debe reflejar la segunda revisión sin sugerir audio completo");

const f72=ctx.window.IDEA_TELARANA_F72_REVIEW, f73=ctx.window.IDEA_TELARANA_F73_REVIEW;
assert(f72.metadata.crossSourceLinks.includes(69)&&f72.metadata.crossSourceLinks.includes(73), "F72 sin contraste cruzado");
assert(f73.metadata.crossSourceLinks.includes(69)&&f73.metadata.crossSourceLinks.includes(72), "F73 sin contraste cruzado");
assert(f72.metadata.verifiedMinuteReferences===0&&f73.metadata.verifiedMinuteReferences===0, "No elevar subtítulos a escucha audiovisual");
assert(f72.nodes.find(x=>x.id==="f72-shinbet")?.name==="Shin Bet", "F72 debe reutilizar el nombre canónico de Shin Bet de F69");
for(const id of ["f72-doc-stuxnet-natanz","f72-doc-eichmann-mossad","f72-doc-pagers-hizbula","f73-doc-morocco-israel","f73-doc-israel-abraham","f73-doc-pegasus-sanchez","f73-doc-ccn-pegasus","f73-doc-pagers-hizbula","f73-doc-israel-pagers"]){
 const e=[...f72.edges,...f73.edges].find(x=>x.id===id);
 assert(e&&e.source.startsWith("https://")&&/documentado/.test(e.confidence), "Falta evidencia independiente: "+id);
}
for(const id of ["f72-mention-sayanim","f73-mention-mohamed","f73-mention-sanchez"]){
 const e=[...f72.edges,...f73.edges].find(x=>x.id===id);
 assert(e&&e.confidence==="hipotesis"&&e.source.includes("youtube.com/"),"Alegación convertida en relación demostrada: "+id);
}
const morocco=feed.items.find(e=>e.id==="study-f73-israel-marruecos-declaracion-2020");
const pagers=feed.items.find(e=>e.id==="study-f72-dispositivos-libano-septiembre-2024");
assert(morocco?.investigation?.date==="2020-12-22"&&morocco.investigation.sourceOrder===73, "Falta declaración Israel–Marruecos");
assert(pagers?.investigation?.date==="2024-09-17"&&pagers.investigation.sourceOrder===72,"Falta fecha de las explosiones en Líbano");
assert(pagers.investigation.otherSourceMentions.some(x=>x.sourceOrder===73),"F73 no está vinculado a explosiones existentes");
assert(feed.items.filter(e=>e.id==="study-vf150-eichmann-1960").length===1,
 "La captura de Eichmann no debe duplicarse");
assert(feed.items.find(e=>e.id==="study-v2-pegasus-revelacion-2022")?.investigation?.otherSourceMentions?.some(x=>x.sourceOrder===73),"No se reutiliza el hito de Pegasus ya existente");
assert(feed.items.find(e=>e.id==="study-f24-ataques-hamas-israel-2023")?.investigation?.otherSourceMentions?.some(x=>x.sourceOrder===72)&&feed.items.find(e=>e.id==="study-f24-ataques-hamas-israel-2023")?.investigation?.otherSourceMentions?.some(x=>x.sourceOrder===73),"No se ha cruzado el 7/10 con ambas fuentes");
assert(reg.sourceCatalog.entries.find(e=>e.order===72)?.analysisCoverage.percent===27&&reg.sourceCatalog.entries.find(e=>e.order===73)?.analysisCoverage.percent===26,"Ranking editorial F72/F73 no sincronizado");


const f71=ctx.window.IDEA_TELARANA_F71_REVIEW,f74=ctx.window.IDEA_TELARANA_F74_REVIEW;
assert(f71.metadata.explicitContradictionReviews===2&&f74.metadata.explicitContradictionReviews===2,
 "F71/F74: faltan contrastes explícitos de afirmaciones sensibles");
assert(f71.metadata.transcriptAudioMatched===false&&f74.metadata.transcriptAudioMatched===false,
 "Los textos no se han escuchado aún: cero validación del audio");
assert(f71.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===7&&
 f74.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===6,
 "Falta contrastar polifarmacia, más de un estudio dental y fin de Hitler");
for(const id of ["f71-doc-morell-hitler","f71-doc-diarios-medicos","f71-doc-pervitin-wehrmacht",
 "f71-doc-trevor-hitler","f71-doc-dental-hitler","f71-doc-blaschke-hitler",
 "f74-doc-morell-hitler","f74-doc-dental-hitler","f74-doc-blaschke-hitler",
 "f74-doc-skull-dental","f74-doc-eva-hitler","f74-doc-trevor-hitler"]){
 const e=[...f71.edges,...f74.edges].find(x=>x.id===id);
 assert(e&&e.source.startsWith("https://")&&!e.source.includes("youtube.com"),
  "Vínculo documental sin respaldo externo: "+id);
}
for(const id of ["f71-mention-fuga","f74-mention-fuga"]){
 const e=[...f71.edges,...f74.edges].find(x=>x.id===id);
 assert(e&&e.confidence==="hipotesis"&&e.claimStatus==="alegacion_no_verificada",
 "Las teorías de escape de Hitler no pueden elevarse a hechos: "+id);
}
for(const id of ["f71","f74"]){
 const ep=(id==="f71"?f71:f74).nodes.find(n=>n.id===id+"-episodio");
 assert(ep?.podcastNotes?.some(x=>x.status==="alegacion_no_verificada"),
  "No hay advertencia explícita sobre afirmaciones no verificadas: "+id);
}
for(const [id,date,order] of [
 ["study-f71-riefenstahl-triumph-1935","1935",71],
 ["study-f71-suicidio-hitler-1945","1945-04-30",71],
 ["study-f74-investigacion-odontologica-hitler-2018","2018-05-18",74]]){
 const e=feed.items.find(x=>x.id===id);
 assert(e&&e.investigation.date===date&&e.investigation.sourceOrder===order,
  "Falta un hito documentado F71/F74: "+id);
}
assert(feed.items.find(x=>x.id==="study-f13-valquiria-1944")?.investigation?.otherSourceMentions?.some(x=>x.sourceOrder===71)&&
 feed.items.find(x=>x.id==="study-f13-valquiria-1944")?.investigation?.otherSourceMentions?.some(x=>x.sourceOrder===74),
 "El atentado de 1944 debe ser único y tener ambas referencias");
assert(reg.sourceCatalog.entries.find(x=>x.order===71)?.analysisCoverage.percent===28&&
 reg.sourceCatalog.entries.find(x=>x.order===74)?.analysisCoverage.percent===27,
 "Ranking editorial F71/F74 no reconciliado");

assert(feed.items.length===116&&reg.timeline.committedVerifiedEvents===116,
  "Descuadre de hitos con la Línea de la Historia");
assert(reg.sourceCatalog.entries.find(x=>x.order===34)?.videoId==="j_5Tj0kIj2c",
  "La fuente anterior de Frattini F34 no debe duplicarse");
console.log("OK: 5 Docs manuales recibidos; "+totalNotes+" notas con anclas textuales, "+totalExternal+" relaciones externas y 116 hitos; Iglesia y Vaticano en 3D");
