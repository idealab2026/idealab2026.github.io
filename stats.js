// Corporate public metrics. Only reads a build-time aggregated JSON file.
// Never makes browser requests to Cloudflare APIs and contains no credentials.
const sites=[
 {id:"observatorio",label:"España en Datos",href:"/dashboard-gobierno/",description:"Observatorio nacional"},
 {id:"midas",label:"MIDAS",href:"/laboratorio-cuantitativo/",description:"Laboratorio cuantitativo"},
 {id:"psicohistoria",label:"Psicohistoria",href:"/sistemas-complejos/",description:"Sistemas complejos"}
];
const root=document.querySelector("#stats-dashboard");
const locale=new Intl.NumberFormat("es-ES");
const finite=v=>Number.isSafeInteger(v)&&v>=0?v:null;
const display=v=>finite(v)===null?"Sin datos":locale.format(v);
const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const time=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")?v:"";
function checkData(data){
 if(!data||data.schema!==1||data.status!=="verified"||!Array.isArray(data.days)||!data.days.length)return null;
 const allowed=new Set(sites.map(s=>s.id));
 if(data.days.length>45)return null;
 const records=[];
 for(const d of data.days){
  if(!time(d.day)||!d.values||typeof d.values!=="object")return null;
  const values={};
  for(const [site,r] of Object.entries(d.values)){
   if(!allowed.has(site)||!r||finite(r.pageViews)===null||finite(r.visits)===null)return null;
   values[site]={pageViews:r.pageViews,visits:r.visits};
  }
  records.push({day:d.day,values});
 }
 return records.sort((a,b)=>a.day.localeCompare(b.day));
}
function metricDays(records,count){
 return records.slice(-count);
}
function total(rows,id,field){
 // A missing site/day is not a zero. Return null when coverage is incomplete.
 if(!rows.length||rows.some(r=>!r.values[id]))return null;
 return rows.reduce((n,r)=>n+r.values[id][field],0);
}
function chart(rows,field){
 const values=rows.map(d=>{
   const complete=sites.every(s=>Boolean(d.values[s.id]));
   return complete?sites.reduce((t,s)=>t+d.values[s.id][field],0):null;
 });
 if(!values.some(v=>v!==null))return '<div class="stat-empty">Sin serie diaria contrastada.</div>';
 const max=Math.max(1,...values.filter(v=>v!==null));
 return '<div class="stat-bars" role="img" aria-label="Evolución de '+(field==="visits"?"visitas":"páginas vistas")+' por día">'+
   rows.map((r,i)=>{
    const v=values[i],height=v===null?0:Math.max(3,Math.round(v/max*100));
    return '<div class="stat-bar-item" title="'+escape(r.day)+' · '+escape(display(v))+'">'+
      '<div class="stat-bar-rail">'+(v===null?'<i class="stat-missing"></i>':'<i style="height:'+height+'%"></i>')+'</div>'+
      '<span>'+escape(r.day.slice(5))+'</span></div>';
   }).join("")+'</div>';
}
function draw(records,period=7,metric="pageViews"){
 const rows=metricDays(records,period);
 const perSite=sites.map(s=>({s,views:total(rows,s.id,"pageViews"),visits:total(rows,s.id,"visits")}));
 const allKnown=perSite.every(x=>x.views!==null&&x.visits!==null);
 const visits=allKnown?perSite.reduce((v,s)=>v+s.visits,0):null;
 const pageViews=allKnown?perSite.reduce((v,s)=>v+s.views,0):null;
 const maximum=Math.max(1,...perSite.map(x=>x[metric]??0));
 root.innerHTML='<div class="stat-head"><div><span class="eyebrow">Audiencia de nuestros productos</span><h3>Tráfico y alcance digital</h3><p>Datos agregados y verificables. Las visitas no equivalen a personas distintas.</p></div>'+
 '<div class="stat-filters"><label>Periodo<select id="stat-period"><option value="7"'+(period===7?" selected":"")+'>7 días</option><option value="30"'+(period===30?" selected":"")+'>30 días</option></select></label>'+
 '<label>Medida<select id="stat-metric"><option value="pageViews"'+(metric==="pageViews"?" selected":"")+'>Páginas vistas</option><option value="visits"'+(metric==="visits"?" selected":"")+'>Visitas</option></select></label></div></div>'+
 '<div class="stat-kpis"><article><span>Visitas registradas</span><strong>'+escape(display(visits))+'</strong></article>'+
 '<article><span>Páginas vistas</span><strong>'+escape(display(pageViews))+'</strong></article>'+
 '<article><span>Productos medidos</span><strong>3</strong></article></div>'+
 '<div class="stat-content"><div class="stat-box"><div class="stat-box-title"><strong>Evolución diaria</strong><span>'+period+' días</span></div>'+
 chart(rows,metric)+'</div>'+
 '<div class="stat-box"><div class="stat-box-title"><strong>Comparativa por producto</strong><span>'+escape(metric==="visits"?"Visitas":"Páginas vistas")+'</span></div>'+
 '<div class="stat-site-list">'+perSite.map(x=>'<article><div class="stat-site-title"><a href="'+escape(x.s.href)+'">'+escape(x.s.label)+'</a><strong>'+escape(display(x[metric]))+'</strong></div>'+
 '<p>'+escape(x.s.description)+'</p><div class="stat-progress"><i style="width:'+(x[metric]===null?0:Math.round(x[metric]/maximum*100))+'%"></i></div></article>').join("")+'</div></div></div>'+
 '<p class="stat-source">Fuente: analítica web agregada. Datos actualizados hasta '+escape(rows.at(-1)?.day||"fecha no disponible")+'. No medimos todavía clics internos ni interacción con los modelos. Los bloqueadores pueden excluir visitas.</p>';
 root.querySelector("#stat-period").addEventListener("change",ev=>draw(records,Number(ev.target.value),metric));
 root.querySelector("#stat-metric").addEventListener("change",ev=>draw(records,period,ev.target.value));
}
function notReady(reason){
 root.innerHTML='<div class="stat-await"><strong>Estadísticas en preparación</strong><p>'+escape(reason)+'</p>'+
 '<div class="stat-products">'+sites.map(s=>'<a href="'+escape(s.href)+'"><span>'+escape(s.label)+'</span><small>Sin datos publicados</small></a>').join("")+'</div>'+
 '<p>La medición de las webs está activa, pero aún no se ha configurado la exportación de cifras agregadas a este panel. No presentamos ceros ni estimaciones como visitas reales.</p></div>';
}
if(root){
 fetch("/data/traffic.json",{cache:"no-store",credentials:"omit"})
  .then(r=>{if(!r.ok)throw Error("UNAVAILABLE");return r.json()})
  .then(d=>{
    const rows=checkData(d);
    if(rows)draw(rows);
    else notReady("Pendiente de una primera actualización verificada desde el proveedor.");
  }).catch(()=>notReady("No se ha podido obtener el informe. Consulta directamente la analítica del proveedor."));
}
