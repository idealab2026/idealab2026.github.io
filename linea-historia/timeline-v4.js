(function(){
"use strict";
var periods=[
{k:"Tiempo profundo",a:-541000000,b:-110000,w:3400,at:-400000000},
{k:"Prehistoria",a:-110000,b:-3000,w:3000,at:-9000},
{k:"Antigüedad",a:-3000,b:476,w:3800,at:-400},
{k:"Edad media",a:476,b:1492,w:3800,at:1000},
{k:"Edad moderna",a:1492,b:1789,w:3600,at:1600},
{k:"Contemporánea",a:1789,b:2031,w:6100,at:1925}
];

/* Geographic links are inferred solely from explicit place references.
   Unknown locations remain unclassified; users may override with g: []. */
var GEO=["Europa","Asia","África","América","Oceanía","Antártida","Mundial"];
var continent="Todos",country="Todos",countryLinks=Object.create(null),worldGeo=null,worldShapesBuilt=false,worldPaths=new Map(),countryNames=new Map(),mapYearActive=false,mapYear=1900,mapListLimit=60,YEAR_PX=96,yearAxisLayer=null,yearGridLayers=[],yearWindowKey="";
for(var pi=2;pi<periods.length;pi++)
 periods[pi].w=(periods[pi].b-periods[pi].a)*YEAR_PX;
function geoFold(str){
 return String(str||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
var geoPatterns=[
 ["Europa","europa|europeo|europea|espana|espanol|espanola|francia|frances|francesa|alemania|aleman|alemana|italia|italiano|italiana|grecia|griego|griega|roma|romano|romana|peninsula iberica|britania|britanico|britanica|inglaterra|ingles|inglesa|reino unido|portugal|paises bajos|holanda|belgica|suiza|austria|irlanda|escocia|gales|suecia|noruega|dinamarca|finlandia|islandia|polonia|ucrania|rumania|hungria|checoslovaquia|chequia|eslovaquia|balcanes|serbia|croacia|bosnia|eslovenia|bulgaria|macedonia|albania|bielorrusia|letonia|lituania|estonia|vaticano|napoles|sicilia|sacro imperio|bizantino|constantinopla|atenas|esparta|verdun|trafalgar|carolingio|franquista|lindisfarne|peloponeso|termopilas|cordoba"],
 ["Asia","asia|asiatico|asiatica|china|chino|japon|japones|japonesa|india|indio|pakistan|bangladesh|nepal|tibet|mongolia|mongol|iran|persia|persa|iraq|irak|mesopotamia|sumeria|sumerio|babilonia|acadia|asirios|israel|israeli|judea|galilea|jerusalen|palestina|libano|siria|sirio|jordania|arabia|yemen|oman|turquia|anatolia|otomano|otomana|corea|tailandia|vietnam|indonesia|filipinas|afganistan|uzbekistan|kazajistan|azerbaiyan|armenia|georgia|baku|singapur|malasia|camboya|birmania|myanmar|laos|qatar|emiratos arabes|kuwait|dinastia tang|dinastia qing|dinastia ming"],
 ["África","africa|africano|africana|egipto|egipcio|sudafrica|sudafricano|etiopia|eritrea|sudan|libia|tunez|argelia|marruecos|marroqui|nigeria|kenia|kenya|uganda|namibia|angola|mozambique|zimbabue|zambia|ruanda|cabo verde|senegal|mali|ghana|camerun|congo|tanzania|somalia|magreb|cartago|punica|punico|alejandria"],
 ["América","america|americano|americana|estados unidos|eeuu|e e u u|usa|canada|mexico|mexicano|mexicana|guatemala|honduras|el salvador|costa rica|nicaragua|panama|cuba|haiti|dominicana|puerto rico|venezuela|colombia|ecuador|peru|bolivia|chile|argentina|uruguay|paraguay|brasil|brasileno|amazonia|andes|azteca|aztecas|maya|inca|yucatan|caribe|washington|nueva york|california|texas|alaska"],
 ["Oceanía","oceania|australia|australiano|australiana|nueva zelanda|fiyi|papua|polinesia|micronesia|melanesia"],
 ["Antártida","antartida|antartico|antartica|polo sur"]
].map(function(pair){
 return [pair[0],new RegExp("(?:^|[^a-z0-9])(?:"+pair[1]+")(?=$|[^a-z0-9])","i")];
});
function continentsOf(d){
 if(d._geo)return d._geo;
 if(Array.isArray(d.g)&&d.g.some(function(v){return GEO.includes(v)})){
  d._geo=GEO.filter(function(v){return d.g.includes(v)});
  d._geoKind="manual";return d._geo;
 }
 var title=geoFold(d.t),description="";
 if(d.c==="Pontífices"){
  description=(d.d||"").split("·").slice(2).join(" ");
  description=description.replace(/\bImperio romano\b/gi,"").replace(/\bEstados Pontificios\b/gi,"");
 }else if(d.c==="Literatura"||d.c==="Filosofía"){
  description=(d.d||"").split("·").slice(0,3).join(" ");
 }
 var reference=title+" "+geoFold(description),out=[];
 geoPatterns.forEach(function(pair){if(pair[1].test(reference))out.push(pair[0])});
 if(/(?:^|[^a-z])(?:rusia|ruso|rusa|urss|union sovietica)(?=$|[^a-z])/.test(title))
  out.push("Europa","Asia");
 if(/imperio romano|imperio otomano|guerras? punicas?/.test(title))
  out.push("Europa","África","Asia");
 if(/imperio britanico|guerras? mundiales?|pandemia|covid.?19|escala mundial|guerra fria|global/.test(title))
  out.push("Mundial");
 d._geo=GEO.filter(function(c){return out.includes(c)});
 d._geoKind=d._geo.length?"text":"unknown";
 return d._geo;
}
function matchesContinent(d){
 var found=continentsOf(d);
 return continent==="Todos"||(continent==="Sin localizar"?found.length===0:found.includes(continent));
}
function geoStatus(all,filtered){
 var identified=all.filter(function(d){return continentsOf(d).length>0}).length;
 $("geo-status").textContent=(continent==="Todos"?
  identified+" con referencia continental · "+(all.length-identified)+" sin localizar":
  filtered.length+" registros · "+(continent==="Sin localizar"?"sin referencia geográfica":"vinculados a "+continent))+
  " · clasificación provisional";
}

var cats=["Eras geológicas","Acontecimientos","Personajes","Historia bíblica","Filosofía","Pontífices","Actualidad","Cine","Literatura"];
var colors=["#d5a66d","#65bdc2","#c68dcb","#bd9ce0","#e6a06b","#8ba7ea","#9cce9b","#f0c96f","#f29ca4"];
var base=[],custom=[],period=periods[5],cat="Todas",query="",selected=null,zoom=1,viewMode="timeline",savedYear=1900,nativeFullscreen=false;
var el=function(tag,t,cls){var x=document.createElement(tag);if(t!=null)x.textContent=t;if(cls)x.className=cls;return x};
var $=function(id){return document.getElementById(id)};
function yearText(y){
 var n=Math.abs(y);
 if(n>=1000000)return "hace aprox. "+(n/1000000).toLocaleString("es-ES",{maximumFractionDigits:1})+" millones de años";
 return y<0?Math.round(n).toLocaleString("es-ES")+" a. C.":String(Math.floor(y))+" d. C.";
}
var dateRe=/\b(\d{1,3}(?:[.,]\d{3})+|\d{2,4})\s*((?:a|d)\.?\s*c\.?)?\s*[-–—]\s*(\d{1,3}(?:[.,]\d{3})+|\d{2,4})\s*((?:a|d)\.?\s*c\.?)?/i;
function valid(d){
 return d&&typeof d.t==="string"&&d.t.length<=500&&
 (d.g==null||(Array.isArray(d.g)&&d.g.length<=GEO.length&&d.g.every(function(v){return GEO.includes(v)})))&&
 Number.isFinite(Number(d.y))&&
 Math.abs(Number(d.y))<=550000000&&cats.includes(d.c)&&
 (d.e==null||d.e===""||(Number.isFinite(Number(d.e))&&Number(d.e)>=Number(d.y)&&Number(d.e)<=2031));
}
function validStudy(d){
 var info=d&&d.investigation||{};
 return !!(valid(d)&&/^study-(?:v\d+|vf\d+|f\d+)-[a-z0-9-]+$/.test(d.id||"")&&
  info.status==="hecho_documentado"&&/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(info.date||"")&&
  info.confirmedBy&&String(info.confirmedBy.url||"").startsWith("https://")&&
  String(info.sourceUrl||"").startsWith("https://")&&Array.isArray(info.relatedTelarana));
}
// Estos estudios documentan sucesos ya presentes en el archivo histórico.
// Se enriquece la ficha original y se conserva su categoría e identidad.
var studyCanonicalIds={
 "study-f39-descubrimiento-tumba-tutankamon-1922":"h-SH103",
 "study-f30-invasion-2022":"a-35-4",
 "study-f14-11s-2001":"a-14-17",
 "study-f19-asalto-capitolio-2021":"a-34-1",
 "study-f30-osce-minsk-2015":"a-28-3"
};
function mergeCanonicalStudy(original,study){
 return Object.assign({},original,{y:study.y,d:study.d,g:study.g,
  investigation:study.investigation,studyAlias:study.id});
}
function loadLocal(){
 try{var raw=JSON.parse(localStorage.getItem("idealab-historia-v1")||"[]");
 return Array.isArray(raw)?raw.filter(valid):[]}catch(e){return[]}
}
function enrich(d){
 if(d._computed)return d;
 var start=Number(d.y),end=d.e==null?NaN:Number(d.e),origin="explicit",ongoing=!!d.ongoing;
 if(!Number.isFinite(end)||end<=start){
  origin="";
  var txt=(d.c==="Filosofía"||d.c==="Literatura")?(d.d||"").split("·")[0]:(d.t||"");
  if(d.c==="Cine"&&!/^[^()]+\(\s*\d{3,4}\s*[-–—]\s*\d{3,4}\s*\)\s*$/.test(txt))txt="";
  var match=dateRe.exec(txt),bc=/a\.?\s*c\.?/i,ad=/d\.?\s*c\.?/i;
  if(match){
   var a=Number(match[1].replace(/[.,]/g,"")),b=Number(match[3].replace(/[.,]/g,"")),am=match[2]||"",bm=match[4]||"",anyBC=bc.test(am)||bc.test(bm);
   if(bc.test(am)||(anyBC&&!ad.test(am)))a=-a;
   if(bc.test(bm)||(anyBC&&!ad.test(bm)))b=-b;
   if(b>a&&b-a<=10000&&b<=2031&&Math.abs(Number(d.y)-a)<=Math.max(100,b-a+25)){
    start=a;end=b;origin=d.c==="Filosofía"||d.c==="Literatura"?"description":"title";
   }
  }
  if(!origin&&d.c==="Acontecimientos"){
   var open=/\b(\d{3,4})\s*[-–—]\s*(?:ACT(?:UALIDAD)?|PRESENTE|VIGENTE)\b/i.exec(txt);
   if(open&&Math.abs(Number(d.y)-Number(open[1]))<100){
    start=Number(open[1]);
    end=Math.min(2030,Date.now()?new Date().getFullYear()+((new Date().getMonth()+1)/12):2026);
    origin="title";ongoing=true;
   }
  }
 }
 d._start=start;d._end=end;d._origin=origin;d._ongoing=ongoing;d._computed=true;
 return d;
}
function sy(d){return d._start==null?Number(d.y):d._start}
function ey(d){return d._end==null?Number(d.e):d._end}
function duration(d){return !d.children&&Number.isFinite(ey(d))&&ey(d)>sy(d)}
function howLong(d){
 var n=ey(d)-sy(d);
 if(n>=1000000)return (n/1000000).toLocaleString("es-ES",{maximumFractionDigits:1})+" millones de años";
 return n<1?Math.max(1,Math.round(n*12))+" meses":(Math.round(n*10)/10).toLocaleString("es-ES")+(Math.abs(n-1)<.001?" año":" años");
}
function displayName(d){
 if(!duration(d))return d.t;
 var m=dateRe.exec(d.t);
 if(m&&m.index>2&&/^\s*(?:\(\s*\d+\s*años?\s*\))?\s*$/i.test(d.t.slice(m.index+m[0].length)))return d.t.slice(0,m.index).trim();
 return d.t;
}
function countriesOf(d){
 var row=countryLinks[d.id],list=row&&row.p||d.p;
 return Array.isArray(list)?list.filter(function(code){return typeof code==="string"&&/^[A-Z]{3}$/.test(code)}):[];
}
function countryBasis(d){var row=countryLinks[d.id];return row&&row.basis||(Array.isArray(d.p)&&d.p.length?"contexto histórico orientativo":"sin clasificación");}
function matchesCountry(d){
 var p=countriesOf(d);
 return country==="Todos"||(country==="Sin clasificar"?p.length===0:p.includes(country));
}
function countryName(code){return countryNames.get(code)||code}
function visible(){
 var all=base.concat(custom).filter(function(d){
  enrich(d);
  return (cat==="Todas"||d.c===cat)&&(!query||(d.t+" "+(d.d||"")).toLocaleLowerCase("es").includes(query));
 });
 var result=all.filter(matchesContinent).filter(matchesCountry);geoStatus(all,result);return result;
}
function axisX(y){
 var x=170,n=Number(y);
 for(var i=0;i<periods.length;i++){
  var p=periods[i],w=p.w*zoom;
  if(n<p.b||i===periods.length-1)return x+Math.max(0,Math.min(1,(n-p.a)/(p.b-p.a)))*w;
  x+=w;
 }
 return x;
}
function canvasWidth(){return 170+periods.reduce(function(a,p){return a+p.w*zoom},0)}
function yearAt(px){
 var x=Math.max(0,px-170);
 for(var i=0;i<periods.length;i++){
  var p=periods[i],w=p.w*zoom;
  if(x<=w||i===periods.length-1)return p.a+(Math.max(0,Math.min(1,x/w)))*(p.b-p.a);
  x-=w;
 }
 return 2026;
}
function eraAt(year){return periods.find(function(p){return year>=p.a&&year<p.b})||periods[periods.length-1]}
function categoryUI(){
 var select=$("filters");
 if(select.options.length!==cats.length+1){
  select.replaceChildren();
  ["Todas"].concat(cats).forEach(function(c){
   var option=el("option",c);option.value=c;select.append(option);
  });
 }
 select.value=cat;
 select.style.setProperty("--selection-color",cat==="Todas"?"#e5b768":colors[cats.indexOf(cat)]);
}
function periodUI(){
 var select=$("periods");
 if(select.options.length!==periods.length){
  select.replaceChildren();
  periods.forEach(function(p){
   var option=el("option",p.k);option.value=p.k;select.append(option);
  });
 }
 select.value=period.k;
}

var lastCardFocus=null,wikiRequestVersion=0,wikiAbort=null,wikiCache=new Map();
/* Deterministic aliases for source-sheet abbreviations, legacy names and
   titles that do not match a canonical encyclopaedia entry. */
var wikiAliases={
 "ww i":"Primera Guerra Mundial","wwii":"Segunda Guerra Mundial",
 "ww ii":"Segunda Guerra Mundial","eeuu":"Estados Unidos",
 "urs s":"Unión Soviética","urss":"Unión Soviética",
 "imperio romano":"Imperio romano","imperio britanico":"Imperio británico",
 "imperio otomano":"Imperio otomano","imperio egipcio":"Antiguo Egipto",
 "imperio persa":"Imperio aqueménida","imperio asirio":"Imperio asirio",
 "imperio hitita":"Imperio hitita","imperio mongol":"Imperio mongol",
 "imperio carolingio":"Imperio carolingio","imperio neerlandes":"Imperio neerlandés",
 "guerra del rif":"Guerra del Rif","minoicos":"Civilización minoica",
 "sumerios":"Sumeria","acadios":"Imperio acadio","olmecas":"Cultura olmeca",
 "aztecas":"Imperio azteca","reconquista":"Reconquista",
 "tartesos":"Tartessos","ii republica espanola":"Segunda República española",
 "i rep":"Primera República española","republica romana":"República romana",
 "republica china":"República de China",
 "dinastia song":"Dinastía Song","dinastia qing":"Dinastía Qing",
 "dinastia ming":"Dinastía Ming","dinastia han":"Dinastía Han",
 "dinastia tang":"Dinastía Tang","dinastia qin":"Dinastía Qin",
 "era glaciacion":"Glaciación","younger dryas":"Dryas Reciente",
 "gautama buddha":"Buda Gautama","mahatma ghandi":"Mahatma Gandhi",
 "margaret tatcher":"Margaret Thatcher","wolfang amadeus mozart":"Wolfgang Amadeus Mozart",
 "soren kierkegaard":"Søren Kierkegaard",
 "jesucristo":"Jesús de Nazaret","rey mebaragesi":"Enmebaragesi",
 "sargon i de acad":"Sargón de Acad","naram sin":"Naram-Sin de Acad",
 "bjor n piel de hierro":"Björn Ragnarsson","almanzor":"Almanzor",
 "ragnar lothbrok":"Ragnar Lodbrok",
 "gengis kan":"Gengis Kan","kublai kan":"Kublai Kan",
 "ii republica":"Segunda República española",
 "batalla de verdun":"Batalla de Verdún",
 "descubrimiento de america":"Descubrimiento de América",
 "cristianismo se hace religion oficial en el imperio romano":"Edicto de Tesalónica",
 "invencion de la imprenta":"Imprenta",
 "invencion de la rueda":"Rueda",
 "invencion de la escritura":"Escritura",
 "invencion de la polvora en china":"Pólvora"
};
var wikiById={
 "c-3-74":"2001: una odisea del espacio","c-3-81":"Barry Lyndon",
 "c-3-85":"Apocalypse Now","c-3-88":"Blade Runner",
 "c-5-85":"Arrebato (película)","c-7-85":"Alien, el octavo pasajero",
 "c-10-49":"Iván Zulueta","c-12-34":"Jacques Rivette",
 "c-14-38":"François Truffaut","c-16-34":"Stanley Kubrick",
 "c-18-43":"Ridley Scott",
 "l-4":"Poema de Gilgamesh","l-6":"Poema de Gilgamesh",
 "l-7":"Enuma Elish","l-8":"Rigveda",
 "l-9":"Shijing","l-16":"Orestíada",
 "l-17":"Edipo rey","l-18":"Historias (Heródoto)",
 "l-22":"De la naturaleza de las cosas","l-23":"Eneida",
 "l-24":"Las metamorfosis","l-26":"El asno de oro",
 "l-29":"Beowulf","l-31":"Genji Monogatari",
 "l-33":"Divina comedia","l-34":"Decamerón",
 "l-35":"Canzoniere","l-36":"Los cuentos de Canterbury",
 "l-37":"La Celestina","l-38":"Orlando furioso",
 "l-39":"Utopía (libro)","l-41":"Lazarillo de Tormes",
 "h-SB40":"Guerra del Rif",
 "h-CZ30":"Antiguo Egipto",
 "h-SI20":"Dictadura de Primo de Rivera",
 "h-SP14":"Dictablanda de Dámaso Berenguer",
 "h-SQ20":"Segunda República española",
 "h-OG27":"Primera cruzada",
 "h-NB35":"Reconquista",
 "h-PW21":"Guerra de Granada",
 "h-QA30":"Conquista de México",
 "h-SD21":"Revolución de Octubre","h-JQ25":"Primera guerra púnica",
 "h-JW25":"Segunda guerra púnica","h-IU34":"República romana",
 "h-JR35":"Guerras púnicas","p-2":"Pedro (apóstol)"
};
function wikiPlain(s){
 return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es")
  .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function wikiStripDates(raw){
 var s=String(raw||"").trim().replace(/\u00a0/g," ");
 // Correct an Excel concatenation such as «Nicolás II1868 - 1918».
 s=s.replace(/([IVX])(?=\d{4}\s*[-–—]\s*\d{4}\s*$)/g,"$1 ");
 // Film title / director / film year: keep only the named work.
 s=s.replace(/\s*\(\s*\d{4}\s*\)\s*[-–—]\s*.+$/,"");
 // Standalone film-year and person-life suffixes.
 s=s.replace(/\s*\(\s*\d{1,4}\s*[-–—]\s*(?:\d{1,4})?\s*\)\s*$/,"");
 s=s.replace(/\s*\(\s*\d{4}\s*\)\s*$/,"");
 s=s.replace(/\s*\(\s*\d{1,4}\s*(?:[ad]\.\s*c\.?|[ad]\.c\.?)\s*\)\s*$/i,"");
 s=s.replace(/\s*\(\s*\d{2,4}\s*(?:[ad]\.\s*c\.?|[ad]\.c\.?)\s*[-–—]\s*\d{2,4}\s*(?:[ad]\.\s*c\.?|[ad]\.c\.?)\s*\)\s*$/i,"");
 // YYYY a. C. — YYYY d. C., with optional thousands separators.
 s=s.replace(/\s+\b\d{1,3}(?:[.,]\d{3})+\s*(?:[ad]\.?\s*c\.?)?\s*[-–—]\s*\d{1,3}(?:[.,]\d{3})*\s*(?:[ad]\.?\s*c\.?)?.*$/i,"");
 s=s.replace(/\s+\b\d{2,4}\s*(?:[ad]\.?\s*c\.?)?\s*[-–—]\s*(?:\d{1,4}\s*(?:[ad]\.?\s*c\.?)?|ACT|actualidad|presente)\s*(?:\([^)]*\)|\.?\s*)$/i,"");
 // A single event date at the end, or an introductory «Año 64 -».
 s=s.replace(/\s*\(\s*\d{3,4}\s*\)\s*$/,"").replace(/\s+(?:\d{2,4})\s*(?:[ad]\.?\s*c\.?)?\s*$/i,"");
 s=s.replace(/^(?:Año\s+)?\d{2,4}\s*[-–—]\s*/i,"");
 return s.replace(/\s+\(\s*\d+\s*años?\s*\)\s*$/i,"").replace(/\s*[-–—]\s*$/,"").trim();
}
function wikipediaSearchName(d){
 var raw=wikiStripDates(d.t);
 if(wikiById[d.id])return wikiById[d.id];
 if(d.c==="Pontífices"){
  raw=raw.replace(/^S\.\s*/i,"").replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();
  // Pontiff names are often shared with monarchs, saints and ordinary people.
  return raw+" (papa)";
 }
 var key=wikiPlain(raw);
 if(wikiAliases[key])return wikiAliases[key];
 return raw||d.t;
}
function wikiCandidates(d){
 var main=wikipediaSearchName(d),a=[main];
 var clean=wikiStripDates(d.t),name=wikiPlain(clean);
 if(d.c==="Pontífices"){
  var pope=main.replace(/\s+\(papa\)$/i,"");
  a.push("papa "+pope,pope);
 }else{
  a.push(clean);
  if(d.c==="Cine"&&clean.includes(","))a.push(clean.split(",")[0]);
  if(d.c==="Personajes"&&name.includes(" de "))a.push(clean.replace(/\s+de\s+.+$/i,""));
 }
 if(wikiAliases[name])a.unshift(wikiAliases[name]);
 return Array.from(new Set(a.filter(function(t){return typeof t==="string"&&t.trim()&&t.length<=180}))).slice(0,4);
}
function wikiIsComposite(d){
 // Do not silently substitute the article for just one of multiple events.
 if(d.c==="Actualidad")return /[;]|\b(?:y|mientras|además)\b/i.test(d.t)&&d.t.split(/\s*[;]\s*|\s+\by\b\s+/i).length>1;
 if(d.c==="Literatura")return /\s+(?:y|\/)\s+/i.test(d.t)&&!wikiById[d.id];
 return false;
}
function wikiSearchURL(term){return "https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(term)}
function wikiArticleURL(title){return "https://es.wikipedia.org/wiki/"+encodeURIComponent(String(title).replace(/ /g,"_"))}
function wikiExternalLink(parent,href,label,cls){
 var a=el("a",label,cls||"note-wiki");
 a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";parent.append(a);return a;
}

function wikiAPIOn(endpoint,params,signal){
 var uri=new URL(endpoint);
 uri.searchParams.set("format","json");uri.searchParams.set("formatversion","2");
 uri.searchParams.set("origin","*");
 Object.keys(params).forEach(function(k){uri.searchParams.set(k,String(params[k]))});
 return fetch(uri.toString(),{signal:signal,credentials:"omit"}).then(function(r){
  if(!r.ok)throw Error("La API de Wikimedia ha respondido con "+r.status);
  return r.json();
 }).then(function(body){
  if(body&&body.error)throw Error(body.error.info||body.error.code||"Error de la API de Wikimedia");
  return body;
 });
}
function wikiAPI(params,signal){
 return wikiAPIOn("https://es.wikipedia.org/w/api.php",params,signal);
}
function wikiTokens(s){
 var stop=new Set(["de","del","la","el","los","las","y","en","un","una","por","para","con","al","s","san","santa"]);
 return wikiPlain(s).split(" ").filter(function(w){return w&&!stop.has(w)});
}
function wikiMatchTitle(d,result,query){
 if(!Array.isArray(result)||!result.length)return null;
 var target=wikiPlain(query),qt=wikiTokens(query);
 var exact=result.find(function(p){return wikiPlain(p.title)===target});
 if(exact)return exact.title;
 if(qt.length<2)return null;
 var candidates=result.map(function(item){
  var name=wikiPlain(item.title),wt=wikiTokens(item.title);
  var overlap=qt.filter(function(w){return wt.includes(w)}).length;
  var recall=overlap/qt.length,precision=overlap/Math.max(1,wt.length);
  var score=recall*.78+precision*.22;
  var pape=/\bpapa\b/.test(name),film=/\bpelicula\b/.test(name);
  if(d.c==="Pontífices"&&!pape)score-=.12;
  if(d.c==="Cine"&&!film&&/\(.*\)/.test(item.title))score-=.04;
  if(name.startsWith(target+" "))score+=.04;
  return {title:item.title,score:score};
 }).sort(function(x,y){return y.score-x.score});
 // Never automatically substitute a weak or ambiguous result.
 return candidates[0].score>=.87 &&
  (candidates.length<2 || candidates[0].score-candidates[1].score>=.06)
  ?candidates[0].title:null;
}
function wikiArticleTitleFromLink(raw){
 if(typeof raw!=="string")return null;
 var m=/^https:\/\/es\.wikipedia\.org\/wiki\/([^?# ]+)$/i.exec(raw);
 if(!m)return null;
 try{return decodeURIComponent(m[1]).replace(/_/g," ")}catch(e){return null}
}
function wikiIsValidArticle(page){
 return !!(page&&!page.missing&&page.ns===0&&
  !("disambiguation" in (page.pageprops||{}))&&
  typeof page.extract==="string"&&page.extract.trim().length>0);
}
async function wikiFetchArticle(title,signal){
 var response=await wikiAPI({
  action:"query",prop:"extracts|pageimages|pageprops",
  titles:title,redirects:1,explaintext:1,exsectionformat:"wiki",
  piprop:"thumbnail|name",pithumbsize:680,pilicense:"free",
  ppprop:"disambiguation|wikibase_item|page_image_free|page_image"
 },signal);
 var pages=response.query&&response.query.pages||[];
 return pages.find(wikiIsValidArticle)||null;
}
async function wikiFindArticle(d,signal){
 var direct=wikiArticleTitleFromLink(d.w),names=wikiCandidates(d);
 var candidateTitles=direct?[direct].concat(names):names;
 var attempted=new Set(),suggestions=[];
 if(wikiIsComposite(d)){
  return {
   page:null,suggestions:[],term:names[0],kind:"composite",
   searchParts:d.t.split(/\s*;\s*|\s+\by\b\s+/i)
     .map(function(p){return wikiStripDates(p).trim()})
     .filter(function(p){return p.length>=4}).slice(0,4)
  };
 }
 // A known article title is queried before a broad full-text search.
 // One failed candidate is fine, but avoid dozens of sequential API calls.
 for(var i=0;i<Math.min(candidateTitles.length,d.c==="Pontífices"?2:2);i++){
  var title=candidateTitles[i];
  if(attempted.has(wikiPlain(title)))continue;
  attempted.add(wikiPlain(title));
  var page=await wikiFetchArticle(title,signal);
  if(page)return {page:page,term:names[0],kind:"exact"};
 }
 for(var k=0;k<Math.min(2,names.length);k++){
  var term=names[k];
  var results=await wikiAPI({
   action:"query",list:"search",srsearch:term,
   srnamespace:0,srlimit:8,srprop:"",utf8:1
  },signal);
  var choices=results.query&&results.query.search||[];
  choices.forEach(function(choice){
   if(!suggestions.some(function(x){return wikiPlain(x)===wikiPlain(choice.title)}))
    suggestions.push(choice.title);
  });
  var title=wikiMatchTitle(d,choices,term);
  if(title){
   var matched=await wikiFetchArticle(title,signal);
   if(matched)return {page:matched,term:term,kind:"search"};
  }
 }
 return {page:null,term:names[0],suggestions:suggestions.slice(0,5),kind:"unmatched"};
}
/* Use Wikimedia's officially documented reusable image redirect, rather
   than relying on a hashed CDN thumbnail URL that may fail on third-party sites. */
var wikiVerifiedImageFiles={
 "Q1001":"Mahatma-Gandhi, studio, 1931.jpg"
};
function wikiCommonsFileURL(filename,width){
 if(typeof filename!=="string"||filename.length>260||
  !/\.(?:jpe?g|png|webp|gif|svg)$/i.test(filename))return null;
 return "https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/"+
  encodeURIComponent(filename.replace(/ /g,"_"))+"&width="+(width||500);
}
function wikiPhotoFromFile(file,kind){
 var url=wikiCommonsFileURL(file,500);
 return url?{source:url,file:file,sourceKind:kind||"commons",resolver:"redirect"}:null;
}
function wikiPhotoURLValid(url){
 return /^https:\/\/(?:upload\.wikimedia\.org\/|commons\.wikimedia\.org\/w\/index\.php\?title=Special:Redirect\/file\/)/i.test(String(url||""));
}
function wikiPicture(page){
 var image=page&&page.thumbnail&&page.thumbnail.source;
 if(wikiPhotoURLValid(image)&&/^https:\/\/upload\.wikimedia\.org\//i.test(image))
  return {source:image,file:page.pageimage||null,sourceKind:"pageimages",resolver:"api"};
 return null;
}
function wikiKnownPhoto(page){
 var q=page&&page.pageprops&&page.pageprops.wikibase_item;
 var file=wikiVerifiedImageFiles[q]||(
  wikiPlain(page&&page.title)==="mahatma gandhi"?
  wikiVerifiedImageFiles.Q1001:null);
 return file?wikiPhotoFromFile(file,"verified-wikidata"):null;
}
function wikiPagePropsPhoto(page){
 var props=page&&page.pageprops||{};
 return wikiPhotoFromFile(props.page_image_free,"pageprops");
}
async function wikiFetchWikidataImage(page,signal){
 var item=page&&page.pageprops&&page.pageprops.wikibase_item;
 if(!/^Q\d+$/.test(String(item||"")))return wikiKnownPhoto(page);
 // Reading P18 is enough to verify the file identity. The browser can
 // resolve its Commons thumbnail through Special:Redirect/file, without a
 // separate Commons imageinfo API request that can fail/return no thumb.
 var response=await wikiAPIOn("https://www.wikidata.org/w/api.php",{
  action:"wbgetentities",ids:item,props:"claims"
 },signal);
 var entity=response.entities&&response.entities[item];
 var values=entity&&entity.claims&&entity.claims.P18||[];
 var candidates=values.map(function(statement){
  var claim=statement.mainsnak&&statement.mainsnak.datavalue;
  return claim&&typeof claim.value==="string"?claim.value:null;
 }).filter(Boolean);
 for(var i=0;i<candidates.length;i++){
  var p=wikiPhotoFromFile(candidates[i],"wikidata");
  if(p)return p;
 }
 return wikiKnownPhoto(page);
}
async function wikiFetchSummaryImage(page,signal){
 var title=String(page&&page.title||"");
 if(!title||title.length>180)return null;
 var url="https://es.wikipedia.org/api/rest_v1/page/summary/"+
  encodeURIComponent(title.replace(/ /g,"_"));
 var response=await fetch(url,{signal:signal,credentials:"omit"});
 if(!response.ok)return null;
 var summary=await response.json();
 if(summary.type==="disambiguation"||
   wikiPlain(summary.title)!==wikiPlain(title))return null;
 var thumbnail=summary.thumbnail&&summary.thumbnail.source;
 return wikiPhotoURLValid(thumbnail)?
  {source:thumbnail,file:null,sourceKind:"summary",resolver:"api"}:null;
}
function stopWikiRequest(){
 wikiRequestVersion++;
 if(wikiAbort){wikiAbort.abort();wikiAbort=null}
}
function closeNote(){
 var layer=$("note-layer");
 if(layer.classList.contains("hide"))return;
 stopWikiRequest();
 layer.classList.add("hide");
 document.body.classList.remove("history-note-open");
 if(lastCardFocus&&typeof lastCardFocus.focus==="function")lastCardFocus.focus();
 lastCardFocus=null;
}
function wikiDateLine(d){
 var label=yearText(sy(d));
 if(duration(d))label+=" — "+(d._ongoing?"actualidad":yearText(ey(d)))+" · "+howLong(d);
 return label;
}
function wikiOpenDrawer(){
 var layer=$("note-layer");
 if(layer.classList.contains("hide"))lastCardFocus=document.activeElement;
 layer.classList.remove("hide");
 document.body.classList.add("history-note-open");
 // Not a modal: leave focus and interactions on the timeline available.
 $("note-dialog").scrollTop=0;
}
function wikiFooter(parent,title){
 var footer=el("div",null,"wiki-credits");
 footer.append(el("span","Fuente: colaboradores de Wikipedia · texto disponible bajo licencia CC BY-SA 4.0."));
 wikiExternalLink(footer,"https://creativecommons.org/licenses/by-sa/4.0/deed.es","Licencia","wiki-credit-link");
 wikiExternalLink(footer,"https://es.wikipedia.org/w/index.php?title="+encodeURIComponent(title)+"&action=history","Autores e historial","wiki-credit-link");
 parent.append(footer);
}
function wikiAppendText(container,raw){
 // Plain-text extraction prevents injection of remote HTML or scripts.
 var lines=String(raw||"").replace(/\r/g,"").split("\n"),part=[];
 function flush(){
  if(!part.length)return;
  container.append(el("p",part.join(" ").trim(),"wiki-paragraph"));part=[];
 }
 lines.forEach(function(line){
  var text=line.trim(),heading=/^(={2,6})\s*(.+?)\s*\1$/.exec(text);
  if(heading){
   flush();
   container.append(el(heading[1].length<=2?"h3":"h4",heading[2],"wiki-section-title"));
  }else if(!text){flush()}
  else{part.push(text)}
 });
 flush();
}

function wikiImageNotice(root,term){
 if(root.querySelector&&root.querySelector(".wiki-image-empty"))return;
 var notice=el("div",null,"wiki-image-empty");
 notice.append(el("span","No se ha podido recuperar una imagen verificable desde los servicios de Wikimedia para esta ficha."));
 wikiExternalLink(notice,
  "https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(term)+"&title=Special:MediaSearch&type=image",
  "Explorar las fotografías de Wikimedia Commons ↗","wiki-credit-link");
 root.append(notice);
}
function wikiRenderImage(root,page,requestId,signal){
 // Do not hide the encyclopaedia text while remote image services are queried.
 var candidates=[],seen=new Set(),index=0,current=null,rescueStarted=false;
 var fig=el("figure",null,"wiki-figure");
 var status=el("div","Comprobando imagen de Wikipedia…","wiki-image-status");
 var photo=el("img",null,"wiki-lead-image");
 photo.alt="Imagen vinculada al artículo: "+page.title;
 photo.loading="eager";photo.decoding="async";photo.referrerPolicy="no-referrer";
 photo.style.display="none";
 var caption=el("figcaption",null,"wiki-image-caption");
 caption.append(el("span","Imagen: Wikimedia Commons"));
 var credit=null;
 fig.append(status,photo,caption);root.append(fig);
 function active(){
  return requestId===wikiRequestVersion&&!$("note-layer").classList.contains("hide");
 }
 function add(candidate){
  if(!candidate||!wikiPhotoURLValid(candidate.source))return;
  if(seen.has(candidate.source))return;
  seen.add(candidate.source);candidates.push(candidate);
 }
 function attribution(p){
  if(credit){credit.remove();credit=null}
  if(p.file){
   var label="Ver archivo, autoría y licencia ↗";
   var prefix=p.sourceKind==="pageimages"?
     "https://es.wikipedia.org/wiki/Archivo:":
     "https://commons.wikimedia.org/wiki/File:";
   credit=wikiExternalLink(caption,prefix+encodeURIComponent(p.file.replace(/ /g,"_")),
     label,"wiki-credit-link");
  }else{
   credit=wikiExternalLink(caption,wikiArticleURL(page.title),
     "Origen de la imagen ↗","wiki-credit-link");
  }
 }
 function fail(){
  if(!active())return;
  fig.remove();
  wikiImageNotice(root,page.title);
 }
 function recover(){
  if(rescueStarted){fail();return}
  rescueStarted=true;
  status.textContent="Buscando una imagen alternativa en Wikidata y Wikipedia…";
  Promise.allSettled([
   wikiFetchWikidataImage(page,signal),
   wikiFetchSummaryImage(page,signal)
  ]).then(function(results){
   if(!active())return;
   results.forEach(function(r){if(r.status==="fulfilled")add(r.value)});
   next();
  });
 }
 function next(){
  if(!active())return;
  if(index>=candidates.length){recover();return}
  current=candidates[index++];
  status.textContent="Cargando imagen…";
  photo.style.display="none";
  attribution(current);
  photo.src=current.source;
 }
 photo.onload=function(){
  if(!active())return;
  status.remove();photo.style.display="block";
  page._resolvedImage=current;
 };
 photo.onerror=function(){
  if(!active())return;
  next();
 };
 add(page._resolvedImage);
 add(wikiPicture(page));
 add(wikiPhotoFromFile(page.pageimage,"pageimages-file"));
 add(wikiPagePropsPhoto(page));
 add(wikiKnownPhoto(page));
 next();
}
function wikiRenderArticle(d,root,page,requestId,signal){
 root.replaceChildren();
 $("note-kicker").textContent=d.c+" · Wikipedia";
 $("note-title").textContent=String(page.title||wikipediaSearchName(d));
 root.append(el("div",wikiDateLine(d),"note-date"));
 appendCountriesInNote(root,d);
 if(d.c==="Eras geológicas"){
  var dating=el("p","Fechas aproximadas según la Comisión Internacional de Estratigrafía.","source-note");
  wikiExternalLink(dating,"https://stratigraphy.org/chart/?language=es","Escala geológica oficial ↗","wiki-credit-link");
  root.append(dating);
 }
 // The lead image must belong to the resolved article, not an image-search guess.
 wikiRenderImage(root,page,requestId,signal);
 var text=el("article",null,"wiki-article");
 wikiAppendText(text,page.extract);
 root.append(text);
 var links=el("div",null,"wiki-actions");
 wikiExternalLink(links,wikiArticleURL(page.title),"Abrir artículo original ↗");
 root.append(links);
 wikiFooter(root,page.title);
 if(d.isTraditional)root.append(el("p","Las fechas bíblicas del Excel no son dataciones históricas demostradas.","note-warning"));
}
function wikiFallback(d,root,term,reason,suggestions,searchParts){
 if($("note-layer").classList.contains("hide"))return;
 $("note-kicker").textContent=d.c+" · búsqueda";
 $("note-title").textContent=displayName(d);
 root.replaceChildren();
 root.append(el("div",wikiDateLine(d),"note-date"));
 appendCountriesInNote(root,d);
 var message=String(reason||"No se ha encontrado un artículo suficientemente coincidente.");
 root.append(el("p",message,"wiki-error"));
 if(d.d)root.append(el("p","Información del archivo: "+d.d,"source-note"));
 if(Array.isArray(searchParts)&&searchParts.length>1){
  root.append(el("h3","Buscar cada acontecimiento por separado","wiki-section-title"));
  var events=el("div",null,"wiki-suggestions");
  searchParts.forEach(function(part){
   wikiExternalLink(events,wikiSearchURL(part),part+" ↗","wiki-suggestion");
  });
  root.append(events);
 }
 if(Array.isArray(suggestions)&&suggestions.length){
  root.append(el("h3","Posibles artículos relacionados","wiki-section-title"));
  var list=el("div",null,"wiki-suggestions");
  suggestions.slice(0,5).forEach(function(title){
   wikiExternalLink(list,wikiArticleURL(title),title+" ↗","wiki-suggestion");
  });
  root.append(list);
 }
 wikiExternalLink(root,wikiSearchURL(term),"Buscar en Wikipedia ↗");
}
async function wikiLoadArticle(d,root,term,requestId,signal){
 var cacheKey=d.w||d.id||term;
 try{
  var page=wikiCache.get(cacheKey);
  if(!page){
   var result=await wikiFindArticle(d,signal);
   if(!result.page){
    if(requestId!==wikiRequestVersion)return;
    var reason=result.kind==="composite"?
     "Este registro incluye varios acontecimientos u obras: no sería correcto atribuirle un solo artículo.":
     "No se ha identificado de forma fiable un artículo único. Puedes consultar las páginas relacionadas.";
    wikiFallback(d,root,result.term||term,reason,result.suggestions||[],result.searchParts||[]);
    return;
   }
   page=result.page;
   // Resolve pictures asynchronously in the drawer: the article text should
   // never wait for a Wikidata or Commons photo service.
   if(wikiCache.size>=80)wikiCache.delete(wikiCache.keys().next().value);
   wikiCache.set(cacheKey,page);
  }
  if(requestId!==wikiRequestVersion||$("note-layer").classList.contains("hide"))return;
  wikiRenderArticle(d,root,page,requestId,signal);
 }catch(err){
  if(requestId!==wikiRequestVersion||err.name==="AbortError")return;
  wikiFallback(d,root,term,"Wikipedia no ha podido responder correctamente: "+err.message);
 }
}
/* La ficha documental prevalece sobre búsquedas automáticas de Wikipedia. */
function documentedLink(parent,href,label){
 try{
  var u=new URL(href,location.href);if(u.protocol!=="https:")return;
  var a=el("a",label,"research-link");
  a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";
  parent.append(a);
 }catch(e){}
}
function studyDate(date,precision){
 var v=String(date||"");
 if(precision==="año"&&/^\d{4}$/.test(v))return v;
 if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(v))return"Fecha por verificar";
 var p=v.split("-").map(Number);
 var options=precision==="mes"?{month:"long",year:"numeric",timeZone:"UTC"}:{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"};
 return new Intl.DateTimeFormat("es",options).format(new Date(Date.UTC(p[0],p[1]-1,p[2]||1)));
}
function showStudyNote(d){
 stopWikiRequest();
 var info=d.investigation||{},root=$("note-body");
 $("note-kicker").textContent="Estudio documental · IDEA LAB";
 $("note-title").textContent=displayName(d);
 root.replaceChildren();
 root.append(el("div",studyDate(info.date,info.datePrecision),"note-date"));
 appendCountriesInNote(root,d);
 root.append(el("div","Hecho documentado con contraste externo","research-evidence"));
 root.append(el("h3","Qué ocurrió","wiki-section-title"));
 root.append(el("p",d.d||"Sin descripción documental.","source-note"));
 root.append(el("h3","Fuente de contraste","wiki-section-title"));
 var proof=el("div",null,"research-sources");
 if(info.confirmedBy&&info.confirmedBy.url)documentedLink(proof,info.confirmedBy.url,info.confirmedBy.label||"Consultar fuente de contraste");
 root.append(proof);
 root.append(el("h3","Referencia en La Telaraña","wiki-section-title"));
 root.append(el("p",info.sourceOrder?("Estudio de la fuente "+info.sourceOrder+". El testimonio no sustituye a la documentación del hecho."):("Estudio complementario de La Telaraña. Numeración pendiente de reconciliar con el catálogo; el episodio no sustituye a las pruebas históricas."),"source-note"));
 var contextual=el("div",null,"research-sources");
 if(info.sourceUrl)documentedLink(contextual,info.sourceUrl,"Consultar el episodio");
 if(Array.isArray(info.relatedTelarana)&&info.relatedTelarana.length){
  documentedLink(contextual,"https://idealab2026.github.io/la-telarana/?entidad="+encodeURIComponent(info.relatedTelarana[0]),"Ver protagonista y relaciones en La Telaraña");
 }
 root.append(contextual);
 if(info.methodologicalLimits){
  root.append(el("h3","Límites de la evidencia","wiki-section-title"));
  root.append(el("p",info.methodologicalLimits,"research-limits"));
 }
 wikiOpenDrawer();
}
function showNote(d){
 if(d&&d.investigation){showStudyNote(d);return}
 stopWikiRequest();
 var root=$("note-body"),term=wikipediaSearchName(d);
 $("note-kicker").textContent=d.c+" · Wikipedia";
 $("note-title").textContent=displayName(d);
 root.replaceChildren();
 root.append(el("div",wikiDateLine(d),"note-date"));
 root.append(el("p","Consultando el artículo en Wikipedia…","wiki-loading"));
 wikiOpenDrawer();
 wikiAbort=typeof AbortController!=="undefined"?new AbortController():null;
 wikiLoadArticle(d,root,term,wikiRequestVersion,wikiAbort?wikiAbort.signal:undefined);
}
function showGroupNote(group){
 stopWikiRequest();
 var root=$("note-body");root.replaceChildren();
 $("note-kicker").textContent="Artículos de Wikipedia";
 $("note-title").textContent=group.groupLabel+" · "+group.children.length+" registros";
 root.append(el("p","Selecciona un registro para leer su artículo de Wikipedia en este panel."));
 var list=el("div",null,"note-group-list");
 group.children.forEach(function(d){
  var b=el("button",yearText(sy(d))+" · "+d.t,"group-result");b.type="button";
  b.addEventListener("click",function(){detail(d)});
  list.append(b);
 });
 root.append(list);wikiOpenDrawer();
}
function detail(d){selected=d;showNote(d)}
function groupedDetail(group){selected=group;showGroupNote(group)}
function grouped(items,c){
 if(c!=="Actualidad"||query)return items;
 var step=zoom<=1?1:zoom<=2?.5:zoom<=4?.25:1/12,g=new Map();
 items.forEach(function(d){
  var key=Math.floor((sy(d)+.0000001)/step);
  if(!g.has(key))g.set(key,[]);
  g.get(key).push(d);
 });
 var rows=[];
 g.forEach(function(a,key){
  if(a.length===1){rows.push(a[0]);return}
  var y=key*step,yr=Math.floor(y+.000001),sub="";
  if(zoom===2)sub=" · S"+(1+Math.floor((y-yr)*2+.00001));
  if(zoom===4)sub=" · T"+(1+Math.floor((y-yr)*4+.00001));
  if(zoom===8)sub=" · mes "+(1+Math.floor((y-yr)*12+.00001));
  rows.push({id:"group-"+key+"-"+zoom,t:a[0].t,y:y,c:c,children:a,groupLabel:yr+sub,count:a.length});
 });
 return rows.sort(function(a,b){return sy(a)-sy(b)});
}
function niceStep(n){
 var p=Math.pow(10,Math.floor(Math.log10(Math.max(n,.000001))));
 for(var choice of [1,2,2.5,5,10])if(choice*p>=n)return choice*p;
 return p*10;
}

/* The column view is independent of the geometric chronology: within
   each category, entries sort strictly by their starting year. */

/* Atlas territorial: los códigos ISO representan países actuales y NO
   constituyen atribuciones de soberanía o fronteras en épocas pasadas. */
function populateCountrySelect(){
 countryNames=new Map();
 if(worldGeo&&Array.isArray(worldGeo.features)){
  worldGeo.features.forEach(function(f){
   var code=String(f.id||"");
   if(/^[A-Z]{3}$/.test(code))countryNames.set(code,String(f.properties&&f.properties.name||code));
  });
 }
 Object.keys(countryLinks).forEach(function(id){
  var codes=countryLinks[id]&&countryLinks[id].p||[];
  codes.forEach(function(code){
   if(/^[A-Z]{3}$/.test(code)&&!countryNames.has(code))countryNames.set(code,code);
  });
 });
 var sel=$("country");sel.replaceChildren();
 [["Todos","Todos los países"],["Sin clasificar","Sin país clasificado"]].forEach(function(pair){
  var o=el("option",pair[1]);o.value=pair[0];sel.append(o);
 });
 Array.from(countryNames).sort(function(a,b){return a[1].localeCompare(b[1],"es")}).forEach(function(pair){
  var o=el("option",pair[1]);o.value=pair[0];sel.append(o);
 });
 sel.value=country;
}
function chooseCountry(code){
 if(code!=="Todos"&&code!=="Sin clasificar"&&!countryNames.has(code))return;
 country=code;
 $("country").value=code;
 // A country can be affiliated with more than one continent; avoid contradictory filters.
 if(continent!=="Todos"){continent="Todos";$("continent").value="Todos"}
 mapListLimit=60;
 var focus=viewMode==="timeline"?yearAt($("viewport").scrollLeft+$("viewport").clientWidth/2):savedYear;
 render();
 if(country!=="Todos"){
  var records=visible();
  if(records.length){
   var nearest=records.reduce(function(best,d){
    return Math.abs(sy(d)-focus)<Math.abs(sy(best)-focus)?d:best;
   });
   savedYear=sy(nearest);
   if(viewMode==="timeline")jumpToYear(savedYear);
  }
 }
}
function initCountryControls(){
 $("country").addEventListener("change",function(e){chooseCountry(e.target.value)});
 var checkbox=$("map-year-toggle"),slider=$("map-year-range"),number=$("map-year-number");
 function yearChanged(value,fromSlider){
  var n=Math.max(fromSlider?-3000:-541000000,Math.min(2026,Math.round(Number(value))));
  if(!Number.isFinite(n))return;
  mapYear=n;slider.value=String(Math.max(-3000,n));number.value=String(n);
  if(mapYearActive)render();
 }
 checkbox.addEventListener("change",function(e){
  mapYearActive=!!e.target.checked;slider.disabled=!mapYearActive;number.disabled=!mapYearActive;
  render();
 });
 slider.addEventListener("input",function(e){yearChanged(e.target.value,true)});
 number.addEventListener("change",function(e){yearChanged(e.target.value,false)});
 $("map-year-reset").addEventListener("click",function(){
  checkbox.checked=false;mapYearActive=false;slider.disabled=true;number.disabled=true;
  render();
 });
 $("map-load-more").addEventListener("click",function(){mapListLimit+=60;render()});
}
function mapAtYear(d,year){
 var start=sy(d);
 return duration(d)?start<=year&&ey(d)>=year:Math.floor(start)===year;
}
function mapCoordsToD(geometry){
 if(!geometry||!["Polygon","MultiPolygon"].includes(geometry.type))return "";
 var polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates;
 var sections=[];
 polygons.forEach(function(rings){
  rings.forEach(function(points){
   if(!Array.isArray(points)||points.length<3)return;
   var part="",last=null;
   points.forEach(function(p,i){
    var lon=Number(p[0]),lat=Number(p[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat))return;
    lon=Math.min(180,Math.max(-180,lon));
    lat=Math.min(88,Math.max(-88,lat));
    var x=(lon+180)/360*1000,y=(88-lat)/176*520;
    var point=x.toFixed(1)+","+y.toFixed(1);
    if(i===0||last!==null&&Math.abs(lon-last)>180){
     if(part)part+="Z";
     part+="M"+point;
    }else part+="L"+point;
    last=lon;
   });
   if(part)sections.push(part+"Z");
  });
 });
 return sections.join("");
}
function buildWorldMap(){
 if(worldShapesBuilt)return;
 var svg=$("world-map-svg"),status=$("world-map-loading");
 svg.replaceChildren();worldPaths=new Map();
 var features=worldGeo&&worldGeo.features||[];
 if(!features.length){
  status.textContent="No se ha podido cargar la cartografía. Puedes seguir usando el selector de países.";
  return;
 }
 features.forEach(function(f){
  if(!f||!/^[A-Z]{3}$/.test(f.id))return;
  var d=mapCoordsToD(f.geometry);if(!d)return;
  var code=f.id,path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d",d);path.setAttribute("class","map-country");
  path.setAttribute("role","button");path.setAttribute("tabindex","0");
  path.setAttribute("aria-label","Seleccionar "+countryName(code));
  path.setAttribute("data-country",code);
  var label=document.createElementNS("http://www.w3.org/2000/svg","title");
  label.textContent=countryName(code);
  path.appendChild(label);
  path.addEventListener("click",function(){chooseCountry(code)});
  path.addEventListener("keydown",function(e){
   if(e.key==="Enter"||e.key===" "){e.preventDefault();chooseCountry(code)}
  });
  svg.appendChild(path);worldPaths.set(code,{path:path,label:label});
 });
 status.textContent="";status.style.display="none";worldShapesBuilt=true;
}
function mapCandidateRecords(){
 return base.concat(custom).filter(function(d){
  enrich(d);
  return (cat==="Todas"||cat===d.c)&&(!query||(d.t+" "+(d.d||"")).toLocaleLowerCase("es").includes(query))&&matchesContinent(d);
 }).filter(function(d){return !mapYearActive||mapAtYear(d,mapYear)});
}
function colorMapCountries(){
 buildWorldMap();
 var candidates=mapCandidateRecords(),counts=new Map();
 candidates.forEach(function(d){
  countriesOf(d).forEach(function(code){counts.set(code,(counts.get(code)||0)+1)});
 });
 worldPaths.forEach(function(obj,code){
  var n=counts.get(code)||0;
  var active=country===code;
  var classes="map-country"+(n?" map-has-data":"")+(n>=10?" map-more-data":"")+
   (!n?" map-muted":"")+(active?" map-selected":"");
  obj.path.setAttribute("class",classes);
  obj.label.textContent=countryName(code)+" · "+n+" referencias"+(active?" · seleccionado":"");
  obj.path.setAttribute("aria-label",obj.label.textContent);
 });
 var linked=base.concat(custom).filter(function(d){return countriesOf(d).length>0}).length;
 $("map-coverage").textContent=linked+" registros vinculados · "+(base.length+custom.length-linked)+" por clasificar";
}
function renderMap(records){
 colorMapCountries();
 var name=country==="Todos"?"Todos los países":country==="Sin clasificar"?"Sin país clasificado":countryName(country);
 $("map-country-name").textContent=name;
 var matches=records.filter(function(d){return !mapYearActive||mapAtYear(d,mapYear)});
 matches.sort(function(a,b){return sy(a)-sy(b)||String(a.t).localeCompare(String(b.t),"es")});
 $("map-year-label").textContent=mapYearActive?yearText(mapYear):"Todos los años";
 $("map-result-count").textContent=matches.length.toLocaleString("es-ES");
 var countAll=records.length;
 $("map-country-count").textContent=mapYearActive?
   matches.length+" registros vinculados activos o fechados en "+yearText(mapYear):
   countAll+" registros vinculados, ordenados del más antiguo al más reciente";
 var list=$("map-results");list.replaceChildren();
 if(!matches.length){
  var empty=country==="Sin clasificar"?
   "No hay registros sin país con estos filtros.":
   "No hay registros vinculados para este país y los filtros seleccionados. Puedes cambiar el año, la categoría o seleccionar otro país.";
  list.append(el("p",empty,"map-empty"));
 }
 matches.slice(0,mapListLimit).forEach(function(d){
  var card=el("div",null,"map-result-card");
  var detailButton=el("button",null,"map-result-detail");
  detailButton.type="button";
  var date=yearText(sy(d))+(duration(d)?" — "+(d._ongoing?"actualidad":yearText(ey(d))):"");
  detailButton.append(el("span",date,"map-result-year"),el("span",displayName(d),"map-result-title"));
  var codes=countriesOf(d);
  var meta=d.c+" · "+(codes.length?codes.map(countryName).join(" · "):"Sin país clasificado");
  detailButton.append(el("span",meta,"map-result-meta"));
  detailButton.setAttribute("aria-label","Abrir ficha: "+displayName(d)+" · "+date);
  detailButton.addEventListener("click",function(){detail(d)});
  var actions=el("div",null,"map-result-actions");
  var jump=el("button","Ver en línea temporal ↗","map-jump-link");
  jump.type="button";
  jump.addEventListener("click",function(){
   savedYear=sy(d);setView("timeline");jumpToYear(sy(d));
  });
  actions.append(jump);card.append(detailButton,actions);list.append(card);
 });
 var more=$("map-load-more");more.classList.toggle("hide",matches.length<=mapListLimit);
 if(matches.length>mapListLimit)more.textContent="Mostrar 60 más · "+(matches.length-mapListLimit)+" pendientes";
}
function appendCountriesInNote(root,d){
 var codes=countriesOf(d);
 if(!codes.length)return;
 var section=el("div",null,"country-note-references");
 section.append(el("span","Países o territorios vinculados · "+countryBasis(d),"country-note-basis"));
 var chips=el("div",null,"country-note-chips");
 codes.forEach(function(code){
  var button=el("button",countryName(code),"country-note-chip");
  button.type="button";
  button.addEventListener("click",function(){chooseCountry(code);setView("map")});
  chips.append(button);
 });
 section.append(chips);root.append(section);
}

function renderColumns(records){
 var grid=$("columns-grid");grid.replaceChildren();
 var count=0,shownCats=cat==="Todas"?cats:[cat];
 shownCats.forEach(function(category){
  var index=cats.indexOf(category);
  var entries=records.filter(function(d){return d.c===category})
   .sort(function(a,b){return sy(a)-sy(b)||String(a.t).localeCompare(String(b.t),"es")});
  var column=el("section",null,"history-column");column.style.setProperty("--col-accent",colors[index]||"#e5b768");
  var head=el("div",null,"history-column-head");
  head.append(el("span",category),el("span",entries.length.toLocaleString("es-ES"),"history-column-count"));
  column.append(head);
  var list=el("div",null,"history-column-items");
  if(!entries.length)list.append(el("p","Sin registros para esta categoría y los filtros aplicados.","history-column-empty"));
  entries.forEach(function(d){
   var item=el("button",null,"history-column-item");item.type="button";
   var label=displayName(d),start=sy(d);
   item.append(el("span",yearText(start),"column-year"),el("span",label,"column-title"));
   if(duration(d)){
    var time=el("span","Fin: "+(d._ongoing?"actualidad":yearText(ey(d)))+" · "+howLong(d),"column-duration");
    item.append(time);
   }
   item.setAttribute("aria-label",label+" · "+yearText(start));
   item.addEventListener("click",function(){detail(d)});
   list.append(item);
  });
  column.append(list);grid.append(column);count+=entries.length;
 });
 $("columns-summary").textContent=count.toLocaleString("es-ES")+" registros · "+shownCats.length+" columnas · de más antiguo a más reciente";
}
function setTimelineMaximized(on){
 var panel=$("timeline-panel"),button=$("toggle-fullscreen");
 panel.classList.toggle("is-maximized",on);
 document.body.classList.toggle("historia-fullscreen",on);
 button.setAttribute("aria-pressed",on?"true":"false");
 button.textContent=on?"⤢ Salir de pantalla completa":"⛶ Pantalla completa";
 button.title=on?"Volver a la vista normal":"Ampliar la cronología a la ventana completa";
 if(on){
  if(document.documentElement&&typeof document.documentElement.requestFullscreen==="function"&&!document.fullscreenElement){
   try{
    Promise.resolve(document.documentElement.requestFullscreen()).catch(function(){nativeFullscreen=false});
   }catch(e){nativeFullscreen=false}
  }
 }else if(document.fullscreenElement&&typeof document.exitFullscreen==="function"){
  Promise.resolve(document.exitFullscreen()).catch(function(){});
 }
}
function setView(next){
 if(next!=="columns"&&next!=="timeline"&&next!=="map")return;
 if(viewMode===next)return;
 if(viewMode==="timeline"){
  var vp=$("viewport");
  if(vp.clientWidth)savedYear=yearAt(vp.scrollLeft+vp.clientWidth/2);
  if($("timeline-panel").classList.contains("is-maximized"))setTimelineMaximized(false);
 }
 viewMode=next;
 // Keep one shared toolbar: its filter buttons and listeners travel with it.
 // In columns mode the same controls remain available above the category columns.
 var toolbar=$("history-toolbar");
 var destination=next==="columns"?$("columns-panel"):next==="map"?$("map-panel"):$("timeline-panel");
 var before=next==="columns"?$("columns-grid"):next==="map"?$("world-map-layout"):$("viewport");
 if(toolbar.parentNode!==destination)destination.insertBefore(toolbar,before);
 $("timeline-panel").classList.toggle("hide",next!=="timeline");
 $("columns-panel").classList.toggle("hide",next!=="columns");
 $("map-panel").classList.toggle("hide",next!=="map");
 [["tab-timeline","timeline"],["tab-columns","columns"],["tab-map","map"]].forEach(function(pair){
  var tab=$(pair[0]),active=pair[1]===next;
  tab.classList.toggle("active",active);
  tab.setAttribute("aria-selected",active?"true":"false");
  tab.tabIndex=active?0:-1;
 });
 render();
 if(next==="timeline")jumpToYear(savedYear);
}

/* Every annual mark is real and exact; only the visible tick labels are
   mounted to keep the 500k-pixel continuous canvas responsive. */

/* Compact overview navigation. Its six segments deliberately have equal width:
   time scales differ by epoch, so a uniformly linear miniature would make
   all of human history invisible. Mapping is strictly monotonic and invertible. */
var miniDensityVersion=-1,miniDragging=false;
function miniClamp(n,min,max){return Math.min(max,Math.max(min,n))}
function miniRatio(year){
 var n=Number(year);
 for(var i=0;i<periods.length;i++){
  var p=periods[i];
  if(n<p.b||i===periods.length-1)
   return (i+miniClamp((n-p.a)/(p.b-p.a),0,1))/periods.length;
 }
 return 1;
}
function miniYear(ratio){
 var pos=miniClamp(Number(ratio)||0,0,1)*periods.length;
 var i=Math.min(periods.length-1,Math.floor(pos)),p=periods[i];
 return p.a+(pos-i)*(p.b-p.a);
}
function drawMiniEras(){
 var container=$("history-minimap-eras");container.replaceChildren();
 ["Profundo","Prehist.","Antig.","Media","Moderna","Actual"].forEach(function(label,i){
  var era=el("span",label,"history-mini-era");
  era.title=periods[i].k+" · "+yearText(periods[i].a)+" — "+yearText(periods[i].b);
  container.append(era);
 });
}
function drawMiniDensity(){
 var grid=$("history-minimap-density");grid.replaceChildren();
 var source=base.concat(custom),bins=new Array(144).fill(0);
 source.forEach(function(d){
  enrich(d);
  var index=Math.min(bins.length-1,Math.max(0,Math.floor(miniRatio(sy(d))*bins.length)));
  bins[index]++;
 });
 var top=Math.max(1,...bins);
 bins.forEach(function(count,i){
  if(!count)return;
  var bar=el("span",null,"history-mini-density-bin");
  bar.style.left=(i/bins.length*100)+"%";
  bar.style.width=(100/bins.length)+"%";
  bar.style.height=(3+17*Math.sqrt(count/top))+"px";
  grid.append(bar);
 });
 miniDensityVersion=source.length;
}
function updateMinimap(){
 if(viewMode!=="timeline")return;
 var view=$("viewport"),track=$("history-minimap-track");
 if(!track||!view)return;
 if(miniDensityVersion!==base.length+custom.length)drawMiniDensity();
 var w=track.clientWidth||290,vw=view.clientWidth||1400;
 var l=miniRatio(yearAt(view.scrollLeft));
 var r=miniRatio(yearAt(view.scrollLeft+vw));
 var midYear=yearAt(view.scrollLeft+vw/2),mid=miniRatio(midYear);
 var span=Math.max(6,(r-l)*w);
 span=Math.min(w,span);
 var left=miniClamp(mid*w-span/2,0,w-span);
 var windowEl=$("history-minimap-window"),cursor=$("history-minimap-cursor");
 windowEl.style.left=left+"px";windowEl.style.width=span+"px";
 cursor.style.left=miniClamp(mid*w,1,w-1)+"px";
 var era=periods.find(function(p){return midYear>=p.a&&midYear<p.b})||periods[periods.length-1];
 $("history-minimap-now").textContent=era.k+" · "+yearText(midYear);
 track.setAttribute("aria-valuenow",String(Math.round(mid*1000)));
 track.setAttribute("aria-valuetext",era.k+" · "+yearText(midYear));
}
function initMinimap(){
 drawMiniEras();
 var track=$("history-minimap-track");
 function navigate(e){
  var rect=track.getBoundingClientRect();
  var width=rect.width||track.clientWidth||290;
  var ratio=miniClamp((e.clientX-rect.left)/width,0,1);
  jumpToYear(miniYear(ratio));
 }
 track.addEventListener("pointerdown",function(e){
  if(e.button!=null&&e.button!==0)return;
  miniDragging=true;
  if(typeof track.setPointerCapture==="function"){
   try{track.setPointerCapture(e.pointerId)}catch(err){}
  }
  navigate(e);if(typeof e.preventDefault==="function")e.preventDefault();
 });
 track.addEventListener("pointermove",function(e){
  if(!miniDragging)return;
  navigate(e);if(typeof e.preventDefault==="function")e.preventDefault();
 });
 function endDrag(){miniDragging=false}
 track.addEventListener("pointerup",endDrag);
 track.addEventListener("pointercancel",endDrag);
 track.addEventListener("lostpointercapture",endDrag);
 track.addEventListener("keydown",function(e){
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
  var v=$("viewport"),current=miniRatio(yearAt(v.scrollLeft+(v.clientWidth||1400)/2));
  var target=e.key==="Home"?0:e.key==="End"?1:miniClamp(current+(e.key==="ArrowRight"?.01:-.01),0,1);
  jumpToYear(miniYear(target));
  if(typeof e.preventDefault==="function")e.preventDefault();
 });
 updateMinimap();
}

function updateAnnualHeader(){
 if(viewMode!=="timeline"||!yearAxisLayer)return;
 var viewport=$("viewport"),pad=YEAR_PX*zoom*2;
 var left=Math.max(axisX(-3000),viewport.scrollLeft-pad);
 var right=Math.min(axisX(2031),viewport.scrollLeft+(viewport.clientWidth||1400)+pad);
 if(right<left){
  if(yearWindowKey!=="outside"){
   yearAxisLayer.replaceChildren();
   yearGridLayers.forEach(function(layer){layer.replaceChildren()});
   yearWindowKey="outside";
  }
  return;
 }
 var first=Math.max(-3000,Math.floor(yearAt(left))-1);
 var last=Math.min(2031,Math.ceil(yearAt(right))+1);
 var key=first+":"+last+":"+zoom;
 if(key===yearWindowKey)return;
 // Render header ticks and lane guides from the exact SAME x coordinates.
 // CSS repeating gradients over the ~500,000px canvas can drift by several
 // pixels under browser compositing / fractional zoom, so never use them.
 var ticks=[],positions=[];
 for(var year=first;year<=last;year++){
  var x=axisX(year),milestone=year%100===0,decade=year%10===0;
  var tick=el("div",null,"tick year-tick"+(decade?" year-decade":"")+(milestone?" year-century":""));
  tick.style.left=x+"px";
  tick.append(el("span",year===0?"Cambio de era":yearText(year)));
  ticks.push(tick);
  positions.push({x:x,decade:decade,century:milestone});
 }
 yearAxisLayer.replaceChildren(...ticks);
 yearGridLayers.forEach(function(layer){
  var guides=positions.map(function(pos){
   var line=el("span",null,"year-guide"+(pos.decade?" decade-guide":"")+(pos.century?" century-guide":""));
   line.style.left=pos.x+"px";
   line.setAttribute("aria-hidden","true");
   return line;
  });
  layer.replaceChildren(...guides);
 });
 yearWindowKey=key;
}

function render(){
 var records=visible();
 $("total").textContent=(base.length+custom.length).toLocaleString("es-ES");
 $("visible").textContent=records.length.toLocaleString("es-ES");
 if(viewMode==="columns"){renderColumns(records);return;}
 if(viewMode==="map"){renderMap(records);return;}
 var can=$("canvas");can.replaceChildren();
 $("period-name").textContent="Historia universal · eje continuo · "+yearText(periods[0].a)+" — "+yearText(2026);
 $("zoom-level").textContent="Zoom ×"+zoom;$("zoom-out").disabled=zoom<=1;$("zoom-in").disabled=zoom>=8;
 var width=canvasWidth();can.style.width=width+"px";
 var regions=el("div",null,"era-strip"),axis=el("div",null,"ticks");
 periods.forEach(function(p){
  var x=axisX(p.a),w=p.w*zoom;
  var era=el("div",p.k,"era-block");era.style.left=x+"px";era.style.width=w+"px";
  era.append(el("small","escala propia"));regions.append(era);
  // Deep-time and prehistory retain a coarse scale.
  if(p.a< -3000){
   var step=niceStep(175*(p.b-p.a)/w),first=Math.ceil(p.a/step)*step;
   for(var y=first,i=0;y<p.b&&i<200;y+=step,i++){
    var tick=el("div",null,"tick");tick.style.left=axisX(y)+"px";
    tick.append(el("span",yearText(y)));axis.append(tick);
   }
  }
 });
 // Labels are virtualized: a year every 96 px, but only years in the viewport
 // are attached to the DOM. Avoid rendering 5,032 labels at every zoom/filter change.
 yearAxisLayer=el("div",null,"year-label-layer");
 yearAxisLayer.style.width=width+"px";
 yearGridLayers=[];
 yearWindowKey="";
 axis.append(yearAxisLayer);
 can.append(regions,axis);
 var count=0;
 cats.forEach(function(c,i){
  if(cat!=="Todas"&&cat!==c)return;
  var items=records.filter(function(d){return d.c===c}).sort(function(a,b){return sy(a)-sy(b)});
  if(!items.length&&cat==="Todas")return;
  var list=grouped(items,c),lane=el("div",null,"lane");
  lane.style.setProperty("--lane-color",colors[i]);
  var yearGrid=el("div",null,"year-guide-layer");
  yearGrid.setAttribute("aria-hidden","true");
  yearGridLayers.push(yearGrid);
  lane.append(yearGrid);
  periods.slice(1).forEach(function(p){
   var guide=el("span",null,"era-guide");guide.style.left=axisX(p.a)+"px";lane.append(guide);
  });
  var lname=el("span",null,"lane-name"),swatch=el("i");
  lname.append(swatch,document.createTextNode(c+" · "+items.length));lane.append(lname);
  var ends=[];
  list.forEach(function(d){
   var start=sy(d),x=axisX(start),dur=duration(d);
   // The duration IS the card. Do not stretch the timeline endpoint to fit text.
   // Long intervals have a sticky inline caption constrained by the end of their bar.
   var full=dur?Math.max(0,axisX(ey(d))-x):0;
   var w=dur?Math.max(12,full):245;
   w=Math.max(12,Math.min(w,width-x-8));
   var row=0;
   while(row<ends.length&&ends[row]>x-10)row++;
   ends[row]=x+w+12;
   var top=42+row*54,b=el("button",null,"event"+(dur?" duration timeline-span":""));
   b.type="button";b.style.setProperty("--item",colors[i]);b.style.left=x+"px";b.style.top=top+"px";b.style.width=w+"px";
   var t=d.children?d.t:displayName(d),date=dur?yearText(start)+" — "+(d._ongoing?"actualidad":yearText(ey(d)))+" · "+howLong(d):d.groupLabel||yearText(start);
   if(dur){
    var inlineLabel=el("span",null,"duration-label");
    inlineLabel.append(el("span",t,"event-name"),el("span",date,"event-years"));
    b.append(inlineLabel);
    if(w<275)b.classList.add("short-interval");
   }else{
    b.append(el("span",t,"event-name"),el("span",date,"event-years"));
    if(d.count)b.append(el("span","+"+(d.count-1),"event-count"));
   }
   b.title=t+" · "+date;b.setAttribute("aria-label",b.title);
   if(selected&&(selected.id===d.id||(d.children&&d.children.some(function(z){return z.id===selected.id}))))b.classList.add("selected");
   b.addEventListener("click",function(){
    if(d.children)groupedDetail(d);else detail(d);
    can.querySelectorAll(".selected").forEach(function(z){z.classList.remove("selected")});b.classList.add("selected");
   });
   lane.append(b);
  });
  if(!items.length)lane.append(el("span","Sin registros","empty-lane"));
  lane.style.height=Math.max(96,100+ends.length*54)+"px";
  can.append(lane);count++;
 });
 can.style.minHeight=(78+count*96)+"px";
 updateAnnualHeader();
 updateMinimap();
}
function jumpToYear(year){
 var v=$("viewport");v.scrollLeft=axisX(year)-v.clientWidth/2;
 updateAnnualHeader();
 updateMinimap();
 var next=eraAt(year);if(period.k!==next.k){period=next;periodUI()}
}
function setZoom(next){
 var v=$("viewport"),y=yearAt(v.scrollLeft+v.clientWidth/2);
 zoom=Math.max(1,Math.min(8,next));render();jumpToYear(y);
}
function init(){
 periodUI();categoryUI();initMinimap();initCountryControls();
 $("periods").addEventListener("change",function(e){
  var next=periods.find(function(p){return p.k===e.target.value});
  if(!next)return;
  period=next;periodUI();savedYear=next.at;
  if(viewMode==="timeline")jumpToYear(next.at);
  else if(viewMode==="map"){
   mapYearActive=true;mapYear=Math.round(next.at);
   $("map-year-toggle").checked=true;
   $("map-year-range").disabled=false;$("map-year-number").disabled=false;
   $("map-year-range").value=String(Math.max(-3000,mapYear));
   $("map-year-number").value=String(mapYear);
   render();
  }
 });
 $("filters").addEventListener("change",function(e){
  if(e.target.value!=="Todas"&&!cats.includes(e.target.value))return;
  cat=e.target.value;categoryUI();render();
  if(cat==="Historia bíblica"||cat==="Eras geológicas"){
   savedYear=cat==="Eras geológicas"?-400000000:-1700;
   if(viewMode==="timeline")jumpToYear(savedYear);
  }
 });
 $("continent").addEventListener("change",function(e){
  continent=e.target.value;
  if(!["Todos","Sin localizar"].concat(GEO).includes(continent))continent="Todos";
  var focus=viewMode!=="timeline"?savedYear:yearAt($("viewport").scrollLeft+$("viewport").clientWidth/2);
  render();
  if(continent!=="Todos"){
   var choices=visible();
   if(choices.length){
    var nearest=choices.reduce(function(best,d){return Math.abs(sy(d)-focus)<Math.abs(sy(best)-focus)?d:best});
    if(viewMode!=="timeline")savedYear=sy(nearest);else jumpToYear(sy(nearest));
   }
  }
 });$("categories").textContent=cats.length;
 $("note-close").addEventListener("click",closeNote);
 // Non-modal side panel: clicks on the timeline are not intercepted.
 document.addEventListener("keydown",function(e){
  if(e.key!=="Escape")return;
  if(!$("note-layer").classList.contains("hide"))closeNote();
  else if($("timeline-panel").classList.contains("is-maximized"))setTimelineMaximized(false);
 });
 document.addEventListener("fullscreenchange",function(){
  updateAnnualHeader();
  if(document.fullscreenElement){nativeFullscreen=true}
  else if(nativeFullscreen){
   nativeFullscreen=false;
   if($("timeline-panel").classList.contains("is-maximized"))setTimelineMaximized(false);
  }
 });
 $("toggle-fullscreen").addEventListener("click",function(){
  setTimelineMaximized(!$("timeline-panel").classList.contains("is-maximized"));
  updateAnnualHeader();updateMinimap();
 });
 $("tab-timeline").addEventListener("click",function(){setView("timeline")});
 $("tab-columns").addEventListener("click",function(){setView("columns")});
 $("tab-map").addEventListener("click",function(){setView("map")});
 $("zoom-in").addEventListener("click",function(){setZoom(zoom*2)});
 $("zoom-out").addEventListener("click",function(){setZoom(zoom/2)});
 $("jump-present").addEventListener("click",function(){jumpToYear(2000)});
 function jumpFromInput(){
  var value=$("jump-year").value,year=Number(value);
  if(value===""||!Number.isInteger(year)||year<periods[0].a||year>2031){
   alert("Introduce un año válido entre "+periods[0].a+" y 2031 (negativo para a. C.).");
   return;
  }
  if(year===0){jumpToYear(0);return}
  if(viewMode!=="timeline")setView("timeline");
  jumpToYear(year);
 }
 $("jump-year-go").addEventListener("click",jumpFromInput);
 $("jump-year").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();jumpFromInput()}});

 var vdrag=$("viewport"),dragging=false,downX=0,downScroll=0;
 vdrag.addEventListener("pointerdown",function(e){
  if(e.pointerType!=="mouse"||e.button!==0||e.target.closest("button"))return;
  dragging=true;downX=e.clientX;downScroll=vdrag.scrollLeft;
  if(vdrag.setPointerCapture)vdrag.setPointerCapture(e.pointerId);
 });
 vdrag.addEventListener("pointermove",function(e){if(!dragging)return;vdrag.scrollLeft=downScroll-(e.clientX-downX);e.preventDefault()});
 vdrag.addEventListener("pointerup",function(){dragging=false});
 vdrag.addEventListener("pointercancel",function(){dragging=false});
 if(typeof window!=="undefined")window.addEventListener("resize",function(){updateAnnualHeader();updateMinimap()});
 $("viewport").addEventListener("scroll",function(){
  updateAnnualHeader();updateMinimap();
  var v=$("viewport"),p=eraAt(yearAt(v.scrollLeft+v.clientWidth/2));
  if(p.k!==period.k){period=p;periodUI()}
 });
 // Previous local entries remain readable; removing UI never destroys user data.
 custom=loadLocal();
 // Historia original + catálogo contrastado de estudios de La Telaraña.
 // El segundo archivo es opcional; cualquier fallo conserva los registros base.
 function readJSON(path){
  return fetch(path,{cache:"no-cache"}).then(function(response){
   if(!response.ok)throw Error("No disponible: "+path);
   return response.json();
  });
 }
 Promise.all([readJSON("./data.json"),
  readJSON("./estudios-telarana.json").catch(function(){return{items:[]}}),
  readJSON("./country-links.json").catch(function(){return{links:{}}}),
  readJSON("./world-110m.json").catch(function(){return{features:[]}})
 ]).then(function(results){
  var linkDoc=results[2]&&results[2].links||{};
  countryLinks=Object.create(null);
  Object.keys(linkDoc).forEach(function(k){var v=linkDoc[k];if(v&&Array.isArray(v.p)&&v.p.length<=40)countryLinks[k]=v});
  worldGeo=results[3]&&Array.isArray(results[3].features)?results[3]:{features:[]};
  populateCountrySelect();
  var historical=Array.isArray(results[0].items)?results[0].items.filter(valid):[];
  var additional=Array.isArray(results[1].items)?results[1].items:[];
  var seenIds=new Set(historical.map(function(d){return d.id}));
  function keyFor(d){
   return String(d.t||"").toLocaleLowerCase("es").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()+
    "|"+Math.floor(Number(d.y));
  }
  var seenEvents=new Set(historical.map(keyFor));
  var studyAliases=new Map();
  additional.forEach(function(d){
   if(!validStudy(d)||seenIds.has(d.id))return;
   var canonical=studyCanonicalIds[d.id];
   if(canonical&&seenIds.has(canonical)){
    var index=historical.findIndex(function(item){return item.id===canonical});
    historical[index]=mergeCanonicalStudy(historical[index],d);
    studyAliases.set(d.id,canonical);return;
   }
   var key=keyFor(d);
   if(seenEvents.has(key))return;
   historical.push(d);seenIds.add(d.id);seenEvents.add(key);
  });
  base=historical;
  worldShapesBuilt=false;
  var requested=null;
  try{requested=new URLSearchParams(location.search).get("evento")}catch(e){}
  var event=requested&&base.find(function(d){return d.id===(studyAliases.get(requested)||requested)});
  if(event){
   period=eraAt(sy(event));periodUI();render();
   jumpToYear(sy(event));detail(event);
  }else{render();jumpToYear(1900)}
 }).catch(function(){
  render();$("period-name").textContent="No se pudo cargar el archivo histórico";
 });
 $("search").addEventListener("input",function(e){query=e.target.value.toLocaleLowerCase("es").trim();render()});

}
init();
})();
