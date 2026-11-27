/* Regresión del catálogo público y tabla de fuentes: porcentajes, enlaces, roles y diseño sin salto. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const root="la-telarana/",html=fs.readFileSync(root+"index.html","utf8");
const catalogJs=fs.readFileSync(root+"source-catalog-public.js","utf8");
const filterJs=fs.readFileSync(root+"source-filter.js","utf8");
const directoryJs=fs.readFileSync(root+"source-directory.js","utf8");
class Elem{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.events={};this.value="";this.style={};this.className="";this.attrs={};this.textContent="";this.open=true;}
 appendChild(c){this.children.push(c);return c}
 replaceChildren(...children){this.children=children}
 addEventListener(name,cb){this.events[name]=cb}
 setAttribute(key,value){this.attrs[key]=String(value)}
 emit(name){assert(this.events[name],name+" listener missing");this.events[name].call(this)}
}
const document={createElement:tag=>new Elem(tag)};
const context={window:{},document,Map,Set,Number,Array,String};
vm.runInNewContext(catalogJs,context,{timeout:7000});
vm.runInNewContext(filterJs,context,{timeout:7000});
vm.runInNewContext(directoryJs,context,{timeout:7000});
const catalog=context.window.IDEA_TELARANA_PUBLIC_SOURCES;
const tracker=context.window.IdeaLabSourceFilters.createTracker(catalog);
const table=context.window.IdeaLabSourceDirectory;
assert.equal(catalog.length,74,"Hay que conservar las 74 entradas de catálogo");
assert.equal(new Set(catalog.map(s=>s.order)).size,74);
assert(catalog.every(s=>Number.isInteger(s.percent)&&s.percent>=0&&s.percent<=100),"Porcentaje no válido");
assert.equal(catalog.filter(s=>!!s.sourceUrl).length,72,"Hay dos entradas sin URL pública verificable");
assert(catalog.every(s=>!s.sourceUrl||(/^https?:\/\//i.test(s.sourceUrl)&&!/(docs\.google\.com|drive\.google\.com|notebooklm\.google\.com)/i.test(s.sourceUrl))),"No publicar Docs privados");
assert.equal(catalog.find(s=>s.order===69).percent,61);
assert.equal(catalog.find(s=>s.order===69).creator,"Vaquero Podcast");
assert(catalog.find(s=>s.order===69).participants.includes("Eric Frattini"));
assert.equal(catalog.find(s=>s.order===4).percent,31);
for(const [duplicate,canonical] of [[36,4],[46,45],[65,42]]){
 const a=catalog.find(s=>s.order===duplicate),b=catalog.find(s=>s.order===canonical);
 assert.equal(a.duplicateOf,canonical);assert.equal(a.percent,b.percent);
 assert(a.percentInherited,"Duplicado no debe publicarse como revisión independiente");
}
assert.equal(catalog.find(s=>s.order===48).sourceUrl,null);
assert.equal(catalog.find(s=>s.order===49).sourceUrl,null);
assert(catalog.some(s=>s.type==="Documento PDF")&&catalog.some(s=>s.type==="Artículo o web"));
const rows=tracker.entries();
assert(catalog.every(s=>s.progressV2?.version===2));
assert(rows.every(s=>s.progress&&Number.isInteger(s.editorialScore)&&s.editorialScore>=0&&s.editorialScore<=100));
assert.equal(rows.find(s=>s.order===48).editorialScore,0);
assert.equal(rows.find(s=>s.order===49).editorialScore,0);
const scoring=context.window.IdeaLabSourceFilters.scoreProgress;
const config={targetEntities:10,targetStatements:20,targetReferences:5,textCoverage:null,closed:false,audioVerified:false,recordedStatements:0,recordedChecks:0};
const before=scoring(config,{nodes:1,edges:1,claims:1,references:1});
const after=scoring(config,{nodes:5,edges:5,claims:6,references:3});
assert(after.score>before.score);assert.equal(after.parts.text,null);
assert.equal(scoring(config,{nodes:100,edges:100,claims:100,references:100}).score,60);
assert.equal(scoring({...config,textCoverage:100,closed:true,audioVerified:true},{nodes:100,edges:100,claims:100,references:100}).score,100);
assert.equal(scoring({...config,originalUnavailable:true},{nodes:100,edges:100,claims:100,references:100}).score,0);
for(const [dup,canonical] of [[36,4],[46,45],[65,42]])assert.equal(rows.find(s=>s.order===dup).editorialScore,rows.find(s=>s.order===canonical).editorialScore);
const dynamic=context.window.IdeaLabSourceFilters.createTracker([{order:67,title:"Test",sourceUrl:"https://www.youtube.com/watch?v=RTXTbYvbn9Q",progressV2:config,percent:20}]);
const n1={id:"n1",name:"N1",source:"https://example.org/a",podcastNotes:[{source:"https://www.youtube.com/watch?v=RTXTbYvbn9Q&t=1",text:"Afirmación A",status:"alegacion"}]};
const n2={id:"n2",name:"N2",source:"https://example.org/b"};
const e1={id:"e1",a:"n1",b:"n2",type:"test",source:"https://example.org/a"};
dynamic.register("f67","test",{nodes:[n1,n2],edges:[e1]},[],[],[n1,n2],[e1]);
const dp=dynamic.entries()[0].progress;assert.equal(dp.references,2);assert.equal(dp.claims,1);assert.equal(dp.nodes,2);assert.equal(dp.edges,1);assert(dp.score>0);
dynamic.register("f67","test",{nodes:[n1,n2],edges:[e1]},["n1","n2"],["e1"],[n1,n2],[e1]);
assert.equal(dynamic.entries()[0].progress.score,dp.score);
assert.equal(rows.length,74);
assert.equal(table.rowsFor(rows,"","","order-asc").length,74);
assert.equal(table.rowsFor(rows,"Frattini","todas","order-asc").some(s=>s.order===69),true);
assert(table.rowsFor(rows,"","Podcast / entrevista","order-asc").every(s=>s.type==="Podcast / entrevista"));
assert.equal(table.rowsFor(rows,"","todas","order-desc")[0].order,74);
const desc=table.rowsFor(rows,"","todas","percent-desc");
assert(desc[0].editorialScore>=desc[1].editorialScore,"Porcentaje descendente");
const asc=table.rowsFor(rows,"","todas","percent-asc");
assert(asc[0].editorialScore<=asc[1].editorialScore,"Porcentaje ascendente");
const opts={engine:tracker,details:new Elem("details"),body:new Elem("tbody"),search:new Elem("input"),
 type:new Elem("select"),sort:new Elem("select"),count:new Elem("p")};
opts.type.value="todas";opts.sort.value="order-asc";
const ui=table.mount(opts);
assert.equal(opts.body.children.length,74);
assert(opts.count.textContent.includes("74 de 74 entradas"));
const first=opts.body.children[0];assert.equal(first.children.length,7);
assert.equal(first.children[0].textContent,"F01");
assert(first.children[2].children.some(x=>x.textContent===rows.find(s=>s.order===1).editorialScore+" / 100"),"F01 muestra su porcentaje");
const f69=opts.body.children.find(x=>x.children[0].textContent==="F69");
assert(f69.children[4].textContent.includes("Vaquero Podcast"),"Creador visible en columna");
assert(f69.children[5].textContent.includes("Eric Frattini"),"Interviniente en tabla");
const link=f69.children[6].children[0];
assert.equal(link.href,catalog.find(s=>s.order===69).sourceUrl);
assert.equal(link.target,"_blank");assert.equal(link.rel,"noopener noreferrer");
const f48=opts.body.children.find(x=>x.children[0].textContent==="F48");
assert(f48.children[6].children[0].textContent.includes("Sin URL pública"));
const f36=opts.body.children.find(x=>x.children[0].textContent==="F36");
assert(f36.children[2].children.some(x=>/Heredado de F04/.test(x.textContent)));
opts.search.value="Eric Frattini";opts.search.emit("input");
assert(opts.body.children.length>=6);
opts.search.value="";opts.type.value="Documento PDF";opts.type.emit("change");
assert(opts.body.children.length>=2);
opts.type.value="todas";opts.sort.value="percent-desc";opts.sort.emit("change");
assert.equal(opts.body.children[0].children[2].children[0].textContent,desc[0].editorialScore+" / 100");
const htmlScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.includes("var DEMO="));
assert.equal(htmlScripts.length,1);
new vm.Script(htmlScripts[0],{filename:"la-telarana/index.html"});
for(const token of [
 'id="sources-directory"','id="sources-dir-body"','id="sources-dir-search"',
 'id="sources-dir-type"','id="sources-dir-sort"','id="sources-dir-count"',
 'source-directory.js?v=','IdeaLabSourceDirectory.mount','source-catalog-public.js?v=',
 'source-filter.js?v=','flex-wrap:nowrap!important',
 'source-filter-percent','source-filter-link'
])assert(html.includes(token),"Falta integración de "+token);
assert(html.includes("scrollbar-width:thin"),"La barra se debe desplazar en horizontal sin crear segunda línea");
assert(html.indexOf('id="sources-directory"')<html.indexOf('id="graph-panel"'),"Apartado Fuentes debe ser accesible antes del mapa");
console.log("OK: 74 fuentes, 72 URLs públicas, 3 duplicados trazados, porcentajes, participantes, tabla y toolbar de una fila.");
