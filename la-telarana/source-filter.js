/* Selector público de fuentes: filtrado de la presentación sin alterar ni reatribuir el expediente canónico. */
(function(global){
"use strict";
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function sourceForModule(mod){
 var key=String(mod&&mod.key||""),label=String(mod&&mod.label||"");
 if(/F49_CANDIDATE/.test(key))return "extra:f49-candidate"; // No confundir artículo candidato y fuente original.
 if(key==="IDEA_TELARANA_PODCAST_150")return "f69";
 if(key==="IDEA_TELARANA_PODCAST_CORONEL_VILLAREJO")return "f1";
 if(key==="IDEA_TELARANA_EPISODE_CEUTA_2026"||key==="IDEA_TELARANA_CEUTA_TRANSCRIPT_REVIEW")return "f2";
 if(key==="IDEA_TELARANA_FRATTINI_EXTERNAL")return "extra:mashal-context";
 var found=label.match(/^Fuente\s+(\d+)/i)||key.match(/(?:_F|_SOURCE)(\d+)_/);
 return found?"f"+Number(found[1]):"extra:"+norm(label).replace(/ /g,"-");
}
function createTracker(sourceCatalog){
 var publicSources=(sourceCatalog||[]).filter(function(s){return s&&Number.isInteger(s.order)&&s.order>=1&&s.order<=999})
  .map(function(s){return {id:"f"+s.order,order:s.order,title:String(s.title||"Fuente "+s.order),duplicateOf:s.duplicateOf||null}});
 var membership=new Map(),labels=new Map();
 function section(key){
  if(!membership.has(key))membership.set(key,{nodes:new Set(),edges:new Set()});
  return membership.get(key);
 }
 function register(key,label,raw,beforeNodeIds,beforeEdgeIds,afterNodes,afterEdges){
  if(!key)return;
  var part=section(key);if(label)labels.set(key,label);
  var nodeById=new Map(afterNodes.map(function(n){return[n.id,n]})),
      nodeByName=new Map();
  afterNodes.forEach(function(n){if(!nodeByName.has(norm(n.name)))nodeByName.set(norm(n.name),n)});
  var beforeNodes=new Set(beforeNodeIds||[]),beforeEdges=new Set(beforeEdgeIds||[]);
  afterNodes.forEach(function(n){if(!beforeNodes.has(n.id))part.nodes.add(n.id)});
  afterEdges.forEach(function(e){
   if(!beforeEdges.has(e.id)){
    part.edges.add(e.id);part.nodes.add(e.a);part.nodes.add(e.b);
   }
  });
  if(!raw||!Array.isArray(raw.nodes))return;
  var idMap=new Map();
  raw.nodes.forEach(function(n){
   if(!n||!n.id)return;
   var canonical=nodeById.get(n.id)||nodeByName.get(norm(n.name));
   if(canonical){idMap.set(n.id,canonical.id);part.nodes.add(canonical.id)}
  });
  if(!Array.isArray(raw.edges))return;
  var byPair=new Map();
  afterEdges.forEach(function(e){
   var pair=[e.a,e.b].sort().join("::");
   if(!byPair.has(pair))byPair.set(pair,[]);
   byPair.get(pair).push(e)
  });
  raw.edges.forEach(function(e){
   if(!e)return;
   var a=idMap.get(e.a)||e.a,b=idMap.get(e.b)||e.b;
   if(!nodeById.has(a)||!nodeById.has(b)||a===b)return;
   var matching=byPair.get([a,b].sort().join("::"))||[];
   var edge=matching.find(function(v){return norm(v.type)===norm(e.type)})||matching[0];
   if(edge){part.edges.add(edge.id);part.nodes.add(edge.a);part.nodes.add(edge.b)}
  });
 }
 function entries(){
  var entries=publicSources.map(function(s){
   var p=membership.get(s.id),count=p?p.nodes.size:0,relations=p?p.edges.size:0;
   return {id:s.id,order:s.order,title:s.title,duplicateOf:s.duplicateOf,nodes:count,edges:relations,available:count>0||relations>0,extra:false};
  });
  membership.forEach(function(p,id){
   if(id.startsWith("f")&&/^f\d+$/.test(id))return;
   entries.push({id:id,order:null,title:labels.get(id)||id,duplicateOf:null,nodes:p.nodes.size,edges:p.edges.size,available:p.nodes.size>0||p.edges.size>0,extra:true});
  });
  return entries.sort(function(a,b){
   if(a.extra!==b.extra)return Number(a.extra)-Number(b.extra);
   return a.extra?String(a.title).localeCompare(String(b.title),"es"):(a.order-b.order)
  });
 }
 function filter(nodes,edges,selected){
  if(selected===null||selected===undefined)return {nodes:nodes||[],edges:edges||[]};
  var ids=new Set(),edgeIds=new Set();
  selected.forEach(function(id){
   var part=membership.get(id);if(!part)return;
   part.nodes.forEach(function(n){ids.add(n)});
   part.edges.forEach(function(e){edgeIds.add(e)});
  });
  var activeEdges=(edges||[]).filter(function(e){return edgeIds.has(e.id)});
  activeEdges.forEach(function(e){ids.add(e.a);ids.add(e.b)});
  return {nodes:(nodes||[]).filter(function(n){return ids.has(n.id)}),edges:activeEdges};
 }
 return {register:register,entries:entries,filter:filter,sourceForModule:sourceForModule};
}
function mount(opts){
 var engine=opts.engine,button=opts.button,panel=opts.panel,search=opts.search,
     list=opts.list,summary=opts.summary,allButton=opts.allButton,noneButton=opts.noneButton;
 var selected=null; // null = todas las fuentes con datos, sin pérdida de la base original.
 function available(){return engine.entries().filter(function(s){return s.available})}
 function keys(){return selected===null?null:new Set(selected)}
 function isActive(id){return selected===null||selected.has(id)}
 function renderList(){
  var sources=engine.entries(),text=norm(search.value),filtered=sources.filter(function(s){
   return !text||norm((s.order?"f"+s.order+" ":"")+s.title).includes(text)
  });
  var loaded=available(),chosen=selected===null?loaded.length:loaded.filter(function(s){return selected.has(s.id)}).length;
  button.textContent=selected===null?"Fuentes · todas":"Fuentes · "+chosen+"/"+loaded.length;
  button.setAttribute("aria-pressed",String(selected!==null));
  summary.textContent=chosen+" de "+loaded.length+" fuentes con entidades en el grafo · "+(sources.length-loaded.length)+" sin datos representados.";
  list.replaceChildren();
  if(!filtered.length){var empty=document.createElement("p");empty.className="source-filter-empty";empty.textContent="No hay fuentes coincidentes.";list.appendChild(empty);return}
  filtered.forEach(function(source){
   var label=document.createElement("label");label.className="source-filter-row"+(source.available?"":" unavailable");
   var checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.value=source.id;
   checkbox.checked=source.available&&isActive(source.id);checkbox.disabled=!source.available;
   checkbox.setAttribute("aria-label",(source.order?"Fuente "+source.order:"Contexto")+": "+source.title);
   checkbox.addEventListener("change",function(){
    if(selected===null)selected=new Set(available().map(function(x){return x.id}));
    if(this.checked)selected.add(source.id);else selected.delete(source.id);
    // Volver al estado sin filtro únicamente si todas las fuentes disponibles están seleccionadas.
    if(selected.size===available().length)selected=null;
    opts.onChange();renderList();
   });
   var caption=document.createElement("span");caption.className="source-filter-description";
   var title=document.createElement("strong");title.textContent=(source.order?"F"+String(source.order).padStart(2,"0")+" · ":"")+source.title;
   var detail=document.createElement("small");
   detail.textContent=source.available?
    source.nodes+" entidades · "+source.edges+" enlaces aportados":
    source.duplicateOf?"Entrada duplicada de F"+String(source.duplicateOf).padStart(2,"0")+" · sin representación separada":
     "Sin entidades representadas todavía";
   caption.appendChild(title);caption.appendChild(detail);label.appendChild(checkbox);label.appendChild(caption);list.appendChild(label);
  });
 }
 function open(value){panel.hidden=!value;button.setAttribute("aria-expanded",String(value));if(value){renderList();search.focus()}}
 button.addEventListener("click",function(){open(panel.hidden)});
 allButton.addEventListener("click",function(){selected=null;opts.onChange();renderList()});
 noneButton.addEventListener("click",function(){selected=new Set();opts.onChange();renderList()});
 search.addEventListener("input",renderList);
 panel.addEventListener("pointerdown",function(e){e.stopPropagation()});
 document.addEventListener("pointerdown",function(e){
  if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))open(false)
 });
 document.addEventListener("keydown",function(e){
  if(e.key==="Escape"&&!panel.hidden){open(false);e.stopPropagation()}
 });
 renderList();
 return {keys:keys,isFiltering:function(){return selected!==null},refresh:renderList,close:function(){open(false)}};
}
global.IdeaLabSourceFilters={createTracker:createTracker,mount:mount,sourceForModule:sourceForModule};
})(window);
