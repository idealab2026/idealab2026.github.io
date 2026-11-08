(function(){
"use strict";
var periods=[
{k:"Tiempo profundo",a:-260000000,b:-110000,w:2600,at:-230000000},
{k:"Prehistoria",a:-110000,b:-3000,w:3000,at:-9000},
{k:"Antigüedad",a:-3000,b:476,w:3800,at:-400},
{k:"Edad media",a:476,b:1492,w:3800,at:1000},
{k:"Edad moderna",a:1492,b:1789,w:3600,at:1600},
{k:"Contemporánea",a:1789,b:2031,w:6100,at:1925}
];

/* Geographic links are inferred solely from explicit place references.
   Unknown locations remain unclassified; users may override with g: []. */
var GEO=["Europa","Asia","África","América","Oceanía","Antártida","Mundial"];
var continent="Todos",YEAR_PX=96,yearAxisLayer=null,yearGridLayers=[],yearWindowKey="";
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

var cats=["Acontecimientos","Personajes","Historia bíblica","Filosofía","Pontífices","Actualidad","Cine","Literatura"];
var colors=["#65bdc2","#c68dcb","#bd9ce0","#e6a06b","#8ba7ea","#9cce9b","#f0c96f","#f29ca4"];
var base=[],custom=[],period=periods[5],cat="Todas",query="",selected=null,zoom=1,viewMode="timeline",savedYear=1900,nativeFullscreen=false;
var el=function(tag,t,cls){var x=document.createElement(tag);if(t!=null)x.textContent=t;if(cls)x.className=cls;return x};
var $=function(id){return document.getElementById(id)};
function yearText(y){
 var n=Math.abs(y);
 if(n>=1000000)return "hace aprox. "+(n/1000000).toLocaleString("es-ES",{maximumFractionDigits:1})+" millones de años";
 return y<0?Math.round(n).toLocaleString("es-ES")+" a. C.":String(Math.floor(y))+" d. C.";
}
var dateRe=/\b(\d{2,4})\s*((?:a|d)\.?\s*c\.?)?\s*[-–—]\s*(\d{2,4})\s*((?:a|d)\.?\s*c\.?)?/i;
function valid(d){
 return d&&typeof d.t==="string"&&d.t.length<=500&&
 (d.g==null||(Array.isArray(d.g)&&d.g.length<=GEO.length&&d.g.every(function(v){return GEO.includes(v)})))&&
 Number.isFinite(Number(d.y))&&
 Math.abs(Number(d.y))<=260000000&&cats.includes(d.c)&&
 (d.e==null||d.e===""||(Number.isFinite(Number(d.e))&&Number(d.e)>=Number(d.y)&&Number(d.e)<=2031));
}
function loadLocal(){
 try{var raw=JSON.parse(localStorage.getItem("idealab-historia-v1")||"[]");
 return Array.isArray(raw)?raw.filter(valid):[]}catch(e){return[]}
}
function enrich(d){
 if(d._computed)return d;
 var start=Number(d.y),end=d.e==null?NaN:Number(d.e),origin="explicit",ongoing=false;
 if(!Number.isFinite(end)||end<=start){
  origin="";
  var txt=(d.c==="Filosofía"||d.c==="Literatura")?(d.d||"").split("·")[0]:(d.t||"");
  if(d.c==="Cine"&&!/^[^()]+\(\s*\d{3,4}\s*[-–—]\s*\d{3,4}\s*\)\s*$/.test(txt))txt="";
  var match=dateRe.exec(txt),bc=/a\.?\s*c\.?/i,ad=/d\.?\s*c\.?/i;
  if(match){
   var a=+match[1],b=+match[3],am=match[2]||"",bm=match[4]||"",anyBC=bc.test(am)||bc.test(bm);
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
 return n<1?Math.max(1,Math.round(n*12))+" meses":(Math.round(n*10)/10).toLocaleString("es-ES")+(Math.abs(n-1)<.001?" año":" años");
}
function displayName(d){
 if(!duration(d))return d.t;
 var m=dateRe.exec(d.t);
 if(m&&m.index>2&&/^\s*(?:\(\s*\d+\s*años?\s*\))?\s*$/i.test(d.t.slice(m.index+m[0].length)))return d.t.slice(0,m.index).trim();
 return d.t;
}
function visible(){
 var all=base.concat(custom).filter(function(d){
  enrich(d);
  return (cat==="Todas"||d.c===cat)&&(!query||(d.t+" "+(d.d||"")).toLocaleLowerCase("es").includes(query));
 });
 var result=all.filter(matchesContinent);geoStatus(all,result);return result;
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
var wikiAliases={
 "ww i":"Primera Guerra Mundial","ww ii":"Segunda Guerra Mundial",
 "eeuu":"Estados Unidos","urs s":"Unión Soviética","urss":"Unión Soviética",
 "imperio romano":"Imperio romano","imperio britanico":"Imperio británico",
 "imperio otomano":"Imperio otomano","guerra del rif":"Guerra del Rif"
};
function wikiPlain(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function wikipediaSearchName(d){
 var raw=String(displayName(d)||d.t||"").trim();
 // Strip Excel chronology suffixes, which do not belong to article titles.
 raw=raw.replace(/\s*\(\s*\d{3,4}\s*[-–—]\s*(?:\d{2,4}|ACT)\s*\)\s*$/i,"");
 raw=raw.replace(/\s+\b\d{1,4}\s*(?:a\.?\s*c\.?|d\.?\s*c\.?)?\s*[-–—]\s*(?:\d{1,4}\s*(?:a\.?\s*c\.?|d\.?\s*c\.?)?|ACT|actualidad)\s*$/i,"");
 raw=raw.replace(/\s*\(\s*\d{3,4}\s*\)\s*[-–—]\s*.+$/i,"");
 raw=raw.replace(/\s*\(\s*\d{3,4}\s*\)\s*$/i,"");
 raw=raw.trim().replace(/\s+[-–—]\s*$/,"");
 var canonical=wikiPlain(raw);
 if(wikiAliases[canonical])return wikiAliases[canonical];
 return raw||d.t;
}
function wikiSearchURL(term){return "https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(term)}
function wikiArticleURL(title){return "https://es.wikipedia.org/wiki/"+encodeURIComponent(String(title).replace(/ /g,"_"))}
function wikiExternalLink(parent,href,label,cls){
 var a=el("a",label,cls||"note-wiki");
 a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";parent.append(a);return a;
}
function wikiAPI(params,signal){
 var uri=new URL("https://es.wikipedia.org/w/api.php");
 uri.searchParams.set("format","json");uri.searchParams.set("formatversion","2");
 uri.searchParams.set("origin","*");
 Object.keys(params).forEach(function(k){uri.searchParams.set(k,String(params[k]))});
 return fetch(uri.toString(),{signal:signal,credentials:"omit"}).then(function(r){
  if(!r.ok)throw Error("Wikipedia ha respondido con "+r.status);
  return r.json();
 });
}
function wikiMatchTitle(d,result,query){
 var target=wikiPlain(query);
 if(!target||!Array.isArray(result)||!result.length)return null;
 var perfect=result.find(function(x){return wikiPlain(x.title)===target});
 if(perfect)return perfect.title;
 if(d.c==="Cine"||d.c==="Literatura"){
  var related=result.find(function(x){return wikiPlain(x.title).startsWith(target+" ")&&/\(/.test(x.title)});
  if(related&&target.split(" ").length===1)return related.title;
 }
 var q=target.split(" ").filter(function(x){return x.length>2});
 if(!q.length)return null;
 var best=null,score=0;
 result.forEach(function(item){
  var title=wikiPlain(item.title),words=title.split(" ");
  var matched=q.filter(function(w){return words.includes(w)}).length;
  var coverage=matched/q.length,precision=matched/Math.max(q.length,words.length);
  var strength=coverage*.75+precision*.25;
  if(strength>score){score=strength;best=item}
 });
 return score>=.76&&q.length>=2?best.title:null;
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
function wikiRenderArticle(d,root,page){
 root.replaceChildren();
 $("note-kicker").textContent=d.c+" · Wikipedia";
 $("note-title").textContent=String(page.title||wikipediaSearchName(d));
 root.append(el("div",wikiDateLine(d),"note-date"));
 var figure=page.thumbnail&&page.thumbnail.source;
 if(typeof figure==="string"&&/^https:\/\/upload\.wikimedia\.org\//i.test(figure)){
  var photo=el("img",null,"wiki-lead-image");
  photo.src=figure;photo.alt="Imagen del artículo "+page.title;photo.loading="lazy";
  photo.referrerPolicy="no-referrer";
  photo.onerror=function(){photo.remove()};
  root.append(photo);
  if(typeof page.pageimage==="string"&&page.pageimage.length<300){
   var credit=el("p",null,"wiki-image-credit");
   wikiExternalLink(credit,"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(page.pageimage.replace(/ /g,"_")),"Autoría y licencia de la imagen ↗","wiki-credit-link");
   root.append(credit);
  }
 }
 var text=el("article",null,"wiki-article");
 wikiAppendText(text,page.extract);
 root.append(text);
 var actualURL=wikiArticleURL(page.title);
 var links=el("div",null,"wiki-actions");
 wikiExternalLink(links,actualURL,"Abrir artículo original ↗");
 root.append(links);
 wikiFooter(root,page.title);
 if(d.isTraditional)root.append(el("p","Las fechas bíblicas de la cronología proceden del archivo original y no constituyen dataciones históricas demostradas.","note-warning"));
}
function wikiFallback(d,root,term,reason){
 if($("note-layer").classList.contains("hide"))return;
 $("note-kicker").textContent=d.c+" · Wikipedia";
 $("note-title").textContent=displayName(d);
 root.replaceChildren();
 root.append(el("div",wikiDateLine(d),"note-date"));
 root.append(el("p",reason||"No se ha encontrado un artículo de Wikipedia suficientemente coincidente con este registro.","wiki-error"));
 if(d.d)root.append(el("p","Nota original: "+d.d,"source-note"));
 wikiExternalLink(root,wikiSearchURL(term),"Buscar este registro en Wikipedia ↗");
}
async function wikiLoadArticle(d,root,term,requestId,signal){
 var cacheKey=d.w||term;
 try{
  var page=wikiCache.get(cacheKey);
  if(!page){
   var title=null;
   if(typeof d.w==="string"&&/^https:\/\/es\.wikipedia\.org\/wiki\/[^?# ]+$/i.test(d.w)){
    title=decodeURIComponent(d.w.split("/wiki/")[1]).replace(/_/g," ");
   }else{
    var results=await wikiAPI({action:"query",list:"search",srsearch:term,srnamespace:0,srlimit:6,srprop:"",utf8:1},signal);
    title=wikiMatchTitle(d,results.query&&results.query.search,term);
   }
   if(!title)throw Error("No se ha encontrado una coincidencia fiable. Para evitar atribuir un artículo incorrecto, utiliza la búsqueda en Wikipedia.");
   var details=await wikiAPI({action:"query",prop:"extracts|pageimages",titles:title,redirects:1,explaintext:1,exsectionformat:"wiki",piprop:"thumbnail|name",pithumbsize:600},signal);
   page=details.query&&details.query.pages&&details.query.pages[0];
   if(!page||page.missing||!page.extract||!String(page.extract).trim())throw Error("No hay texto disponible de este artículo mediante la API de Wikipedia.");
   if(wikiCache.size>=50)wikiCache.delete(wikiCache.keys().next().value);
   wikiCache.set(cacheKey,page);
  }
  if(requestId!==wikiRequestVersion||$("note-layer").classList.contains("hide"))return;
  wikiRenderArticle(d,root,page);
 }catch(err){
  if(requestId!==wikiRequestVersion||err.name==="AbortError")return;
  wikiFallback(d,root,term,"No se ha podido mostrar el artículo: "+err.message);
 }
}
function showNote(d){
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
 if(next!=="columns"&&next!=="timeline")return;
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
 var destination=next==="columns"?$("columns-panel"):$("timeline-panel");
 var before=next==="columns"?$("columns-grid"):$("viewport");
 if(toolbar.parentNode!==destination)destination.insertBefore(toolbar,before);
 $("timeline-panel").classList.toggle("hide",next!=="timeline");
 $("columns-panel").classList.toggle("hide",next!=="columns");
 [["tab-timeline","timeline"],["tab-columns","columns"]].forEach(function(pair){
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
}
function jumpToYear(year){
 var v=$("viewport");v.scrollLeft=axisX(year)-v.clientWidth/2;
 updateAnnualHeader();
 var next=eraAt(year);if(period.k!==next.k){period=next;periodUI()}
}
function setZoom(next){
 var v=$("viewport"),y=yearAt(v.scrollLeft+v.clientWidth/2);
 zoom=Math.max(1,Math.min(8,next));render();jumpToYear(y);
}
function init(){
 periodUI();categoryUI();
 $("periods").addEventListener("change",function(e){
  var next=periods.find(function(p){return p.k===e.target.value});
  if(!next)return;
  period=next;periodUI();savedYear=next.at;
  if(viewMode==="timeline")jumpToYear(next.at);
 });
 $("filters").addEventListener("change",function(e){
  if(e.target.value!=="Todas"&&!cats.includes(e.target.value))return;
  cat=e.target.value;categoryUI();render();
  if(cat==="Historia bíblica"){
   savedYear=-1700;
   if(viewMode==="timeline")jumpToYear(-1700);
  }
 });
 $("continent").addEventListener("change",function(e){
  continent=e.target.value;
  if(!["Todos","Sin localizar"].concat(GEO).includes(continent))continent="Todos";
  var focus=viewMode==="columns"?savedYear:yearAt($("viewport").scrollLeft+$("viewport").clientWidth/2);
  render();
  if(continent!=="Todos"){
   var choices=visible();
   if(choices.length){
    var nearest=choices.reduce(function(best,d){return Math.abs(sy(d)-focus)<Math.abs(sy(best)-focus)?d:best});
    if(viewMode==="columns")savedYear=sy(nearest);else jumpToYear(sy(nearest));
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
  updateAnnualHeader();
 });
 $("tab-timeline").addEventListener("click",function(){setView("timeline")});
 $("tab-columns").addEventListener("click",function(){setView("columns")});
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
  if(viewMode==="columns")setView("timeline");
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
 if(typeof window!=="undefined")window.addEventListener("resize",updateAnnualHeader);
 $("viewport").addEventListener("scroll",function(){
  updateAnnualHeader();
  var v=$("viewport"),p=eraAt(yearAt(v.scrollLeft+v.clientWidth/2));
  if(p.k!==period.k){period=p;periodUI()}
 });
 // Previous local entries remain readable; removing UI never destroys user data.
 custom=loadLocal();
 fetch("./data.json",{cache:"no-cache"}).then(function(r){
  if(!r.ok)throw Error("Archivo histórico no disponible");return r.json();
 }).then(function(data){
  base=Array.isArray(data.items)?data.items.filter(valid):[];render();jumpToYear(1900);
 }).catch(function(){render();$("period-name").textContent="No se pudo cargar el archivo histórico"});
 $("search").addEventListener("input",function(e){query=e.target.value.toLocaleLowerCase("es").trim();render()});

}
init();
})();