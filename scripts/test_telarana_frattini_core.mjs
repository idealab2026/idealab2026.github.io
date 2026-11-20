/* Control bloqueante de integridad F70–F74: no aceptar aristas huérfanas, alegaciones
 * ascendidas a hechos, ni minutos verificados sin cotejo del audio.
 * Las afirmaciones editoriales detalladas se auditan por separado.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ctx={window:{}};
const source=fs.readFileSync("la-telarana/fuentes-70-74-frattini-inicial.js","utf8");
const registry=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
const html=fs.readFileSync("la-telarana/index.html","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(!source.includes("docs.google.com/document/d/"),"Transcripción privada incrustada en el JS público");
assert(html.includes('src="./fuentes-70-74-frattini-inicial.js'),"HTML no carga las fichas F70–F74");
assert(workflow.includes("cp la-telarana/fuentes-70-74-frattini-inicial.js dist/la-telarana/fuentes-70-74-frattini-inicial.js"),"Pages omite las fichas");
vm.runInNewContext(source,ctx,{timeout:10000});

const videos=["rLGs5AXE5iQ","WPW8yHSduFA","z-0I92HGceY","KxrKZU9T_6I","82W2taMMsTo"];
const expectedMarkers=[777,1006,1483,840,1019];
const documentedStatuses=new Set(["hecho_verificado_independiente","hecho_documentado_por_portavoz_citado"]);
let allNodes=0,allEdges=0;
for(let i=0;i<5;i++){
 const order=i+70,mod=ctx.window["IDEA_TELARANA_F"+order+"_REVIEW"];
 assert(mod&&Array.isArray(mod.nodes)&&Array.isArray(mod.edges),"Módulo ausente F"+order);
 assert.equal(mod.metadata.sourceOrder,order,"sourceOrder incorrecto F"+order);
 assert(mod.metadata.url.includes(videos[i]),"Vídeo desasignado F"+order);
 assert.equal(mod.metadata.timecodeMarkersDetected,expectedMarkers[i],"Marcadores de transcripción alterados F"+order);
 assert.equal(mod.metadata.transcriptAudioMatched,false,"Audio sin cotejo etiquetado como verificado F"+order);
 assert.equal(mod.metadata.verifiedMinuteReferences,0,"Minutaje no cotejado publicado como confirmado F"+order);
 const nodes=new Set(mod.nodes.map(x=>x.id)),edges=new Set(mod.edges.map(x=>x.id));
 assert.equal(nodes.size,mod.nodes.length,"IDs de nodos duplicados F"+order);
 assert.equal(edges.size,mod.edges.length,"IDs de aristas duplicados F"+order);
 for(const edge of mod.edges){
  assert(nodes.has(edge.a)&&nodes.has(edge.b),"Arista huérfana F"+order+": "+edge.id);
  if(documentedStatuses.has(edge.claimStatus)){
   assert.equal(edge.confidence,"documentado","Confianza documental incorrecta F"+order+": "+edge.id);
   assert(/^https:\/\//.test(edge.source)&&!/youtu(?:be\.com|\.be)/.test(edge.source),"Falta documento externo F"+order+": "+edge.id);
  }else{
   assert.equal(edge.confidence,"hipotesis","Relato elevado a relación documentada F"+order+": "+edge.id);
  }
 }
 const documented=mod.edges.filter(e=>documentedStatuses.has(e.claimStatus)).length;
 const review=registry.inReview.find(x=>x.order===order);
 const row=registry.sourceCatalog.entries.find(x=>x.order===order);
 assert(review&&row,"Falta inventario F"+order);
 assert.equal(review.sourceNodesDocumented,mod.nodes.length,"Inventario de nodos desincronizado F"+order);
 assert.equal(review.sourceRelationsDocumented,mod.edges.length,"Inventario de relaciones desincronizado F"+order);
 assert.equal(review.verifiedIndependentChecks,documented,"Contrastes sin conciliar F"+order);
 assert.equal(row.analysisCoverage.signals.entities,mod.nodes.length,"Catálogo de entidades desincronizado F"+order);
 assert.equal(row.analysisCoverage.signals.relations,mod.edges.length,"Catálogo de relaciones desincronizado F"+order);
 assert.equal(row.analysisCoverage.signals.independentChecks,documented,"Catálogo de contrastes desincronizado F"+order);
 assert(row.tracking.audioVerified===false&&row.tracking.complete===false&&row.tracking.inReview===true,"Fuente cerrada sin audio cotejado F"+order);
 allNodes+=mod.nodes.length;allEdges+=mod.edges.length;
}
console.log("OK: 5 fuentes; "+allNodes+" nodos, "+allEdges+" aristas; atribución, procedencia, audio y recuentos validados");
