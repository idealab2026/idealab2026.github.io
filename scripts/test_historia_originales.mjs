// Guard de publicación de las 81 imágenes originales autorizadas del libro HISTORIA.xlsx.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.resolve(process.argv[2]||path.join(here,"..","linea-historia"));
const file=path.join(base,"atlas-imported.json");
const catalog=JSON.parse(fs.readFileSync(file,"utf8"));
assert.equal(catalog.status,"authorized_for_publication_by_owner");
assert.equal(catalog.counts.images,81);
assert.equal(catalog.items.length,81);
assert.equal(catalog.items.filter((m)=>m.asOf!==null).length,6);
assert.equal(catalog.items.filter((m)=>m.asOf===null).length,75);

const used=new Set();
for(const m of catalog.items){
 assert.equal(m.provenance,"HISTORIA.xlsx");
 assert.equal(m.rightsStatus,"publicacion_autorizada_por_titular");
 assert.match(m.anchor,/^[A-Z]{1,3}[1-9][0-9]*$/);
 assert.match(m.src,/^\.\/atlas-media\/image[0-9]+-[a-f0-9]{12}\.webp$/);
 assert.ok(!used.has(m.src),"Duplicate original image path: "+m.src);
 used.add(m.src);
 const name=path.join(base,m.src.slice(2));
 const bytes=fs.readFileSync(name);
 assert.ok(bytes.length>=1024,"Image too small: "+name);
 assert.equal(bytes.subarray(0,4).toString("ascii"),"RIFF","Expected RIFF WebP: "+name);
 assert.equal(bytes.subarray(8,12).toString("ascii"),"WEBP","Expected WebP: "+name);
 if(m.asOf!==null){
  assert.ok(Number.isFinite(m.start)&&Number.isFinite(m.end));
  assert.ok(m.start<=m.asOf&&m.asOf<=m.end);
 }else{
  assert.equal(m.start,null);
  assert.equal(m.end,null);
 }
}
const files=fs.readdirSync(path.join(base,"atlas-media")).filter(x=>x.endsWith(".webp"));
assert.equal(files.length,81,"Unexpected number of published images");
console.log("OK: 81 original WebP images, 81 anchors, 6 historical dates, owner authorization and no missing assets");
