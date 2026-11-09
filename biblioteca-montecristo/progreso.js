'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const ui = {data:null,book:'conde-montecristo',filter:'todos',query:''};
  const labels = {
    sin_solicitar:'Sin solicitar',
    en_cola:'En cola',
    generando:'Generándose',
    generada:'Generada',
    error:'Error',
    no_verificado:'Sin verificar'
  };
  function element(tag,cls,txt){
    const x=document.createElement(tag);
    if(cls)x.className=cls;
    if(txt!==undefined)x.textContent=String(txt);
    return x;
  }
  function stateBadge(state){
    const b=element('span','progress-status progress-status-'+(labels[state]?state:'no_verificado'),labels[state]||'Sin verificar');
    if(state==='generada')b.title='El Mac ha confirmado que la imagen de NotebookLM se ha descargado.';
    if(state==='generando')b.title='NotebookLM ha recibido la solicitud, pero no hay descarga confirmada.';
    return b;
  }
  function hyperlink(label,href,cls=''){
    const a=element('a',cls,label);
    a.href=href;
    a.target='_blank';
    a.rel='noopener noreferrer';
    return a;
  }
  function matches(r){
    if(ui.book!=='todos'&&r.book!==ui.book)return false;
    if(ui.filter==='pendiente'&&r.nlm_status==='generada')return false;
    if(ui.filter==='corregir'&&(r.nlm_status!=='generada'||r.corrected))return false;
    if(ui.filter==='corregidas'&&!r.corrected)return false;
    const q=ui.query.trim().toLocaleLowerCase('es');
    return !q||[r.chapter,r.title,r.video_id,r.book_title].join(' ').toLocaleLowerCase('es').includes(q);
  }
  function setBar(id,count,total){
    const percent=total?Math.round(100*count/total):0;
    $(id+'-count').textContent=count+' / '+total;
    $(id+'-fill').style.width=percent+'%';
    $(id+'-track').setAttribute('aria-valuenow',String(percent));
  }
  function renderGeneral(){
    const list=$('progress-general-rows');list.replaceChildren();
    const arr=(ui.data.general||[]).filter(g=>ui.book==='todos'||g.book===ui.book);
    if(!arr.length){list.append(element('p','progress-empty','Todavía no hay solicitudes generales registradas para esta selección.'));return;}
    arr.sort((a,b)=>a.book_title.localeCompare(b.book_title,'es')||a.label.localeCompare(b.label,'es'));
    arr.forEach(g=>{
      const line=element('div','progress-general-item');
      const label=element('span','progress-general-name',g.book_title+' · '+g.label);
      line.append(label,stateBadge(g.nlm_status));
      if(g.issue_url)line.append(hyperlink('Seguimiento ↗',g.issue_url,'progress-small-link'));
      list.append(line);
    });
  }
  function render(){
    if(!ui.data)return;
    const all=ui.data.rows.filter(r=>ui.book==='todos'||r.book===ui.book);
    const nlm=all.filter(r=>r.nlm_status==='generada').length;
    const corrected=all.filter(r=>r.corrected).length;
    if(ui.data.sync_ok){
      setBar('progress-nlm',nlm,all.length);
    }else{
      $('progress-nlm-count').textContent='No verificable';
      $('progress-nlm-fill').style.width='0%';
      $('progress-nlm-track').setAttribute('aria-valuenow','0');
    }
    setBar('progress-corrected',corrected,all.length);
    const rows=all.filter(matches);
    $('progress-row-count').textContent=rows.length+' de '+all.length+' vídeos';
    const body=$('progress-rows');body.replaceChildren();
    rows.forEach(r=>{
      const tr=element('tr');
      const ch=element('td','progress-number');ch.append(element('strong','',r.chapter));
      const title=element('td','progress-cell-title');title.append(element('strong','',r.title),element('small','',r.video_id));
      const lm=element('td','');lm.append(stateBadge(r.nlm_status));
      const edited=element('td','');
      if(r.corrected){
        edited.append(element('span','progress-status progress-status-corrected','Corregida'));
        if(r.corrected_image)edited.append(hyperlink('Ver imagen ↗',r.corrected_image,'progress-small-link'));
      }else{
        edited.append(element('span','progress-status progress-status-pending','Pendiente'));
      }
      const links=element('td','progress-links');
      links.append(hyperlink('YouTube ↗',r.youtube_url,'progress-small-link'));
      if(r.issue_url)links.append(hyperlink('Solicitud ↗',r.issue_url,'progress-small-link'));
      tr.append(ch,title,lm,edited,links);
      body.append(tr);
    });
    const msg=$('progress-message');
    msg.replaceChildren();
    if(!ui.data.sync_ok){
      msg.append(element('p','progress-warning','No se han podido contrastar los estados de NotebookLM con GitHub. Los pendientes figuran como «Sin verificar»; no deben interpretarse como imágenes no generadas.'));
    }else if(!rows.length){
      msg.append(element('p','progress-empty','No hay capítulos con estos filtros.'));
    }else if(ui.filter==='todos'){
      msg.append(element('p','progress-verified-note','Fase 1: '+nlm+' originales descargadas. Fase 2: '+corrected+' versiones corregidas y validadas. El resto sigue pendiente o en elaboración.'));
    }
    renderGeneral();
  }
  async function refresh(){
    $('progress-updated').textContent='Consultando progreso…';
    $('progress-refresh').disabled=true;
    try{
      const response=await fetch('./progreso.json?c='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      if(data.version!==1||!Array.isArray(data.rows)||!Array.isArray(data.books))throw new Error('Formato de seguimiento inesperado');
      ui.data=data;
      const list=$('progress-book');
      const old=ui.book;
      list.replaceChildren();
      const all=element('option','','Todos los libros');all.value='todos';list.append(all);
      data.books.forEach(b=>{const op=element('option','',b.title);op.value=b.slug;list.append(op)});
      ui.book=data.books.some(b=>b.slug===old)?old:'todos';
      list.value=ui.book;
      let date='fecha no disponible';
      try{date=new Date(data.updated_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){}
      $('progress-updated').textContent='Última sincronización de GitHub: '+date+' · El seguimiento se actualiza tras las confirmaciones públicas de descarga.';
      render();
    }catch(err){
      $('progress-updated').textContent='Seguimiento no disponible. Vuelve a actualizar.';
      $('progress-message').replaceChildren(element('p','progress-warning','No se han podido cargar los datos de seguimiento. No se debe asumir que las infografías no se hayan generado.'));
    }finally{
      $('progress-refresh').disabled=false;
    }
  }
  $('progress-book').addEventListener('change',e=>{ui.book=e.target.value;render()});
  $('progress-filter').addEventListener('change',e=>{ui.filter=e.target.value;render()});
  $('progress-search').addEventListener('input',e=>{ui.query=e.target.value;render()});
  $('progress-refresh').addEventListener('click',refresh);
  refresh();
})();
