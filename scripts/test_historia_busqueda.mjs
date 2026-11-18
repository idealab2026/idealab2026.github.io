// Historical search regression: matches from HISTORIA.xlsx must be findable
// and jump to their year instead of remaining in the previously visible era.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(process.argv[2]||path.join(here,"..","linea-historia"));
const read=name=>fs.readFileSync(path.join(dir,name),"utf8");
const src=read("timeline-v4.js");
new vm.Script(src,{filename:"timeline-v4.js"});
const html=read("index.html");
assert.match(html,/id="history-search-results"/);
assert.match(html,/id="history-search-matches"/);
assert.match(html,/id="history-search-status"/);
assert.match(html,/timeline-v4\.js\?v=20261118-zoom-out-x0125/);

const begin=src.indexOf("var historySearchAliases=");
const end=src.indexOf("function visible(){",begin);
assert.ok(begin>0&&end>begin,"Search matcher missing");
const section=src.slice(begin,end);
const fold='function geoFold(str){return String(str||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase()}\n';
const matched=vm.runInNewContext(fold+section+"\n matchesHistorySearch;");
const data=JSON.parse(read("data.json")).items;
const acad=data.find(d=>d.id==="h-DJ35");
const sargon=data.find(d=>d.id==="h-DN44");
const literature=data.find(d=>d.id==="l-6");
assert.ok(acad&&sargon&&literature,"Missing original historical records");
assert.match(acad.t,/ACADIOS/);
assert.match(sargon.t,/Sargón I de Acad/);
assert.equal(matched(acad,"acad"),true,"Acadios not matched");
assert.equal(matched(acad,"imperio acadio"),true,"Common historical name not matched");
assert.equal(matched(sargon,"acad"),true,"Sargon is missing from Acad results");
assert.equal(matched(sargon,"sargon"),true,"Accent-insensitive Sargon lookup failed");
assert.equal(matched(literature,"acadia"),true,"Akkadian literature should also match");
assert.equal(matched(sargon,"imperio romano"),false,"Unrelated search unexpectedly matches");
assert.ok(acad.y<0&&sargon.y<0);
assert.ok(acad.y>=-3000&&sargon.y>=-3000,"Records outside timeline historical axis");

// The preceding bug returned filtered records but never moved the viewport.
assert.ok(src.includes("jumpToYear(sy(hits[0]))"),"Input must navigate to first hit");
assert.ok(src.includes("if(first)navigateSearchResult(first)"),"Enter must open a hit");
assert.ok(src.includes('e.key==="Enter"&&query.length>=2'),"Empty search must not navigate");
assert.ok(src.includes("incomingHits.length?sy(incomingHits[0]):1900"),"Early search must navigate after initial data load");
assert.ok(src.includes("b.addEventListener(\"click\",function(){navigateSearchResult(d)})"),"Results must be selectable");
assert.ok(src.includes("updateSearchResults(records)"),"Result list must refresh on render");
assert.ok(src.includes("query=geoFold(text)"),"User query must be accent-insensitive");
console.log("OK: original Acadios and Sargón searchable; accent aliases, jump and selectable results verified");
