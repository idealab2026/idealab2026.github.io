/* F61: comprobación bloqueante de la cadena de tres operaciones FEC y sus límites. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const raw=fs.readFileSync("la-telarana/fuente-61-democracy-pac-20261124.js","utf8");
const ctx={window:{}};
vm.runInNewContext(raw,ctx,{timeout:4000});
const d=ctx.window.IDEA_TELARANA_F61_DEMOCRACY_PAC_20261124;
assert(d?.metadata.sourceOrder===61,"Identidad fuente 61 ausente");
assert(d.metadata.audioVerified===false&&d.metadata.transcriptComplete===false&&d.metadata.reviewComplete===false,"No se ha cotejado el audio");
assert.equal(d.nodes.length,10);assert.equal(d.edges.length,11);
const ids=new Set(d.nodes.map(n=>n.id)),eids=new Set(d.edges.map(e=>e.id));
assert.equal(ids.size,d.nodes.length);assert.equal(eids.size,d.edges.length);
const nodes=new Map(d.nodes.map(n=>[n.id,n]));
for(const e of d.edges){
 assert(ids.has(e.a)&&ids.has(e.b),"Extremo huérfano en arista "+e.id);
 assert(/^https:\/\//.test(e.source),"Fuente HTTPS ausente en "+e.id);
 assert(e.confidence==="documentado","Grado documental incorrecto "+e.id);
 assert(["hecho_verificado_independiente","corroboracion_periodistica_independiente"].includes(e.claimStatus),"Falta categoría de evidencia "+e.id);
}
for(const [id,amount,date,tx,image] of [
 ["f61v5-r52",52000000,"2025-01-02","5777711","202507319779631150"],
 ["f61v5-r50",50000000,"2026-01-13","6178398","202604159862294599"],
 ["f61v5-r225",2250000,"2026-01-16","10032723","202602199834794600"]
]){
 const n=nodes.get(id);
 assert(n&&n.amountUSD===amount&&n.transactionDate===date&&n.transactionId===tx&&n.fecImageId===image,"Operación primaria no coincide "+id);
 assert(n.source.includes("docquery.fec.gov/pdf/"),"No se enlaza el Schedule A original "+id);
}
const getEdge=(id,a,b,source)=>{const e=d.edges.find(x=>x.id===id);assert(e&&e.a===a&&e.b===b&&e.source===source,"Arista de financiación incorrecta "+id);};
getEdge("f61v5-geosor-r52","f61v5-geosor","f61v5-r52",nodes.get("f61v5-r52").source);
getEdge("f61v5-r52-democracy","f61v5-r52","f61v5-democracy-pac",nodes.get("f61v5-r52").source);
getEdge("f61v5-fpr-r50","f61v5-fpr","f61v5-r50",nodes.get("f61v5-r50").source);
getEdge("f61v5-r50-democracy","f61v5-r50","f61v5-democracy-pac",nodes.get("f61v5-r50").source);
getEdge("f61v5-democracy-r225","f61v5-democracy-pac","f61v5-r225",nodes.get("f61v5-r225").source);
getEdge("f61v5-r225-jsaf","f61v5-r225","f61v5-jsaf",nodes.get("f61v5-r225").source);
assert(!d.edges.some(e=>e.a==="f61v5-soros"&&e.b==="f61v5-jsaf"),"No inventar donación Soros→J Street directa");
assert(d.metadata.methodologicalNote.includes("fungibles")||d.metadata.methodologicalNote.includes("no hay trazabilidad dólar a dólar"),"Debe constar que el dinero no es rastreable dólar a dólar");
assert(nodes.get("f61v5-sec2016")?.note?.includes("2016"),"No omitir temporalidad de titularidad");
assert(nodes.get("f61v5-fpr")?.note?.includes("donantes últimos no se identifican"),"No inventar origen del dinero de fundación");
const html=fs.readFileSync("la-telarana/index.html","utf8");
const wf=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(html.includes('src="./fuente-61-democracy-pac-20261124.js'),"Nuevo archivo no cargado");
assert(html.includes("mergeNewEpisode(window.IDEA_TELARANA_F61_DEMOCRACY_PAC_20261124)"),"No se fusiona la capa nueva");
assert(["www.sec.gov","www.factcheck.org","docquery.fec.gov"].every(h=>html.includes('"'+h+'"')),"Documentos originales no accesibles en inspector");
assert(wf.includes("cp la-telarana/fuente-61-democracy-pac-20261124.js dist/la-telarana/fuente-61-democracy-pac-20261124.js"),"Módulo ausente de Pages");
const inv=JSON.parse(fs.readFileSync("la-telarana/progreso-fuentes.json","utf8"));
assert.equal(inv.sourceCatalog.entries.find(x=>x.order===61)?.analysisCoverage.percent,20,"No inflar el % editorial sin audio");
console.log("OK: F61, Geosor 52M + Fund for Policy Reform 50M → Democracy PAC; 2,25M a J Street, tres transacciones originales y límites causales");
