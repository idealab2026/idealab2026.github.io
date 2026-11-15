import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8'),ctx={window:{}};vm.runInNewContext(read('la-telarana/fuente-53-arqueologia.js'),ctx);const f=ctx.window.IDEA_TELARANA_F53_REVIEW,ids=new Set(f.nodes.map(n=>n.id));assert.equal(ids.size,15);assert.equal(f.edges.length,20);assert(f.edges.every(e=>ids.has(e.a)&&ids.has(e.b)&&e.a!==e.b));assert(!f.metadata.audioVerified&&!f.metadata.reviewComplete);assert.equal(f.nodes.flatMap(n=>n.podcastNotes).length,14);assert(f.nodes.flatMap(n=>n.podcastNotes).every(n=>n.timeSec===null));assert(f.nodes.find(n=>n.id==='f53-hipotesis-neolitico').podcastNotes[0].text.includes('no como conclusión demostrada'));
const h=JSON.parse(read('linea-historia/estudios-telarana.json'));const e=h.items.find(e=>e.id==='study-f39-descubrimiento-tumba-tutankamon-1922');assert(e.investigation.additionalSources.some(s=>s.sourceOrder===40));assert(e.investigation.additionalSources.some(s=>s.sourceOrder===53));
const progress=JSON.parse(read('la-telarana/progreso-fuentes.json'));
const entry=progress.sourceCatalog.entries.find(e=>e.order===53);
assert.equal(entry.analysisCoverage.percent,23);
assert.equal(entry.analysisCoverage.signals.entities,15);
assert.equal(entry.analysisCoverage.signals.relations,20);
assert.equal(entry.analysisCoverage.signals.biographies,3);
assert.equal(entry.analysisCoverage.signals.verifiedTimelineEvents,2);
assert.equal(entry.tracking.verifiedMinuteReferences,0);
assert.equal(entry.analysisCoverage.audioVerified,false);
assert(f.nodes.some(n=>n.id==='f53-carnarvon')&&f.nodes.some(n=>n.id==='f53-daniken')&&f.nodes.some(n=>n.id==='f53-carros-dioses'));
assert(f.nodes.find(n=>n.id==='f39-howard-carter').podcastNotes.some(n=>n.status==='alegacion_medica_no_verificada_no_diagnostico'));
assert(!f.nodes.find(n=>n.id==='f39-howard-carter').note.includes('fue autista'));
assert(f.nodes.find(n=>n.id==='f39-gobekli').podcastNotes.some(n=>n.text.includes('Goblitpay')&&n.text.includes('requiere audio')));
const gobEdge=f.edges.find(e=>e.id==='f53-gobekli-hipotesis');
assert(gobEdge&&gobEdge.confidence==='hipotesis'&&gobEdge.claimStatus==='interpretacion_del_episodio_no_demostrada');
assert(!f.edges.some(e=>!ids.has(e.a)||!ids.has(e.b)),'No puede haber aristas huérfanas');
assert(f.nodes.find(n=>n.id==='f53-san-borondon').note.includes('leyenda'));
for(const studyId of ['study-f53-carter-antecamara-1922','study-f53-daniken-libro-1968']){
 const x=h.items.find(e=>e.id===studyId);
 assert(x&&x.investigation.status==='hecho_documentado');
 assert(x.investigation.methodologicalLimits.length>=60);
}
assert(read('la-telarana/index.html').includes('fuente-53-arqueologia.js'));assert(read('.github/workflows/pages.yml').includes('cp la-telarana/fuente-53-arqueologia.js'));console.log('OK: F53 separa evidencia e hipótesis y reutiliza el hito');
