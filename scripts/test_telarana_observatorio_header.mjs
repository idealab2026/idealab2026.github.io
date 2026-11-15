/* La Telaraña comparte lenguaje de cabecera con España en Datos: producto, navegación y móvil. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync("la-telarana/index.html","utf8");
const prefix=html.match(/<body><header class="site-header"[\s\S]*?<\/header>/)?.[0];
assert(prefix,"La cabecera propia debe sustituir a la antigua cabecera de texto");
for(const token of [
 'id="site-header"','class="site-header-inner"','class="site-identity"',
 'class="site-name"','La Telaraña</a>','Un producto de',
 'src="/logo-idea-lab.svg"','id="site-nav"','aria-label="Navegación principal de La Telaraña"',
 'id="header-map"','id="header-rankings"','id="header-sources"',
 'id="header-photos"','href="/linea-historia/"','href="/"',
 'id="header-menu-toggle"','aria-expanded="false"',
 'class="header-telarana-icon" src="./icon.svg"'
])assert(prefix.includes(token),"Falta elemento de cabecera "+token);
const ids=[...prefix.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,"IDs duplicados en la cabecera");
assert(!prefix.includes("INVESTIGACIÓN RELACIONAL")&&!prefix.includes("← Todos los proyectos"),"Texto antiguo retirado del encabezado");
const positions=["header-map","header-rankings","header-sources","header-photos"].map(x=>prefix.indexOf('id="'+x+'"'));
assert(positions.every((p,i)=>p>0&&(i===0||p>positions[i-1])),"Orden lógico de navegación");
const style=html.split("<style>")[1]?.split("</style>")[0]||"";
for(const css of [
 ".site-header{position:sticky;top:0",
 ".site-header-inner{max-width:1920px",
 ".site-name{font:700",
 ".site-product{display:flex",
 ".site-nav{display:flex",
 ".site-header .header-telarana-icon",
 ".site-menu-toggle{display:none",
 "@media(max-width:1160px)",
 "@media(max-width:700px)",
 ".site-nav.is-open{display:flex}",
 "scroll-margin-top:104px"
])assert(style.includes(css),"Falta regla de cabecera "+css);
assert(html.includes('id="mode"')&&html.includes('id="search"'),"La búsqueda original permanece funcional");
assert(html.includes('id="rankings-panel"')&&html.includes('id="sources-directory"')&&html.includes('id="gallery"'),"Apartados originales conservados");
assert(html.includes("openTopPanel(\"sources\")")&&html.includes("openTopPanel(\"rankings\")"),"El menú debe abrir los apartados existentes");
assert(html.includes('if(view!=="gallery")$("mode").click()'),"Fotografías activa la vista real");
assert(html.includes('if(view!=="graph")$("mode").click()'),"Mapa regresa del panel fotográfico");
assert(html.includes("function syncProductHeader()")&&html.includes("syncProductHeader();"),"Estados de navegación sincronizados");
assert(html.includes("function setHeaderMenu(open)")&&html.includes('event.key==="Escape"'),"Menú móvil accesible y cerrable");
assert(html.includes("setHeaderMenu(false)")&&html.includes("aria-expanded"),"Menú móvil informa de su estado");

const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).filter(s=>s.includes("var DEMO="));
assert.equal(scripts.length,1);
new vm.Script(scripts[0],{filename:"la-telarana/index.html"});

// Los botones de la cabecera reflejan la apertura de Rankings y Fuentes, y el modo Fotos.
const elements={};
class Fake{
 constructor(){this.open=false;this.attrs={};this.classes=new Set();
  this.classList={toggle:(name,condition)=>{if(condition)this.classes.add(name);else this.classes.delete(name)}};
 }
 setAttribute(key,value){this.attrs[key]=String(value)}
 removeAttribute(key){delete this.attrs[key]}
}
for(const id of ["sources-directory","rankings-panel","header-sources","header-rankings","header-photos","header-map"]){elements[id]=new Fake()}
const code=scripts[0],from=code.indexOf("function syncProductHeader(){"),to=code.indexOf("function moveToHeaderSection(",from);
assert(from>=0&&to>from,"Control del estado de navegación ausente");
const context={$:id=>elements[id],view:"graph"};
vm.createContext(context);
vm.runInContext(code.slice(from,to),context,{timeout:2000});
context.syncProductHeader();
assert.equal(elements["header-map"].attrs["aria-current"],"page");
elements["sources-directory"].open=true;context.syncProductHeader();
assert.equal(elements["header-sources"].attrs["aria-expanded"],"true");
assert.equal(elements["header-map"].attrs["aria-current"],undefined);
elements["sources-directory"].open=false;elements["rankings-panel"].open=true;context.syncProductHeader();
assert.equal(elements["header-rankings"].attrs["aria-expanded"],"true");
elements["rankings-panel"].open=false;context.view="gallery";context.syncProductHeader();
assert.equal(elements["header-photos"].attrs["aria-pressed"],"true");
assert(!elements["header-map"].classes.has("is-current"));
console.log("OK: cabecera estilo España en Datos, IDEA LAB, navegación real, menú móvil y estados sincronizados.");
