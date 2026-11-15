/* Regresión: todas las entidades del antiguo panel fotográfico deben poder recorrerse. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("la-telarana/index.html","utf8");
const css=html.split("<style>")[1]?.split("</style>")[0]||"";
const viewportRule=css.match(/\.graph-panel\.entity-list-view #gallery\s*\{([^}]+)\}/)?.[1]||"";
assert(viewportRule,"Falta el scroll propio del listado de entidades");
for(const property of [
 "height:100%","min-height:0","max-height:100%",
 "overflow-y:auto","overflow-x:hidden","overscroll-behavior-y:contain",
 "-webkit-overflow-scrolling:touch","touch-action:pan-y",
 "align-content:start","grid-auto-rows:max-content"
])assert(viewportRule.includes(property),"Falta "+property+" en el listado");
assert(css.includes(".graph-stack>.graph-panel{height:660px"),"El mapa mantiene la altura fija prevista");
assert(css.includes(".graph-panel.entity-list-view #gallery:focus-visible"),"El listado permite desplazar mediante teclado");
assert(css.includes("@media(max-width:600px){\n .graph-panel.entity-list-view #gallery"),"Adaptación táctil para móvil");

const gallery=html.match(/<div id="gallery"[^>]+><\/div>/)?.[0]||"";
assert(gallery.includes('role="region"')&&gallery.includes('tabindex="0"'),"Zona desplazable accesible al teclado");
assert(gallery.includes("Listado de entidades"),"Nombre accesible actualizado");
assert(html.includes('id="header-photos"')&&html.includes('>Listado de entidades</button>'),"Nombre en navegación superior");
assert(html.includes('id="mode" aria-controls="gallery">Ver listado de entidades</button>'),"Botón principal actualizado");
assert(!html.includes("Ver panel de fotografías")&&!html.includes("Panel fotográfico"),"No debe quedar el antiguo nombre");
assert(html.includes('Haz clic en una entidad, ficha o línea de conexión'),"La ficha no debe exigir fotografías");

const start=html.indexOf("function setView(){");
const end=html.indexOf("\n // Priorizar nombres",start);
assert(start>0&&end>start,"setView debe mantenerse");
const code=html.slice(start,end);
const state={};
function element(id){
 if(!state[id]){
  const classes=new Set();
  state[id]={id,classes,textContent:"",disabled:false,
   classList:{toggle:(key,on)=>{if(on)classes.add(key);else classes.delete(key)}}
  };
 }
 return state[id];
}
const context={$:element,view:"graph",dimensionMode:"3d",syncProductHeader:()=>{}};
vm.createContext(context);
vm.runInContext(code,context,{timeout:2000});
context.setView();
assert(element("gallery").classes.has("hidden"),"Con el mapa activo, se oculta el listado");
assert(!element("graph-panel").classes.has("entity-list-view"),"Sin scroll especial en modo orbe");
assert.equal(element("mode").textContent,"Ver listado de entidades");
assert.equal(element("view-title").textContent,"Mapa relacional 3D");
context.view="gallery";
context.setView();
assert(!element("gallery").classes.has("hidden"),"La galería se muestra al seleccionar listado");
assert(element("graph-panel").classes.has("entity-list-view"),"La galería activa el scroll dentro del panel");
assert(element("stage3d").classes.has("hidden"),"El canvas no debe interceptar el scroll");
assert.equal(element("view-title").textContent,"Listado de entidades");
assert.equal(element("mode").textContent,"Ver mapa relacional");
context.view="graph";
context.setView();
assert(!element("graph-panel").classes.has("entity-list-view"),"Volver al mapa recupera estado original");
assert(element("gallery").classes.has("hidden"),"El listado se oculta al volver al orbe");
console.log("OK: listado de entidades desplazable en desktop y móvil, nombres consistentes y vista 3D conservada.");
