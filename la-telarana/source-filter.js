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
  .map(function(s){return {id:"f"+s.order,order:s.order,title:String(s.title||"Fuente "+s.order),duplicateOf:s.duplicateOf||null,
   percent:Number.isFinite(s.percent)?s.percent:null,percentInherited:Boolean(s.percentInherited),
   sourceUrl:/^https?:\/\//i.test(s.sourceUrl||"")?s.sourceUrl:null,
   type:String(s.type||"Tipo por determinar"),creator:s.creator||null,
   participants:Array.isArray(s.participants)?s.participants.filter(function(p){return typeof p==="string"&&p.trim()}):[]}});
 var membership=new Map(),labels=new Map(),sourceMeta=new Map();
 function section(key){
  if(!membership.has(key))membership.set(key,{nodes:new Set(),edges:new Set()});
  return membership.get(key);
 }
 function register(key,label,raw,beforeNodeIds,beforeEdgeIds,afterNodes,afterEdges){
  if(!key)return;
  var part=section(key);if(label)labels.set(key,label);
  // Solo roles explícitos en los metadatos del episodio: un personaje citado NO es necesariamente interviniente.
  if(/^f\d+$/.test(key)&&raw&&raw.metadata&&typeof raw.metadata==="object"){
   var m=raw.metadata,old=sourceMeta.get(key)||{creator:null,participants:[]};
   var channel=m.channel||m.publisher||m.production||m.creator||null;
   if(typeof channel==="string"&&channel.length<125&&!/entrevista audiovisual remitida|transcripci[oó]n|usuario|investigaci[oó]n externa/i.test(channel))old.creator=old.creator||channel;
   [m.host,m.interviewHost,m.guest,m.interviewer,m.guests,m.presenters].forEach(function(v){
    (Array.isArray(v)?v:[v]).forEach(function(person){
     if(typeof person==="string"&&person.trim()&&person.length<100&&!old.participants.includes(person.trim()))old.participants.push(person.trim());
    })
   });
   sourceMeta.set(key,old);
  }
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
   var meta=sourceMeta.get(s.id)||{creator:null,participants:[]};
   var people=Array.from(new Set(s.participants.concat(meta.participants)));
   return {id:s.id,order:s.order,title:s.title,duplicateOf:s.duplicateOf,nodes:count,edges:relations,
    available:count>0||relations>0,extra:false,percent:s.percent,percentInherited:s.percentInherited,
    sourceUrl:s.sourceUrl,type:s.type,creator:s.creator||meta.creator||null,participants:people};
  });
  membership.forEach(function(p,id){
   if(id.startsWith("f")&&/^f\d+$/.test(id))return;
   entries.push({id:id,order:null,title:labels.get(id)||id,duplicateOf:null,nodes:p.nodes.size,edges:p.edges.size,available:p.nodes.size>0||p.edges.size>0,extra:true,percent:null,percentInherited:false,sourceUrl:null,type:"Capa de contexto",creator:null,participants:[]});
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
   var titleLine=document.createElement("div");titleLine.className="source-filter-title-line";
   var title=document.createElement("strong");title.textContent=(source.order?"F"+String(source.order).padStart(2,"0")+" · ":"")+source.title;
   var percent=document.createElement("span");percent.className="source-filter-percent";
   percent.textContent=source.percent===null?"Sin %":source.percent+" %";
   percent.title=source.percentInherited?"Avance editorial heredado de F"+source.duplicateOf:"Avance editorial estimado; no mide cobertura real del audio";
   titleLine.appendChild(title);titleLine.appendChild(percent);
   var detail=document.createElement("small");
   detail.textContent=source.available?
    source.nodes+" entidades · "+source.edges+" enlaces aportados":
    source.duplicateOf?"Entrada duplicada de F"+String(source.duplicateOf).padStart(2,"0")+" · sin representación separada":
     "Sin entidades representadas todavía";
   caption.appendChild(titleLine);caption.appendChild(detail);
   if(source.sourceUrl){
    var link=document.createElement("a");link.className="source-filter-link";link.href=source.sourceUrl;
    link.target="_blank";link.rel="noopener noreferrer";link.textContent="↗ Abrir fuente original";
    link.addEventListener("click",function(event){event.stopPropagation()});
    caption.appendChild(link);
   }else{
    var noLink=document.createElement("small");noLink.className="source-filter-unavailable-link";noLink.textContent="Sin enlace público verificado";caption.appendChild(noLink);
   }
   label.appendChild(checkbox);label.appendChild(caption);list.appendChild(label);
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
/* Filtro de tipos del MAPA PRINCIPAL (3D, 2D y listado). No sustituye el filtro del esquema local. */
function entityType(node){
 var raw=String(node&&node.kind||"Otro").trim()||"Otro",kind=norm(raw);
 if(/^(institucion|instituciones|organizacion|organizaciones|organismos?|agencias?|institutos?)$/.test(kind))return "Institución / organización";
 // El campo "kind" original distingue varias clases de MATERIAL FUENTE:
 // p. ej. F07 The Wild Project #312 tiene kind="Publicación" y F30 kind="Fuente".
 // Para el filtro, todos los registros documentales/audiovisuales son "Fuente".
 // NO cambiar node.kind: se conserva el subtipo original en las fichas.
 if(/^(fuente(?: .+)?|publicacion(?: .+)?|documento(?: .+)?|estudio(?: .+)?|texto(?: .+)?|obra(?: .+)?|libro(?: .+)?|articulo(?: .+)?|informe(?: .+)?|episodio(?: .+)?|entrevista(?: .+)?|podcast(?: .+)?|programa de (?:radio|television)|grabacion(?: .+)?|video(?: .+)?|reportaje(?: .+)?)$/.test(kind))return "Fuente";
 return raw;
}
function filterByTypes(nodes,edges,selected){
 if(selected===null||selected===undefined)return {nodes:nodes||[],edges:edges||[]};
 var visible=(nodes||[]).filter(function(n){return selected.has(entityType(n))});
 var ids=new Set(visible.map(function(n){return n.id}));
 return {nodes:visible,edges:(edges||[]).filter(function(e){return ids.has(e.a)&&ids.has(e.b)})};
}
function mountTypes(opts){
 var button=opts.button,panel=opts.panel,list=opts.list,summary=opts.summary;
 var selected=null; // null: todos, incluso nuevos tipos incorporados por próximas fuentes
 function data(){return opts.getData()||{nodes:[],edges:[]}}
 function entries(){
  var counts=new Map();
  (data().nodes||[]).forEach(function(node){var type=entityType(node);counts.set(type,(counts.get(type)||0)+1)});
  var leading=["Persona","Institución / organización","Fuente","Lugar","País","Acontecimiento"];
  return Array.from(counts,function(pair){return {name:pair[0],count:pair[1]}}).sort(function(a,b){
   var x=leading.indexOf(a.name),y=leading.indexOf(b.name);
   return x>=0||y>=0?(x<0?1:y<0?-1:x-y):a.name.localeCompare(b.name,"es")
  });
 }
 function keys(){return selected===null?null:new Set(selected)}
 function renderList(){
  var choices=entries(),all=choices.length,chosen=selected===null?all:choices.filter(function(x){return selected.has(x.name)}).length;
  var nodeCount=choices.filter(function(x){return selected===null||selected.has(x.name)}).reduce(function(sum,x){return sum+x.count},0);
  button.textContent=selected===null?"Tipos · todos":"Tipos · "+chosen+"/"+all;
  button.setAttribute("aria-pressed",String(selected!==null));
  summary.textContent=chosen+" de "+all+" tipos seleccionados · "+nodeCount+" entidades del conjunto de fuentes activo.";
  opts.allButton.disabled=selected===null;
  opts.noneButton.disabled=selected!==null&&chosen===0;
  list.replaceChildren();
  if(!all){
   var empty=document.createElement("p");empty.className="source-filter-empty";empty.textContent="Las fuentes seleccionadas no contienen entidades.";list.appendChild(empty);return
  }
  choices.forEach(function(choice){
   var label=document.createElement("label");label.className="source-filter-row entity-type-row";
   var check=document.createElement("input");check.type="checkbox";check.value=choice.name;
   check.checked=selected===null||selected.has(choice.name);
   check.setAttribute("aria-label","Mostrar "+choice.name);
   var caption=document.createElement("span");caption.className="source-filter-description";
   var name=document.createElement("strong");name.textContent=choice.name;
   var total=document.createElement("small");total.textContent=choice.count+" entidad"+(choice.count===1?"":"es");
   caption.appendChild(name);caption.appendChild(total);label.appendChild(check);label.appendChild(caption);
   check.addEventListener("change",function(){
    if(selected===null)selected=new Set(choices.map(function(item){return item.name}));
    if(this.checked)selected.add(choice.name);else selected.delete(choice.name);
    if(choices.every(function(item){return selected.has(item.name)}))selected=null;
    opts.onChange();renderList()
   });
   list.appendChild(label);
  });
 }
 function open(value){panel.hidden=!value;button.setAttribute("aria-expanded",String(value));if(value){if(opts.onOpen)opts.onOpen();renderList()}}
 button.addEventListener("click",function(){open(panel.hidden)});
 opts.allButton.addEventListener("click",function(){selected=null;opts.onChange();renderList()});
 opts.noneButton.addEventListener("click",function(){selected=new Set();opts.onChange();renderList()});
 if(opts.closeButton)opts.closeButton.addEventListener("click",function(){open(false)});
 panel.addEventListener("pointerdown",function(e){e.stopPropagation()});
 document.addEventListener("pointerdown",function(e){
  if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))open(false)
 });
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!panel.hidden){open(false);e.stopPropagation()}});
 renderList();
 return {keys:keys,refresh:renderList,close:function(){open(false)},isFiltering:function(){return selected!==null}};
}
global.IdeaLabSourceFilters={createTracker:createTracker,mount:mount,sourceForModule:sourceForModule,entityType:entityType,filterByTypes:filterByTypes,mountTypes:mountTypes};
})(window);
