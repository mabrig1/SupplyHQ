"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
async function main(){
  const file=fs.readFileSync("worker/src/marketplace.js","utf8");
  const {marketplace}=await import("data:text/javascript;base64,"+Buffer.from(file).toString("base64"));
  const product={id:12,store_id:"store-a",name:"USB charger",category:"Accessories",description:"20W fast charger",price:6500,stock:9,unit:"each",image_key:null,status:"Draft",created_at:"2026-11-02"};
  const stores={alice:{id:"store-a",slug:"alice-tech",name:"Alice Tech",approval:"Pending",owner_user_id:"alice"},bob:{id:"store-b",slug:"bob-mart",name:"Bob Mart",approval:"Approved",owner_user_id:"bob"}};
  const execute=(sql,args,mode)=>{
    if(sql.includes("SELECT s.*, sp.status AS approval"))return stores[args[0]]||null;
    if(sql.includes("SELECT business,phone,location,status FROM supplier_profiles"))return {business:"Alice",phone:"2348000000000",location:"Lagos",status:args[0]==="bob"?"Approved":"Pending"};
    if(sql.includes("FROM merchant_products WHERE store_id=? AND status!='Archived'"))return [product].filter(p=>p.store_id===args[0]);
    if(sql.includes("SELECT * FROM merchant_products WHERE id=? AND store_id=?"))return Number(args[0])===product.id&&args[1]===product.store_id?product:null;
    if(sql.includes("SELECT id FROM merchant_stores WHERE slug=?"))return null;
    if(sql.includes("SELECT id FROM merchant_products"))return null;
    if(sql.includes("COUNT(*) AS n FROM merchant_products"))return {n:0};
    if(sql.includes("COUNT(*) AS n FROM merchant_uploads"))return {n:0};
    if(sql.includes("SELECT id,status FROM supplier_profiles WHERE user_id=?"))return {id:"supplier-"+args[0],status:"Pending"};
    if(sql.includes("SELECT key FROM merchant_uploads"))return null;
    if(sql.includes("FROM merchant_uploads m WHERE m.key=?"))return null;
    if(sql.includes("SELECT s.id,s.slug"))return null;
    if(sql.includes("GROUP BY s.id"))return [];
    return mode==="all"?[]:null;
  };
  const env={DB:{prepare(sql){return{bind(...args){return{
    first:async()=>execute(sql,args,"first"),all:async()=>({results:execute(sql,args,"all")||[]}),
    run:async()=>({success:true})
  };}}}}};
  const utils={
    json:(body,status=200)=>Response.json(body,{status}),
    requireAuth:async request=>({id:request.headers.get("x-test-user"),role:"supplier"}),
    authUser:async request=>({id:request.headers.get("x-test-user")}),
    bodyJson:async request=>request.json(),
    routeMatch:(path,pattern)=>{
      const p=path.split("/").filter(Boolean),pat=pattern.split("/").filter(Boolean),params={};
      if(p.length!==pat.length)return null;
      for(let i=0;i<p.length;i++)if(pat[i].startsWith(":"))params[pat[i].slice(1)]=p[i];else if(pat[i]!==p[i])return null;
      return params;
    },
    audit:async()=>{}
  };
  function call(path,who="alice",method="GET",body=null){
    return marketplace(new Request("https://api.supplyhq.test"+path,{
      method,headers:{"x-test-user":who,...(body?{"Content-Type":"application/json"}:{})},
      body:body?JSON.stringify(body):undefined
    }),env,utils);
  }
  let res=await call("/api/seller/store","alice");
  assert.equal(res.status,200);
  let data=await res.json();
  assert.equal(data.store.slug,"alice-tech");
  assert.equal(data.products[0].name,"USB charger");
  res=await call("/api/seller/store","bob");
  data=await res.json();assert.equal(data.store.slug,"bob-mart");
  assert.equal(data.products.length,0,"Seller B must not access Seller A products");
  await assert.rejects(call("/api/seller/products/12","bob","PATCH",{name:"Stolen listing",price:1,stock:1,category:"Other",unit:"each"}),
    error=>error.status===404,"Seller B cannot edit Seller A product");
  await assert.rejects(call("/api/seller/products/12","bob","DELETE"),
    error=>error.status===404,"Seller B cannot archive Seller A product");
  await assert.rejects(call("/api/seller/products","alice","POST",{name:"Another item",category:"Chargers",price:500,stock:1,unit:"each",status:"Published"}),
    error=>error.status===403,"Pending sellers cannot publish");
  res=await call("/api/stores");assert.equal(res.status,200);
  assert.ok(Array.isArray((await res.json()).stores));
  res=await call("/api/seller/media","alice","POST",{test:true});
  assert.equal(res.status,503,"Image endpoints must fail closed without R2 binding");
  const sql=fs.readFileSync("worker/migrations/001_marketplace.sql","utf8");
  for(const n of ["merchant_stores","merchant_uploads","merchant_products","owner_user_id","store_id","FOREIGN KEY"])
    assert.ok(sql.includes(n),"Missing migration element: "+n);
  const pages=["sell.html","stores.html","store.html"];
  for(const p of pages){assert.ok(fs.existsSync(p));assert.ok(fs.readFileSync(p,"utf8").includes("api-client.js"));}
  const client=fs.readFileSync("api-client.js","utf8");
  assert.ok(client.includes("uploadSellerImage")&&client.includes("sellerStore"));
  const home=fs.readFileSync("index.html","utf8");
  assert.ok(home.includes('href="sell.html"')&&home.includes('href="stores.html"'));
  console.log("Multi-vendor contracts verified: cross-tenant isolation, approval gate, R2 requirement, pages, migration.");
}
main().catch(e=>{console.error(e);process.exit(1);});
