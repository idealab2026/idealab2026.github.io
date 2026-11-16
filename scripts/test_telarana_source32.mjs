import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8'),ctx={window:{}};
vm.runInNewContext(read('la-telarana/fuente-32-revision-inicial.js'),ctx);
const f=ctx.window.IDEA_TELARANA_F32_REVIEW, ids=new Set(f.nodes.map(n=>n.id));
assert.equal(ids.size,18); assert.equal(f.edges.length,25);
assert(f.edges.every(e=>ids.has(e.a)&&ids.has(e.b)&&e.a!==e.b));
assert(!f.metadata.audioVerified&&!f.metadata.timecodesAvailable&&!f.metadata.reviewComplete);
assert(f.nodes.flatMap(n=>n.podcastNotes).every(n=>n.timeSec===null));
assert(f.nodes.find(n=>n.id==='f30-nato').podcastNotes.some(n=>n.text.includes('categorías distintas')));
assert(f.nodes.find(n=>n.id==='f18-xi').podcastNotes.some(n=>n.text.includes('posición de Pekín')));
const history=JSON.parse(read('linea-historia/estudios-telarana.json'));
assert.equal(history.items.filter(e=>e.id==='study-f32-congreso-chino-taiwan-2022').length,1);
assert(history.items.find(e=>e.id==='study-f30-nato-concept-2022').investigation.relatedTelarana.includes('f32-episodio'));
const entry=JSON.parse(read('la-telarana/progreso-fuentes.json')).sourceCatalog.entries.find(e=>e.order===32);
assert.equal(entry.analysisCoverage.percent,21);
assert.equal(entry.analysisCoverage.signals.entities,18);
assert.equal(entry.analysisCoverage.signals.relations,25);
assert.equal(entry.analysisCoverage.signals.independentChecks,3);
assert.equal(entry.analysisCoverage.signals.documentaryChecks,7);
assert.equal(entry.analysisCoverage.signals.verifiedTimelineEvents,5);
assert.equal(entry.tracking.verifiedMinuteReferences,0);
assert.equal(entry.analysisCoverage.audioVerified,false);
for(const key of ['f32-nato-2010','f32-agenda-2030','f32-un','f32-cartas-2022','f32-audiencia','f32-pompeyo-gonzalez']){
 assert(ids.has(key),'Debe existir el contexto histórico '+key);
}
assert(f.nodes.find(n=>n.id==='f32-agenda-2030').note.includes('17 objetivos y 169 metas'),'Falta la cifra oficial');
assert(f.nodes.find(n=>n.id==='f32-cartas-2022').podcastNotes.some(n=>n.status==='relato_atribuido_sin_audio'&&n.text.includes('especulación')),'La acusación temprana se conserva como hipótesis');
assert(!f.edges.some(e=>(e.a==='f30-russia'&&e.b==='f32-cartas-2022')||(e.b==='f30-russia'&&e.a==='f32-cartas-2022')),'Prohibido sugerir vínculo Rusia-cartas sin prueba');
assert(f.nodes.find(n=>n.id==='f32-pompeyo-gonzalez').podcastNotes.every(n=>n.source!=='https://www.youtube.com/watch?v=LAa4e9H1Nlo'),'La investigación 2024 no se atribuye al podcast 2022');
for(const id of ['study-f32-nato-concepto-lisboa-2010','study-f32-onu-agenda-2030-2015','study-f32-cartas-explosivas-espana-2022','study-f32-cartas-apelacion-2024']){
 assert.equal(history.items.filter(e=>e.id===id).length,1);
 assert(history.items.find(e=>e.id===id).investigation.methodologicalLimits.length>60);
}
for(const id of ['f32-william-burns','f32-sergei-naryshkin','f32-ankara-2022-espias'])assert(ids.has(id),'Falta evidencia de Ankara '+id);
assert(f.edges.some(e=>e.id==='f32-burns-naryshkin-encuentro'&&e.confidence==='documentado'));
assert(f.nodes.find(n=>n.id==='f32-ankara-2022-espias').note.includes('no eran negociaciones')===false || f.nodes.find(n=>n.id==='f32-ankara-2022-espias').note.includes('negociación'));
assert(!f.edges.some(e=>e.a==='f30-russia'&&e.b==='f32-ankara-2022-espias'),'El encuentro de servicios no atribuye otros hechos al Estado ruso');
assert(read('la-telarana/index.html').includes('fuente-32-revision-inicial.js'));
assert(read('.github/workflows/pages.yml').includes('cp la-telarana/fuente-32-revision-inicial.js'));
console.log('OK: F32 distingue fuentes, declaraciones y límites audiovisuales');
