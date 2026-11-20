/* Control de integridad del bundle de La Telaraña tras copiar la lista blanca a dist. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const html=fs.readFileSync("dist/la-telarana/index.html","utf8");
const refs=Array.from(html.matchAll(/<script\b[^>]*\bsrc=["'](\.\/[^"']+\.js(?:\?[^"']*)?)["']/g),m=>m[1]);
assert(refs.length>=90,"El HTML no conserva el inventario de scripts públicos");
const missing=[];
for(const ref of refs){
 const file=ref.split("?")[0].slice(2);
 assert(!file.includes("..")&&!path.isAbsolute(file),"Ruta de script no permitida: "+ref);
 const dest=path.join("dist/la-telarana",file);
 if(!fs.existsSync(dest)||fs.statSync(dest).size===0)missing.push(ref);
}
assert.deepEqual(missing,[],"Scripts de La Telaraña omitidos en la distribución: "+missing.join(", "));
const newScript="dist/la-telarana/redes-politicas-verificadas-20261120.js";
const text=fs.readFileSync(newScript,"utf8");
assert(text.includes("David Hatchwell Altaras")&&text.includes("IDEA_TELARANA_REDES_POLITICAS_VERIFICADAS"),"No se empaquetaron las nuevas conexiones verificadas");
console.log("OK: "+refs.length+" scripts íntegros y capa política documentada incluida en GitHub Pages");
