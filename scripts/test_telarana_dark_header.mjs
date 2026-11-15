/* Contraste del encabezado de La Telaraña y su menú móvil. */
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("la-telarana/index.html","utf8");
const logo=fs.readFileSync("la-telarana/logo-idea-lab-dark.svg","utf8");
const oldLogo=fs.readFileSync("logo-idea-lab.svg","utf8");
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
const css=html.split("<style>")[1]?.split("</style>")[0]||"";

function rule(selector){
 // Buscar el inicio exacto del selector: el estado activo también aparece dentro de una lista
 // de selectores combinados y no debe confundirse con esa otra declaración.
 const line=css.split("\n").find(line=>line.trimStart().startsWith(selector+"{"));
 assert(line,"No se encuentra regla independiente de "+selector);
 return line.slice(line.indexOf("{"),line.indexOf("}")+1);
}
const header=rule(".site-header"),name=rule(".site-name"),product=rule(".site-product"),nav=rule(".site-nav-link");
const navOpen=rule('.site-nav-link[aria-expanded="true"]'),active=rule(".site-nav-link.is-current");
const mobile=css.split("\n").find(line=>line.startsWith(" .site-nav{display:none;"));
assert(mobile,"Falta declaración de menú móvil");
assert(header.includes("background:linear-gradient(180deg,#182c3b 0%,#102131 100%)"),"Cabecera azul petróleo");
assert(header.includes("border-bottom:1px solid #324b60"),"Contorno integrado con la web");
assert(!header.includes("background:#fff"),"No debe volver el fondo blanco");
assert(name.includes("color:#f3f6fa"),"Título claro");
assert(product.includes("color:#b8c6d5"),"Subtítulo en gris azulado");
assert(nav.includes("color:#c3d0dc"),"Enlaces con contraste suficiente");
assert(navOpen.includes("text-decoration-color:#d9a24a"),"Enlace desplegado resaltado en dorado");
assert(active.includes("text-decoration-color:#d9a24a"),"Sección activa resaltada en dorado");
assert(rule(".site-menu-toggle").includes("background:#1d3446"),"Botón móvil oscuro");
assert(mobile.includes("background:#14293b"),"Menú desplegable móvil también oscuro");
assert(mobile.includes("border:1px solid #355066"),"Borde de menú móvil");
assert(css.includes(" .site-nav-link{justify-content:flex-start;font-size:14px;min-height:45px;padding:10px 13px;border-bottom:1px solid #2b4355}"),"Separadores móviles de la misma paleta");

assert(html.includes('src="./logo-idea-lab-dark.svg"'),"Cabecera usa logotipo IDEA LAB específico para fondo oscuro");
assert(!html.includes('src="/logo-idea-lab.svg"'),"No utilizar el logotipo oscuro original sobre azul petróleo");
assert(logo.includes('fill="#eef3f9">IDEA</text>'),"El texto IDEA debe ser blanco claro");
assert(logo.includes('fill="#d69f26">LAB</text>'),"LAB conserva su tono dorado");
assert(logo.includes('fill="#07304b"'),"Se preserva el icono institucional");
assert(oldLogo.includes('fill="#07304b">IDEA</text>'),"El SVG original de IDEA LAB no ha sido modificado");
assert(workflow.includes("cp la-telarana/logo-idea-lab-dark.svg dist/la-telarana/logo-idea-lab-dark.svg"),"La distribución debe incluir el logotipo claro");

function lum(hex){
 const c=hex.replace("#","").match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const fg of ["#f3f6fa","#c3d0dc","#b8c6d5"]){
 assert(contrast(fg,"#182c3b")>=4.5&&contrast(fg,"#102131")>=4.5,"Contraste WCAG AA en cabecera: "+fg);
}
assert(contrast("#c3d0dc","#14293b")>=4.5,"Contraste en menú móvil");
console.log("OK: cabecera azul petróleo y menú móvil oscuro, contrastes AA y logotipo IDEA LAB legible en claro/dorado.");
