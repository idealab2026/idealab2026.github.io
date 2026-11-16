// Test E2E de datos: el año 1076 debe mostrar las imágenes reales de la hoja Excel, no un panel vacío.
// Se ejecuta tras la extracción del ZIP original dentro de la distribución GitHub Pages.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(process.argv[2]||path.join(here,"..","linea-historia"));
const read=name=>fs.readFileSync(path.join(dir,name),"utf8");
const imported=JSON.parse(read("atlas-imported.json"));
const placement=JSON.parse(read("atlas-placement.json"));
const inventory=JSON.parse(read("atlas-inventory.json"));
assert.equal(imported.items.length,81);
assert.equal(placement.records.length,81);
assert.equal(inventory.items.length,81);
assert.ok(imported.status==="authorized_for_publication_by_owner");

const anchored=new Map(imported.items.map(i=>[i.anchor,i]));
const positioned=new Map(placement.records.map(p=>[p.anchor,p]));
const labels=new Map(inventory.items.map(i=>[i.anchor,i]));
assert.equal(anchored.size,81);
assert.equal(positioned.size,81);
for(const [anchor,item] of anchored){
 assert.ok(positioned.has(anchor),"Image without calendar coordinate "+anchor);
 assert.ok(labels.has(anchor),"Image without inventory title "+anchor);
 assert.ok(fs.statSync(path.join(dir,item.src.slice(2))).size>1000,"Missing original WebP "+anchor);
}
// Side-by-side original medieval cartography in the user's 1020–1220 screenshot.
for(const [anchor,year] of [["NW6",980],["OE6",1060],["OP5",1170]]){
 assert.equal(positioned.get(anchor).placementYear,year);
 const item=anchored.get(anchor);
 assert.match(item.src,/\/atlas-media\/image[0-9]+-.*\.webp$/);
 assert.equal(item.asOf,null,"An approximate Excel placement was incorrectly promoted to an exact map date.");
 const radius=year<=1500?130:85;
 assert.ok(1076>=year-radius&&1076<=year+radius,"The 1076 view is missing "+anchor);
}
const contextual=positioned.size&&placement.records.filter(p=>Number.isFinite(p.placementYear)&&
  p.placementYear>=946&&p.placementYear<=1206).map(p=>p.anchor);
assert.ok(contextual.includes("OE6"),"The 1060 screenshot must appear at 1076");
const ctx=read("timeline-visual-context.js");
new vm.Script(ctx,{filename:"timeline-visual-context.js"});
assert.match(ctx,/source\("\.\/atlas-placement\.json"\)/);
assert.match(ctx,/function qualifyOriginal\(row,placement,inventory\)/);
assert.doesNotMatch(ctx,/return matching\.slice\(0,3\)/,"No 3-card cap allowed");
assert.match(ctx,/visual-context-next/);
const atlas=read("atlas.js");
new vm.Script(atlas,{filename:"atlas.js"});
assert.match(atlas,/placements=new Map/);
assert.match(atlas,/mapYearLabel/);
const page=read("index.html");
assert.match(page,/timeline-visual-context\.js\?v=20261116-ubicaciones-v2/);
const css=read("timeline-visual-context.css");
assert.match(css,/\.visual-context-card:nth-child\(n\)/);
console.log("OK: 81 originals indexed, 1076 shows NW6, OE6 and OP5, no hidden fourth card, local image assets valid");
