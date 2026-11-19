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
const expectedNodes=[21,28,30,38,28],expectedEdges=[27,36,38,47,35],
      expectedMarkers=[777,1006,1483,840,1019];
assert(reg.total===74&&reg.counts.uniqueSources===71&&reg.counts.inReview===reg.inReview.length,
  "El inventario 74/71 está desincronizado");
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
 const progress=reg.inReview.find(x=>x.order===n);
 assert(progress?.sourceNodesDocumented===mod.nodes.length&&progress?.sourceRelationsDocumented===mod.edges.length&&progress?.verifiedIndependentChecks===mod.edges.filter(x=>x.claimStatus==="hecho_verificado_independiente"||x.claimStatus==="hecho_documentado_por_portavoz_citado").length,
   "Inventario editorial y datos modulares no reconciliados F"+n);
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
assert(totalNotes===78&&totalExternal===118,
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
assert(f70.metadata.explicitContradictionReviews===4&&f70.metadata.transcriptAudioMatched===false,
 "F70: conservar tres contrastes documentales sin atribuir escucha del audio");
assert(f70.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===17,
 "F70: diez relaciones con evidencia oficial, no confundir las menciones");
// F70 cuarta pasada: fuente judicial primaria y separación de responsabilidades.
for(const id of ["f70-tribunal-vaticano","f70-sentencia-gabriele-2012",
 "f70-firmeza-gabriele-2012","f70-sciarpelletti","f70-sentencia-sciarpelletti-2012"]){
 const n=f70.nodes.find(x=>x.id===id);
 assert(n?.source.includes("press.vatican.va/")&&n.note.length>90,
  "F70: falta nodo judicial Vatileaks "+id);
}
for(const id of ["f70-doc-tribunal-gabriele-fallo","f70-doc-gabriele-condena",
 "f70-doc-gabriele-firme","f70-doc-tribunal-sciarpelletti","f70-doc-sciarpelletti-condena",
 "f70-doc-dos-procesos-conexos","f70-doc-sciarpelletti-gabriele-vinculo"]){
 const e=f70.edges.find(x=>x.id===id);
 assert(e?.claimStatus==="hecho_verificado_independiente"&&e.source.includes("press.vatican.va")&&
  e.confidence==="documentado"&&e.note.length>60,
  "F70: falta referencia judicial precisa "+id);
}
assert(f70.nodes.find(x=>x.id==="f70-sentencia-gabriele-2012")?.note.includes("REDUJO")&&
 f70.nodes.find(x=>x.id==="f70-sentencia-sciarpelletti-2012")?.note.includes("suspendida")&&
 f70.metadata.independentDocumentaryRelations===17&&
 f70.metadata.transcriptAudioMatched===false&&f70.metadata.verifiedMinuteReferences===0,
 "F70: no confundir pena inicial, pena final, suspensión y escucha de audio");
for(const e of ["f70-doc-archive-access","f70-doc-archive-rename-2019","f70-doc-pio-xii-open-2020",
 "f70-doc-francisco-praedicate","f70-doc-praedicate-curia","f70-doc-ior-2025-report",
 "f70-doc-moneyval-2024","f70-doc-asif-ior-2025","f70-doc-apelacion-fondos-2026"]){
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

const f72Iran=ctx.window.IDEA_TELARANA_F72_REVIEW;
assert(f72Iran.metadata.independentDocumentaryRelations===23&&f72Iran.metadata.verifiedMinuteReferences===0,
 "F72: el contraste institucional no equivale a minutos de audio verificados");
for(const eid of ["f72-doc-netanyahu-presentacion-archivo-2018","f72-doc-oiea-evaluacion-2015",
 "f72-doc-oiea-comunicado-mayo-2018","f72-doc-oiea-reitera-2015-en-2018"]){
 const e=f72Iran.edges.find(e=>e.id===eid);
 assert(e&&e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente"&&/^https:\/\//.test(e.source),
 "F72: falta separar discurso, informe OIEA y declaración pública 2018: "+eid);
}
assert(f72Iran.nodes.find(n=>n.id==="f72-informe-oiea-2015")?.note.includes("2015")&&
 f72Iran.nodes.find(n=>n.id==="f72-comunicado-oiea-2018")?.note.includes("no puede etiquetarse como prueba"),
 "F72: no se distinguen los límites temporales y la falta de aval público del OIEA");


const f73Iran=ctx.window.IDEA_TELARANA_F73_REVIEW;
assert(f73Iran.metadata.independentDocumentaryRelations===30,
 "F73: recuento documental no conciliado");
for(const id of ["f73-doc-israel-ataques-jun2025","f73-doc-ataques-natanz-2025",
 "f73-doc-oiea-acta-onu-2025","f73-doc-acta-natanz-2025"]){
 const e=f73Iran.edges.find(x=>x.id===id);
 assert(e&&e.claimStatus==="hecho_verificado_independiente"&&e.confidence==="documentado"&&/^https:\/\//.test(e.source),
  "F73: faltan los contrastes oficiales de ataque y daños de junio 2025: "+id);
}
for(const id of ["f73-alleg-mossad-reuters-2025","f73-alleg-reuters-ataques-2025"]){
 const e=f73Iran.edges.find(x=>x.id===id);
 assert(e&&e.claimStatus==="alegacion_no_verificada"&&e.confidence==="hipotesis"&&/reuters.com/.test(e.source)&&/NO pudo|no cuenta/i.test(e.note),
  "F73: versiones de fuentes anónimas convertidas en operaciones acreditadas: "+id);
}
for(const id of ["f73-doc-oiea-comparecencia-2026","f73-doc-grossi-iran-inspeccion-2026"]){
 const e=f73Iran.edges.find(x=>x.id===id);
 assert(e&&e.claimStatus==="hecho_documentado_por_portavoz_citado"&&e.temporalContext==="posterior_a_entrevista"&&e.source.includes("transcripts.un.org"),
  "F73: intervención ONU posterior al podcast interpretada como afirmación del entrevistado: "+id);
}
assert(f73Iran.nodes.find(x=>x.id==="f73-onu-grossi-oct2026")?.note.includes("NO es acta oficial"),
 "F73: falta advertencia sobre la transcripción automatizada de Naciones Unidas");
for(const [a,b] of [["f72-oiea","f73-oiea"],["f72-natanz","f73-natanz"]]){
 const aa=ctx.window.IDEA_TELARANA_F72_REVIEW.nodes.find(x=>x.id===a),
 bb=f73Iran.nodes.find(x=>x.id===b);
 assert(aa&&bb&&aa.name===bb.name,"F72/F73 duplicarán la misma instalación u organismo: "+a);
}


// Sexta revisión: Midnight Hammer de EE. UU. no es sinónimo de la
// operación israelí del 13/06 ni valida atribuciones al Mossad.
const f73June=ctx.window.IDEA_TELARANA_F73_REVIEW;
assert(f73June.metadata.independentDocumentaryRelations===30&&f73June.metadata.verifiedMinuteReferences===0,
 "F73: ampliar respaldo documental no equivale a audio verificado");
const statements=[
 "f73-doc-eeuu-midnight-hammer","f73-doc-midnight-fordow","f73-doc-midnight-natanz",
 "f73-doc-midnight-isfahan","f73-doc-pentagono-midnight"
];
for(const id of statements){
 const e=f73June.edges.find(x=>x.id===id);
 assert(e&&e.confidence==="documentado"&&e.claimStatus==="hecho_documentado_por_portavoz_citado"&&
 e.source.includes("defense.gov")&&!e.note.includes("Mossad ejecutó"),
  "F73: comunicado militar propio presentado como constatación de autoría clandestina: "+id);
}
for(const id of ["f73-doc-oiea-informe-sept2025","f73-doc-gov2025-50-iran",
 "f73-doc-gov2025-50-fordow","f73-doc-gov2025-50-natanz"]){
 const e=f73June.edges.find(x=>x.id===id);
 assert(e&&e.confidence==="documentado"&&e.claimStatus==="hecho_verificado_independiente"&&
 e.source.includes("/gov2025-50.pdf"),
  "F73: informe OIEA ausente o confundido con afirmación del Pentágono: "+id);
}
const report=f73June.nodes.find(x=>x.id==="f73-oiea-gov2025-50");
assert(report?.note.includes("440,9 kg")&&report.note.includes("13/06/2025")&&
 report.note.includes("no acredita fabricación de armas"),
 "F73: estimación anterior al ataque incorrectamente interpretada como armamento nuclear");
assert(f73June.nodes.find(x=>x.id==="f73-midnight-hammer")?.note.includes("distinta")&&
 f73June.nodes.find(x=>x.id==="f73-isfahan")?.note.includes("medios de ataque"),
 "F73: no se separan fecha, mando militar y armamento entre Fordow/Natanz/Isfahán");


// Auditoría: una admisión de responsabilidad estatal no identifica la unidad que ejecutó
// el asesinato, y una acusación iraní tampoco.
const c72=ctx.window.IDEA_TELARANA_F72_REVIEW,c73=ctx.window.IDEA_TELARANA_F73_REVIEW;
for(const id of ["f72-doc-cohen-entrevista-2021","f72-doc-entrevista-archivo-2018","f72-doc-mossad-archivo-relato-cohen"]){
 const e=c72.edges.find(x=>x.id===id);
 assert(e?.claimStatus==="hecho_documentado_por_portavoz_citado"&&e.confidence==="documentado"&&e.source.includes("timesofisrael.com"),
  "F72: relato del exdirector de Mossad convertido en hecho independiente: "+id);
}
assert(c72.edges.find(x=>x.id==="f72-doc-yossi-cohen-direccion")?.claimStatus==="hecho_verificado_independiente",
 "F72: cargo institucional de Cohen no documentado");
assert(c72.nodes.find(x=>x.id==="f72-archivo")?.note.includes("10/06/2021"),
 "F72: no se distingue archivo presentado en abril 2018 de descripción pública de Cohen de 2021");
assert(c73.edges.find(x=>x.id==="f73-doc-fakhrizadeh-muerte-2020")?.claimStatus==="hecho_verificado_independiente",
 "F73: el asesinato de Fakhrizadeh no está documentado");
assert(c73.nodes.find(x=>x.id==="f73-mohsen-fakhrizadeh")?.note.includes("ni se demostró públicamente")&&
 c73.nodes.find(x=>x.id==="f73-mohsen-fakhrizadeh")?.note.includes("Israel no reconoció"),
 "F73: se ha omitido la distinción entre muerte documentada y atribución iraní");
for(const id of ["f73-doc-katz-reuters-haniyeh","f73-doc-reuters-katz-asesinato","f73-doc-israel-katz-declaracion"]){
 const e=c73.edges.find(x=>x.id===id);
 assert(e?.claimStatus==="hecho_documentado_por_portavoz_citado"&&e.source.includes("reuters.com")&&!/Mossad (llev[oó] a cabo|ejecut[oó])/.test(e.note),
  "F73: admisión estatal sobre Haniyeh interpretada como ejecución por Mossad: "+id);
}
assert(c73.edges.find(x=>x.id==="f73-doc-haniyeh-muerte-2024")?.claimStatus==="hecho_verificado_independiente",
 "F73: la muerte de Haniyeh no está documentada");
assert(!c73.edges.some(x=>x.a==="f73-mossad"&&/fakhrizadeh|haniyeh/.test(x.b)||x.b==="f73-mossad"&&/fakhrizadeh|haniyeh/.test(x.a)),
 "F73: no crear aristas de Mossad a asesinatos por inferencias");
assert(c72.metadata.independentDocumentaryRelations===23&&c73.metadata.independentDocumentaryRelations===30,
 "F72/F73: metadatos de relaciones documentales desincronizados");


// F72: incendios 2020, apagón 2021, atribución periodística y verificación OIEA.
const natanzF72=ctx.window.IDEA_TELARANA_F72_REVIEW;
for(const [edgeId,host] of [
 ["f72-doc-natanz-incendio-julio2020","pbs.org"],
 ["f72-doc-natanz-apagon-abril2021","pbs.org"],
 ["f72-doc-oiea-informe-mayo2021","iaea.org"],
 ["f72-doc-gov2021-natanz-continuidad","iaea.org"]
]){
 const e=natanzF72.edges.find(x=>x.id===edgeId);
 assert(e&&e.claimStatus==="hecho_verificado_independiente"&&e.confidence==="documentado"&&e.source.includes(host),
  "F72: no se diferencia incidente observado y evaluación nuclear: "+edgeId);
}
for(const edgeId of ["f72-alleg-mossad-reporte-natanz2021","f72-alleg-reporte-apagon-natanz2021"]){
 const e=natanzF72.edges.find(x=>x.id===edgeId);
 assert(e&&e.claimStatus==="alegacion_no_verificada"&&e.confidence==="hipotesis"&&
  e.source.includes("timesofisrael.com")&&/anónim|identificar|NO demuestra/i.test(e.note),
  "F72: atribución periodística anónima del Mossad convertida en hecho: "+edgeId);
}
assert(!natanzF72.edges.some(x=>x.a==="f72-mossad"&&x.b==="f72-natanz-apagon-2021"||
 x.b==="f72-mossad"&&x.a==="f72-natanz-apagon-2021"),
 "F72: nunca representar la atribución anónima como arista operativa Mossad→apagón");
const iaea2021=natanzF72.nodes.find(x=>x.id==="f72-oiea-gov2021-28");
assert(iaea2021&&iaea2021.note.includes("24/05/2021")&&iaea2021.note.includes("NO demuestra inexistencia de daños")&&
 iaea2021.source.includes("gov2021-28.pdf"),
 "F72: la observación del OIEA de mayo de 2021 no debe tratarse como certificación del sabotaje");
assert(natanzF72.nodes.find(x=>x.id==="f72-natanz-incendio-2020")?.name!==natanzF72.nodes.find(x=>x.id==="f72-natanz-apagon-2021")?.name,
 "F72: se están confundiendo los incidentes de julio 2020 y abril 2021");


// F72: los testimonios de dos fechas no son la misma observación,
// una admisión de Cohen en 2026 supera la atribución anónima de 2021.
const natanzCohen=ctx.window.IDEA_TELARANA_F72_REVIEW;
for(const id of [
 "f72-quote-cohen-lepoint-2026","f72-quote-lepoint-apagon-2021",
 "f72-quote-lepoint-mossad-2026","f72-doc-evolucion-cohen-2021-2026"
]){
 const e=natanzCohen.edges.find(x=>x.id===id);
 assert(e&&e.claimStatus==="hecho_documentado_por_portavoz_citado"&&
  e.confidence==="documentado"&&e.source.startsWith("https://www.lepoint.fr/"),
  "F72: nueva declaración de Cohen incorrectamente clasificada: "+id);
}
for(const id of ["f72-quote-zarif-iranintl-2025","f72-quote-iranintl-plataforma-sin-fecha"]){
 const e=natanzCohen.edges.find(x=>x.id===id);
 assert(e&&e.claimStatus==="hecho_documentado_por_portavoz_citado"&&
  e.source.includes("iranintl.com")&&e.note.includes("Natanz")&&/(no equivale|no conectarla)/i.test(e.note),
  "F72: declaración de Zarif interpretada como prueba del mismo sabotaje: "+id);
}
assert(!natanzCohen.edges.some(x=>
 ["f72-mohammad-javad-zarif","f72-iranintl-zarif-2025","f72-plataforma-zarif-sin-fecha"].includes(x.a)&&
 ["f72-natanz-apagon-2021","f72-natanz-incendio-2020"].includes(x.b)||
 ["f72-mohammad-javad-zarif","f72-iranintl-zarif-2025","f72-plataforma-zarif-sin-fecha"].includes(x.b)&&
 ["f72-natanz-apagon-2021","f72-natanz-incendio-2020"].includes(x.a)),
 "F72: no vincular la plataforma indeterminada de Zarif a Natanz 2020/2021");
assert(natanzCohen.nodes.find(n=>n.id==="f72-lepoint-cohen-2026")?.note.includes("NO queda demostrada")&&
 natanzCohen.nodes.find(n=>n.id==="f72-natanz-apagon-2021")?.note.includes("CONTRASTE POSTERIOR")&&
 natanzCohen.nodes.find(n=>n.id==="f72-yossi-cohen")?.note.includes("10/06/2021"),
 "F72: omisión del límite probatorio, confesión posterior o cronología");
assert(natanzCohen.metadata.verifiedMinuteReferences===0&&natanzCohen.metadata.transcriptAudioMatched===false,
 "F72: contrastar un artículo no implica cotejo del audio");

const f72=ctx.window.IDEA_TELARANA_F72_REVIEW, f73=ctx.window.IDEA_TELARANA_F73_REVIEW;
assert(f72.metadata.crossSourceLinks.includes(69)&&f72.metadata.crossSourceLinks.includes(73), "F72 sin contraste cruzado");
assert(f73.metadata.crossSourceLinks.includes(69)&&f73.metadata.crossSourceLinks.includes(72), "F73 sin contraste cruzado");
assert(f72.metadata.verifiedMinuteReferences===0&&f73.metadata.verifiedMinuteReferences===0, "No elevar subtítulos a escucha audiovisual");
assert(f72.nodes.find(x=>x.id==="f72-shinbet")?.name==="Shin Bet", "F72 debe reutilizar el nombre canónico de Shin Bet de F69");
for(const id of ["f72-doc-stuxnet-natanz","f72-doc-eichmann-mossad","f72-doc-pagers-hizbula","f72-doc-enisa-stuxnet","f72-doc-stuxnet-siemens","f73-doc-morocco-israel","f73-doc-israel-abraham","f73-doc-pegasus-sanchez","f73-doc-ccn-pegasus","f73-doc-pagers-hizbula","f73-doc-israel-pagers","f73-doc-dgst-pegasus-amnistia","f73-doc-informe-dgst-amnistia","f73-doc-audiencia-archivo-2026","f73-doc-archivo-sanchez-2026"]){
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


// Cruce de entidades F69–F72–F73: los nombres canónicos fusionan fichas, no atribuyen operaciones.
const f69ctx={window:{}};
vm.runInNewContext(read("la-telarana/podcast-vaquero-150.js"),f69ctx,{timeout:8000});
const f69=f69ctx.window.IDEA_TELARANA_PODCAST_150;
const canon=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").trim().toLocaleLowerCase("es").replace(/[^a-z0-9]+/g," ");
const sharedPairs=[
 ["vf150-dgst-marruecos","f73-dgst"],
 ["vf150-pegasus-archivo-2026","f73-archivo-pegasus-2026"],
 ["vf150-mossad","f72-mossad"],
 ["vf150-mossad","f73-mossad"],
 ["vf150-hizbula","f72-hizbula"],
 ["vf150-hizbula","f73-hizbula"],
 ["vf150-adolf-eichmann","f72-eichmann"]
];
for(const [a,b] of sharedPairs){
 const before=f69.nodes.find(x=>x.id===a),after=[...f72.nodes,...f73.nodes].find(x=>x.id===b);
 assert(before&&after&&canon(before.name)===canon(after.name),
  "Las fichas F69 y F72/F73 se están duplicando en el grafo: "+a+" / "+b);
}
for(const name of ["Stuxnet","Explosiones de buscapersonas en Líbano (2024)"]){
 assert(f72.nodes.some(x=>x.name===name)&&f73.nodes.some(x=>x.name===name),
  "F72/F73 no comparten una identidad canónica: "+name);
}
assert(f69.edges.length===161&&!f69.edges.some(x=>["vf150-f69-r4-pegasus-dgst","vf150-f69-r4-pegasus-rumor"].includes(x.id)),
 "Rumores, ausencias probatorias o personas sin autoría judicial no deben conectarse como operaciones");
for(const [edgeId,mod] of [["f72-doc-pagers-hizbula",f72],["f73-doc-pagers-hizbula",f73]]){
 assert(mod.edges.find(x=>x.id===edgeId)?.source.includes("lebanon.un.org"),
  "La documentación de víctimas de buscapersonas debe citar directamente a la ONU");
}
assert(f73.edges.find(x=>x.id==="f73-doc-israel-pagers")?.source.includes("reuters.com"),
 "La declaración del portavoz israelí es una fuente distinta del comunicado ONU");

const f71=ctx.window.IDEA_TELARANA_F71_REVIEW,f74=ctx.window.IDEA_TELARANA_F74_REVIEW;
assert(f71.metadata.explicitContradictionReviews===2&&f74.metadata.explicitContradictionReviews===2,
 "F71/F74: faltan contrastes explícitos de afirmaciones sensibles");
assert(f71.metadata.transcriptAudioMatched===false&&f74.metadata.transcriptAudioMatched===false,
 "Los textos no se han escuchado aún: cero validación del audio");
assert(f71.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===16&&
 f74.edges.filter(e=>e.claimStatus==="hecho_verificado_independiente").length===16,
 "Falta contrastar polifarmacia, más de un estudio dental y fin de Hitler");
for(const id of ["f71-doc-morell-hitler","f71-doc-diarios-medicos","f71-doc-pervitin-wehrmacht",
 "f71-doc-trevor-hitler","f71-doc-dental-hitler","f71-doc-blaschke-hitler",
 "f74-doc-morell-hitler","f74-doc-dental-hitler","f74-doc-blaschke-hitler",
 "f74-doc-skull-dental","f74-doc-eva-hitler","f74-doc-trevor-hitler",
 "f71-doc-ndb-fin-morell","f71-doc-odontologia-1973",
 "f74-doc-heusermann-blaschke","f74-doc-echtmann-blaschke","f74-doc-odontologia-1973"]){
 const e=[...f71.edges,...f74.edges].find(x=>x.id===id);
 assert(e&&e.source.startsWith("https://")&&!e.source.includes("youtube.com"),
  "Vínculo documental sin respaldo externo: "+id);
}
// Cuarta revisión: la historiografía farmacológica no certifica adicción ni causalidad política.
for(const [tag,module] of [["f71",f71],["f74",f74]]){
 assert(module.metadata.independentDocumentaryRelations===11&&module.metadata.verifiedMinuteReferences===0,
  tag+": dos contrastes bibliográficos nuevos no implican audio verificado");
 const g=module.nodes.find(n=>n.id===tag+"-estudio-gibbels-1994");
 assert(g?.source==="https://www.ifz-muenchen.de/heftarchiv/1994_2.pdf"&&
  g.note.includes("129 días")&&g.note.includes("1944")&&g.note.includes("1945"),
  tag+": falta serie cuantitativa Gibbels 1994");
 for(const suffix of ["doc-gibbels-morell","doc-gibbels-hitler"]){
  const e=module.edges.find(e=>e.id===tag+"-"+suffix);
  assert(e?.claimStatus==="hecho_verificado_independiente"&&e.source===g.source,
   tag+": referencia de Gibbels desprotegida: "+suffix);
 }
 const w=module.nodes.find(n=>n.id===tag+"-estudio-wade-2003");
 const a=module.edges.find(e=>e.id===tag+"-alleg-wade-pervitin");
 assert(w?.source.includes("10.1177/096777200301100216")&&
  a?.claimStatus==="alegacion_no_verificada"&&a.confidence==="hipotesis"&&
  /no implica/i.test(a.note),
  tag+": Vitamultin/Pervitin no debe elevarse a prueba de ingesta o adicción");
}
// Quinta revisión: anexo clínico de 1944, prescripción documentada no = ingesta ni composición probada.
for(const [tag,mod] of [["f71",f71],["f74",f74]]){
 const cir=mod.nodes.find(n=>n.id===tag+"-cir4-inteligencia-eeuu");
 const vita=mod.nodes.find(n=>n.id===tag+"-vitamultin");
 assert(cir&&cir.source.includes("cia.gov/readingroom/docs/")&&
  /cautela|cautel/i.test(cir.note)&&mod.metadata.independentDocumentaryRelations===14,
  tag+": CIR4 sin procedencia o advertencia crítica");
 assert(vita?.note.includes("4–6")&&vita.note.includes("no queda")===false&&
  vita.note.includes("no ha sido examinado"),
  tag+": Vitamultin debe distinguir pauta original de análisis indirecto");
 for(const suffix of ["stmt-cir4-vitamultin","stmt-vitamultin-hitler"]){
  const e=mod.edges.find(x=>x.id===tag+"-"+suffix);
  assert(e&&e.claimStatus==="hecho_documentado_por_portavoz_citado"&&
   e.confidence==="documentado"&&e.source===cir.source&&/no /i.test(e.note),
   tag+": el documento no acredita ingesta ni composición: "+suffix);
 }
 const source=mod.edges.find(x=>x.id===tag+"-doc-cir4-morell");
 assert(source?.claimStatus==="hecho_verificado_independiente"&&
  mod.metadata.verifiedMinuteReferences===0&&mod.metadata.transcriptAudioMatched===false,
  tag+": la existencia del documento no confirma la entrevista en audio");
}
// Sexta revisión: crítica de fuentes Hartmann 2021 / Brandt 1947 y datación CIR4.
for(const [tag,mod] of [["f71",f71],["f74",f74]]){
 assert(mod.metadata.independentDocumentaryRelations===18&&mod.metadata.transcriptAudioMatched===false,
  tag+": bibliografía adicional no acredita verificación de audio");
 const h=mod.nodes.find(n=>n.id===tag+"-hartmann-2021");
 const k=mod.nodes.find(n=>n.id===tag+"-karl-brandt");
 const tr=mod.nodes.find(n=>n.id===tag+"-acta-brandt-1947");
 assert(h?.source.includes("wmm.pic-mediaserver.de")&&h.note.includes("no se podía demostrar")&&
  k?.source.includes("nuremberg.law.harvard.edu")&&tr?.note.includes("03/02/1947"),
  tag+": faltan las fuentes históricas 2021 o 1947");
 for(const id of ["stmt-hartmann-pervitin","stmt-hartmann-morell","stmt-brandt-morell"]){
  const e=mod.edges.find(e=>e.id===tag+"-"+id);
  assert(e?.claimStatus==="hecho_documentado_por_portavoz_citado"&&e.confidence==="documentado",
   tag+": conclusión o testimonio personal elevado a verificación material: "+id);
 }
 assert(mod.edges.find(e=>e.id===tag+"-doc-acta-brandt")?.claimStatus==="hecho_verificado_independiente",
  tag+": falta registro judicial de la declaración");
 const vita=mod.nodes.find(n=>n.id===tag+"-vitamultin");
 const e=mod.edges.find(e=>e.id===tag+"-stmt-cir4-vitamultin");
 assert(vita?.note.includes("fecha no demuestra")&&e?.note.includes("datación propia de la pauta no queda acreditada"),
  tag+": el ECG 4/05/1944 no permite fechar exactamente la pauta Vitamultin");
}
// Séptima revisión: catálogo archivístico ≠ fórmula química o ingestión; bibliografía ≠ páginas comprobadas.
for(const [tag,mod] of [["f71",f71],["f74",f74]]){
 const archive=mod.nodes.find(n=>n.id===tag+"-barch-rh12-23-1884");
 const author=mod.nodes.find(n=>n.id===tag+"-schenck");
 const book=mod.nodes.find(n=>n.id===tag+"-schenck-1998");
 assert(archive?.source.includes("deutsche-digitale-bibliothek.de")&&
  archive?.note.includes("RH 12-23/1884")&&archive.note.includes("no significa")&&
  archive.note.includes("Zulassung von Vitamultin"),
  tag+": el catálogo no demuestra la composición de Vitamultin");
 assert(book?.source==="https://www.ncbi.nlm.nih.gov/nlmcatalog/100935363"&&
  author?.source===book.source&&book.note.includes("no se adopta")&&
  mod.metadata.independentDocumentaryRelations===21,
  tag+": existencia de la monografía confundida con prueba del análisis químico");
 for(const suffix of ["doc-barch-catalogo-vitamultin","doc-schenck-autor-1998","doc-schenck-libro-morell"]){
  const e=mod.edges.find(e=>e.id===tag+"-"+suffix);
  assert(e?.claimStatus==="hecho_verificado_independiente"&&
   (e.source===archive.source||e.source===book.source)&&
   !e.note.includes("contuviera metanfetamina confirmado"),
   tag+": registro bibliográfico mal clasificado: "+suffix);
 }
 assert(mod.metadata.transcriptAudioMatched===false&&mod.metadata.verifiedMinuteReferences===0,
  tag+": documentación externa no equivale a minutos de audio comprobados");
}
// Octava revisión: enunciados secundarios Doyle 2005 no equivalen a análisis químicos.
for(const [tag,mod] of [["f71",f71],["f74",f74]]){
 const article=mod.nodes.find(n=>n.id===tag+"-doyle-2005");
 const inj=mod.nodes.find(n=>n.id===tag+"-vitamultin-calcium");
 assert(article?.source.includes("www.rcpe.ac.uk/journal/issue/")&&article.note.includes("Irving")&&
  inj?.note.includes("no proporciona")&&inj.note.includes("metanfetamina")&&
  mod.metadata.independentDocumentaryRelations===24,tag+": incompleta la advertencia de procedencia Doyle");
 for(const id of ["stmt-doyle-vitamultin-calcium","stmt-doyle-morell","stmt-doyle-pervitin"]){
  const e=mod.edges.find(e=>e.id===tag+"-"+id);
  assert(e?.claimStatus==="hecho_documentado_por_portavoz_citado"&&e.confidence==="documentado"&&
   e.source===article.source&&e.note.includes("no "),tag+": declaracion Doyle elevada a prueba clínica: "+id);
 }
 assert(mod.metadata.verifiedMinuteReferences===0&&!mod.metadata.transcriptAudioMatched,
  tag+": lectura bibliográfica no valida audio del podcast");
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

assert(feed.items.length>=126&&reg.timeline.committedVerifiedEvents===feed.items.length,
  "Descuadre de hitos con la Línea de la Historia");
assert(reg.sourceCatalog.entries.find(x=>x.order===34)?.videoId==="j_5Tj0kIj2c",
  "La fuente anterior de Frattini F34 no debe duplicarse");
console.log("OK: 5 Docs manuales recibidos; "+totalNotes+" notas con anclas textuales, "+totalExternal+" relaciones externas y cronología sincronizada; Iglesia y Vaticano en 3D");
