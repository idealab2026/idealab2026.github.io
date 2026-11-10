/* Regresión: buscar entidades dentro de fullscreen nativo y fallback, sin cerrar el orbe. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("la-telarana/index.html","utf8");
const style=html.slice(html.indexOf("<style>")+7,html.indexOf("</style>"));
const body=html.slice(html.indexOf("<body"),html.indexOf("</body>"));
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim()).at(-1);
assert(js&&js.length>20000,"No se encuentra el controlador principal");
new vm.Script(js,{filename:"la-telarana/index-inline.js"});

const section=body.slice(body.indexOf('id="graph-panel"'),body.indexOf("</section>"));
assert(section.includes('id="fullscreen-search-bar"'),"El buscador debe ser descendiente del elemento fullscreen");
assert(section.includes('id="fullscreen-search-input"')&&section.includes('id="fullscreen-search-results"'),"Faltan campo o sugerencias");
assert(section.includes('id="fullscreen-search-clear"'),"Falta control de limpiar");
assert(section.includes('aria-label="Buscar una entidad en el mapa"'),"El control requiere etiqueta accesible");
assert(section.includes('autocomplete="off"'),"No confundir autocompletado del navegador con resultados del grafo");

assert(style.includes('.fullscreen-search-bar[hidden]'),"El buscador aparece fuera de pantalla completa");
assert(style.includes('z-index:40'),"Los resultados deben sobreponerse al canvas");
assert(style.includes('.graph-panel:fullscreen.drawer-open .fullscreen-search-bar'),"Se solapa el inspector de pantalla completa");
assert(style.includes('.graph-panel.is-fullscreen.drawer-open .fullscreen-search-bar'),"Se solapa el inspector del modo fallback");
assert(style.includes("@media(max-width:750px)"),"Faltan ajustes de móvil");
assert(style.includes(".fullscreen-search-results"),"Falta contenedor de sugerencias");

assert(js.includes('function renderFullscreenSearchResults(query)'),"Sin búsqueda incremental");
assert(js.includes('var matches=searchCandidates(query.trim())'),"No reutiliza el índice canónico");
assert(js.includes('fullscreenSearchItems=matches.slice(0,12)'),"Sin límite de resultados");
assert(js.includes('if(e.key==="ArrowDown"||e.key==="ArrowUp")'),"Sin navegación por teclado");
assert(js.includes('if(e.key==="Enter")'),"Enter no selecciona entidad");
assert(js.includes('if(e.key==="Escape"'),"Escape no cierra las sugerencias");
assert(js.includes('focusOnSearchEntity(entity)'),"Seleccionar no enfoca el nodo o abre su ficha");
assert(js.includes('hideFullscreenSearchResults();\n focusOnSearchEntity(entity);'),"La selección debe ocultar sugerencias y conservar fullscreen");
assert(js.includes('function syncFullscreenSearch()'),"No se actualiza al entrar o salir de fullscreen");
assert(js.includes('syncFullscreenInspector();\n syncFullscreenSearch();'),"El buscador debe sincronizarse en native fullscreen y fallback");
assert(js.includes('document.addEventListener("fullscreenchange",syncFullscreenButton)'),"No se maneja la salida por Esc");
assert(js.includes('$("fullscreen-search-clear").addEventListener("click"'),"No existe limpiar búsqueda");
assert(js.includes('$("search").value=this.value'),"No se sincroniza la consulta con el renderizado");
assert(js.includes('if(dimensionMode==="3d"&&graph3d&&graph3d.focusNode)graph3d.focusNode(n.id)'),"No se enfoca el orbe 3D");

console.log("OK: buscador fullscreen dentro del panel, navegación teclado, foco 3D, 2D, CSS móvil y salida nativa/fallback");
