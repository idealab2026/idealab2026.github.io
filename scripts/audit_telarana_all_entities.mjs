/**
 * Auditoría exhaustiva estructural del grafo de producción, con conteo dinámico.
 * NO es una verificación factual externa. La revisión humana de afirmaciones sigue siendo necesaria.
 * Exporta hallazgos por entidad como artefacto privado de GitHub Actions, no como contenido web.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const base="la-telarana/";
const html=fs.readFileSync(base+"index.html","utf8");
const refs=[...html.matchAll(/<script\s+src="\.\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
const ignored=new Set(["photo-catalog.js","person-biographies.js","layout-seed-v2.js","graph-3d.js"]);
const ctx=vm.createContext({
 window:{},data:{nodes:[],edges:[]},demo:false,seedError:false,
 document:{getElementById:()=>null},
 safePhoto:s=>typeof s==="string"&&/^https?:\/\//.test(s)?s:"",
 console
});
for(const name of refs.filter(x=>!ignored.has(x))){
 const path=base+name;assert(fs.existsSync(path),"Falta script: "+name);
 vm.runInContext(fs.readFileSync(path,"utf8"),ctx,{filename:path,timeout:7000});
}
vm.runInContext(fs.readFileSync(base+"person-biographies.js","utf8"),ctx,{timeout:5000});
const inner=html.slice(html.lastIndexOf("<script>")+8,html.lastIndexOf("</script>"));
const a=inner.indexOf("function sanitizePodcastNotes(value){"),b=inner.indexOf("function mergeStudy(v){",a);
const c=inner.indexOf("var loadAudit=[]"),d=inner.indexOf("function safePhoto(",c);
assert(a>=0&&b>a&&c>=0&&d>c,"No se pudo reconstruir la carga");
vm.runInContext(inner.slice(a,b),ctx,{timeout:7000});
vm.runInContext(inner.slice(c,d),ctx,{timeout:7000});
vm.runInContext("load()",ctx,{timeout:12000});
const data=ctx.data,lib=ctx.window.IDEA_TELARANA_PERSON_SOURCE_REPORTS||{profiles:{},sourceUrls:{}},bio=ctx.window.IDEA_TELARANA_BIOGRAPHIES||{};
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g," ").trim();
const profileMap=new Map(Object.entries(lib.profiles||{}).map(([key,v])=>[normalize(key),v]));
const idMap=new Map(data.nodes.map(n=>[n.id,n]));
function mention(e){
 const st=String(e.claimStatus||"").toLowerCase(),tp=String(e.type||"").toLowerCase();
 if(st.startsWith("mencion_")||/^menci[oó]n (de |en |a )/.test(tp)||/^citado (en|por) la fuente/.test(tp))return true;
 return [idMap.get(e.a),idMap.get(e.b)].some(n=>n&&(n.kind==="Fuente"||/^Podcast\s*[·:]/i.test(n.name||"")||/^Entrevista\s*[·:]/i.test(n.name||"")));
}
const vague=/(?:lo menciona|lo cita|se le menciona|es mencionado|se menciona|se cita|lo incluye|se incluye|aparece en una enumeraci[oó]n|en la conversaci[oó]n se|en el episodio se menciona|la fuente lo menciona|discusiones sobre|habla de|en relaci[oó]n con|coment[ao] su|interpretaci[oó]n del|plantea interpretaciones|posiciones sobre|al analizar|se refiere a su|en el contexto de|a grandes rasgos)/i;
const allegations=/(?:presunt[oa]|acusaciones?|imputaci[oó]n|chantaje|conspiraci[oó]n|supuest[oa]|delito|ilegal|fraude|operaci[oó]n encubierta)/i;
const roleTimeSensitive=/(?:presidente|primer ministro|canciller|ministro|director|secretario general|jefe de estado).{0,60}\bdesde\s+(?:19|20)\d\d/i;
const sourceLabel=new Map();
const names=new Map();
for(const n of data.nodes){const k=normalize(n.name);const arr=names.get(k)||[];arr.push(n.id);names.set(k,arr)}
const edgesByNode=new Map(data.nodes.map(n=>[n.id,[]]));
for(const e of data.edges){if(edgesByNode.has(e.a))edgesByNode.get(e.a).push(e);if(edgesByNode.has(e.b))edgesByNode.get(e.b).push(e)}
const report=data.nodes.map(n=>{
 const key=normalize(n.name),p=profileMap.get(key)||(key==="jd vance"?profileMap.get("j d vance"):null);
 const curated=bio.curated?.[n.id]||null;
 const notes=Array.isArray(n.podcastNotes)?n.podcastNotes:[];
 const vaguePodcastNotes=notes.filter(v=>vague.test(String(v.text||"")));
 const sensitivePodcastNotes=notes.filter(v=>allegations.test(String(v.text||"")));
 const genericNodeNote=vague.test(String(n.note||""));
 const sensitiveNodeNote=allegations.test(String(n.note||""));
 const sensitiveOneNoteArchive=allegations.test(String(n.archiveNote||""));
 const archiveHasProvenance=Boolean(String(n.archiveNote||"").trim().length);
 const normalizedNoteKeys=notes.map(v=>normalize((v.source||v.episodeId||"")+" "+(v.text||"").slice(0,120)));
 const duplicatedPodcastNotes=normalizedNoteKeys.length-new Set(normalizedNoteKeys).size;
 const entries=Object.entries(p?.sources||{}).flatMap(([order,arr])=>arr.map((v,index)=>({order,index,structured:typeof v==="object"&&v!==null,statement:String(typeof v==="object"&&v!==null?(v.statement||""):v||"")})));
 const bad=entries.filter(x=>vague.test(x.statement));
 const sensitive=entries.filter(x=>allegations.test(x.statement));
 const independent=Array.isArray(p?.biographySources)&&p.biographySources.some(x=>/^https:\/\//.test(x.url||""))||Boolean(curated?.source);
 const ownEdges=edgesByNode.get(n.id)||[],mentions=ownEdges.filter(mention).length;
 const reliableEdges=ownEdges.filter(e=>!mention(e)&&e.claimStatus==="hecho_verificado_independiente").length;
 const hasRealDescription=Boolean((p?.who||"").length>=70||(curated?.text||"").length>=80||String(n.note||"").trim().length>=80);
 const issues=[];
 if(n.kind==="Persona"&&!hasRealDescription)issues.push("biografia_limitada");
 if(n.kind==="Persona"&&!independent)issues.push("sin_cita_biografica_independiente");
 if(!String(n.note||"").trim()&&!String(n.archiveNote||"").trim()&&!entries.length&&!notes.length)issues.push("sin_descripcion_documental");
 if(bad.length)issues.push("resumenes_genericos:"+bad.length);
 if(sensitive.length)issues.push("alegaciones_requieren_cotejo:"+sensitive.length);
 if(vaguePodcastNotes.length)issues.push("notas_podcast_genericas:"+vaguePodcastNotes.length);
 if(genericNodeNote)issues.push("descripcion_base_generica");
 if(sensitivePodcastNotes.length)issues.push("controversias_en_podcast:"+sensitivePodcastNotes.length);
 if(sensitiveNodeNote||sensitiveOneNoteArchive)issues.push("acusacion_en_nota_base_o_archivo");
 if(duplicatedPodcastNotes)issues.push("notas_podcast_duplicadas:"+duplicatedPodcastNotes);
 if(entries.some(x=>!x.structured))issues.push("resumenes_no_estructurados");
 if(notes.some(x=>!x.source||!/^https?:\/\//.test(x.source)))issues.push("notas_sin_url_verificable");
 if(roleTimeSensitive.test((p?.who||"")+" "+(curated?.text||"")+" "+(n.note||"")))issues.push("cargo_sensible_al_tiempo");
 if((names.get(key)||[]).length>1)issues.push("nombre_duplicado");
 if(ownEdges.length&&ownEdges.length===mentions)issues.push("solo_enlaces_de_mencion");
 const priority=(sensitive.length?6:0)+(bad.length?4:0)+(sensitivePodcastNotes.length?5:0)+(vaguePodcastNotes.length?4:0)+(sensitiveNodeNote||sensitiveOneNoteArchive?3:0)+(genericNodeNote?2:0)+(!independent&&n.kind==="Persona"?3:0)+(!hasRealDescription&&n.kind==="Persona"?2:0)+(issues.includes("cargo_sensible_al_tiempo")?3:0);
 return {id:n.id,name:n.name,kind:n.kind,topic:n.topic3d||"",issues,priority,
  biography:{status:independent?"con_referencia":"sin_referencia_independiente",length:String(p?.who||curated?.text||n.subtitle||"").length},
  sourceClaims:entries.length,genericClaims:bad.length,allegationTerms:sensitive.length,
  podcastNotes:notes.length,genericPodcastNotes:vaguePodcastNotes.length,sensitivePodcastNotes:sensitivePodcastNotes.length,duplicatedPodcastNotes,baseNoteVague:genericNodeNote,baseNoteSensitive:sensitiveNodeNote,archiveSensitive:sensitiveOneNoteArchive,hasOneNoteArchive:archiveHasProvenance,edges:ownEdges.length,mentions,independentlyClassifiedEdges:reliableEdges,
  sourceOrders:[...new Set(entries.map(x=>x.order))],
  auditStatus:"cribado_estructural_no_verificacion_factual"};
}).sort((a,b)=>b.priority-a.priority||a.name.localeCompare(b.name,"es"));
const count=(key,pred)=>report.filter(pred).length;
const types=Object.fromEntries([...new Set(report.map(x=>x.kind))].sort().map(k=>[k,count(k,x=>x.kind===k)]));
const top=(field)=>report.filter(x=>x.issues.some(k=>k===field||k.startsWith(field+":")));
const totalMentions=data.edges.filter(mention).length;
const summary={
 auditedAt:"2026-11-11",scope:"Entidades del grafo de producción; se evalúan nodos, notas, biografías, menciones y aristas",
 scopeLimit:"Auditoría AUTOMÁTICA estructural. No comprueba la verdad material de cada afirmación ni la correspondencia con audio.",
 totalEntities:data.nodes.length,totalLinks:data.edges.length,mentionLinks:totalMentions,otherRelationships:data.edges.length-totalMentions,
 independentlyClassifiedEdges:data.edges.filter(e=>!mention(e)&&e.claimStatus==="hecho_verificado_independiente").length,
 byKind:types,profilesInEditorialLibrary:Object.keys(lib.profiles||{}).length,
 entitiesWithGenericClaims:count("vague",x=>x.genericClaims>0),
 genericClaimStatements:report.reduce((a,x)=>a+x.genericClaims,0),
 entitiesWithAllegationTerms:count("allegations",x=>x.allegationTerms>0),
 entitiesWithGenericPodcastNotes:count("podcast",x=>x.genericPodcastNotes>0),
 genericPodcastNotes:report.reduce((a,x)=>a+x.genericPodcastNotes,0),
 entitiesWithSensitivePodcastNotes:count("sensitive",x=>x.sensitivePodcastNotes>0),
 entitiesWithGenericSeedNotes:count("seed",x=>x.baseNoteVague),
 entitiesWithSensitiveSeedOrArchives:count("archive",x=>x.baseNoteSensitive||x.archiveSensitive),
 entitiesWithDuplicatePodcastNotes:count("dupe",x=>x.duplicatedPodcastNotes>0),
 unreferencedPeople:count("uncited",x=>x.kind==="Persona"&&x.biography.status==="sin_referencia_independiente"),
 entitiesWithoutDocumentaryDescription:top("sin_descripcion_documental").length,
 timeSensitiveRoleCandidates:top("cargo_sensible_al_tiempo").length,
 duplicatedNameEntities:top("nombre_duplicado").length,
 nodesOnlyLinkedToSources:top("solo_enlaces_de_mencion").length
};
assert(data.nodes.length>=527,"El grafo ha perdido entidades desde la última verificación");
assert(data.edges.every(e=>idMap.has(e.a)&&idMap.has(e.b)),"Relación huérfana");
assert(report.length===data.nodes.length,"No se ha auditado la totalidad del grafo");
assert(report.find(n=>n.name==="Nicolás Maduro")?.sourceClaims===3,"Falta reparar los testimonios de Nicolás Maduro");
fs.mkdirSync("audit-results",{recursive:true});
fs.writeFileSync("audit-results/telarana-all-entities.json",JSON.stringify({summary,entities:report},null,2)+"\n");
console.log("AUDITORÍA ESTRUCTURAL COMPLETA · LA TELARAÑA");
console.log(JSON.stringify(summary,null,2));
console.log("30 fichas prioritarias:",JSON.stringify(report.slice(0,30).map(x=>({name:x.name,priority:x.priority,issues:x.issues}))));
console.log("OK: "+report.length+" entidades inventariadas, sin relaciones huérfanas; informe exportado como artefacto de CI.");
