// Verify piecewise timeline: annual before 2010; calendar months from Jan 2010.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const folder=path.resolve(process.argv[2]||path.join(here,"..","linea-historia"));
const read=name=>fs.readFileSync(path.join(folder,name),"utf8");
const src=read("timeline-v4.js"),html=read("index.html");
new vm.Script(src,{filename:"timeline-v4.js"});
assert.match(html,/timeline-v4\.js\?v=20261118-monthly-axis/);
assert.match(html,/\.tick\.month-tick/);
assert.match(html,/\.year-guide\.month-guide/);

function sliceBetween(a,b){
 const start=src.indexOf(a),end=src.indexOf(b,start);
 assert.ok(start>=0&&end>start,"Missing code segment "+a);
 return src.slice(start,end);
}
const code=sliceBetween("var periods=[","/* Geographic links")+
 "var YEAR_PX=96,zoom=1;\n"+
 sliceBetween("var MONTH_START_YEAR=2010","function geoFold(str)")+
 sliceBetween("function withinPeriodWidth(p,year){","function eraAt(year){")+
 sliceBetween("function grouped(items,c){","function niceStep(n){")+
 sliceBetween("function updateAnnualHeader(){","function render(){");
const ctx=vm.createContext({Map,Set,Math,Number});
vm.runInContext(code,ctx,{filename:"month-geometry.js"});
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-5,
 label+": expected "+expected+", got "+actual);

for(const zoom of [.125,.25,.5,1,2,4,8]){
 ctx.zoom=zoom;
 close(ctx.axisX(2009)-ctx.axisX(2008),96*zoom,"Old annual width");
 close(ctx.axisX(2010)-ctx.axisX(2009),96*zoom,"Transition to January 2010");
 close(ctx.axisX(2010+1/12)-ctx.axisX(2010),56*zoom,"January 2010 width");
 close(ctx.axisX(2011)-ctx.axisX(2010),672*zoom,"Twelve equal months");
 for(const year of [-3000,-44,476,1492,1789,2009,2010,2010+1/12,2016.5,2026+11/12,2030+11/12,2031]){
  close(ctx.yearAt(ctx.axisX(year)),year,"Invertible time coordinate "+year);
 }
 for(let month=0;month<12;month++){
  close(ctx.axisX(2025+(month+1)/12)-ctx.axisX(2025+month/12),
   56*zoom,"Calendar month width "+month);
 }
 close(ctx.yearAt(ctx.axisX(2010)),2010,"Continuous scale boundary");
}
assert.equal(ctx.MONTH_LABELS.join(","),"Ene,Feb,Mar,Abr,May,Jun,Jul,Ago,Sep,Oct,Nov,Dic");
ctx.zoom=1;
ctx.query="";
ctx.sy=d=>d.y;
const recent=ctx.grouped([
 {id:"jan1",y:2010+1/48,c:"Actualidad"},
 {id:"jan2",y:2010+1/24,c:"Actualidad"},
 {id:"feb1",y:2010+1/12,c:"Actualidad"},
 {id:"feb2",y:2010+1/12+1/48,c:"Actualidad"}
],"Actualidad");
assert.equal(recent.length,2,"Separate January and February groups");
assert.equal(recent[0].groupLabel,"Ene 2010");
assert.equal(recent[1].groupLabel,"Feb 2010");
assert.equal(recent[0].count,2);

assert.equal(recent[1].count,2);

// Lower zoom retains exact monthly geometry, but uses summaries for readability.
for(const [level,monthsPerGroup,groupName] of [
 [.125,12,"2010"],[.25,6,"2010 · S1"],[.5,3,"2010 · T1"]
]){
 ctx.zoom=level;
 const items=[
  {id:"january",y:2010+1/24,c:"Actualidad"},
  {id:"february",y:2010+1/12+1/48,c:"Actualidad"},
  {id:"july",y:2010+6/12+1/48,c:"Actualidad"}
 ];
 const actual=ctx.grouped(items,"Actualidad");
 assert.equal(actual[0].groupLabel,groupName,"Wrong overview label at zoom "+level);
 assert.equal(actual[0].count,monthsPerGroup===12?3:2,"Incorrect compact summary size at zoom "+level);
 assert.equal(actual.length,monthsPerGroup===12?1:2,"Wrong number of groups at zoom "+level);
}


const recentSource=JSON.parse(read("data.json")).items.filter(d=>Number(d.y)>=2010);
const fractional=recentSource.filter(d=>Number(d.y)%1!==0);
assert.ok(fractional.length>300,"Source monthly precision disappeared");

ctx.el=(tag,text,className)=>({
 tag,text,className,style:{},children:[],
 append(child){this.children.push(child)},
 setAttribute(name,value){this[name]=value}
});
ctx.viewMode="timeline";
ctx.yearWindowKey="";
ctx.yearAxisLayer={replaceChildren(...children){this.children=children}};
const lane={replaceChildren(...children){this.children=children}};
ctx.yearGridLayers=[lane];
ctx.$=id=>id==="viewport"?{scrollLeft:ctx.axisX(2020),clientWidth:1600}:null;
ctx.updateAnnualHeader();
const months=ctx.yearAxisLayer.children.filter(el=>el.className.includes("month-tick"));
assert.ok(months.length>=24,"Monthly labels must be rendered within visible range");
const monthGuide=lane.children.filter(el=>el.className.includes("month-guide"));
assert.ok(monthGuide.length>=22,"Vertical monthly grid must cover every lane");
const labels=new Set(months.map(el=>el.children[0]?.text));
assert.ok(labels.has("Ene")&&labels.has("Dic"),"All 12 month names must be present");
for(const [level,monthlyStride,annualStride] of [
 [.125,6,10],[.25,3,5],[.5,2,2],[1,1,1]
]){
 ctx.zoom=level;
 ctx.yearWindowKey="";
 const v={scrollLeft:ctx.axisX(2005)-150,clientWidth:2300};
 ctx.$=id=>id==="viewport"?v:null;
 ctx.updateAnnualHeader();
 const row=ctx.yearAxisLayer.children;
 const modern=row.filter(el=>el.className.includes("month-tick"));
 assert.ok(modern.length>0,"Expected at least one modern calendar month at "+level);
 const names=modern.map(t=>t.children[0].text);
 assert.ok(names.includes("Ene"),"January label missing at "+level);
 if(level<=.25)assert.ok(!names.includes("Feb"),"Small zoom must not crowd February label");
 const oldYears=row.filter(el=>el.className.includes("year-tick")&&!el.className.includes("monthly-year-tick"))
  .map(el=>el.children[0].text);
 assert.ok(oldYears.length>0,"Missing historic years at "+level);
 if(level===.125)assert.ok(oldYears.every(label=>/0 (?:a|d)\. C\./.test(label)||label==="Cambio de era"),"Low-zoom annual labels too dense");
 // The original coordinate is preserved; center year is recovered after changing zoom.
 const target=2016.5;
 close(ctx.yearAt(ctx.axisX(target)),target,"Center year after zoom "+level);
}

console.log("OK: 2010 monthly axis, 12 months/year, year/pixel inverse, grid and grouped Actualidad");
