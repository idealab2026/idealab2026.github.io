(function(){
 "use strict";
 // Synchronized period illustrations. Never treat scientific time spans as exact annual maps.
 var api=window.HistoryTimeline, panel=document.getElementById("timeline-panel");
 if(!api||!panel)return;
 var state={year:1900,focus:null,locked:false,closed:false,docs:[],loaded:false,view:"timeline"};
 var $=function(id){return document.getElementById(id)};
 var make=function(tag,text,cls){var x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x};
 function normalize(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
 function safeURL(raw,asset){
  if(typeof raw!=="string")return"";
  try{var u=new URL(raw,location.href);if(u.protocol!=="https:")return"";
   if(asset&&!["commons.wikimedia.org","upload.wikimedia.org"].includes(u.hostname))return"";
   return u.href;
  }catch(e){return""}
 }
 function qualify(row){
  if(!row||typeof row.id!=="string"||typeof row.title!=="string")return null;
  var from=Number(row.from),to=Number(row.to),year=Number(row.referenceYear);
  var url=safeURL(row.src,true),source=safeURL(row.sourceUrl,false);
  if(!Number.isFinite(from)||!Number.isFinite(to)||from>to||!Number.isFinite(year)||!url||!source)return null;
  return {id:row.id,title:row.title,from:from,to:to,referenceYear:year,
   src:url,sourceUrl:source,kind:String(row.type||"Diagrama"),credit:String(row.credit||""),
   license:String(row.license||""),context:String(row.context||""),summary:String(row.summary||""),
   excelAnchor:String(row.excelAnchor||""),excelOriginal:String(row.excelOriginal||""),
   hints:Array.isArray(row.hints)?row.hints.filter(function(s){return typeof s==="string"}):[]};
 }
 function qualifyMap(row){
  if(!row||!Number.isFinite(row.asOf)||!Number.isFinite(row.start)||!Number.isFinite(row.end))return null;
  var src=safeURL(row.src,true),link=safeURL(row.sourceUrl,false);
  if(!src||!link)return null;
  return {id:row.id,title:row.title,from:row.start,to:row.end,referenceYear:row.asOf,
   src:src,sourceUrl:link,kind:"Mapa histórico",credit:row.credit||"",license:row.license||"Ver fuente",
   context:"Mapa de "+api.yearText(row.asOf)+" · no representa todos los años cercanos.",
   summary:row.note||"",excelAnchor:row.excelReference||"",excelOriginal:"",
   hints:Array.isArray(row.hints)?row.hints:[]};
 }
 function selection(){
  var y=state.year,focus=state.locked?state.focus:null;
  var matching=state.docs.filter(function(d){return y>=d.from&&y<=d.to});
  if(focus){
   var name=normalize(focus.t);
   var linked=state.docs.filter(function(d){
    return d.hints.some(function(t){return t.length>=4&&name.includes(normalize(t))});
   });
   // A clicked historical record takes priority; otherwise honour the visible year.
   if(linked.length)matching=Array.from(new Map(linked.concat(matching).map(function(d){return[d.id,d]})).values());
  }
  matching.sort(function(a,b){
   var sa=(focus&&a.hints.some(function(t){return normalize(focus.t).includes(normalize(t))})?100:0)+
     (a.kind==="Gráfico científico"?4:0)-Math.abs(y-a.referenceYear)/Math.max(1,a.to-a.from);
   var sb=(focus&&b.hints.some(function(t){return normalize(focus.t).includes(normalize(t))})?100:0)+
     (b.kind==="Gráfico científico"?4:0)-Math.abs(y-b.referenceYear)/Math.max(1,b.to-b.from);
   return sb-sa;
  });
  return matching.slice(0,3);
 }
 function ensureUI(){
  var strip=make("section",null,"timeline-visual-context");
  strip.id="timeline-visual-context";
  strip.setAttribute("aria-label","Imágenes, diagramas y gráficos del contexto histórico");
  strip.innerHTML='<div class="visual-context-heading">'+
   '<div class="visual-context-title"><span>IMÁGENES Y DIAGRAMAS DE LA ÉPOCA</span><strong id="visual-context-year">—</strong><small id="visual-context-count"></small></div>'+
   '<div class="visual-context-tools"><button type="button" id="visual-context-unpin" class="visual-context-tool" hidden>Soltar registro</button><button type="button" id="visual-context-atlas" class="visual-context-tool">Ver atlas</button><button type="button" id="visual-context-toggle" class="visual-context-tool" aria-expanded="true">Ocultar láminas</button></div></div>'+
   '<div id="visual-context-items" class="visual-context-items" aria-live="polite"><span class="visual-context-empty">Cargando ilustraciones…</span></div>';
  var toolbar=$("history-toolbar"),viewport=$("viewport");
  if(toolbar&&toolbar.parentNode===panel)panel.insertBefore(strip,viewport);
  else panel.insertBefore(strip,viewport);
  var lightbox=make("dialog",null,"visual-context-dialog");
  lightbox.id="visual-context-dialog";
  lightbox.innerHTML='<div class="visual-dialog-head"><strong id="visual-dialog-title"></strong><button type="button" id="visual-dialog-close" aria-label="Cerrar imagen">×</button></div>'+
   '<img id="visual-dialog-img" alt=""><p id="visual-dialog-description"></p><p id="visual-dialog-credits"></p><a id="visual-dialog-source" rel="noopener noreferrer" target="_blank">Fuente original, autoría y licencia ↗</a>';
  document.body.append(lightbox);
  $("visual-dialog-close").addEventListener("click",function(){lightbox.close()});
  lightbox.addEventListener("click",function(ev){if(ev.target===lightbox)lightbox.close()});
  $("visual-context-atlas").addEventListener("click",function(){api.setView("atlas")});
  $("visual-context-unpin").addEventListener("click",function(){
   state.locked=false;state.focus=null;state.year=Math.round(api.getYear());requestDraw();
  });
  $("visual-context-toggle").addEventListener("click",function(){
   state.closed=!state.closed;strip.classList.toggle("visual-context-collapsed",state.closed);
   $("visual-context-toggle").textContent=state.closed?"Mostrar láminas":"Ocultar láminas";
   $("visual-context-toggle").setAttribute("aria-expanded",state.closed?"false":"true");
   if(!state.closed)requestDraw();
  });
 }
 function enlarge(d){
  var dlg=$("visual-context-dialog");
  $("visual-dialog-title").textContent=d.title;
  var img=$("visual-dialog-img");img.src=d.src;img.alt=d.title;
  $("visual-dialog-description").textContent=d.context+" "+d.summary;
  $("visual-dialog-credits").textContent=d.credit+" · "+d.license+
    (d.excelAnchor?" · Relacionado con "+d.excelAnchor+" de HISTORIA.xlsx (imagen alternativa)":"");
  $("visual-dialog-source").href=d.sourceUrl;
  if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
 }
 var oldSig="";
 function draw(){
  if(state.view!=="timeline")return;
  var active=selection();
  $("visual-context-year").textContent=api.yearText(state.year);
  $("visual-context-count").textContent=state.locked&&state.focus?
   "Registro: "+state.focus.t:active.length+" láminas vinculadas al periodo";
  $("visual-context-unpin").hidden=!state.locked;
  var signature=state.year+"|"+(state.focus&&state.locked?state.focus.id:"")+"|"+
    active.map(function(d){return d.id}).join(",")+"|"+state.loaded;
  if(signature===oldSig)return;oldSig=signature;
  var root=$("visual-context-items");root.replaceChildren();
  if(!active.length){
   root.append(make("div",state.loaded?
     "No hay ilustraciones contrastadas para este año. La cronología continúa disponible y puedes consultar el inventario del Excel en Atlas visual.":
     "Cargando láminas de contexto histórico…","visual-context-empty"));
   return;
  }
  active.forEach(function(d){
   var card=make("article",null,"visual-context-card");
   var preview=make("button",null,"visual-context-preview");preview.type="button";
   preview.setAttribute("aria-label","Ampliar "+d.title);
   var img=make("img");img.loading="lazy";img.decoding="async";img.src=d.src;img.alt=d.title;
   img.onerror=function(){
    img.hidden=true;
    var missing=make("span","Imagen no disponible · consultar fuente","visual-context-image-fallback");
    preview.append(missing);
   };
   preview.addEventListener("click",function(){enlarge(d)});
   preview.append(img);
   var body=make("div",null,"visual-context-card-body");
   body.append(make("span",d.kind+" · "+d.license,"visual-context-kind"),make("strong",d.title,"visual-context-card-name"));
   body.append(make("small",d.context,"visual-context-card-caption"));
   var foot=make("div",null,"visual-context-card-footer");
   if(d.excelAnchor)foot.append(make("span","Excel: "+d.excelAnchor,"visual-context-excel"));
   var a=make("a","Fuente ↗","visual-context-source");a.href=d.sourceUrl;a.rel="noopener noreferrer";a.target="_blank";
   foot.append(a);body.append(foot);card.append(preview,body);root.append(card);
  });
 }
 var scheduled=false;
 function requestDraw(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(function(){scheduled=false;draw()});
 }
 function source(path){
  return fetch(path,{cache:"no-cache"}).then(function(resp){if(!resp.ok)throw Error(path);return resp.json()});
 }
 async function load(){
  var results=await Promise.all([
   source("./atlas-context.json").catch(function(){return{items:[]}}),
   source("./atlas-examples.json").catch(function(){return{items:[]}})
  ]);
  state.docs=results[0].items.map(qualify).concat(results[1].items.map(qualifyMap)).filter(Boolean);
  state.loaded=true;oldSig="";requestDraw();
 }
 ensureUI();
 state.view=api.getView();state.year=Math.round(api.getYear());
 window.addEventListener("historia:year",function(ev){
  if(state.locked)return;
  var y=ev.detail&&ev.detail.year;
  if(Number.isFinite(y)){state.year=Math.round(y);requestDraw()}
 });
 window.addEventListener("historia:focus",function(ev){
  var d=ev.detail&&ev.detail.item;
  if(!d)return;
  state.focus={id:d.id,t:d.t};
  state.locked=true;
  state.year=Math.round(Number(d._start==null?d.y:d._start));
  requestDraw();
 });
 window.addEventListener("historia:view",function(ev){
  state.view=ev.detail&&ev.detail.view||"timeline";
  if(state.view==="timeline"){if(!state.locked)state.year=Math.round(api.getYear());requestDraw()}
 });
 load();
})();
