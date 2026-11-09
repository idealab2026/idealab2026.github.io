/* Listado público de fuentes. El estado se calcula desde el registro canónico:
   no se promocionan investigaciones parciales a fuentes completadas. */
(function(){
  "use strict";
  const tbody=document.getElementById("source-review-rows");
  const summary=document.getElementById("source-review-summary");
  const bar=document.getElementById("source-review-fill");
  const side=document.getElementById("source-review-additional");
  if(!tbody||!summary||!bar||!side)return;
  const node=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const youtube=(value)=>{
    try{
      const url=new URL(value);
      if(url.protocol!=="https:")return "";
      if(!["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be"].includes(url.hostname))return "";
      return url.href;
    }catch(error){return "";}
  };
  const appendLink=(cell,name,url)=>{
    const href=youtube(url);
    if(!href){cell.textContent=name;return;}
    const link=node("a",null,name);
    link.href=href;link.target="_blank";link.rel="noopener noreferrer";
    cell.append(link);
  };
  const draw=(data)=>{
    if(!data||!Number.isInteger(data.total)||data.total<1||data.total>500)throw Error("Total de fuentes inválido");
    const byOrder=new Map();
    for(const rec of data.reviewed||[]){
      if(Number.isInteger(rec.order)&&rec.order>=1&&rec.order<=data.total)byOrder.set(rec.order,rec);
    }
    for(const rec of data.inReview||[]){
      if(Number.isInteger(rec.order)&&rec.order>=1&&rec.order<=data.total&&!byOrder.has(rec.order))byOrder.set(rec.order,rec);
    }
    let complete=0,partial=0;
    const fragment=document.createDocumentFragment();
    for(let order=1;order<=data.total;order++){
      const item=byOrder.get(order);
      const done=!!item&&item.reviewComplete===true&&item.status==="revision_publicada";
      const pending=!!item&&!done;
      const row=node("tr",!item?"source-unknown":"");
      const index=node("td","source-index",String(order).padStart(2,"0"));
      const title=node("td","source-name");
      const name=item?(item.title||("Fuente "+order)):"Fuente pendiente de identificar";
      if(item)appendLink(title,name,item.sourceUrl||"");
      else title.textContent=name;
      if(!item)title.classList.add("source-placeholder");
      const state=node("td","source-status-cell");
      const label=node("span","source-status "+(done?"source-done":pending?"source-active":"source-pending"),
        done?"✓ Completada":pending?"◔ En revisión":"○ Pendiente");
      state.append(label);row.append(index,title,state);fragment.append(row);
      if(done)complete++;
      else if(pending)partial++;
    }
    tbody.replaceChildren(fragment);
    summary.textContent=complete+"/"+data.total+" completas · "+partial+" en revisión · "+(data.total-complete-partial)+" pendientes";
    summary.title="Última actualización del inventario: "+(data.updatedAt||"sin fecha");
    bar.style.width=(100*complete/data.total).toFixed(2)+"%";
    bar.setAttribute("aria-valuenow",String(complete));
    bar.setAttribute("aria-valuemax",String(data.total));
    side.replaceChildren();
    const supplemental=Array.isArray(data.supplementalResearch)?data.supplementalResearch:[];
    if(supplemental.length){
      const intro=node("div","source-additional-label","Investigación complementaria · sin numeración confirmada (no computa como completada)");
      side.append(intro);
      for(const item of supplemental){
        const line=node("div","source-additional-row"),name=node("span","source-additional-name");
        appendLink(name,item.title||"Fuente sin título",item.url||"");
        line.append(name,node("span","source-status source-active","◔ Parcial · pendiente de cotejo"));
        side.append(line);
      }
    }
  };
  fetch("./progreso-fuentes.json",{cache:"no-store"}).then(response=>{
    if(!response.ok)throw Error("Registro no accesible");
    return response.json();
  }).then(draw).catch(()=>{
    summary.textContent="Estado no disponible · consultar registro en GitHub";
    bar.style.width="0%";
  });
})();
