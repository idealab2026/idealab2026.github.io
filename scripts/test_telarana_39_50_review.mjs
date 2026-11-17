/** QA: expedientes editoriales F39 y F50 sobre TXT NotebookLM sin tiempo. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const specs=[
 {order:39,file:"la-telarana/fuente-39-egiptologia-revision.js",key:"IDEA_TELARANA_F39_REVIEW",nodes:29,edges:33,notes:28,video:"tPZ8wXGmSgA",event:"study-f39-descubrimiento-tumba-tutankamon-1922",score:29},
 {order:50,file:"la-telarana/fuente-50-miguel-de-lys-revision.js",key:"IDEA_TELARANA_F50_REVIEW",nodes:109,edges:222,notes:108,video:"H841XyN9B_4",event:"study-f50-juicios-salem-1692",score:27}
];
const ctx={window:{}};
const html=fs.readFileSync("la-telarana/index.html","utf8");
const pages=fs.readFileSync(".github/workflows/pages.yml","utf8");
const progress=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const events=JSON.parse(fs.readFileSync("linea-historia/estudios-telarana.json","utf8")).items;
for(const s of specs){
 vm.runInNewContext(fs.readFileSync(s.file,"utf8"),ctx,{filename:s.file,timeout:10000});
 const obj=ctx.window[s.key];
 assert(obj&&obj.metadata.sourceOrder===s.order,"Falta módulo F"+s.order);
 assert(obj.metadata.transcriptAvailable&&obj.metadata.timecodesAvailable===false&&obj.metadata.audioVerified===false,
  "No equiparar NotebookLM a transcripción minutada ni a audio cotejado");
 assert.equal(obj.nodes.length,s.nodes,"Regresión en fichas F"+s.order);
 assert.equal(obj.edges.length,s.edges,"Regresión en relaciones F"+s.order);
 const ids=new Set(obj.nodes.map(n=>n.id)),edgeIds=new Set(obj.edges.map(e=>e.id));
 assert.equal(ids.size,obj.nodes.length,"ID de nodo duplicado");
 assert.equal(edgeIds.size,obj.edges.length,"ID de arista duplicado");
 for(const edge of obj.edges){
  assert(ids.has(edge.a)&&ids.has(edge.b),"Arista huérfana "+edge.id);
  if(edge.claimStatus==="mencion_editorial_no_vinculo_causal")
   assert(edge.confidence==="hipotesis","Mención de entrevista contabilizada como relación causal acreditada");
 }
 const notes=obj.nodes.flatMap(n=>n.podcastNotes||[]);
 assert.equal(notes.length,s.notes,"Notas fuente F"+s.order+" perdidas");
 for(const n of notes){
  assert(n.timeSec===null,"Nota sin tiempo se ha convertido en un minutaje ficticio");
  assert(n.source===`https://www.youtube.com/watch?v=${s.video}`,"Nota sin enlace original");
  assert(/carácter aproximado \d+/.test(n.text),"No se conserva ancla por posición textual");
  assert(n.text.length>180,"Descripción breve o incompleta en "+n.title);
 }
 assert(html.includes(s.file.split("/").pop())&&html.includes(s.key),"Carga HTML no configurada");
 assert(pages.includes("cp "+s.file+" dist/"+s.file),"Módulo fuera de dist público");
 const r=progress.sourceCatalog.entries.find(x=>x.order===s.order);
 assert(r.tracking.untimedTranscriptStoredInDrive&&!r.tracking.untimedTranscriptAudioVerified&&!r.tracking.untimedTranscriptTimecodesAvailable);
 assert(r.analysisCoverage.percent===s.score&&r.analysisCoverage.state==="en_revision"&&!r.reviewComplete);
 const review=progress.inReview.find(x=>x.order===s.order);
 assert(review&&!review.reviewComplete&&review.verifiedMinuteReferences===0);
 const event=events.find(x=>x.id===s.event);
 assert(event&&event.investigation.status==="hecho_documentado"&&event.investigation.sourceOrder===s.order&&event.investigation.confirmedBy.url.startsWith("https://"));
 assert(event.investigation.relatedTelarana.every(id=>ids.has(id)||(event.investigation.additionalSources||[]).some(extra=>id===`f${extra.sourceOrder}-episodio`)),"Hito histórico refiere IDs ausentes de F"+s.order);
}
assert.equal(events.length,progress.timeline.committedVerifiedEvents,"Diferencia en contador de cronología");
const f50=ctx.window.IDEA_TELARANA_F50_REVIEW;
for(const id of ["f50-casco-gjermundbu","f50-lanse-aux-meadows","f50-leif-eriksson","f50-actividad-nordica-1021","f50-giles-corey","f50-ahorcados-salem-1692","f50-caza-brujas-edad-moderna","f50-inquisicion-medieval","f50-cataros","f50-patente-corso","f50-corsarios","f50-barbanegra"])assert(f50.nodes.some(n=>n.id===id),"F50: falta "+id);
assert(f50.edges.some(e=>e.id==="f50-salem-corey"&&e.claimStatus==="hecho_documentado_independiente"));
assert(f50.edges.find(e=>e.id==="f50-barbanegra-patente").claimStatus==="alegacion_no_corroborada");
assert(f50.nodes.find(n=>n.id==="f50-actividad-nordica-1021").note.includes("no fecha el descubrimiento"));
const bCtx={window:{}};vm.runInNewContext(fs.readFileSync("la-telarana/person-biographies.js","utf8"),bCtx);
for(const id of ["f50-leif-eriksson","f50-giles-corey"])assert(bCtx.window.IDEA_TELARANA_BIOGRAPHIES.curated[id]?.text.length>200);
const e1021=events.filter(e=>e.id==="study-f50-actividad-nordica-1021");assert.equal(e1021.length,1);
assert.equal(e1021[0].investigation.status,"hecho_documentado");assert.equal(e1021[0].investigation.date,"1021");
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.percent,27);
assert.equal(progress.timeline.eventsBySource["50"].length,13);
for(const id of ["f45-herodoto","f50-heit-el-ghurab","f50-corvea-egipto","f50-rampas-hipotesis","f50-vercingetorix","f50-caballeria-alesia","f50-doble-cerco-alesia","f50-incitatus","f50-mito-caballo-senador","f50-gran-incendio-roma-64","f50-tacito","f50-bloqueo-charleston-1718","f50-medicinas-charleston","f50-queen-annes-revenge","f50-sifilis-barbanegra","f50-pasar-por-quilla","f50-caminar-tablon"])assert(f50.nodes.some(n=>n.id===id),"F50 nueva ficha ausente "+id);
for(const id of ["incitatus-mito","barbanegra-sifilis","tablon-piratas"])assert(f50.edges.some(e=>e.id==="f50-rev3-"+id&&e.confidence==="indicio"),"F50 incertidumbre ausente "+id);
assert(f50.nodes.find(n=>n.id==="f50-vercingetorix").note.includes("permaneció"));
assert(f50.nodes.find(n=>n.id==="f50-incitatus").note.includes("CÓNSUL"));
assert(f50.nodes.find(n=>n.id==="f50-gran-incendio-roma-64").note.toLowerCase().includes("no está demostrado"));
for(const id of ["f50-vercingetorix","f50-tacito","f50-barbanegra"])assert(bCtx.window.IDEA_TELARANA_BIOGRAPHIES.curated[id]?.text.length>200);
for(const id of ["study-f50-alesia-52ac","study-f50-incendio-roma-64","study-f50-bloqueo-charleston-1718"]){const x=events.find(e=>e.id===id);assert(x&&x.investigation.status==="hecho_documentado"&&x.investigation.sourceOrder===50);assert(x.investigation.relatedTelarana.every(id=>f50.nodes.some(n=>n.id===id)));}
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.signals.verifiedTimelineEvents,13);
// F50 cuarta revisión: identidad de fuentes y límites probatorios.
for(const id of ["f50-dinastia-ptolemaica","f50-plutarco","f50-lenguas-cleopatra","f50-arsinoe-iv","f50-estudio-efeso-2025","f50-aspid-cleopatra","f50-marco-antonio","f50-octavio","f50-accio-31ac","f50-anexion-egipto-30ac","f50-republica-509ac","f50-claudio","f50-mesalina","f50-anecdota-mesalina","f50-heliogabalo","f50-casio-dion","f50-coliseo-anacronismo","f50-zheng-yi-sao","f50-zheng-yi","f50-zhang-bao","f50-confederacion-guangdong","f50-amnistia-zheng-1810","f50-cifras-confederacion","f50-libertalia","f50-capitan-misson","f50-rumor-pasado-zheng"])
 assert(f50.nodes.some(n=>n.id===id),"F50 cuarto bloque sin entidad "+id);
for(const id of ["f50-rev4-zheng-pasado","f50-rev4-mesalina-relato","f50-rev4-asp-cleopatra","f50-rev4-libertalia-pirateria"])
 assert(f50.edges.some(e=>e.id===id&&e.confidence==="indicio"),"F50 revisión cuarta: falta cautela "+id);
assert.equal(f50.edges.find(e=>e.id==="f50-rev4-coliseo-caligula").claimStatus,"anacronismo_comprobado");
assert(f50.nodes.find(n=>n.id==="f50-mesalina").note.includes("tercera"));
assert(f50.nodes.find(n=>n.id==="f50-estudio-efeso-2025").note.includes("varón"));
assert(f50.nodes.find(n=>n.id==="f50-confederacion-guangdong").note.includes("estimaciones"));
for(const id of ["f50-zheng-yi-sao","f50-mesalina","f50-heliogabalo","f50-arsinoe-iv"])
 assert(bCtx.window.IDEA_TELARANA_BIOGRAPHIES.curated[id]?.text.length>200,"Biografía nueva no desarrollada: "+id);
for(const id of ["study-f50-republica-romana-509ac","study-f50-accio-31ac","study-f50-anexion-egipto-30ac","study-f50-zheng-amnistia-1810","study-f50-descarte-craneo-arsinoe-2025"]) {
 const e=events.find(e=>e.id===id);
 assert(e&&e.investigation.sourceOrder===50&&e.investigation.status==="hecho_documentado","Falta hito F50: "+id);
 assert(e.investigation.relatedTelarana.every(id=>f50.nodes.some(n=>n.id===id)),"Hito con referencia huérfana "+id);
}
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.signals.biographies,20);
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.signals.relations,222);
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.signals.entities,109);
assert.equal(progress.sourceCatalog.entries.find(e=>e.order===50).analysisCoverage.percent,27);
// Quinta revisión F50: prueba de procedencia y distinciones documentales
for(const id of ["f50-samuel-parris","f50-betty-parris","f50-abigail-williams","f50-tituba","f50-witch-cake","f50-tribunal-oyer-terminer","f50-william-phips","f50-prueba-espectral","f50-teutoburgo-9","f50-arminio","f50-varo","f50-legiones-17-19","f50-retirada-romana-16","f50-kalkriese","f50-batalla-waterloo-1815","f50-wellington","f50-blucher","f50-hemorroides-waterloo","f50-terreno-waterloo","f50-vlad-iii","f50-estudio-vlad-2025","f50-bram-stoker","f50-dracula-ficcion"])assert(f50.nodes.some(n=>n.id===id),"F50 quinta revisión: falta "+id);
for(const [id,status] of [["f50-rev5-waterloo-hum","causalidad_medica_no_demostrada"],["f50-rev5-teuto-kalkriese","identificacion_arqueologica_no_definitiva"],["f50-rev5-tituba-accuser","acusacion_no_prueba_delito"]]) {
 const e=f50.edges.find(e=>e.id===id);
 assert(e?.claimStatus===status&&e.confidence==="indicio","F50 evidencia no clasificada "+id);
}
assert(f50.nodes.find(n=>n.id==="f50-tituba").note.includes("origen étnico y geográfico exacto no es seguro"));
assert(f50.nodes.find(n=>n.id==="f50-tribunal-oyer-terminer").note.includes("tribunal colonial especial"));
assert(f50.nodes.find(n=>n.id==="f50-witch-cake").note.includes("un perro"));
assert(f50.nodes.find(n=>n.id==="f50-teutoburgo-9").note.includes("no supone"));
for(const id of ["f50-samuel-parris","f50-tituba","f50-arminio","f50-vlad-iii"])assert(bCtx.window.IDEA_TELARANA_BIOGRAPHIES.curated[id]?.text.length>200,"Falta biografía "+id);
for(const id of ["study-f50-teutoburgo-varus-9","study-f50-oyer-terminer-salem-1692","study-f50-waterloo-1815"]) { const event=events.find(e=>e.id===id);assert(event&&event.investigation.sourceOrder===50&&event.investigation.status==="hecho_documentado","Falta hito "+id);assert(event.investigation.relatedTelarana.every(id=>f50.nodes.some(n=>n.id===id)),"Hito con IDs incorrectos "+id); }
assert(html.includes("fuente-50-miguel-de-lys-revision.js?v=20261117-review5"));
assert(/person-biographies\.js\?v=[^"\s]+/.test(html), "Las biografías deben cargarse con versión de caché no vacía");
console.log("OK F39 F50: 138 fichas, 255 enlaces, 136 notas textuales sin minutajes y 13 hitos F50 documentados.");
