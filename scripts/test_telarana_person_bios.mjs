/* Prueba independiente de identidades, citas y presentación de fichas. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const page=fs.readFileSync("la-telarana/index.html","utf8");
const catalogSrc=fs.readFileSync("la-telarana/person-biographies.js","utf8");
const photoSrc=fs.readFileSync("la-telarana/photo-catalog.js","utf8");
const begin=page.indexOf("/* Biografía separada de alegaciones");
const end=page.indexOf("function showPodcastNotes(panel,notes,heading){",begin);
assert(begin>=0&&end>begin,"the biography subsystem must be present");
const window={};
vm.runInNewContext(catalogSrc, {window});
vm.runInNewContext(photoSrc, {window});
const entries={...window.IDEA_TELARANA_WIKIPEDIA_PORTRAITS,
 ...window.IDEA_TELARANA_BIOGRAPHIES.wikiPages};
assert.equal(window.IDEA_TELARANA_BIOGRAPHIES.curated["vf150-meir-dagan"].source.includes("runi.ac.il"),true);
for(const id of ["vf150-khaled-meshaal","vf150-danny-yatom","vf150-hussein-jordania","vf150-ahmed-yassin","vf150-abdel-aziz-al-rantisi"]){
 const b=window.IDEA_TELARANA_BIOGRAPHIES.curated[id];
 assert(b&&b.text.length>=200&&/^https:\/\//.test(b.source), "Missing sourced biography: "+id);
}
assert(Object.keys(entries).length>=110,"minimum 110 exact public biography mappings");
const base=JSON.parse(fs.readFileSync("la-telarana/one-note-seed.js","utf8").split("window.IDEA_TELARANA_ONENOTE = ")[1].trim().replace(/;$/,""));
const p1=JSON.parse(fs.readFileSync("la-telarana/podcast-vaquero-150.js","utf8").split("window.IDEA_TELARANA_PODCAST_150 = ")[1].trim().replace(/;$/,""));
const p2=JSON.parse(fs.readFileSync("la-telarana/podcast-coronel-villarejo-2026.js","utf8").split("window.IDEA_TELARANA_PODCAST_CORONEL_VILLAREJO = ")[1].trim().replace(/;$/,""));
const p3=JSON.parse(fs.readFileSync("la-telarana/podcast-coronel-elecciones-2026-preliminar.js","utf8").split("window.IDEA_TELARANA_EPISODE_CEUTA_2026 = ")[1].trim().replace(/;$/,""));
const unique=new Map();
for(const n of [...base.nodes,...p1.nodes,...p2.nodes,...p3.nodes]){
 if(n.kind!=="Persona")continue;
 const key=n.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9]+/g," ").trim();
 if(!unique.has(key))unique.set(key,n);
}
const covered=[...unique.values()].filter(n=>entries[n.id]||window.IDEA_TELARANA_BIOGRAPHIES.curated[n.id]);
assert(covered.length>=105,"expected at least 105 explicitly identified people");

class Element{
 constructor(tag){this.tag=tag;this.childNodes=[];this.isConnected=true;this.className="";this._text="";}
 set textContent(v){this._text=String(v??"")}
 get textContent(){return this._text+this.childNodes.map(x=>x.textContent||"").join("")}
 append(...items){this.childNodes.push(...items)}
 remove(){this.isConnected=false}
}
const N=(tag,text,cls)=>{const el=new Element(tag);if(text!=null)el.textContent=text;el.className=cls||"";return el};
const document={createTextNode:t=>({textContent:t})};
let fetchCalls=0;
const fetch=async url=>{
 fetchCalls++;
 const isSpanish=String(url).startsWith("https://es.wikipedia.org/");
 const data=isSpanish?
 {query:{pages:{"20":{pageid:20,title:"Robert Maxwell",extract:"Robert Maxwell fue un empresario y editor británico que desarrolló su carrera en la prensa y la política."}}}}:
 {query:{pages:{"19":{pageid:19,title:"Robert Maxwell",extract:"Robert Maxwell was a British publisher.",langlinks:[{lang:"es","*":"Robert Maxwell"}]}}}};
 return{ok:true,json:async()=>data};
};
let sourceCalls=[];
const showPodcastNotes=(panel,notes,heading)=>{sourceCalls.push({panel,notes,heading});panel.append(N("h3",heading))};
const context={window,N,document,fetch,showPodcastNotes,URLSearchParams,Map,Promise};
vm.runInNewContext(page.slice(begin,end),context);
const curated=new Element("panel");
const meir=p1.nodes.find(n=>n.id==="vf150-meir-dagan");
assert(meir);
context.showPersonBiography(curated,meir);
assert(curated.textContent.includes("2002 y 2011"),"Meir Dagan must have verified biography");
assert(curated.textContent.includes("Quién es / trayectoria"));
assert.equal(fetchCalls,0,"curated biographies are available offline");
const quote=new Element("panel");
context.showPersonResearch(quote,meir);
assert(quote.textContent.includes("Qué dicen las fuentes"));
assert.equal(sourceCalls.length,1);
assert.equal(sourceCalls[0].notes.length,1,"retain original podcast notes");
assert(sourceCalls[0].notes[0].timeSec>0,"retain exact podcast timestamp");

const external=new Element("panel");
const maxwell=base.nodes.find(n=>n.id==="on-robert-maxwell");
context.showPersonBiography(external,maxwell);
await new Promise(resolve=>setImmediate(resolve));
await new Promise(resolve=>setImmediate(resolve));
assert(external.textContent.includes("editor británico"),"Wikipedia intro should populate from public source");
assert(external.textContent.includes("Wikipedia"),"must cite the biographical page");
assert.equal(fetchCalls,2,"first query uses explicit English identity, second Spanish language link");

const unknown=new Element("panel");
const ambiguous=p1.nodes.find(n=>n.id==="vf150-juan-serrat");
const previous=fetchCalls;
context.showPersonBiography(unknown,ambiguous);
assert(unknown.textContent.includes("pendiente"),"do not invent biography for ambiguous source name");
assert.equal(previous,fetchCalls,"must not fetch guessed Wikipedia page for ambiguous person");
assert(page.indexOf("showPersonBiography(p,obj)")<page.indexOf("showPersonResearch(p,obj)"),
 "biography must be shown before the podcast claims");
console.log("OK: "+unique.size+" personas detectadas; "+covered.length+" perfiles identificados; Meir Dagan, Wikipedia, fuente original y homónimos verificados");
