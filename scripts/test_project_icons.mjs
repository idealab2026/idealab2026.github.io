// Homepage project cards must each show a real, same-origin icon asset.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=readFileSync(path.join(root,"index.html"),"utf8");
const items=[...html.matchAll(/<article class="card"><div class="cardtop with-project-icon"><div class="project-icon-title"><img src="([^"]+)"[^>]+><h3>([^<]+)<\/h3>/g)];
assert.equal(items.length,6,"All six public projects must show a logo");
const names=["España en Datos","PSICOHISTORIA","MIDAS",
  "Línea de la Historia","La Telaraña","La Biblioteca de Montecristo"];
for(const [i,name] of names.entries()){
 const item=items[i];
 assert.ok(item,`Missing icon in card ${name}`);
 assert.equal(item[2],name,`Unexpected project order ${name}`);
 const icon=item[1];
 assert.ok(icon.startsWith("/")&&!icon.startsWith("//"),`Asset must be hosted locally: ${icon}`);
 const relative=icon.slice(1);
 const file=path.join(root,relative);
 assert.ok(existsSync(file),`Missing icon asset ${relative}`);
 if(icon.endsWith(".svg")){
   const xml=readFileSync(file,"utf8");
   assert.match(xml,/<svg\s/);
   assert.match(xml,/viewBox="0 0 128 128"/);
   assert.match(xml,/<title/);
 }
}
assert.match(html,/\.project-icon-title img\{[^}]*width:60px;height:60px/);
assert.match(html,/@media\(max-width:620px\)/);
assert.doesNotMatch(html,/https:\/\/x\.com\/LARREALIDAD|Visitar el canal en X|<h3>LAREALIDAD<\/h3>/,"X editorial channel should not appear on IDEA LAB homepage");
console.log("OK: 6 project icons, no X channel, local paths, SVG metadata, responsive styles");
