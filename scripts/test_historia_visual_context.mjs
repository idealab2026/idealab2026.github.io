// Regression guard: visual context images must be present in GitHub Pages and tied to correct periods.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const folder=path.resolve(process.argv[2]||path.join(here,"..","linea-historia"));
const read=(file)=>fs.readFileSync(path.join(folder,file),"utf8");
const html=read("index.html");
for(const file of ["timeline-v4.js","atlas.js","timeline-visual-context.js","timeline-visual-context.css","atlas-context.json","atlas-examples.json"]){
 assert.ok(fs.statSync(path.join(folder,file)).size>0,"Missing deployed asset: "+file);
}
assert.match(html,/src="\.\/timeline-visual-context\.js\?/);
assert.match(html,/href="\.\/timeline-visual-context\.css\?/);
new vm.Script(read("timeline-visual-context.js"),{filename:"timeline-visual-context.js"});
const src=read("timeline-visual-context.js");
const atlasSource=read("atlas.js");
assert.match(atlasSource,/drawAtlasDiagrams/);
assert.match(atlasSource,/"\.\/atlas-context\.json"/);
assert.match(atlasSource,/atlas-diagrams/);
for(const signature of ["historia:year","historia:focus","historia:view","timeline-visual-context","visual-context-dialog","atlas-context.json"]){
 assert.ok(src.includes(signature),"Missing context synchronization: "+signature);
}
const doc=JSON.parse(read("atlas-context.json"));
assert.equal(doc.items.length,5);
const ids=new Set(),need=["context-geologic-clock","context-geologic-scale","context-human-migration","context-younger-dryas","context-neolithic-spread"];
for(const item of doc.items){
 assert.ok(!ids.has(item.id),"Duplicate diagram ID");
 ids.add(item.id);
 assert.ok(Number.isFinite(item.from)&&Number.isFinite(item.to)&&item.from<=item.referenceYear&&item.referenceYear<=item.to,"Wrong period "+item.id);
 assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(item.src),"Non Commons image "+item.id);
 assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(item.sourceUrl),"Missing source "+item.id);
 assert.ok(item.license&&item.credit&&item.summary&&item.context,"Incomplete metadata "+item.id);
 assert.ok(item.excelAnchor&&item.excelOriginal,"Missing Excel source mapping "+item.id);
}
for(const id of need)assert.ok(ids.has(id),"Missing requested illustration "+id);
const dryas=doc.items.find(x=>x.id==="context-younger-dryas");
assert.equal(dryas.excelAnchor,"BR18");
assert.ok(dryas.from<=-12000&&dryas.to>=-12000);
const geological=doc.items.find(x=>x.id==="context-geologic-clock");
assert.match(geological.excelAnchor,/C11/);
// Publish originals only as a complete, explicitly authorized package.
if (fs.existsSync(path.join(folder,"atlas-imported.json"))) {
 const originals=JSON.parse(read("atlas-imported.json"));
 assert.equal(originals.items.length,81,"Incomplete original archive");
 assert.equal(originals.status,"authorized_for_publication_by_owner");
}
console.log("OK: synchronized visual context, 5 open diagrams and optional 81-image owner-authorized archive");
