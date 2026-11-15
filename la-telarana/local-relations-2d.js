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
function drawCard(svg,node,x,y,center,selected,onSelect){
 var width=center?250:206,height=center?82:90;
 var g=buttonGroup((center?"Entidad central: ":"Abrir entidad: ")+node.name,function(){onSelect(node.id)});
 g.setAttribute("class","local-node"+(center?" is-center":"")+(selected?" is-selected":""));
 g.appendChild(el("rect",{x:x-width/2,y:y,width:width,height:height,rx:12}));
 g.appendChild(el("circle",{cx:x-width/2+23,cy:y+27,r:12,"class":"local-avatar"}));
 g.appendChild(el("text",{x:x-width/2+23,y:y+31,"text-anchor":"middle","class":"local-avatar-letter"},String(node.kind||"").startsWith("Org")?"O":String(node.name||"?").slice(0,1).toUpperCase()));
 textLines(g,node.name,x-width/2+44,y+26,center?27:20,2,"local-name");
 textLines(g,node.subtitle||node.kind||"Entidad",x-width/2+13,y+height-17,center?37:29,1,"local-sub");
 g.appendChild(el("title",{},node.name+(node.subtitle?" · "+node.subtitle:"")));
 svg.appendChild(g);
}
function create(config){
 var opts=config||{},panel=opts.panel,svg=opts.svg;
 if(!panel||!svg)throw Error("Panel o SVG de relaciones inmediatas ausente");
 var state={nodes:[],edges:[],selection:null,centerId:null,page:0,includeMentions:false,autoMentions:false};
 function draw(){
  var substantive=buildNeighborhood(state.nodes,state.edges,state.centerId,false,opts.isSourceMention);
  var allDirect=buildNeighborhood(state.nodes,state.edges,state.centerId,true,opts.isSourceMention);
  var neighborhood=state.includeMentions?allDirect:substantive;
  panel.hidden=!neighborhood.center;
  if(!neighborhood.center)return;
  var neighbors=neighborhood.neighbors,maxPage=Math.max(0,Math.ceil(neighbors.length/PAGE_SIZE)-1);
  state.page=Math.min(maxPage,Math.max(0,state.page));
  var pageItems=neighbors.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  opts.heading.textContent=neighborhood.center.name;
  var onlyMentions=substantive.totalEdges===0&&allDirect.totalEdges>0;
  opts.summary.textContent=onlyMentions?
   (state.includeMentions?
    allDirect.totalEdges+" menciones en fuentes · sin vínculos sustantivos registrados. La mención no demuestra una relación personal.":
    allDirect.totalEdges+" menciones ocultas · activa «Incluir menciones en fuentes» para ver el esquema."):
   (neighbors.length+" vecinos directos · "+neighborhood.totalEdges+" relaciones"+
    (!state.includeMentions&&neighborhood.excludedMentions?" · "+neighborhood.excludedMentions+" menciones excluidas":""));
  var start=state.page*PAGE_SIZE+1,end=Math.min(neighbors.length,(state.page+1)*PAGE_SIZE);
  opts.pageLabel.textContent=neighbors.length?"Entidades "+start+"–"+end+" de "+neighbors.length:"Sin relaciones inmediatas visibles";
  opts.prev.disabled=state.page===0;
  opts.next.disabled=state.page>=maxPage;
  svg.replaceChildren();
  var rows=Math.ceil(pageItems.length/4),height=Math.max(215,165+rows*142);
  svg.setAttribute("viewBox","0 0 960 "+height);
  // La altura intrínseca debe coincidir con viewBox: evita un SVG alto y vacío por preserveAspectRatio.
  svg.setAttribute("height",String(height));
  svg.setAttribute("aria-label","Esquema 2D de "+neighborhood.center.name+": "+neighbors.length+" entidades vecinas directas");
  var paths=el("g",{"class":"local-links"});svg.appendChild(paths);
  pageItems.forEach(function(item,i){
   var col=i%4,row=Math.floor(i/4),x=120+col*240,y=175+row*142;
   var mentionOnly=!!opts.isSourceMention&&item.edges.every(opts.isSourceMention);
   var grade=mentionOnly?"mention":groupTier(item.edges);
   var selected=state.selection&&state.selection.kind==="edge"&&item.edges.some(function(edge){return edge.id===state.selection.id});
   var path=el("path",{d:"M 480 120 C 480 "+(y-48)+" "+x+" "+(y-48)+" "+x+" "+(y-6),"class":"local-link "+grade+(selected?" is-selected":"")});
   path.appendChild(el("title",{},neighborhood.center.name+" ↔ "+item.node.name+" · "+item.edges.length+" relación(es): "+item.edges.map(function(e){return e.type||"Relación"}).join("; ")));
   paths.appendChild(path);
   var badges=buttonGroup("Ver relación entre "+neighborhood.center.name+" y "+item.node.name+": "+item.edges.length+" vínculo(s)",function(){
    if(opts.onSelectEdge)opts.onSelectEdge(item.edges[0].id)
   });
   badges.setAttribute("class","local-edge-pill "+grade+(selected?" is-selected":""));
   badges.appendChild(el("rect",{x:x-36,y:y-43,width:72,height:25,rx:10}));
   badges.appendChild(el("text",{x:x,y:y-26,"text-anchor":"middle"},mentionOnly?
    (item.edges.length===1?"Mención":item.edges.length+" menciones"):
    (item.edges.length===1?cut(item.edges[0].type||"Vínculo",12):item.edges.length+" vínculos")));
   badges.appendChild(el("title",{},item.edges.map(function(e){return (e.type||"Relación")+" · "+(e.claimStatus||e.confidence||"sin clasificación")}).join("\n")));
   svg.appendChild(badges);
  });
  drawCard(svg,neighborhood.center,480,32,true,false,function(){});
  pageItems.forEach(function(item,i){
   drawCard(svg,item.node,120+(i%4)*240,175+Math.floor(i/4)*142,false,false,function(id){
    if(opts.onSelectNode)opts.onSelectNode(id)
   });
  });
  if(!pageItems.length){
   svg.appendChild(el("text",{x:480,y:165,"text-anchor":"middle","class":"local-empty"},
    allDirect.totalEdges?"Marca «Incluir menciones» para mostrar las fuentes.":"No hay conexiones registradas para este nodo."));
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
   var substantive=buildNeighborhood(state.nodes,state.edges,focus,false,opts.isSourceMention);
   var allDirect=buildNeighborhood(state.nodes,state.edges,focus,true,opts.isSourceMention);
   state.autoMentions=substantive.totalEdges===0&&allDirect.totalEdges>0;
   state.includeMentions=state.autoMentions; // fallback automático solo cuando no existen vínculos sustantivos
   opts.mentions.checked=state.includeMentions;
   panel.classList.remove("is-collapsed");opts.minimize.setAttribute("aria-expanded","true");opts.minimize.textContent="− Contraer";
  }
  draw();
 }
 opts.mentions.addEventListener("change",function(){state.includeMentions=!!this.checked;state.autoMentions=false;state.page=0;draw()});
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
global.IdeaLabLocalRelations={create:create,buildNeighborhood:buildNeighborhood,relationTier:relationTier,groupTier:groupTier,PAGE_SIZE:PAGE_SIZE};
})(window);
