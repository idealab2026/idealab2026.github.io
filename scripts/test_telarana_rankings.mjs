/** QA: rankings calculados desde el grafo y no confunden menciones con relaciones verificadas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("la-telarana/rankings.js","utf8");
const ctx=vm.createContext({window:{}});
vm.runInContext(source,ctx,{filename:"rankings.js",timeout:5000});
const rank=ctx.window.IDEA_TELARANA_RANKINGS;
assert.equal(typeof rank.compute,"function");
const nodes=[
{id:"s",name:"Entrevista · prueba",kind:"Fuente"},
{id:"a",name:"Institución A",kind:"Institución"},
{id:"b",name:"Institución B",kind:"Institución"},
{id:"c",name:"Persona C",kind:"Persona"}
];
const edges=[
{id:"mention",a:"s",b:"a",type:"Mención en fuente",claimStatus:"mencion_editorial_no_vinculo_causal",confidence:"documentado",source:"https://www.youtube.com/watch?v=Test"},
{id:"ab1",a:"a",b:"b",type:"Relación institucional",claimStatus:"hecho_verificado_independiente",confidence:"documentado",source:"https://example.org/informe"},
{id:"ab2",a:"a",b:"b",type:"Relación adicional",claimStatus:"testimonio",confidence:"documentado",source:"https://example.net/reporte"},
{id:"bc",a:"b",b:"c",type:"Hipótesis",claimStatus:"hipotesis",confidence:"indicio",source:"https://example.org/otra"},
{id:"ac",a:"a",b:"c",type:"Posible contacto",claimStatus:"alegacion",confidence:"hipotesis",source:"https://www.youtube.com/watch?v=Test2"},
{id:"orphan",a:"a",b:"unknown",type:"Debe ignorarse",confidence:"documentado"}];
const base=rank.compute(nodes,edges,"substantive",10);
assert.equal(base.entities.length,3,"Fuente no debe entrar por mera mención");
assert.equal(base.relations.length,3,"Pares relacionales únicos");
assert.equal(base.relations[0].tier,3,"Verificados externamente primero");
assert.equal(base.relations[0].totalEdges,2,"Agrupar enlaces entre el mismo par");
assert.equal(base.relations[0].sourceCount,2,"Contar referencias sin equiparar a verificaciones");
assert(base.entities.every(e=>e.degree===2),"Centralidad por vecinos distintos, no por volumen de menciones");
assert.equal(base.entities.find(e=>e.id==="a").verifiedNeighbors,1);
const all=rank.compute(nodes,edges,"all",50);
assert.equal(all.entities.length,4,"Modo «incluir menciones» debe recuperar fuentes");
assert(all.relations.some(x=>x.tier===-1&&x.mentions===1));
assert.equal(rank.compute(nodes,edges,"substantive",1).entities.length,1,"Límite del ranking");
const html=fs.readFileSync("la-telarana/index.html","utf8");
for(const token of ["id=\"rankings-panel\"","id=\"rank-entities-tab\"","id=\"rank-relations-tab\"","id=\"rank-scope\"","id=\"rank-limit\"","rankings.js?","function updateRankings()","function setRankView("])assert(html.includes(token),"UI ausente: "+token);
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert(workflow.includes("cp la-telarana/rankings.js dist/la-telarana/rankings.js"),"Rankings ausentes del despliegue Pages");
console.log("OK: rankings por vecinos únicos, pares agregados, calidad documental y menciones optativas.");
