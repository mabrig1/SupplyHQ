"use strict";
const assert=require("node:assert/strict");
async function main(){
 const {AGENTS,runAgent,routeAgent}=await import("../worker/src/agent-core.js");
 const {agentApi}=await import("../worker/src/agent-api.js");
 assert.equal(AGENTS.length,28);
 assert.equal(new Set(AGENTS.map(a=>a.id)).size,28,"Agents have distinct IDs");
 const publicProducts=[
 {id:1,name:"POGA 20000mAh power bank",category:"Power Banks",description:"USB output",price:12500,stock:3,unit:"each",storeName:"Verified Shop",storeSlug:"verified-shop"},
 {id:2,name:"Fast USB charger",category:"Chargers",description:"USB-C connection",price:4900,stock:8,unit:"each",storeName:"Verified Shop",storeSlug:"verified-shop"},
 {id:3,name:"Compact speaker",category:"Audio",description:"Bluetooth speaker",price:17800,stock:0,unit:"each",storeName:"Verified Shop",storeSlug:"verified-shop"}
 ];
 const own=[
 {...publicProducts[0],id:11,price:15000,stock:1,status:"Draft",imageUrl:null,storeSlug:"alice-store"},
 {...publicProducts[0],id:12,price:15200,stock:3,status:"Draft",imageUrl:"photos/a.jpg",storeSlug:"alice-store"},
 {...publicProducts[1],id:13,stock:7,status:"Published",storeSlug:"alice-store"}
 ];
 const seller={id:"alice-store-id",slug:"alice-store",name:"Alice Store",description:"Accessories",location:"Lagos",approval:"Pending"};
 const buyerCtx={audience:"buyer",products:publicProducts,stores:[{name:"Verified Shop",slug:"verified-shop",description:"Tech",location:"Lagos"}]};
 const sellerCtx={audience:"seller",products:own,store:seller,publicProducts,sources:["test-owned-data"]};
 const before=JSON.stringify({buyerCtx,sellerCtx});
 for(const a of AGENTS){
  const input={agentId:a.id,query:a.audience==="seller"?"power bank":"power",budget:30000,unitCost:8500,productId:a.audience==="seller"?11:1,target:10,threshold:3};
  const ctx=a.audience==="seller"?sellerCtx:buyerCtx;
  const data=runAgent(input,ctx);
  assert.equal(data.ok,true,a.id);
  assert.ok(data.summary&&typeof data.summary==="string",a.id+" no summary");
  assert.ok(Array.isArray(data.items),a.id+" no results array");
  assert.ok(Array.isArray(data.nextSteps),a.id+" no next steps");
  assert.ok(data.items.length<=8,a.id+" unbounded results");
  assert.equal(data.execution,"deterministic-read-only");
 }
 assert.equal(before,JSON.stringify({buyerCtx,sellerCtx}),"Agents must not mutate store or products");
 assert.throws(()=>runAgent({agentId:"margin-check"},buyerCtx),e=>e.status===403,"Buyer cannot run seller workflows");
 assert.throws(()=>runAgent({agentId:"not-an-agent"},buyerCtx),e=>e.status===404);
 assert.equal(routeAgent("show me lowest priced products","buyer"),"value-ranker");
 assert.equal(routeAgent("check my profit margin","seller"),"margin-check");
 const request=(path,method="GET",body=null)=>new Request("https://api.example.test"+path,{
  method,headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined
 });
 const sqlLogs=[];
 const env={DB:{prepare(sql){
  sqlLogs.push(sql);
  const exec=args=>({
   first:async()=>sql.includes("FROM merchant_stores s JOIN supplier_profiles")?{...seller}:null,
   all:async()=>({results:
    sql.includes("FROM merchant_products p JOIN merchant_stores s")?publicProducts:
    sql.includes("FROM merchant_stores s JOIN supplier_profiles")?buyerCtx.stores:
    sql.includes("FROM merchant_products WHERE store_id=?")?own:[]})
  });
  return {...exec([]),bind:(...args)=>exec(args)};
 }}};
 const tools={
  json:(body,status=200)=>Response.json(body,{status}),
  requireAuth:async()=>({id:"alice",role:"supplier"}),
  bodyJson:r=>r.json(),
  audit:async()=>{}
 };
 let response=await agentApi(request("/api/agents"),env,tools);
 let data=await response.json();assert.equal(data.agents.length,28);
 response=await agentApi(request("/api/agents/catalog"),env,tools);
 data=await response.json();assert.equal(data.products.length,3);
 response=await agentApi(request("/api/agents/run","POST",{agentId:"smart-search",query:"power"}),env,tools);
 data=await response.json();assert.equal(data.executedAgent,"smart-search");
 response=await agentApi(request("/api/agents/run","POST",{agentId:"catalog-auditor"}),env,tools);
 data=await response.json();assert.equal(data.executedAgent,"catalog-auditor");
 assert.ok(sqlLogs.some(s=>s.includes("sp.status='Approved'")),"Public catalogue must require approval");
 assert.ok(sqlLogs.some(s=>s.includes("WHERE s.owner_user_id=?")),"Seller-owned reads must be scoped");
 response=await agentApi(request("/api/agents/compose","POST",{agentId:"description-helper",consent:true,productId:11}),env,tools);
 assert.equal(response.status,503,"Provider missing should fail closed");
 console.log("PASS: 28 executable agent workflows; router, read-only execution, role checks, public approval and tenant-scoped queries.");
}
main().catch(e=>{console.error(e);process.exit(1);});
