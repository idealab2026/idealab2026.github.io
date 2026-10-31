// End-to-end isolated render contract: no DOM package or network required.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL("../stats.js",import.meta.url),"utf8");

async function render(values,missing=false){
  const handlers={};
  const root={
    innerHTML:"",
    querySelector(selector){
      return {addEventListener:(event,cb)=>{handlers[selector+":"+event]=cb;}};
    }
  };
  const currentDay="2026-10-31";
  const payload={schema:1,status:"verified",generatedAt:"2026-10-31T19:10:56Z",
    days:[{day:currentDay,values}]};
  const document={querySelector(selector){return selector==="#stats-dashboard"?root:null;}};
  const fetch=async url=>{
    if(missing&&url==="/data/traffic.json")return {ok:false};
    return {ok:true,json:async()=>payload};
  };
  runInNewContext(source,{document,fetch,Intl});
  await new Promise(resolve=>setTimeout(resolve,15));
  return {html:root.innerHTML,handlers};
}
test("Cloudflare totals agree with displayed count in every public web",async()=>{
 const x=await render({
  observatorio:{visits:1,pageViews:17},
  midas:{visits:0,pageViews:0},
  psicohistoria:{visits:0,pageViews:0}
 });
 assert.match(x.html,/Visitas registradas<\/span><strong>1<\/strong>/);
 assert.match(x.html,/Páginas vistas<\/span><strong>17<\/strong>/);
 assert.match(x.html,/España en Datos[\s\S]*?class="stat-site-visits">1 <small>visitas/);
 assert.match(x.html,/España en Datos[\s\S]*?17 páginas vistas/);
 assert.match(x.html,/MIDAS[\s\S]*?class="stat-site-visits">0 <small>visitas/);
 assert.match(x.html,/Psicohistoria[\s\S]*?class="stat-site-visits">0 <small>visitas/);
 assert.doesNotMatch(x.html,/class="stat-site-visits">Sin datos/);
 assert.match(x.html,/Última extracción: 2026-10-31 19:10 UTC/);
 assert.match(x.html,/option value="visits" selected/);
});
test("Missing site data stays unknown rather than zero",async()=>{
 const x=await render({observatorio:{visits:1,pageViews:17}});
 assert.match(x.html,/España en Datos[\s\S]*?class="stat-site-visits">1 <small>visitas/);
 assert.match(x.html,/MIDAS[\s\S]*?class="stat-site-visits">Sin datos <small>visitas/);
 assert.match(x.html,/Psicohistoria[\s\S]*?class="stat-site-visits">Sin datos <small>visitas/);
});
