/* IDEA LAB - Rankings del grafo, calculados exclusivamente a partir del grafo cargado.
 * La centralidad no es importancia/culpabilidad; la "verificación externa" requiere un estado explícito.
 */
(function(root){
"use strict";
function isMention(e,lookup){
 const s=String(e.claimStatus||"").toLowerCase(),t=String(e.type||"").toLowerCase();
 if(s.startsWith("mencion_")||s.startsWith("mención_")||s==="mencion_editorial_no_vinculo_causal"||/^menci[oó]n (de |en |a )/.test(t)||/^citado (en|por) la fuente/.test(t))return true;
 return [lookup.get(e.a),lookup.get(e.b)].some(n=>n&&(n.kind==="Fuente"||/^Podcast\s*[·:]/i.test(n.name||"")||/^Entrevista\s*[·:]/i.test(n.name||"")));
}
function quality(e,mention){
 if(mention)return -1;
 if(e.claimStatus==="hecho_verificado_independiente")return 3;
 if(e.confidence==="documentado")return 2; // documentado por la fuente; no necesariamente corroborado.
 if(e.confidence==="indicio")return 1;
 return 0;
}
function compute(nodes,edges,scope,limit){
 const lookup=new Map(nodes.map(n=>[n.id,n])),includeMentions=scope==="all",pairs=new Map(),degrees=new Map(nodes.map(n=>[n.id,{node:n,neighbors:new Set(),verified:new Set(),links:0,mentions:0}]));
 for(const e of edges){
  if(!lookup.has(e.a)||!lookup.has(e.b)||e.a===e.b)continue;
  const mention=isMention(e,lookup);
  if(!includeMentions&&mention)continue;
  const q=quality(e,mention);
  const da=degrees.get(e.a),db=degrees.get(e.b);
  da.neighbors.add(e.b);db.neighbors.add(e.a);
  if(q===3){da.verified.add(e.b);db.verified.add(e.a);}
  da.links++;db.links++;if(mention){da.mentions++;db.mentions++;}
  const ids=[e.a,e.b].sort(),key=ids.join("::");
  if(!pairs.has(key))pairs.set(key,{a:ids[0],b:ids[1],edges:[],tier:-1,verified:0,documented:0,indicia:0,mentions:0,sourceLinks:new Set()});
  const group=pairs.get(key);group.edges.push(e);
  group.tier=Math.max(group.tier,q);if(q===3)group.verified++;else if(q===2)group.documented++;else if(q===1)group.indicia++;else if(mention)group.mentions++;
  if(e.source)group.sourceLinks.add(String(e.source).split("&t=")[0]);
 }
 const entityRank=[...degrees.values()].filter(x=>x.neighbors.size).map(x=>({id:x.node.id,name:x.node.name,kind:x.node.kind||"Entidad",degree:x.neighbors.size,verifiedNeighbors:x.verified.size,edgeCount:x.links,mentionCount:x.mentions})).sort((a,b)=>b.degree-a.degree||b.verifiedNeighbors-a.verifiedNeighbors||b.edgeCount-a.edgeCount||a.name.localeCompare(b.name,"es")).slice(0,limit);
 const relationRank=[...pairs.values()].map(g=>{
  const e=g.edges.slice().sort((a,b)=>quality(b,isMention(b,lookup))-quality(a,isMention(a,lookup))||String(a.id).localeCompare(String(b.id)))[0];
  return {a:g.a,b:g.b,left:lookup.get(g.a).name,right:lookup.get(g.b).name,id:e.id,type:String(e.type||"Relación"),tier:g.tier,verified:g.verified,documented:g.documented,indicia:g.indicia,mentions:g.mentions,totalEdges:g.edges.length,sourceCount:g.sourceLinks.size};
 }).sort((a,b)=>b.tier-a.tier||b.verified-a.verified||b.documented-a.documented||b.sourceCount-a.sourceCount||b.totalEdges-a.totalEdges||a.left.localeCompare(b.left,"es")).slice(0,limit);
 return {entities:entityRank,relations:relationRank,counts:{entities:degrees.size,edges:edges.length,rankablePairs:pairs.size,scope:scope}};
}
root.IDEA_TELARANA_RANKINGS={compute,isMention};
})(window);
