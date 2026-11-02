import {AGENTS,runAgent} from "./worker/src/agent-core.js";
const api=window.SupplyHQAPI;
const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(Number(n))?"₦"+Number(n).toLocaleString("en-NG"):"Price to confirm";
const local=(window.MABRIG_PHONES_CATALOG||[]).map(p=>({
 id:p.sku,name:p.name,category:p.category,description:"",imageUrl:p.image,price:p.price,
 stock:null,unit:"each",storeName:"MABRIG Phones",storeSlug:""
}));
let mode="buyer",agentId="smart-search",publicProducts=[...local],stores=[],sellerData=null,lastResult=null,backendOnline=false;
const safeText=(node,value)=>node.textContent=String(value??"");
const selectAgent=id=>{const agent=AGENTS.find(a=>a.id===id);if(!agent)return;agentId=id;
 safeText($("selectedTitle"),agent.name);safeText($("selectedPurpose"),agent.purpose);
 for(const btn of $("agentGrid").querySelectorAll(".agent-choice")){
  const active=btn.dataset.id===id;btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
 }
 $("generationSection").hidden=!(mode==="seller"&&["social-caption","description-helper","whatsapp-message"].includes(id));
};
const note=(text,error=false)=>{$("availability").textContent=text;$("availability").className="message"+(error?" error":"");};
function refreshChoices(){
 $("agentGrid").replaceChildren();
 AGENTS.filter(a=>a.audience===mode||a.audience==="both").forEach(agent=>{
  const btn=document.createElement("button");btn.type="button";btn.className="agent-choice";
  btn.dataset.id=agent.id;btn.setAttribute("aria-pressed","false");
  const title=document.createElement("strong");title.textContent=agent.name;
  const desc=document.createElement("small");desc.textContent=agent.purpose;
  btn.append(title,desc);btn.addEventListener("click",()=>selectAgent(agent.id));
  $("agentGrid").appendChild(btn);
 });
 $("agentCount").textContent=AGENTS.length;
 selectAgent(mode==="buyer"?"smart-search":"catalog-auditor");
 refreshProducts();
}
function refreshProducts(){
 const select=$("focusProduct");select.replaceChildren();
 const def=document.createElement("option");def.value="";def.textContent="Auto-select from catalogue";select.appendChild(def);
 const products=mode==="seller"?(sellerData?.products||[]):publicProducts;
 products.forEach(p=>{const o=document.createElement("option");o.value=p.id;
  o.textContent=p.name+" · "+(p.price==null?"Price pending":fmt(p.price));select.appendChild(o);});
 $("catalogCount").textContent=publicProducts.length;
}
async function loadSeller(){
 const current=api.user();
 if(!current||current.role!=="supplier"||!api.token()){
  sellerData=null;note("Sign in with a supplier account to access private seller agent tools.",true);
  $("runtimeStatus").textContent="Seller mode requires authenticated, server-held product records. No browser-only seller demo is substituted.";
  return;
 }
 try{
  const r=await api.sellerStore();sellerData={store:r.store,products:r.products||[]};
  note(r.store?"Seller agents ready. Analyses operate on your own "+sellerData.products.length+" listings.":"Create your store first, then add products.",!r.store);
 }catch(e){sellerData=null;note("Seller API unavailable: "+e.message+". Seller analysis is disabled rather than showing fabricated data.",true);}
}
async function changeMode(next){
 mode=next;$("buyerTab").classList.toggle("active",mode==="buyer");$("sellerTab").classList.toggle("active",mode==="seller");
 $("buyerTab").setAttribute("aria-pressed",String(mode==="buyer")),$("sellerTab").setAttribute("aria-pressed",String(mode==="seller"));
 if(mode==="seller")await loadSeller();else note("Buyer workflows use the actual published MABRIG Phones catalogue"+(backendOnline?" and live approved stores.":". Cloudflare-powered store search is not connected yet."));
 refreshChoices();
}
function cardView(p){
 const card=document.createElement("article");card.className="result-item";
 const img=p.imageUrl&&String(p.imageUrl).slice(0,250);
 if(img && (/^phones-media\/[A-Za-z0-9_.-]+\.jpg$/.test(img)||/^\/api\/store-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(img))){
  const pic=document.createElement("img");pic.loading="lazy";pic.alt=String(p.title||"Product")+" photograph";
  pic.src=img.startsWith("/api/")?api.mediaUrl(img):img;
  card.appendChild(pic);
 }
 const name=document.createElement("h4");name.textContent=p.title;
 const detail=document.createElement("p");detail.textContent=p.detail||"";
 card.append(name,detail);
 if(p.price!==null&&p.price!==undefined){const money=document.createElement("div");money.className="result-price";money.textContent=fmt(p.price);card.appendChild(money);}
 if(p.storeSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.storeSlug)){
  const link=document.createElement("a");link.href="store.html?shop="+encodeURIComponent(p.storeSlug);
  link.textContent="View store";link.className="outline";card.appendChild(link);
 }
 return card;
}
function render(result){
 lastResult=result;$("resultPanel").replaceChildren();
 const head=document.createElement("div");head.className="analysis-head";
 const title=document.createElement("h3");title.textContent=result.agentName||"Agent result";
 const intro=document.createElement("p");intro.textContent=result.summary;
 head.append(title,intro);$("resultPanel").appendChild(head);
 if(result.items?.length){const grid=document.createElement("div");grid.className="result-grid";result.items.forEach(p=>grid.appendChild(cardView(p)));$("resultPanel").appendChild(grid);}
 if(result.nextSteps?.length){const wrap=document.createElement("section");wrap.className="result-steps";const h=document.createElement("strong");h.textContent="Recommended next checks";const list=document.createElement("ul");
 result.nextSteps.forEach(s=>{const li=document.createElement("li");li.textContent=s;list.appendChild(li);});wrap.append(h,list);$("resultPanel").appendChild(wrap);}
 const meta=document.createElement("div");meta.className="analysis-meta";
 meta.textContent="Executed "+result.executedAgent+" · "+result.execution+" · "+(result.catalogueCount??"?")+" catalogue items · no write or payment action";
 $("resultPanel").appendChild(meta);$("copyResult").disabled=false;
}
function options(){
 const f=new FormData($("agentForm"));const inp={agentId,query:String(f.get("query")||"").slice(0,200)};
 for(const n of ["budget","target","threshold","unitCost"]){const v=String(f.get(n)||"");if(v.trim()!=="")inp[n]=Number(v);}
 if(f.get("productId"))inp.productId=f.get("productId");
 if(agentId==="agent-router")inp.audience=mode;
 return inp;
}
$("buyerTab").addEventListener("click",()=>changeMode("buyer"));
$("sellerTab").addEventListener("click",()=>changeMode("seller"));
$("agentForm").addEventListener("submit",async e=>{
 e.preventDefault();const b=$("runBtn");b.disabled=true;b.textContent="Analyzing…";
 try{
  if(mode==="seller"&&!sellerData?.store)throw new Error("Sign in as a seller and create your store before running this analysis.");
  const input=options();let result;
  if(mode==="seller"){
   // Prefer server-side execution to enforce user tenancy. Never include another seller's data.
   result=await api.request("/api/agents/run",{method:"POST",body:input});
  }else{
   result=runAgent(input,{audience:"buyer",products:publicProducts,stores,sources:["published-MABRIG-catalogue",...(backendOnline?["approved-D1-stores"]:[])]});
  }
  render(result);
 }catch(err){note("Agent could not run: "+(err.message||"Unknown error"),true);}
 finally{b.disabled=false;b.textContent="Run agent";}
});
$("copyResult").addEventListener("click",async()=>{
 if(!lastResult)return;
 const content=[lastResult.agentName,lastResult.summary,...(lastResult.items||[]).map(p=>p.title+": "+(p.detail||"")), ...(lastResult.nextSteps||[])].join("\n");
 try{await navigator.clipboard.writeText(content);note("Agent analysis copied.");}catch{note("Copy unavailable on this browser.",true);}
});
$("generateDraft").addEventListener("click",async()=>{
 if(!$("aiConsent").checked){note("Tick the external AI consent box before requesting generated copy.",true);return;}
 if(!sellerData?.store){note("An active seller backend is required for AI writing.",true);return;}
 const selected=$("focusProduct").value||sellerData.products[0]?.id;if(!selected){note("Choose a product first.",true);return;}
 const b=$("generateDraft");b.disabled=true;b.textContent="Generating…";
 try{
  const r=await api.request("/api/agents/compose",{method:"POST",body:{consent:true,agentId,productId:selected}});
  $("generatedText").hidden=false;$("generatedText").textContent=r.draft+"\n\n"+r.warning;
  note("AI-assisted draft created. Review it before posting.");
 }catch(e){note("AI generation not available: "+e.message+". The free agent workflow still works.",true);}
 finally{b.disabled=false;b.textContent="Generate AI draft (requires configured backend)";}
});
async function bootstrap(){
 refreshChoices();note("Local catalogue loaded: "+local.length+" published photos. Checking optional live API…");
 try{
  const data=await api.request("/api/agents/catalog",{timeout:5500});
  const remote=(data.products||[]).map(p=>({...p,imageUrl:p.imageUrl||null,storeName:p.storeName||""}));
  const seen=new Set(local.map(p=>String(p.id)));
  for(const p of remote)if(!seen.has(String(p.id))){publicProducts.push(p);seen.add(String(p.id));}
  stores=data.stores||[];backendOnline=true;
  note("Agent Studio online. "+publicProducts.length+" products available including "+remote.length+" approved live-store listings.");
  $("runtimeStatus").textContent="Backend catalogue is responding. AI copy generation remains optional and only works if OpenRouter has been configured.";
 }catch(e){
  note("Free buyer workflows are ready with "+local.length+" MABRIG products. Seller workflows and live store discovery require Cloudflare API activation.");
  $("runtimeStatus").textContent="Cloudflare API not verified: "+e.message+". Local buyer specialists are running without paid model APIs.";
 }
 refreshProducts();
}
bootstrap();
