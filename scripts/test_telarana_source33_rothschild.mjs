/* F33: conservación de identidad, procedencia y límites probatorios. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const ctx={window:{}};
vm.runInNewContext(read('la-telarana/fuente-33-rothschild-inicial.js'),ctx);
vm.runInNewContext(read('la-telarana/person-biographies.js'),ctx);
const f=ctx.window.IDEA_TELARANA_F33_REVIEW;
const bios=ctx.window.IDEA_TELARANA_BIOGRAPHIES.curated;
const history=JSON.parse(read('linea-historia/estudios-telarana.json'));
const tracker=JSON.parse(read('la-telarana/progreso-fuentes.json'));
assert.equal(f.nodes.length,16);
assert.equal(f.edges.length,34);
assert(!f.metadata.audioVerified&&!f.metadata.timecodesAvailable&&!f.metadata.reviewComplete);
const ids=new Set(f.nodes.map(n=>n.id));
assert.equal(ids.size,f.nodes.length);
assert(f.edges.every(e=>ids.has(e.a)&&ids.has(e.b)&&e.a!==e.b));
assert(f.nodes.flatMap(n=>n.podcastNotes||[]).every(n=>n.timeSec===null), 'F33 carece de minutajes verificados');
assert(f.nodes.filter(n=>n.kind==='Persona').every(n=>bios[n.id]?.text.length>150&&bios[n.id]?.source.startsWith('https://')));
assert(f.nodes.some(n=>n.id==='f33-firma-1810'&&n.note.includes('No se identifica automáticamente')));
assert(f.nodes.find(n=>n.id==='f33-mayer').podcastNotes.some(n=>n.text.includes('Samuel Oppenheimer')&&n.text.includes('audio')));
assert(f.nodes.find(n=>n.id==='f33-nathan').podcastNotes.some(n=>n.source.includes('nathan_and_waterloo.pdf')));
assert.equal(f.edges.filter(e=>e.type==='Socio de la firma de 1810').length,4);
assert(!f.edges.some(e=>e.a==='f33-james'&&e.b==='f33-firma-1810'), 'James no firmó el primer acuerdo');
const event=history.items.filter(e=>e.id==='study-f33-sociedad-francfort-1810');
assert.equal(event.length,1);
assert.equal(event[0].investigation.date,'1810-09-27');
assert(event[0].p.includes('DEU'), 'El acontecimiento debe poder filtrarse por el territorio actual');
assert(read('linea-historia/timeline-v4.js').includes('Array.isArray(d.p)&&d.p.length?"contexto histórico orientativo"'));
assert(event[0].investigation.methodologicalLimits.includes('no se afirma'));
assert(tracker.inReview.some(x=>x.order===33&&!x.reviewComplete));
const progress33=tracker.sourceCatalog.entries.find(x=>x.order===33);
assert.equal(progress33.analysisCoverage.percent,22);
assert.equal(progress33.analysisCoverage.signals.entities,16);
assert.equal(progress33.analysisCoverage.signals.relations,34);
assert.equal(progress33.analysisCoverage.signals.biographies,14);
assert.equal(progress33.analysisCoverage.signals.verifiedTimelineEvents,2);
assert.equal(progress33.analysisCoverage.audioVerified,false);
for(const id of ['f33-gutle','f33-jeannette','f33-isabella','f33-babette','f33-julie','f33-henriette','f33-niall-ferguson']){
 const bio=bios[id],entity=f.nodes.find(x=>x.id===id);
 assert(entity&&bio&&bio.text.length>150&&bio.source.startsWith('https://'),'Biografía verificable ausente: '+id);
}
for(const id of ['f33-jeannette','f33-isabella','f33-babette','f33-julie','f33-henriette']){
 assert(!f.edges.some(x=>x.a==='f33-fuente'&&x.b===id),'El vídeo no cita por nombre a la hija '+id);
 assert(f.edges.some(x=>x.a==='f33-gutle'&&x.b===id&&x.source.startsWith('https://')),'Falta genealogía documentada '+id);
}
const gutle=f.nodes.find(x=>x.id==='f33-gutle');
assert(gutle.podcastNotes.some(x=>x.text.includes('19 embarazos')&&x.text.includes('diez')),'Distinguir embarazos y supervivientes');
assert(f.nodes.find(x=>x.id==='f33-mayer').podcastNotes.some(x=>x.text.includes('Simon Wolf Oppenheimer')),'Conservar corrección documental de Oppenheimer');
assert(f.nodes.find(x=>x.id==='f33-nathan').podcastNotes.some(x=>x.text.includes('no como hecho probado')),'Waterloo no es una manipulación financiera probada');
const matrimonio=history.items.find(x=>x.id==='study-f33-gutle-mayer-matrimonio-1770');
assert(matrimonio&&matrimonio.investigation.date==='1770-08-29'&&matrimonio.investigation.sourceOrder===33);
assert(matrimonio.investigation.relatedTelarana.includes('f33-gutle'));
assert.equal(tracker.sourceCatalog.entries.find(x=>x.order===33).tracking.verifiedMinuteReferences,0);
assert(read('la-telarana/index.html').includes('fuente-33-rothschild-inicial.js'));
assert(read('.github/workflows/pages.yml').includes('cp la-telarana/fuente-33-rothschild-inicial.js'));
console.log('OK: F33 conserva atribución, datos archivísticos y límites audiovisuales');
