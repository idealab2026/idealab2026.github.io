// La web no debe publicar enlaces a archivos de trabajo privados.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = "la-telarana";
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["'](\.\/[^"']+)["']/gi)]
  .map(match => match[1].split("?")[0]);
assert(scripts.length > 20, "No se ha encontrado la lista real de módulos");
const forbidden = /https?:\/\/(?:docs\.google\.com\/document\/d\/|drive\.google\.com\/(?:file\/d|drive\/folders)\/)/i;
for (const file of ["index.html", ...scripts]) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");
  assert(!forbidden.test(content), `Enlace a archivo privado en recurso público: ${file}`);
}
console.log(`OK: ${scripts.length} módulos y la página sin enlaces a archivos privados`);
