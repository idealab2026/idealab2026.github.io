// Regression: prevent an empty Atlas tab caused by missing GitHub Pages assets.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.resolve(process.argv[2] || path.join(here, "..", "linea-historia"));
const read = (name) => fs.readFileSync(path.join(folder, name), "utf8");
const html = read("index.html");

for (const id of ["tab-atlas", "atlas-panel", "history-atlas-context"]) {
  assert.match(html, new RegExp('id="' + id + '"'), "Falta elemento " + id);
}
assert.match(html, /src="\.\/timeline-v4\.js\?/);
assert.match(html, /src="\.\/atlas\.js\?/);
assert.match(html, /href="\.\/atlas\.css\?/);

// All local JS and CSS assets referenced by the HTML must be present in Pages.
const local = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\.\/[^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)]
  .map((m) => m[1].slice(2).split("?")[0]);
for (const file of local) {
  assert.ok(fs.statSync(path.join(folder, file)).size > 0, "Missing published asset: " + file);
}
for (const file of ["timeline-v4.js", "atlas.js"]) {
  new vm.Script(read(file), { filename: file });
}
const atlas = read("atlas.js");
assert.match(atlas, /initDOM\(\)/);
assert.match(atlas, /full\.innerHTML=/);
assert.match(atlas, /"historia:year"/);
assert.match(atlas, /"historia:focus"/);
assert.match(atlas, /"historia:view"/);
assert.match(atlas, /"\.\/atlas-examples\.json"/);
const catalog = JSON.parse(read("atlas-examples.json"));
assert.ok(Array.isArray(catalog.items) && catalog.items.length >= 5);
for (const map of catalog.items) {
  assert.equal(typeof map.id, "string");
  assert.ok(Number.isFinite(map.asOf) && Number.isFinite(map.start) && Number.isFinite(map.end));
  assert.ok(map.start <= map.asOf && map.asOf <= map.end);
  assert.match(map.src, /^https:\/\//);
  assert.match(map.sourceUrl, /^https:\/\//);
}
console.log("OK: Atlas mounted, " + local.length + " web assets found, " + catalog.items.length + " maps.");
