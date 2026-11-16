/* Esquema local de La Telaraña: únicamente relaciones de primer grado, sin alterar el orbe 3D. */
(function(global){
"use strict";
var SVG_NS="http://www.w3.org/2000/svg",PAGE_SIZE=12;
function buildNeighborhood(nodes,edges,centerId,includeMentions,isSourceMention){
 var byId=new Map((nodes||[]).filter(Boolean).map(function(n){return [n.id,n]}));
 var center=byId.get(centerId);if(!center)return {center:null,neighbors:[],totalEdges:0,excludedMentions:0};
 var related=new Map(),totalEdges=0,excludedMentions=0;
 (edges||[]).forEach(function(edge){
  if(!edge||(edge.a!==centerId&&edge.b!==centerId))return;
  var neighborId=edge.a===centerId?edge.b:edge.a;
  if(!neighborId||neighborId===centerId||!byId.has(neighborId))return;
  if(!includeMentions&&isSourceMention&&isSourceMention(edge)){excludedMentions++;return}
  if(!related.has(neighborId))related.set(neighborId,{node:byId.get(neighborId),edges:[]});
  related.get(neighborId).edges.push(edge);totalEdges++;
 });
 var neighbors=Array.from(related.values()).sort(function(a,b){
  return String(a.node.name||"").localeCompare(String(b.node.name||""),"es")||String(a.node.id).localeCompare(String(b.node.id))
 });
 return {center:center,neighbors:neighbors,totalEdges:totalEdges,excludedMentions:excludedMentions};
}
/* Filtrado local por clase de entidad. El centro del esquema se mantiene visible
   y las instituciones/organizaciones se agrupan bajo una sola categoría. */
function entityType(node){
 var kind=String(node&&node.kind||"Otro").trim();
 if(!kind)return "Otro";
 if(/^(instituci[oó]n|organizaci[oó]n|organismo|agencia)(?:$|\s)/i.test(kind))return "Institución / organización";
 return kind;
}
function filterNeighborhoodByTypes(neighborhood,excludedTypes){
 if(!neighborhood.center||!excludedTypes||!excludedTypes.size)return neighborhood;
 var neighbors=neighborhood.neighbors.filter(function(item){return !excludedTypes.has(entityType(item.node))});
 return {center:neighborhood.center,neighbors:neighbors,totalEdges:neighbors.reduce(function(sum,item){return sum+item.edges.length},0),
  excludedMentions:neighborhood.excludedMentions};
}
function relationTier(edge){
 if(edge.claimStatus==="hecho_verificado_independiente")return "verified";
 var status=String(edge.claimStatus||"").toLowerCase(),confidence=String(edge.confidence||"").toLowerCase();
 if(confidence==="hipotesis"||/no corroborad|hip[oó]tesis|especulaci[oó]n/.test(status))return "hypothesis";
 if(confidence==="indicio")return "indication";
 return "source";
}
function groupTier(edges){
 var grades=new Set((edges||[]).map(relationTier));
 return grades.size===1?Array.from(grades)[0]:"mixed";
}
function el(name,attrs,text){
 var item=document.createElementNS(SVG_NS,name);
 Object.keys(attrs||{}).forEach(function(k){item.setAttribute(k,String(attrs[k]))});
 if(text!==undefined&&text!==null)item.textContent=String(text);
 return item;
}
function cut(text,max){
 var value=String(text||"").trim();
 return value.length<=max?value:value.slice(0,max-1).trimEnd()+"…";
}
function lines(text,maxChars,maxLines){
 var words=String(text||"").trim().split(/\s+/).filter(Boolean),result=[],line="";
 words.forEach(function(word){
  if(result.length>=maxLines)return;
  if((line?line.length+1:0)+word.length<=maxChars){line+=(line?" ":"")+word;return}
  if(line){result.push(line);line="";if(result.length>=maxLines)return}
  line=word.length>maxChars?cut(word,maxChars):word;
 });
 if(line&&result.length<maxLines)result.push(line);
 if(result.length&&words.join(" ").length>result.join(" ").length)result[result.length-1]=cut(result[result.length-1],maxChars-1)+"…";
 return result;
}
/* A diferencia de las fichas abreviadas, los nombres de relaciones nunca se recortan. */
function wrapRelationLabel(value,maxChars){
 var raw=String(value||"Vínculo").replace(/\s+/g," ").trim(),out=[],line="";
 raw.split(" ").forEach(function(token){
  var word=token;
  while(word.length>maxChars){
   if(line){out.push(line);line=""}
   out.push(word.slice(0,maxChars));
   word=word.slice(maxChars);
  }
  if(!word)return;
  if(!line)line=word;
  else if(line.length+word.length+1<=maxChars)line+=" "+word;
  else{out.push(line);line=word}
 });
 if(line)out.push(line);
 return out.length?out:["Vínculo"];
}
function relationLabel(edge){
 var text=edge&&edge.type;
 return typeof text==="string"&&text.trim()?text.trim():"Vínculo";
}
function textLines(group,value,x,y,maxChars,maxLines,className){
 lines(value,maxChars,maxLines).forEach(function(text,i){group.appendChild(el("text",{x:x,y:y+i*16,"class":className},text))});
}
function buttonGroup(label,click){
 var g=el("g",{"role":"button",tabindex:"0","aria-label":label});
 g.addEventListener("click",click);
 g.addEventListener("keydown",function(event){
  if(event.key==="Enter"||event.key===" "){event.preventDefault();click()}
 });
 return g;
}
/* Las tarjetas comparten un ancho fijo por columna, pero crecen en altura sin
   cortar nombres ni subtítulos. No utilizar maxLines ni puntos suspensivos. */
function cardMetrics(node,center){
 var title=wrapRelationLabel(node.name||"Entidad",center?25:21);
 var subtitle=wrapRelationLabel(node.subtitle||node.kind||"Entidad",center?36:30);
 var height=Math.max(center?82:90,68+(title.length-1)*16+(subtitle.length-1)*15);
 return {width:center?270:244,height:height,title:title,subtitle:subtitle};
}
function drawCard(svg,node,x,y,center,selected,onSelect,metrics){
 var size=metrics||cardMetrics(node,center),width=size.width,height=size.height;
 var g=buttonGroup((center?"Entidad central: ":"Abrir entidad: ")+node.name,function(){onSelect(node.id)});
 g.setAttribute("class","local-node"+(center?" is-center":"")+(selected?" is-selected":""));
 g.appendChild(el("rect",{x:x-width/2,y:y,width:width,height:height,rx:12}));
 g.appendChild(el("circle",{cx:x-width/2+23,cy:y+27,r:12,"class":"local-avatar"}));
 g.appendChild(el("text",{x:x-width/2+23,y:y+31,"text-anchor":"middle","class":"local-avatar-letter"},String(node.kind||"").startsWith("Org")?"O":String(node.name||"?").slice(0,1).toUpperCase()));
 size.title.forEach(function(line,i){
  g.appendChild(el("text",{x:x-width/2+44,y:y+26+i*16,"class":"local-name"},line));
 });
 var subtitleY=Math.max(26+(size.title.length-1)*16+25,height-17-(size.subtitle.length-1)*15);
 size.subtitle.forEach(function(line,i){
  g.appendChild(el("text",{x:x-width/2+13,y:y+subtitleY+i*15,"class":"local-sub"},line));
 });
 g.appendChild(el("title",{},node.name+(node.subtitle?" · "+node.subtitle:"")));
 svg.appendChild(g);
}
function create(config){
 var opts=config||{},panel=opts.panel,svg=opts.svg;
 if(!panel||!svg)throw Error("Panel o SVG de relaciones inmediatas ausente");
 var state={nodes:[],edges:[],selection:null,centerId:null,page:0,includeMentions:false,
  autoMentions:false,mentionsExplicit:false,excludedTypes:new Set(),typeSignature:""};
 function autoConfigureMentions(){
  if(state.mentionsExplicit||!state.centerId)return;
  var base=buildNeighborhood(state.nodes,state.edges,state.centerId,false,opts.isSourceMention);
  var all=buildNeighborhood(state.nodes,state.edges,state.centerId,true,opts.isSourceMention);
  var filteredBase=filterNeighborhoodByTypes(base,state.excludedTypes);
  var filteredAll=filterNeighborhoodByTypes(all,state.excludedTypes);
  state.autoMentions=filteredBase.totalEdges===0&&filteredAll.totalEdges>0;
  state.includeMentions=state.autoMentions;
  opts.mentions.checked=state.includeMentions;
 }
 function buildTypeChoices(allDirect){
  var counts=new Map();
  allDirect.neighbors.forEach(function(item){
   var kind=entityType(item.node);counts.set(kind,(counts.get(kind)||0)+1);
  });
  var priority=["Persona","Fuente","Institución / organización"];
  var kinds=Array.from(counts.keys()).sort(function(a,b){
   var ia=priority.indexOf(a),ib=priority.indexOf(b);
   if(ia>=0||ib>=0)return ia<0?1:ib<0?-1:ia-ib;
   return a.localeCompare(b,"es");
  });
  var total=kinds.length,chosen=kinds.filter(function(k){return !state.excludedTypes.has(k)});
  if(opts.typeOptions){
   var signature=kinds.map(function(k){return k+":"+counts.get(k)}).join("|");
   if(signature!==state.typeSignature){
    opts.typeOptions.replaceChildren();
    kinds.forEach(function(kind){
     var label=document.createElement("label"),checkbox=document.createElement("input");
     var name=document.createElement("span"),count=document.createElement("span");
     checkbox.type="checkbox";checkbox.value=kind;
     checkbox.addEventListener("change",function(){
      if(this.checked)state.excludedTypes.delete(kind);
      else state.excludedTypes.add(kind);
      state.page=0;autoConfigureMentions();draw();
     });
     name.textContent=kind;count.textContent=String(counts.get(kind));count.className="local-types-count";
     label.appendChild(checkbox);label.appendChild(name);label.appendChild(count);
     opts.typeOptions.appendChild(label);
    });
    state.typeSignature=signature;
   }
   Array.from(opts.typeOptions.children).forEach(function(label){
    var input=label.children[0];
    if(input)input.checked=!state.excludedTypes.has(input.value);
   });
  }
  if(opts.typeSummary)opts.typeSummary.textContent=!total?"Tipos: sin vecinos":
   chosen.length===total?"Tipos: todos ("+total+")":
   !chosen.length?"Tipos: ninguno":
   chosen.length===1?"Tipo: "+chosen[0]:
   "Tipos: "+chosen.length+" de "+total;
  if(opts.typeAll)opts.typeAll.disabled=!total||chosen.length===total;
  if(opts.typeNone)opts.typeNone.disabled=!total||!chosen.length;
  return {available:total,selected:chosen.length};
 }
 function draw(){
  var substantiveAll=buildNeighborhood(state.nodes,state.edges,state.centerId,false,opts.isSourceMention);
  var allDirectAll=buildNeighborhood(state.nodes,state.edges,state.centerId,true,opts.isSourceMention);
  panel.hidden=!allDirectAll.center;
  if(!allDirectAll.center)return;
  var typeSelection=buildTypeChoices(allDirectAll);
  var substantive=filterNeighborhoodByTypes(substantiveAll,state.excludedTypes);
  var allDirect=filterNeighborhoodByTypes(allDirectAll,state.excludedTypes);
  var neighborhood=state.includeMentions?allDirect:substantive;
  var neighbors=neighborhood.neighbors,maxPage=Math.max(0,Math.ceil(neighbors.length/PAGE_SIZE)-1);
  state.page=Math.min(maxPage,Math.max(0,state.page));
  var pageItems=neighbors.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  opts.heading.textContent=neighborhood.center.name;
  var onlyMentions=substantive.totalEdges===0&&allDirect.totalEdges>0;
  var excludedMentions=Math.max(0,allDirect.totalEdges-substantive.totalEdges);
  opts.summary.textContent=typeSelection.available&&!typeSelection.selected?
   "0 vecinos directos · selecciona al menos un tipo de entidad.":
   onlyMentions?
   (state.includeMentions?
    allDirect.totalEdges+" menciones en fuentes · sin vínculos sustantivos registrados. La mención no demuestra una relación personal.":
    allDirect.totalEdges+" menciones ocultas · activa «Incluir menciones en fuentes» para ver el esquema."):
   (neighbors.length+" vecinos directos · "+neighborhood.totalEdges+" relaciones"+
    (!state.includeMentions&&excludedMentions?" · "+excludedMentions+" menciones excluidas":""));
  var start=state.page*PAGE_SIZE+1,end=Math.min(neighbors.length,(state.page+1)*PAGE_SIZE);
  opts.pageLabel.textContent=neighbors.length?"Entidades "+start+"–"+end+" de "+neighbors.length:"Sin relaciones inmediatas visibles";
  opts.prev.disabled=state.page===0;
  opts.next.disabled=state.page>=maxPage;
  svg.replaceChildren();
  // Tres columnas con ancho suficiente para etiquetas de varias líneas.
  // Cada fila se dimensiona según la relación más larga (o los vínculos paralelos).
  var columns=3,rows=Math.ceil(pageItems.length/columns),layouts=[];
  var centerTop=32,centerSize=cardMetrics(neighborhood.center,true);
  var nextLabelTop=Math.max(135,centerTop+centerSize.height+21);
  var groups=pageItems.map(function(item){
   var badges=item.edges.map(function(edge){
    var label=relationLabel(edge),textLines=wrapRelationLabel(label,28);
    return {edge:edge,label:label,lines:textLines,height:Math.max(31,14+textLines.length*16)};
   });
   return {badges:badges,height:badges.reduce(function(total,badge,i){return total+badge.height+(i?6:0)},0),card:cardMetrics(item.node,false)};
  });
  for(var row=0;row<rows;row++){
   var values=groups.slice(row*columns,(row+1)*columns);
   var maxLabelHeight=Math.max.apply(null,values.map(function(group){return group.height}));
   var maxCardHeight=Math.max.apply(null,values.map(function(group){return group.card.height}));
   var nodeTop=nextLabelTop+maxLabelHeight+16;
   layouts.push({labelTop:nextLabelTop,labelHeight:maxLabelHeight,nodeY:nodeTop,cardHeight:maxCardHeight});
   nextLabelTop=nodeTop+maxCardHeight+40;
  }
  var height=rows?Math.max(215,layouts[rows-1].nodeY+layouts[rows-1].cardHeight+35):Math.max(215,centerTop+centerSize.height+55);
  svg.setAttribute("viewBox","0 0 960 "+height);
  // La altura intrínseca debe coincidir con viewBox: evita un SVG alto y vacío por preserveAspectRatio.
  svg.setAttribute("height",String(height));
  svg.setAttribute("aria-label","Esquema 2D de "+neighborhood.center.name+": "+neighbors.length+" entidades vecinas directas");
  var paths=el("g",{"class":"local-links"});svg.appendChild(paths);
  pageItems.forEach(function(item,i){
   var col=i%columns,row=Math.floor(i/columns),x=160+col*320,layout=layouts[row];
   var group=groups[i],y=layout.nodeY;
   var mentionOnly=!!opts.isSourceMention&&item.edges.every(opts.isSourceMention);
   var grade=mentionOnly?"mention":groupTier(item.edges);
   var selected=state.selection&&state.selection.kind==="edge"&&item.edges.some(function(edge){return edge.id===state.selection.id});
   var controlY=Math.max(centerTop+centerSize.height+10,layout.labelTop-8);
   var path=el("path",{d:"M 480 "+(centerTop+centerSize.height+6)+" C 480 "+controlY+" "+x+" "+controlY+" "+x+" "+(y-7),"class":"local-link "+grade+(selected?" is-selected":"")});
   path.appendChild(el("title",{},neighborhood.center.name+" ↔ "+item.node.name+" · "+item.edges.length+" relación(es): "+item.edges.map(relationLabel).join("; ")));
   paths.appendChild(path);
   var nextY=layout.labelTop+(layout.labelHeight-group.height)/2;
   group.badges.forEach(function(entry){
    var edge=entry.edge;
    var edgeGrade=mentionOnly?"mention":relationTier(edge);
    var edgeSelected=state.selection&&state.selection.kind==="edge"&&state.selection.id===edge.id;
    var badges=buttonGroup("Abrir relación completa entre "+neighborhood.center.name+" y "+item.node.name+": "+entry.label,function(){
     if(opts.onSelectEdge)opts.onSelectEdge(edge.id);
    });
    badges.setAttribute("class","local-edge-pill "+edgeGrade+(edgeSelected?" is-selected":""));
    badges.appendChild(el("rect",{x:x-132,y:nextY,width:264,height:entry.height,rx:11}));
    entry.lines.forEach(function(line,lineNo){
     badges.appendChild(el("text",{x:x,y:nextY+19+lineNo*16,"text-anchor":"middle"},line));
    });
    badges.appendChild(el("title",{},entry.label+" · "+(edge.claimStatus||edge.confidence||"sin clasificación")));
    svg.appendChild(badges);
    nextY+=entry.height+6;
   });
  });
  drawCard(svg,neighborhood.center,480,centerTop,true,false,function(){},centerSize);
  pageItems.forEach(function(item,i){
   drawCard(svg,item.node,160+(i%columns)*320,layouts[Math.floor(i/columns)].nodeY,false,false,function(id){
    if(opts.onSelectNode)opts.onSelectNode(id);
   },groups[i].card);
  });
  if(!pageItems.length){
   svg.appendChild(el("text",{x:480,y:165,"text-anchor":"middle","class":"local-empty"},
    typeSelection.available&&!typeSelection.selected?"Selecciona uno o varios tipos de entidad en el filtro.":
    allDirect.totalEdges?"Marca «Incluir menciones» para mostrar las fuentes.":
    allDirectAll.totalEdges?"Ninguna entidad del tipo seleccionado entre los vecinos directos.":
    "No hay conexiones registradas para este nodo."));
  }
 }
 function update(nodes,edges,selection){
  state.nodes=Array.isArray(nodes)?nodes:[];
  state.edges=Array.isArray(edges)?edges:[];
  state.selection=selection||null;
  if(!selection){state.centerId=null;state.page=0;draw();return}
  var focus=null;
  if(selection.kind==="node")focus=selection.id;
  else if(selection.kind==="edge"){
   var edge=state.edges.find(function(item){return item.id===selection.id});
   if(edge)focus=state.centerId&&(edge.a===state.centerId||edge.b===state.centerId)?state.centerId:edge.a;
  }
  if(focus!==state.centerId){
   state.centerId=focus;state.page=0;
   state.mentionsExplicit=false;
   autoConfigureMentions(); // menciones visibles si los tipos elegidos solo presentan ese vínculo
   panel.classList.remove("is-collapsed");opts.minimize.setAttribute("aria-expanded","true");opts.minimize.textContent="− Contraer";
  }
  draw();
 }
 opts.mentions.addEventListener("change",function(){state.includeMentions=!!this.checked;state.autoMentions=false;state.mentionsExplicit=true;state.page=0;draw()});
 if(opts.typeAll)opts.typeAll.addEventListener("click",function(){
  state.excludedTypes.clear();state.page=0;autoConfigureMentions();draw();
 });
 if(opts.typeNone)opts.typeNone.addEventListener("click",function(){
  var all=buildNeighborhood(state.nodes,state.edges,state.centerId,true,opts.isSourceMention);
  all.neighbors.forEach(function(item){state.excludedTypes.add(entityType(item.node))});
  state.page=0;autoConfigureMentions();draw();
 });
 opts.prev.addEventListener("click",function(){state.page--;draw()});
 opts.next.addEventListener("click",function(){state.page++;draw()});
 opts.minimize.addEventListener("click",function(){
  var collapsed=panel.classList.toggle("is-collapsed");
  this.setAttribute("aria-expanded",String(!collapsed));
  this.textContent=collapsed?"+ Expandir":"− Contraer";
 });
 panel.hidden=true;
 return {update:update,buildNeighborhood:buildNeighborhood};
}
global.IdeaLabLocalRelations={create:create,buildNeighborhood:buildNeighborhood,filterNeighborhoodByTypes:filterNeighborhoodByTypes,entityType:entityType,relationTier:relationTier,groupTier:groupTier,wrapRelationLabel:wrapRelationLabel,PAGE_SIZE:PAGE_SIZE};
})(window);
