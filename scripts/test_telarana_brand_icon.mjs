/* Miniatura La Telaraña: favicon y mismo símbolo en portada y cabecera; sin textos superpuestos. */
import assert from "node:assert/strict";
import fs from "node:fs";
const icon=fs.readFileSync("la-telarana/icon.svg","utf8");
const home=fs.readFileSync("index.html","utf8");
const tel=fs.readFileSync("la-telarana/index.html","utf8");
const pages=fs.readFileSync(".github/workflows/pages.yml","utf8");

assert(icon.startsWith("<svg")&&icon.trim().endsWith("</svg>"),"Icono SVG íntegro");
assert(/viewBox="0 0 128 128"/.test(icon),"Lienzo cuadrado apto para favicon");
assert(/<title[^>]*>La Telaraña · IDEA LAB<\/title>/.test(icon),"Título accesible del icono");
assert(/<desc[^>]*>/.test(icon),"Descripción accesible del icono");
assert((icon.match(/<circle/g)||[]).length>=12,"Debe representar una red de nodos legible");
assert(/id="sphere"/.test(icon)&&/id="gold"/.test(icon),"Paleta y nodos dorados");
assert(!/<script|<image\b|(?:href|src)="https?:\/\//i.test(icon),"El favicon debe ser autónomo, vectorial y sin activos externos");
assert(icon.length<10000,"El favicon no debe resultar pesado");

const iconPath="/la-telarana/icon.svg?v=20261115";
assert(home.includes('src="'+iconPath+'"'),"La tarjeta de La Telaraña debe usar el icono del proyecto");
const homeCard=home.match(/<article class="card"><div class="cardtop with-project-icon">[\s\S]*?<\/article>/);
assert(homeCard&&homeCard[0].includes("<h3>La Telaraña</h3>"),"Emblema en la tarjeta correcta");
assert(homeCard[0].includes('src="'+iconPath+'"'),"Mismo icono en la portada");
assert(home.includes(".project-icon-title img"),"Tamaño estable de miniatura en la página principal");
assert(home.includes('width="60" height="60"'),"Miniatura principal en formato compacto");

assert(tel.includes('<link rel="icon" href="./icon.svg?v=20261115" type="image/svg+xml">'),"Favicon específico, distinto del favicon global de IDEA LAB");
assert(tel.includes('class="header-telarana-icon" src="./icon.svg?v=20261115"'),"Emblema en la parte derecha de la cabecera");
assert(tel.includes('<div class="header-right"><a class="back"'),"Conservar acceso a todos los proyectos");
assert(tel.includes(".header-telarana-icon{width:50px;height:50px"),"Dimensión de icono de cabecera");
assert(tel.includes("@media(max-width:650px){.header-right"),"Cabecera adaptada a móvil");
assert(!tel.includes('id="graph-hint"')&&!tel.includes("Orbe 3D · gira arrastrando"),"Eliminar instrucciones superpuestas solicitadas");
assert(!tel.includes(".graph-hint{"),"Eliminar CSS obsoleto de instrucciones");

assert(pages.includes("cp la-telarana/icon.svg dist/la-telarana/icon.svg"),"GitHub Pages debe incluir el favicon nuevo en la distribución");
assert(pages.includes("test -s dist/la-telarana/icon.svg"),"Comprobar que el archivo existe en el artefacto");
console.log("OK: un icono La Telaraña en favicon, portada IDEA LAB y esquina superior derecha; sin pista del orbe.");
