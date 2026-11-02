(function () {
"use strict";
const products=window.MABRIG_PHONES_CATALOG||[];
const $=id=>document.getElementById(id);
const icons={"Power Banks":"🔋","Earbuds & Audio":"🎧","Wireless Accessories":"📶","Fans":"🌬️","Phone Stands":"📱","Chargers & Cables":"🔌","Mobile Phones":"📱","Speakers":"🔊","Accessories":"📦"};
const format=n=>"₦"+Number(n).toLocaleString("en-NG");
const escape=s=>String(s).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const KEY="mabrig-phones-enquiry-v1";
let chosen=new Set(),category="All",toastTimer;
try{const saved=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(saved))chosen=new Set(saved.filter(sku=>products.some(p=>p.sku===sku)));}catch{}
function notify(s){const el=$("toast");el.textContent=s;el.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("visible"),2500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify([...chosen]));}catch{}$("quoteCount").textContent=chosen.size;}
const groups=["All",...new Set(products.map(p=>p.category))];
groups.forEach(group=>{const btn=document.createElement("button");btn.type="button";btn.textContent=group;btn.className=group===category?"active":"";btn.addEventListener("click",()=>{category=group;Array.from($("categories").children).forEach(b=>b.classList.toggle("active",b.textContent===group));render();});$("categories").appendChild(btn);});
function card(p){
const active=chosen.has(p.sku),unpriced=p.price===null;
const img='<img loading="lazy" decoding="async" src="'+encodeURI(p.image)+'" alt="'+escape(p.name)+' product photo">';
const label=unpriced?"PRICE TO CONFIRM":"RETAIL PRICE";
return '<article class="product-card"><div class="photo" data-photo>'+img+'<span class="fallback" aria-hidden="true">'+(icons[p.category]||"📱")+'</span><span class="price-status '+(unpriced?"needs-quote":"")+'">'+label+'</span></div><div class="card-inner"><span class="card-category">'+escape(p.category)+'</span><h3>'+escape(p.name)+'</h3><small class="code">'+escape(p.sku)+'</small><div class="product-price '+(unpriced?"ask":"")+'">'+(unpriced?"Request price":format(p.price))+'</div><button type="button" data-sku="'+escape(p.sku)+'" class="'+(active?"selected":"")+'" aria-pressed="'+active+'">'+(active?"✓ Added to enquiry":"+ Add to enquiry")+'</button></div></article>';
}
function render(){
const query=$("productSearch").value.trim().toLowerCase();
let list=products.filter(p=>(category==="All"||p.category===category)&&(p.name+" "+p.category+" "+p.sku).toLowerCase().includes(query));
switch($("sortProducts").value){
case "low":list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));break;
case "high":list.sort((a,b)=>(b.price??-Infinity)-(a.price??-Infinity));break;
case "name":list.sort((a,b)=>a.name.localeCompare(b.name));break;
default:list.reverse();
}
$("showingCount").textContent=list.length+" photos";
$("productGrid").innerHTML=list.map(card).join("");
$("emptyMessage").hidden=list.length!==0;
}
function selectedProducts(){return [...chosen].map(sku=>products.find(p=>p.sku===sku)).filter(Boolean);}
function enquiryText(){
const selected=selectedProducts();
const total=selected.reduce((s,p)=>s+(p.price||0),0);
return "Hello MABRIG Phones, please confirm stock, variants and delivery for:\n\n"+
selected.map((p,i)=>(i+1)+". "+p.name+" ["+p.sku+"] — "+(p.price===null?"Price to confirm":format(p.price))).join("\n")+
"\n\nListed-price subtotal (one each, priced items only): "+format(total)+
"\nPlease confirm final pricing, delivery and payment details before I pay.";
}
function openEnquiry(){
const selected=selectedProducts();const total=selected.reduce((s,p)=>s+(p.price||0),0);
$("enquiryBody").innerHTML=selected.length?selected.map(p=>'<div class="quote-item"><div><b>'+escape(p.name)+'</b><small>'+escape(p.sku)+' · '+(p.price===null?"Price to confirm":format(p.price))+'</small></div><button data-remove="'+escape(p.sku)+'" aria-label="Remove '+escape(p.sku)+'">Remove</button></div>').join("")+
'<p><strong>Listed-price subtotal: '+format(total)+'</strong><br><small>One each. Delivery and quote-only items excluded.</small></p>':
"<p>No products selected. Browse the collection and choose items to enquire about.</p>";
$("copyEnquiry").disabled=$("shareEnquiry").disabled=!selected.length;
if(!$("enquiryDialog").open)$("enquiryDialog").showModal();
}
$("productGrid").addEventListener("click",e=>{const b=e.target.closest("button[data-sku]");if(!b)return;const sku=b.dataset.sku;if(chosen.has(sku))chosen.delete(sku);else chosen.add(sku);persist();render();notify(chosen.has(sku)?"Added to enquiry":"Removed from enquiry");});
$("productGrid").addEventListener("error",e=>{if(e.target.tagName==="IMG")e.target.parentElement.classList.add("placeholder");},true);
$("enquiryBody").addEventListener("click",e=>{const b=e.target.closest("button[data-remove]");if(b){chosen.delete(b.dataset.remove);persist();render();openEnquiry();}});
$("productSearch").addEventListener("input",render);
$("sortProducts").addEventListener("change",render);
$("openEnquiry").addEventListener("click",openEnquiry);
$("closeEnquiry").addEventListener("click",()=>$("enquiryDialog").close());
$("copyEnquiry").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(enquiryText());notify("Enquiry copied — share it with your sales contact.");}catch{notify("Copy unavailable on this browser.");}});
$("shareEnquiry").addEventListener("click",async()=>{if(navigator.share){try{await navigator.share({title:"MABRIG Phones enquiry",text:enquiryText()});}catch(e){if(e.name!=="AbortError")notify("Share failed.");}}else{try{await navigator.clipboard.writeText(enquiryText());notify("Enquiry copied.");}catch{notify("Share unavailable.");}}});
$("catalogTotal").textContent=products.length;
persist();render();
})();