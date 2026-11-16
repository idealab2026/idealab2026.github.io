(function(){
"use strict";
/* Atlas visual independiente: mapas puntuales + importaciones locales de HISTORIA.xlsx.
   Las ventanas temporales sirven para descubrir una lámina; NO son fronteras históricas anuales. */
var api=window.HistoryTimeline;
var context=document.getElementById("history-atlas-context");
var full=document.getElementById("atlas-panel");
if(!api||!context||!full)return;
var state={year:Math.round(api.getYear()),focusId:null,focusName:"",pinned:false,chosen:null,items:[],diagrams:[],inventory:[],loaded:false,fullScreen:false};
var $=function(id){return document.getElementById(id)};
function node(tag,text,className){var e=document.createElement(tag);if(text!=null)e.textContent=text;if(className)e.className=className;return e}
function safeUrl(url,asset){
 if(typeof url!=="string")return"";
 if(asset&&/^\.\/atlas-media\/[a-z0-9._/-]+\.(?:webp|png|jpe?g|gif|svg)$/i.test(url)&&!url.includes(".."))return url;
 try{var u=new URL(url,location.href);return u.protocol==="https:"&&(!asset||u.hostname==="commons.wikimedia.org"||u.hostname==="upload.wikimedia.org")?u.href:""}catch(e){return""}
}
function safeItem(raw){
 if(!raw||typeof raw.id!=="string"||typeof raw.title!=="string"||!raw.id)return null;
 var src=safeUrl(raw.src,true),dated=raw.asOf!==null&&raw.asOf!==undefined&&raw.asOf!==""&&Number.isFinite(Number(raw.asOf));
 var asOf=dated?Number(raw.asOf):null,start=dated?Number(raw.start):null,end=dated?Number(raw.end):null;
 var placementYear=raw.placementYear!==null&&raw.placementYear!==undefined&&Number.isFinite(Number(raw.placementYear))?
  Number(raw.placementYear):null;
 var radius=placementYear===null?0:placementYear<-100000?250000:placementYear<-5000?1300:
   placementYear<-1000?500:placementYear<0?180:placementYear<=1500?130:
   placementYear<=1800?85:placementYear<=1950?50:25;
 if(!src)return null;
 if(dated){if(raw.start===null||!Number.isFinite(start))start=asOf;if(raw.end===null||!Number.isFinite(end))end=asOf;if(start>end)return null;}
 return{ id:raw.id,title:raw.title.slice(0,180),src:src,
  sourceUrl:safeUrl(raw.sourceUrl,false),credit:String(raw.credit||"Fuente no verificada").slice(0,220),
  note:String(raw.note||"").slice(0,400),kind:String(raw.kind||"Imagen histórica").slice(0,80),
  start:start,end:end,asOf:asOf,placementYear:placementYear,placementFrom:placementYear===null?null:placementYear-radius,placementTo:placementYear===null?null:placementYear+radius,anchor:String(raw.anchor||"").slice(0,18),sheet:String(raw.sheet||"").slice(0,60),hints:Array.isArray(raw.hints)?raw.hints.filter(function(x){return typeof x==="string"}).slice(0,15):[],
  eventIds:Array.isArray(raw.eventIds)?raw.eventIds.filter(function(x){return typeof x==="string"}):[],
  provenance:String(raw.provenance||"archivo").slice(0,70),needsReview:!!raw.needsReview };
}
function records(){return api.getRecords()}
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function focusedRecord(){return state.focusId&&records().find(function(d){return d.id===state.focusId})}
function related(item,d){
 if(!d)return false;
 if(item.eventIds.includes(d.id))return true;
 var name=norm(d.t);
 return item.hints.some(function(h){return h.length>=4&&name.includes(norm(h))});
}
function mapYear(m){return m.asOf!==null?m.asOf:m.placementYear}
function mapYearLabel(m){
 if(!m)return"";
 return m.asOf!==null?api.yearText(m.asOf):
  m.placementYear!==null?"hacia "+api.yearText(m.placementYear)+" (posición en Excel)":"sin año asignado";
}
function candidates(){
 var current=state.year,focus=state.pinned?focusedRecord():null;
 var byYear=state.items.filter(function(m){
  return (m.asOf!==null&&current>=m.start&&current<=m.end)||
    (m.placementYear!==null&&current>=m.placementFrom&&current<=m.placementTo);
 });
 function sort(a,b){
  var pa=a.provenance==="HISTORIA.xlsx"?1:0,pb=b.provenance==="HISTORIA.xlsx"?1:0;
  if(pa!==pb)return pb-pa;
  return Math.abs(current-mapYear(a))-Math.abs(current-mapYear(b));
 }
 if(!focus)return byYear.sort(sort);
 var exact=state.items.filter(function(m){return mapYear(m)!==null&&related(m,focus)});
 if(exact.length)return exact.sort(sort);
 return byYear.sort(sort);
}
function chosenItem(items){
 if(!items.length)return null;
 return items.find(function(m){return m.id===state.chosen})||items[0];
}
function sourceLink(a,m){
 a.hidden=!m||!m.sourceUrl;
 if(m&&m.sourceUrl){a.href=m.sourceUrl;a.textContent="Consultar la fuente y su licencia ↗"}
 else a.removeAttribute("href");
}
function setImage(img,empty,map){
 var src=map&&map.src||"";
 if(img.dataset.currentSrc!==src){
  img.dataset.currentSrc=src;
  img.hidden=!src;
  img.onerror=function(){img.hidden=true;empty.hidden=false;empty.textContent="No se ha podido cargar la imagen externa. Abre la fuente para consultarla."};
  if(src)img.src=src;else img.removeAttribute("src");
 }
 if(src){img.alt=map.title+" · "+mapYearLabel(map);empty.hidden=!img.hidden;}
 else{img.hidden=true;empty.hidden=false;empty.textContent=state.loaded?
  "Aún no hay un mapa catalogado para este año. Usa el deslizador o las flechas para localizar imágenes históricas.":"Cargando catálogo del atlas…"}
}
function fillSelect(select,items){
 var sig=items.map(function(m){return m.id}).join("|");
 if(select.dataset.optionsSig===sig){select.value=state.chosen||items[0]&&items[0].id||"";return}
 select.dataset.optionsSig=sig;
 select.replaceChildren();
 if(!items.length){var o=node("option","No hay mapas en esta fecha");o.value="";select.append(o)}
 else items.forEach(function(m){var o=node("option",m.title+" · "+mapYearLabel(m));o.value=m.id;select.append(o)});
 select.disabled=!items.length;
 select.value=state.chosen||items[0]&&items[0].id||"";
}
function setYear(raw,fromTimeline){
 var n=Number(raw);
 if(!Number.isFinite(n))return;
 state.year=Math.max(-541000000,Math.min(2031,Math.round(n)));
 if(!fromTimeline){state.pinned=false;state.focusId=null;state.focusName="";state.chosen=null;}
 requestUpdate();
}
function selectMap(id){state.chosen=id;requestUpdate()}
function goToSnapshot(step){
 var snapshots=Array.from(new Set(state.items.map(mapYear).filter(function(y){return y!==null&&Number.isFinite(y)}))).sort(function(a,b){return a-b});
 var target=step<0?snapshots.filter(function(y){return y<state.year}).pop():snapshots.find(function(y){return y>state.year});
 if(target!==undefined)setYear(target,false);
}
function initDOM(){
 context.innerHTML=
 '<div class="atlas-side-head"><strong>ATLAS · CONTEXTO VISUAL</strong><button type="button" id="atlas-side-release" class="atlas-action" hidden>Soltar</button></div>'+
 '<div class="atlas-side-year" id="atlas-side-year"></div><div class="atlas-side-focus" id="atlas-side-focus"></div>'+
 '<div class="atlas-mini-image"><img id="atlas-side-img" class="atlas-image" alt="" hidden><div id="atlas-side-empty" class="atlas-no-image">Cargando imágenes…</div></div>'+
 '<div id="atlas-side-title" class="atlas-map-name"></div><div id="atlas-side-meta" class="atlas-map-meta"></div>'+
 '<div id="atlas-side-note" class="atlas-map-note"></div>'+
 '<select id="atlas-side-select" class="atlas-select" aria-label="Elegir mapa de contexto"></select>'+
 '<div class="atlas-actions"><button type="button" id="atlas-side-prev" class="atlas-action">◀ Anterior</button><button type="button" id="atlas-side-next" class="atlas-action">Siguiente ▶</button><button type="button" id="atlas-side-open" class="atlas-action">⛶ Abrir Atlas</button></div>'+
 '<a id="atlas-side-source" class="atlas-source" target="_blank" rel="noopener noreferrer" hidden></a>';
 full.innerHTML=
 '<div class="atlas-panel-head"><div><span class="eyebrow">CARTOGRAFÍA HISTÓRICA</span><strong style="display:block">Atlas visual sincronizado</strong></div><button id="atlas-fullscreen" class="action fullscreen-button" type="button" aria-pressed="false">⛶ Pantalla completa</button></div>'+
 '<div class="atlas-controls"><button id="atlas-prev" class="atlas-action" type="button">◀ Mapa anterior</button><input id="atlas-range" type="range" min="0" max="10000" step="1" aria-label="Desplazar el año por todas las eras"><input id="atlas-number" type="number" min="-541000000" max="2031" step="1" aria-label="Año del atlas"><button id="atlas-next" class="atlas-action" type="button">Mapa siguiente ▶</button><select id="atlas-select" class="atlas-select" aria-label="Seleccionar representación histórica"></select><button id="atlas-release" type="button" class="atlas-action" hidden>Soltar imperio</button><button id="atlas-timeline" type="button" class="atlas-action">Ver año en cronología</button></div>'+
 '<div class="atlas-layout"><figure class="atlas-figure"><div class="atlas-large-stage"><img id="atlas-large-img" class="atlas-image" alt="" hidden><div id="atlas-large-empty" class="atlas-no-image"></div></div><figcaption class="atlas-caption"><h2 id="atlas-large-title"></h2><div class="atlas-map-meta" id="atlas-large-meta"></div><p id="atlas-large-note"></p><p id="atlas-large-credit"></p><a id="atlas-large-source" class="atlas-source" rel="noopener noreferrer" target="_blank" hidden></a></figcaption></figure><aside class="atlas-contemporaries"><h3>Contemporáneos al año seleccionado</h3><div class="muted" id="atlas-record-count"></div><div id="atlas-records"></div></aside></div>'+
 '<div class="atlas-gallery" id="atlas-gallery" aria-label="Galería de imágenes del periodo"></div>'+
 '<section class="atlas-context-diagrams" aria-label="Gráficos y diagramas del periodo"><div class="atlas-diagrams-heading"><h3>Gráficos y diagramas de la época</h3><span id="atlas-diagrams-count" class="muted"></span></div><div id="atlas-diagrams" class="atlas-diagrams-grid"></div></section>'+
 '<section class="atlas-archive"><h3>Imágenes originales de HISTORIA.xlsx <span id="atlas-archive-count"></span></h3><p class="muted">Galería de los 81 archivos de tu hoja LÍNEA TEMPORAL. Las imágenes con una fecha identificada también se muestran en el año correspondiente; las restantes se conservan sin fecha inventada.</p><div class="atlas-archive-grid" id="atlas-archive-grid"></div></section>'+
 '<p class="muted">Cada mapa es una instantánea de su fecha de referencia. El deslizador no calcula fronteras históricas: muestra láminas documentales disponibles para ese intervalo.</p>'+
 '<section class="atlas-original-inventory" id="atlas-original-inventory"><div class="atlas-inventory-header"><h3>Inventario del Excel · <span id="atlas-inventory-total">81</span> imágenes</h3><div class="atlas-inventory-controls"><input id="atlas-inventory-search" type="search" aria-label="Buscar imágenes del Excel" placeholder="Buscar imagen, tema o celda…"><select id="atlas-inventory-type" aria-label="Filtrar tipo de imagen"><option value="">Todos los tipos</option></select></div></div><p class="muted">Se han revisado los 81 archivos incrustados de HISTORIA.xlsx. Las miniaturas originales no se publican sin acreditar derechos. Cuando existe un mapa alternativo de Wikimedia Commons, puedes abrirlo aquí. No es una copia idéntica de la imagen original.</p><div id="atlas-inventory-status" class="atlas-map-meta" role="status"></div><div id="atlas-inventory-list" class="atlas-inventory-list"></div></section>';
 $("atlas-inventory-search").addEventListener("input",drawInventory);
 $("atlas-inventory-type").addEventListener("change",drawInventory);
 $("atlas-side-open").addEventListener("click",function(){api.setView("atlas")});
 $("atlas-side-select").addEventListener("change",function(e){selectMap(e.target.value)});
 $("atlas-select").addEventListener("change",function(e){selectMap(e.target.value)});
 ["atlas-side-prev","atlas-prev"].forEach(function(id){$(id).addEventListener("click",function(){goToSnapshot(-1)})});
 ["atlas-side-next","atlas-next"].forEach(function(id){$(id).addEventListener("click",function(){goToSnapshot(1)})});
 ["atlas-side-release","atlas-release"].forEach(function(id){$(id).addEventListener("click",function(){state.pinned=false;state.focusId=null;state.focusName="";state.chosen=null;requestUpdate()})});
 $("atlas-range").addEventListener("input",function(e){setYear(api.yearForRatio(Number(e.target.value)/10000),false)});
 $("atlas-number").addEventListener("change",function(e){setYear(e.target.value,false)});
 $("atlas-timeline").addEventListener("click",function(){api.setView("timeline");api.jumpToYear(state.year)});
 $("atlas-fullscreen").addEventListener("click",function(){setAtlasFullscreen(!state.fullScreen)});
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&state.fullScreen)setAtlasFullscreen(false)});
}
function setAtlasFullscreen(on){
 state.fullScreen=!!on;
 full.classList.toggle("is-maximized",state.fullScreen);
 document.body.classList.toggle("historia-fullscreen",state.fullScreen);
 $("atlas-fullscreen").setAttribute("aria-pressed",on?"true":"false");
 $("atlas-fullscreen").textContent=on?"⤢ Salir de pantalla completa":"⛶ Pantalla completa";
 if(on&&document.documentElement.requestFullscreen&&!document.fullscreenElement){
  try{Promise.resolve(document.documentElement.requestFullscreen()).catch(function(){})}catch(e){}
 }else if(!on&&document.fullscreenElement&&document.exitFullscreen){
  Promise.resolve(document.exitFullscreen()).catch(function(){});
 }
}
function currentRecords(){
 var year=state.year;
 return records().filter(function(d){
  var a=d._start==null?Number(d.y):Number(d._start);
  var b=d._end==null?Number(d.e):Number(d._end);
  return Number.isFinite(a)&&(Number.isFinite(b)&&b>a?a<=year&&year<=b:Math.floor(a)===year);
 }).sort(function(a,b){return (a.c==="Acontecimientos"?-1:0)-(b.c==="Acontecimientos"?-1:0)||String(a.t).localeCompare(String(b.t),"es")});
}
var archiveSig="",inventorySig="";
function drawArchive(){
 var archive=state.items.filter(function(m){return m.provenance==="HISTORIA.xlsx"}).sort(function(a,b){return String(a.anchor).localeCompare(String(b.anchor),"es",{numeric:true})});
 $("atlas-archive-count").textContent="· "+archive.length;
 var signature=archive.map(function(m){return m.id}).join("|");
 if(signature===archiveSig)return;archiveSig=signature;
 var root=$("atlas-archive-grid");root.replaceChildren();
 if(!archive.length){root.append(node("p",state.loaded?"El catálogo está preparado, pero los originales aún no se han desplegado. Consulta el inventario o los mapas de referencia.":"Cargando archivo…","muted"));return;}
 archive.forEach(function(m){
  var card=node("a",null,"atlas-archive-card");card.href=m.src;card.target="_blank";card.rel="noopener noreferrer";
  var pic=node("img");pic.src=m.src;pic.alt=m.title;pic.loading="lazy";pic.decoding="async";
  card.append(pic,node("span",m.title),node("small",m.sheet+(m.anchor?" · "+m.anchor:"")+(m.asOf===null?" · fecha pendiente":" · "+api.yearText(m.asOf))));
  root.append(card);
 });
}
function drawInventory(){
 var list=$("atlas-inventory-list");
 var term=norm($("atlas-inventory-search").value).trim(),kind=$("atlas-inventory-type").value;
 var signature=term+"|"+kind+"|"+state.inventory.length+"|"+state.items.filter(function(m){return m.provenance==="HISTORIA.xlsx"}).length;
 if(signature===inventorySig)return;
 inventorySig=signature;
 list.replaceChildren();
 var filtered=state.inventory.filter(function(item){
  return (!kind||item.category===kind)&&(!term||norm([item.title,item.anchor,item.originalName,item.category].join(" ")).includes(term));
 });
 var available=state.inventory.filter(function(item){return !!item.publicAlternativeId}).length;
 var originals=state.items.filter(function(m){return m.provenance==="HISTORIA.xlsx"});
 var originalByAnchor=new Map(originals.map(function(m){return [m.anchor,m]}));
 $("atlas-inventory-total").textContent=String(state.inventory.length||81);
 $("atlas-inventory-status").textContent=filtered.length+" de "+state.inventory.length+
   " registros visibles · "+available+" con alternativa libre · "+originals.length+" originales disponibles";
 if(!state.inventory.length){list.append(node("p",state.loaded?"El inventario no está disponible en esta publicación.":"Cargando inventario…","atlas-no-image"));return;}
 var fragment=document.createDocumentFragment();
 filtered.forEach(function(item){
  var card=node("div",null,"atlas-inventory-item");
  var title=node("strong",item.title);
  var name=node("span",item.originalName+" · "+item.anchor+" · "+item.category,"atlas-inventory-meta");
  var note=node("small",item.reviewNote,"atlas-inventory-note");
  var original=originalByAnchor.get(item.anchor);
  if(original){
   var preview=node("a",null,"atlas-inventory-original-preview");
   preview.href=original.src;preview.target="_blank";preview.rel="noopener noreferrer";
   var photo=node("img");photo.loading="lazy";photo.decoding="async";
   photo.src=original.src;photo.alt="Imagen original de "+item.title;
   preview.append(photo);card.append(preview);
  }
  card.append(title,name);
  if(item.asOf!==null)card.append(node("span","Fecha representada: "+api.yearText(item.asOf),"atlas-inventory-date"));
  if(original){
   var direct=node("a","Ver imagen original ↗","atlas-action");
   direct.href=original.src;direct.target="_blank";direct.rel="noopener noreferrer";
   card.append(direct);
  }
  if(item.publicAlternativeId){
   var button=node("button",original?"Comparar con mapa alternativo ↗":"Ver mapa alternativo ↗","atlas-action");button.type="button";
   button.addEventListener("click",function(){
    var map=state.items.find(function(m){return m.id===item.publicAlternativeId});
    if(!map)return;
    state.pinned=false;state.focusId=null;state.year=map.asOf;state.chosen=map.id;
    requestUpdate();
    full.scrollIntoView({behavior:"smooth",block:"start"});
   });
   card.append(button);
  }else if(!original){
   card.append(node("span","Archivo original aún no desplegado","atlas-inventory-pending"));
  }
  card.append(note);fragment.append(card);
 });
 list.append(fragment);
}
function drawAtlasDiagrams(){
 var root=$("atlas-diagrams");root.replaceChildren();
 var year=state.year,focus=state.pinned?focusedRecord():null;
 var active=state.diagrams.filter(function(d){
  if(year>=d.from&&year<=d.to)return true;
  if(!focus)return false;
  var title=String(focus.t||"").toLowerCase();
  return Array.isArray(d.hints)&&d.hints.some(function(h){return String(h).length>=4&&title.includes(String(h).toLowerCase())});
 }).slice(0,6);
 $("atlas-diagrams-count").textContent=active.length+" ilustraciones";
 if(!active.length){
  root.append(node("p","No hay diagramas adicionales catalogados para este año. Puedes consultar los mapas históricos y el inventario del Excel.","atlas-no-image"));
  return;
 }
 active.forEach(function(d){
  var card=node("article",null,"atlas-diagram-card");
  var imageLink=node("a",null,"atlas-diagram-image");
  imageLink.href=safeUrl(d.src,true);imageLink.target="_blank";imageLink.rel="noopener noreferrer";
  var img=node("img");img.alt=d.title;img.src=safeUrl(d.src,true);img.loading="lazy";
  imageLink.append(img);
  var info=node("div",null,"atlas-diagram-info");
  info.append(node("span",d.type+" · "+d.license,"atlas-map-meta"),node("strong",d.title));
  info.append(node("p",d.context+" "+d.summary,"atlas-diagram-caption"));
  info.append(node("small",(d.credit||"")+(" · Excel: "+d.excelAnchor),"atlas-diagram-credit"));
  var source=node("a","Ver fuente y licencia ↗","atlas-source");source.href=safeUrl(d.sourceUrl,false);
  source.rel="noopener noreferrer";source.target="_blank";info.append(source);
  card.append(imageLink,info);root.append(card);
 });
}
function drawRecords(){
 var list=$("atlas-records");list.replaceChildren();
 var arr=currentRecords(),count=arr.length;
 $("atlas-record-count").textContent=count.toLocaleString("es-ES")+" referencias en el archivo histórico";
 if(!count){list.append(node("p","No hay registros fechados o activos exactamente en este año.","atlas-no-image"));return}
 arr.slice(0,35).forEach(function(d){
  var b=node("button",null,"atlas-event");b.type="button";
  b.append(node("small",d.c),document.createTextNode(d.t));
  b.addEventListener("click",function(){api.focusEvent(d.id);state.focusId=d.id;state.focusName=d.t;state.pinned=true;requestUpdate()});
  list.append(b);
 });
 if(count>35)list.append(node("div","Mostrando 35 de "+count+" referencias.","muted"));
}
function render(){
 var items=candidates(),map=chosenItem(items),focus=state.pinned?focusedRecord():null;
 if(map)state.chosen=map.id;else state.chosen=null;
 var shortFocus=state.pinned&&focus?"Imperio o registro seleccionado: "+focus.t:"Cronología sincronizada con el año central visible";
 $("atlas-side-year").textContent=api.yearText(state.year);
 $("atlas-side-focus").textContent=shortFocus;
 $("atlas-side-release").hidden=!state.pinned;
 $("atlas-release").hidden=!state.pinned;
 $("atlas-side-title").textContent=map?map.title:"Sin mapa en este año";
 $("atlas-side-meta").textContent=map?(map.asOf===null?"Ubicación en el Excel: ":"Imagen de ")+mapYearLabel(map)+" · "+map.kind:"";
 $("atlas-side-note").textContent=map?(map.note||"La fecha del mapa puede diferir del año seleccionado."):"";
 setImage($("atlas-side-img"),$("atlas-side-empty"),map);
 setImage($("atlas-large-img"),$("atlas-large-empty"),map);
 fillSelect($("atlas-side-select"),items);
 fillSelect($("atlas-select"),items);
 sourceLink($("atlas-side-source"),map);
 sourceLink($("atlas-large-source"),map);
 $("atlas-large-title").textContent=map?map.title:"Sin mapa catalogado para "+api.yearText(state.year);
 $("atlas-large-meta").textContent=map?(map.asOf===null?"Situada en el montaje hacia ":"Representa ")+mapYearLabel(map)+" · "+map.kind:"";
 $("atlas-large-note").textContent=map?(map.asOf===null?"El año es la posición aproximada de la imagen en HISTORIA.xlsx, no una fecha certificada del mapa. "+(map.note||""):(map.note||"La lámina es una instantánea documental, no un mapa reconstruido año a año.")):"Prueba otro año o consulta las 81 imágenes en la galería inferior.";
 $("atlas-large-credit").textContent=map?map.credit:"";
 $("atlas-range").value=String(Math.round(api.ratioForYear(state.year)*10000));
 $("atlas-number").value=String(state.year);
 $("atlas-side-prev").disabled=$("atlas-prev").disabled=!state.items.some(function(m){return mapYear(m)!==null&&mapYear(m)<state.year});
 $("atlas-side-next").disabled=$("atlas-next").disabled=!state.items.some(function(m){return mapYear(m)!==null&&mapYear(m)>state.year});
 var gallery=$("atlas-gallery");gallery.replaceChildren();
 items.slice(0,20).forEach(function(m){
  var b=node("button",null);b.type="button";b.setAttribute("aria-pressed",map&&map.id===m.id?"true":"false");
  var img=node("img");img.src=m.src;img.alt="";img.loading="lazy";
  b.append(img,node("span",m.title+" · "+mapYearLabel(m)));
  b.addEventListener("click",function(){selectMap(m.id)});gallery.append(b);
 });
 if(api.getView()==="atlas"){drawRecords();drawAtlasDiagrams();drawArchive();drawInventory();}
}
var scheduled=false;
function requestUpdate(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(function(){scheduled=false;render()});
}
async function loadCatalogs(){
 var paths=["./atlas-examples.json","./atlas-imported.json","./atlas-inventory.json","./atlas-context.json","./atlas-placement.json"],documents=await Promise.all(paths.map(function(p){
  return fetch(p,{cache:"no-cache"}).then(function(r){if(!r.ok)throw Error(p);return r.json()}).catch(function(){return{items:[]}})
 }));
 var seen=new Set();
 state.inventory=Array.isArray(documents[2].items)?documents[2].items:[];
 state.diagrams=Array.isArray(documents[3].items)?documents[3].items.filter(function(d){
  return d&&typeof d.title==="string"&&typeof d.type==="string"&&
  Number.isFinite(d.from)&&Number.isFinite(d.to)&&
  safeUrl(d.src,true)&&safeUrl(d.sourceUrl,false);
 }):[];
 var typeSelect=$("atlas-inventory-type");
 Array.from(new Set(state.inventory.map(function(i){return i.category}))).sort().forEach(function(category){var o=node("option",category);o.value=category;typeSelect.append(o)});
 var placements=new Map((documents[4].records||[]).map(function(p){return[p.anchor,p]}));
 var names=new Map(state.inventory.map(function(p){return[p.anchor,p]}));
 state.items=[documents[1],documents[0]].flatMap(function(doc){return Array.isArray(doc.items)?doc.items:[]})
  .map(function(raw){
   if(raw.provenance!=="HISTORIA.xlsx")return raw;
   var placement=placements.get(raw.anchor),name=names.get(raw.anchor);
   return Object.assign({},raw,{
    placementYear:placement?placement.placementYear:null,
    title:name&&name.title||raw.title,
    kind:name&&name.category||raw.kind
   });
  }).map(safeItem).filter(function(item){
  if(!item||seen.has(item.id))return false;
  seen.add(item.id);return true;
 });
 state.items.sort(function(a,b){return (a.asOf===null?Infinity:a.asOf)-(b.asOf===null?Infinity:b.asOf)});
 state.loaded=true;requestUpdate();
}
initDOM();
window.addEventListener("historia:year",function(e){
 if(state.pinned)return;
 if(e.detail&&Number.isFinite(e.detail.year)){state.year=Math.round(e.detail.year);state.chosen=null;requestUpdate()}
});
window.addEventListener("historia:focus",function(e){
 var d=e.detail&&e.detail.item;if(!d||!d.id)return;
 state.focusId=d.id;state.focusName=d.t;state.pinned=true;state.year=Math.round(Number(d._start==null?d.y:d._start));state.chosen=null;requestUpdate();
});
window.addEventListener("historia:view",function(e){
 if(state.fullScreen&&e.detail&&e.detail.view!=="atlas")setAtlasFullscreen(false);
 requestUpdate();
});
window.addEventListener("historia:render",requestUpdate);
document.addEventListener("fullscreenchange",function(){
 if(!document.fullscreenElement&&state.fullScreen)setAtlasFullscreen(false);
});
loadCatalogs();
requestUpdate();
})();