/* Tabla pública de fuentes del proyecto; se apoya en los mismos datos que filtran el orbe. */
(function(global){
"use strict";
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function rowsFor(sources,search,type,sort){
 var query=norm(search),shown=(sources||[]).filter(function(s){
  if(!s||s.extra)return false;
  if(type&&type!=="todas"&&s.type!==type)return false;
  return !query||norm(["F"+String(s.order).padStart(2,"0"),s.title,s.type,s.creator,(s.participants||[]).join(" ")].join(" ")).includes(query);
 });
 return shown.slice().sort(function(a,b){
  if(sort==="percent-desc"||sort==="percent-asc"){
   var x=a.percent,y=b.percent;
   if(x===null&&y!==null)return 1;
   if(y===null&&x!==null)return -1;
   if(x!==null&&y!==null&&x!==y)return sort==="percent-desc"?y-x:x-y;
  }
  return sort==="order-desc"?b.order-a.order:a.order-b.order;
 });
}
function el(tag,cls,value){
 var item=document.createElement(tag);
 if(cls)item.className=cls;
 if(value!==undefined&&value!==null)item.textContent=String(value);
 return item;
}
function mount(opts){
 var engine=opts.engine,details=opts.details,body=opts.body,search=opts.search,type=opts.type,
     sort=opts.sort,count=opts.count;
 if(!engine||!details||!body||!search||!type||!sort||!count)throw Error("Faltan elementos del catálogo de fuentes");
 function render(){
  var all=engine.entries().filter(function(s){return !s.extra}),
      visible=rowsFor(all,search.value,type.value,sort.value);
  count.textContent=visible.length+" de "+all.length+" entradas del catálogo · "+
    all.filter(function(s){return s.percent!==null}).length+" con avance registrado · "+
    all.filter(function(s){return !!s.sourceUrl}).length+" con enlace público";
  body.replaceChildren();
  if(!visible.length){var tr=el("tr"),td=el("td","sources-none","No hay fuentes que cumplan esos filtros.");
   td.colSpan=7;tr.appendChild(td);body.appendChild(tr);return}
  visible.forEach(function(s){
   var tr=el("tr");
   if(s.duplicateOf)tr.className="sources-is-duplicate";
   tr.appendChild(el("td","sources-id","F"+String(s.order).padStart(2,"0")));
   var name=el("td","sources-title-cell");
   var title=el("strong",null,s.title);name.appendChild(title);
   if(s.duplicateOf)name.appendChild(el("small","sources-duplicate","Duplicada de F"+String(s.duplicateOf).padStart(2,"0")));
   tr.appendChild(name);
   var coverage=el("td","sources-coverage");
   if(s.percent!==null){
    var strong=el("strong",null,s.percent+" %");coverage.appendChild(strong);
    var bar=el("div","sources-progress-bar"),fill=el("span");
    fill.style.width=Math.min(100,Math.max(0,s.percent))+"%";bar.appendChild(fill);coverage.appendChild(bar);
    if(s.percentInherited)coverage.appendChild(el("small",null,"Heredado de F"+String(s.duplicateOf).padStart(2,"0")));
   }else coverage.appendChild(el("span","sources-unknown","Sin dato"));
   tr.appendChild(coverage);
   tr.appendChild(el("td","sources-type",s.type||"No identificado"));
   tr.appendChild(el("td","sources-creator",s.creator||"Por identificar"));
   tr.appendChild(el("td","sources-participants",(s.participants||[]).length?s.participants.join(" · "):
    /podcast|entrevista/i.test(s.type||"")?"Intervinientes por verificar":"—"));
   var linkCell=el("td");
   if(s.sourceUrl){
    var anchor=el("a","sources-open-link","Abrir ↗");
    anchor.href=s.sourceUrl;anchor.target="_blank";anchor.rel="noopener noreferrer";
    anchor.setAttribute("aria-label","Abrir fuente original F"+String(s.order).padStart(2,"0"));
    linkCell.appendChild(anchor);
   }else linkCell.appendChild(el("span","sources-unknown","Sin URL pública"));
   tr.appendChild(linkCell);body.appendChild(tr);
  });
 }
 [search,type,sort].forEach(function(item){item.addEventListener(item===search?"input":"change",render)});
 details.addEventListener("toggle",function(){if(details.open)render()});
 render();
 return {render:render,rowsFor:rowsFor};
}
global.IdeaLabSourceDirectory={mount:mount,rowsFor:rowsFor};
})(window);
