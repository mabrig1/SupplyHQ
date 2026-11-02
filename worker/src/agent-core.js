/* SupplyHQ Agent Studio 1.0: 28 measurable, read-only specialist workflows. */
export const AGENTS=[
["smart-search","Smart Search","buyer","Find matching products"],["budget-matcher","Budget Matcher","buyer","Filter by naira budget"],
["value-ranker","Value Ranker","buyer","Rank visible unit prices"],["product-compare","Product Comparator","buyer","Compare listing evidence"],
["alternatives","Alternatives Finder","buyer","Find related category items"],["category-explorer","Category Explorer","buyer","Profile catalogue categories"],
["stock-scout","Stock Scout","buyer","Identify unconfirmed and low stock"],["store-discovery","Store Discovery","buyer","Find approved store listings"],
["seller-signal","Seller Status","buyer","Explain verification limitations"],["bundle-builder","Bundle Builder","buyer","Build a budget-based selection"],
["quote-writer","Enquiry Writer","buyer","Compose enquiry without ordering"],["spec-explainer","Specification Explainer","buyer","Explain supplied product facts"],
["purchase-check","Purchase Readiness","buyer","Spot gaps before sending money"],["catalog-auditor","Listing Auditor","seller","Audit product completeness"],
["inventory-alert","Inventory Watch","seller","Flag low inventory"],["restock-coach","Restock Planner","seller","Calculate target stock top-ups"],
["price-benchmark","Price Benchmark","seller","Compare listed category prices"],["margin-check","Margin Calculator","seller","Compute illustrative gross margins"],
["duplicate-guard","Duplicate Guard","seller","Find possible repeated listings"],["seo-keywords","SEO Keywords","seller","Extract grounded listing keywords"],
["description-helper","Description Assistant","seller","Draft safe product copy"],["social-caption","Social Caption","seller","Draft social media captions"],
["whatsapp-message","WhatsApp Assistant","seller","Draft replies for manual sending"],["storefront-audit","Storefront Inspector","seller","Check store profile completeness"],
["category-gaps","Category Mix Advisor","seller","Summarise catalogue breadth"],["bundle-planner","Bundle Planner","seller","Suggest seller-owned bundles"],
["approval-guide","Approval Guide","seller","Explain admin approval status"],
["agent-router","Agent Orchestrator","both","Select and execute a relevant specialist"]
].map(([id,name,audience,purpose])=>({id,name,audience,purpose}));
const clean=s=>String(s??"").slice(0,600);
const words=s=>[...new Set((clean(s).toLowerCase().match(/[a-z0-9]{2,}/g)||[]))].filter(w=>!["the","and","for","with","your","from","this","please","find","some","show","best","want"].includes(w));
const isPrice=p=>p.price!==null&&p.price!==undefined&&Number.isFinite(Number(p.price))&&Number(p.price)>0;
const amount=p=>isPrice(p)?Number(p.price):Infinity;
const naira=n=>Number.isFinite(Number(n))?"₦"+Number(n).toLocaleString("en-NG",{maximumFractionDigits:2}):"Price to confirm";
const num=(n,defaultValue,min=0,max=1e9)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):defaultValue;
const grouped=(list,key)=>{const result=new Map();for(const x of list){const k=key(x);result.set(k,[...(result.get(k)||[]),x]);}return [...result];};
const listing=p=>({id:p.id,title:p.name,detail:[p.category,p.storeName].filter(Boolean).join(" · "),price:isPrice(p)?Number(p.price):null,imageUrl:p.imageUrl||null,storeSlug:p.storeSlug||null,stock:p.stock??null});
const result=(summary,items=[],nextSteps=[],metrics={})=>({summary,items:items.slice(0,8),nextSteps,metrics});
const productsFrom=context=>(context.products||[]).slice(0,150).map(p=>({
 id:p.id,name:clean(p.name),category:clean(p.category||"Other"),description:clean(p.description),
 imageUrl:clean(p.imageUrl||p.image||""),storeName:clean(p.storeName||p.supplier||context.store?.name),
 storeSlug:clean(p.storeSlug||context.store?.slug),price:isPrice(p)?Number(p.price):null,
 stock:p.stock===null||p.stock===undefined?null:Number(p.stock),unit:clean(p.unit||"each"),
 status:clean(p.status||"Published")
})).filter(p=>p.name);
const matches=(p,query)=>{const t=words(query);return !t.length||t.some(w=>words([p.name,p.category,p.description,p.storeName].join(" ")).some(x=>x.includes(w)||w.includes(x)));};
const rank=list=>[...list].sort((a,b)=>amount(a)-amount(b));
const choose=(p,options)=>p.find(x=>String(x.id)===String(options.productId))||p.find(x=>matches(x,options.query)&&options.query)||p[0];
function buyer(id,ps,opt,stores){
 const budget=num(opt.budget,25000,1);
 const selected=ps.filter(p=>matches(p,opt.query||opt.category));
 const p=choose(ps,opt);
 if(!ps.length&&id!=="store-discovery"&&id!=="seller-signal")return result("No products are available in the accessible catalogue.",[],["Add or publish products first."]);
 switch(id){
 case "smart-search":return result("Found "+selected.length+" matching products.",rank(selected).map(listing),["Confirm prices and delivery directly with the seller."],{matches:selected.length});
 case "budget-matcher":{const a=rank(selected.filter(p=>isPrice(p)&&p.price<=budget));return result(a.length+" products listed within "+naira(budget)+".",a.map(listing),["Allow extra budget for delivery."],{budget,matching:a.length});}
 case "value-ranker":return result("Comparative ranking by listed price only; different sizes and specifications are not normalized.",rank(selected.filter(isPrice)).map(listing),["Confirm pack sizes and warranty."]);
 case "product-compare":return result("Comparing seller-entered specifications and prices.",(selected.length?selected:ps).slice(0,5).map(p=>({...listing(p),detail:p.description||"No product specifications provided"})),["Check model variants and unit size."]);
 case "alternatives":return result("Same-category alternatives to "+(p?.name||"this item")+".",rank(ps.filter(q=>q.id!==p?.id&&q.category===p?.category)).map(listing),["Matching categories does not guarantee compatibility."]);
 case "category-explorer":{const g=grouped(ps,p=>p.category).sort((a,b)=>b[1].length-a[1].length);return result(ps.length+" items across "+g.length+" categories.",g.map(([name,a])=>({title:name,detail:a.length+" products; "+a.filter(isPrice).length+" priced",price:null})),[],{categories:g.length});}
 case "stock-scout":return result("Stock counts are seller-entered and unverified.",ps.filter(p=>p.stock===null||p.stock<=3).map(p=>({...listing(p),detail:p.stock===null?"Stock unconfirmed":"Seller-listed quantity: "+p.stock})),["Ask seller to check current inventory."]);
 case "store-discovery":{const found=stores.filter(s=>matches({name:s.name,category:"",description:s.description,storeName:s.location},opt.query));return result(found.length+" approved marketplace stores match.",found.map(s=>({title:s.name,detail:s.location||"Location unspecified",storeSlug:s.slug,price:null})),["Supplier approval is not a guarantee of quality."]);}
 case "seller-signal":return result("Marketplace approval means an account passed admin review; it does not guarantee identity, quality, delivery or payment safety.",stores.map(s=>({title:s.name,detail:s.location||"",storeSlug:s.slug})),["Verify sellers independently before paying."]);
 case "bundle-builder":{let left=budget;const used=new Set(),chosen=[];for(const p of rank(selected.filter(isPrice))){if(p.price<=left&&!used.has(p.category)){chosen.push(p);left-=p.price;used.add(p.category);}if(chosen.length===5)break;}return result("Illustrative bundle value "+naira(budget-left)+" of "+naira(budget)+".",chosen.map(listing),["Confirm quantities and shipping."],{subtotal:budget-left});}
 case "quote-writer":{const msg="Hello, please confirm stock, current price, variants and delivery for: "+(selected.length?selected:ps).slice(0,3).map(p=>p.name+" ("+(isPrice(p)?naira(p.price):"price to confirm")+")").join(", ")+". Please provide warranty and safe payment details.";return result("Enquiry draft only — nothing has been sent.",[{title:"Copyable enquiry",detail:msg}],["Review and share this draft manually."]);}
 case "spec-explainer":return result("Only information from the published listing is shown; unspecified technical details are unknown.",[{...listing(p),detail:p.description||"Seller has not supplied detailed product specifications."}],["Ask for model number, size, capacity and warranty."]);
 case "purchase-check":{const gaps=selected.filter(p=>!isPrice(p)||p.stock===null||!p.description);return result(gaps.length+" of "+selected.length+" matching listings lack price, stock or description information.",gaps.map(p=>({...listing(p),detail:[!isPrice(p)?"No price":null,p.stock===null?"No stock count":null,!p.description?"No description":null].filter(Boolean).join(", ")})),["Verify final price, delivery fees, seller and refund terms before paying."],{missing:gaps.length});}
 default:return result("Unsupported shopper agent.");
 }
}
function seller(id,ps,opt,store,publicProducts){
 if(!store)return result("Create your store and sign in to run seller agents.",[],["Open Seller Studio and sign in."]);
 const p=choose(ps,opt),threshold=num(opt.threshold,3,0,1000),target=num(opt.target,20,1,100000),priced=ps.filter(isPrice);
 switch(id){
 case "catalog-auditor":{const flagged=ps.map(p=>({p,issues:[!p.description?"description missing":null,!p.imageUrl?"photo missing":null,p.name.length<18?"short title":null,!isPrice(p)?"price missing":null].filter(Boolean)})).filter(x=>x.issues.length);return result(flagged.length+" of "+ps.length+" listings need review.",flagged.map(x=>({...listing(x.p),detail:x.issues.join("; ")})),["Edit in Seller Studio; changes are never automatic."],{flagged:flagged.length});}
 case "inventory-alert":{const low=ps.filter(p=>p.stock!==null&&p.stock<=threshold);return result(low.length+" products at or below quantity "+threshold+".",low.map(listing),["Check physical inventory before replenishment."],{low:low.length});}
 case "restock-coach":{const low=ps.filter(p=>p.stock!==null&&p.stock<target);return result(low.length+" listings below illustrative target "+target+".",low.map(p=>({...listing(p),detail:"Suggested top-up: "+(target-p.stock)+" units"})),["Not a demand forecast. Review recent sales and supplier lead times."]);}
 case "price-benchmark":return result("Category peer comparison only; specs and pack size may differ.",priced.map(p=>{const peers=publicProducts.filter(q=>q.category===p.category&&isPrice(q)&&!(q.storeSlug===store.slug&&String(q.id)===String(p.id))).map(x=>x.price).sort((a,b)=>a-b);return {...listing(p),detail:peers.length?"Comparable category median: "+naira(peers[Math.floor((peers.length-1)/2)]):"No public peers in category"};}),["Verify real comparability before repricing."]);
 case "margin-check":{const cost=Number(opt.unitCost);if(!Number.isFinite(cost)||cost<0)return result("Enter a nonnegative unit cost to calculate margins.",[],["Supply a unit cost."]);return result("Illustrative gross margin before delivery, fees, tax and returns.",priced.map(p=>({...listing(p),detail:"Cost: "+naira(cost)+"; gross profit: "+naira(p.price-cost)+"; margin: "+((p.price-cost)/p.price*100).toFixed(1)+"%"})),["Do not interpret gross margin as net profit."],{unitCost:cost});}
 case "duplicate-guard":{const dup=grouped(ps,p=>p.name.toLowerCase().replace(/[^a-z0-9]/g,"")).filter(([,a])=>a.length>1);return result(dup.length+" possible duplicate groups.",dup.map(([,a])=>({title:a[0].name,detail:a.length+" similar listings"})),["Review variants before archiving anything."]);}
 case "seo-keywords":return p?result("Words extracted from actual product attributes; not search-volume measurements.",words([p.name,p.category,p.description].join(" ")).slice(0,12).map(w=>({title:w,detail:"Grounded listing keyword"})),["Do not insert unsupported brands."]):result("Create a product first.");
 case "description-helper":return p?result("Product copy suggestion grounded in current fields.",[{title:"Description",detail:p.name+". "+(p.description||"Ask us about specifications and available variants.")+" Category: "+p.category+". "+(isPrice(p)?"Listed price "+naira(p.price)+".":"Price on request.")+" Confirm stock and delivery before paying."}],["Review before publishing."]):result("Create a product first.");
 case "social-caption":return p?result("Social media caption draft; nothing is published automatically.",[{title:"Caption",detail:"📦 "+p.name+" — "+(p.description||"Ask for details.")+" "+(isPrice(p)?naira(p.price)+" ":"")+"DM for availability and delivery. #SupplyHQ #ShopNigeria"}],["Check current price and stock before posting."]):result("Create a product first.");
 case "whatsapp-message":return p?result("Editable WhatsApp reply; nothing is sent automatically.",[{title:"Reply",detail:"Hello! Welcome to "+store.name+". Thank you for your interest in "+p.name+". "+(isPrice(p)?"Listed price "+naira(p.price)+". ":"")+"Please share delivery city and quantity; we will confirm availability."}],["Copy and send manually."]):result("Create a product first.");
 case "storefront-audit":{const gaps=[!store.name?"Store name":null,!store.description?"About section":null,!store.location?"Location":null,!store.public_phone?"Public contact":null,ps.length===0?"Catalogue products":null].filter(Boolean);return result(gaps.length+" storefront elements need attention.",gaps.map(g=>({title:"Improve "+g,detail:"Update your store profile"})),["Completeness does not guarantee seller quality."]);}
 case "category-gaps":return result(ps.length+" products in "+grouped(ps,p=>p.category).length+" categories.",grouped(ps,p=>p.category).map(([name,a])=>({title:name,detail:a.length+" listings"})),["Expand categories only based on demand and supply."]);
 case "bundle-planner":{const selected=[];for(const p of rank(priced)){if(!selected.some(x=>x.category===p.category))selected.push(p);if(selected.length===3)break;}return result("Illustrative bundle total "+naira(selected.reduce((s,p)=>s+p.price,0))+".",selected.map(listing),["Confirm stock; no discount was applied."]);}
 case "approval-guide":return result(store.approval==="Approved"?"Seller approved; products still need publication.":"Approval status: "+(store.approval||"Pending")+"; drafts remain private.",[{title:"Approval",detail:store.approval||"Pending"}],["Only a SupplyHQ administrator may approve sellers."]);
 default:return result("Unsupported seller agent.");
 }
}
export function routeAgent(query,role="buyer"){
 const s=String(query||"").toLowerCase();
 const rules=role==="seller"?[
 [/margin|profit|cost/,"margin-check"],[/duplicate/,"duplicate-guard"],[/restock/,"restock-coach"],
 [/inventory|low stock|quantity/,"inventory-alert"],[/competitor|benchmark|price/,"price-benchmark"],
 [/instagram|caption|social/,"social-caption"],[/whatsapp|reply/,"whatsapp-message"],[/keyword|seo/,"seo-keywords"],
 [/description|copy/,"description-helper"],[/bundle/,"bundle-planner"],[/approval|pending/,"approval-guide"],
 [/profile|storefront/,"storefront-audit"],[/category/,"category-gaps"]
 ]:[
 [/budget|under|afford/,"budget-matcher"],[/alternative|similar/,"alternatives"],[/stock|availability/,"stock-scout"],
 [/cheapest|lowest|value/,"value-ranker"],[/compare|versus/,"product-compare"],[/bundle/,"bundle-builder"],
 [/seller|shops|stores/,"store-discovery"],[/enquiry|quote|message/,"quote-writer"],
 [/spec|explain/,"spec-explainer"],[/trust|safe|verify/,"seller-signal"],[/category/,"category-explorer"],
 [/purchase|pay|checkout/,"purchase-check"]
 ];
 return (rules.find(([rule])=>rule.test(s))||[null,role==="seller"?"catalog-auditor":"smart-search"])[1];
}
export function runAgent(input={},context={}){
 const requested=String(input.agentId||"agent-router");
 const defined=AGENTS.find(a=>a.id===requested);
 if(!defined)throw Object.assign(new Error("Unknown agent"),{status:404});
 const role=context.audience==="seller"?"seller":"buyer";
 if(defined.audience==="seller"&&role!=="seller")throw Object.assign(new Error("Seller sign-in required"),{status:403});
 const id=requested==="agent-router"?routeAgent(input.query,role):requested;
 const specialist=AGENTS.find(a=>a.id===id);
 const products=productsFrom(context),pub=productsFrom({products:context.publicProducts||products});
 const data=specialist.audience==="seller"?seller(id,products,input,context.store,pub):
   buyer(id,products,input,Array.isArray(context.stores)?context.stores:[]);
 return {ok:true,requestedAgent:requested,executedAgent:id,agentName:specialist.name,
 execution:"deterministic-read-only",catalogueCount:products.length,sources:context.sources||["catalogue"],...data};
}
