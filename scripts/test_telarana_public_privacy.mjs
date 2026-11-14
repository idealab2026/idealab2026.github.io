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
// El repositorio es público incluso para archivos excluidos de Pages.
const tracker = JSON.parse(fs.readFileSync(path.join(dir, "progreso-fuentes.json"), "utf8"));
assert(!forbidden.test(JSON.stringify(tracker)), "El seguimiento público contiene enlaces privados");
function checkPrivateIds(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (["untimedTranscriptDriveId", "auditDriveId"].includes(key)) {
      assert(item === null, `Identificador privado en seguimiento: ${key}`);
    }
    checkPrivateIds(item);
  }
}
checkPrivateIds(tracker);
console.log(`OK: ${scripts.length} módulos y la página sin enlaces a archivos privados`);
