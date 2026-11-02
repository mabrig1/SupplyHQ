(() => {
"use strict";
const api=window.SupplyHQAPI,$=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>"₦"+Number(n).toLocaleString("en-NG",{maximumFractionDigits:2});
const slug=new URLSearchParams(location.search).get("shop")||"";
let shop=null,products=[],chosen=new Set();
function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>(p.name+" "+p.category+" "+p.description).toLowerCase().includes(q));
  $("grid").innerHTML=list.map(p=>'<article class="product-card">'+
    (p.imageUrl?'<img loading="lazy" src="'+esc(api.mediaUrl(p.imageUrl))+'" alt="'+esc(p.name)+'">':'<div class="placeholder">📦</div>')+
    '<div class="info"><small>'+esc(p.category)+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||"")+'</p>'+
    '<div class="price">'+fmt(p.price)+'</div><small>Per '+esc(p.unit)+' · '+(p.stock>0?"Seller-listed qty: "+Number(p.stock):"Contact seller for availability")+'</small>'+
    '<button class="'+(chosen.has(p.id)?"outline":"primary")+'" data-add="'+p.id+'">'+(chosen.has(p.id)?"Remove from enquiry":"Add to enquiry")+'</button></div></article>').join("")||
    '<div class="empty">No products match this search.</div>';
  $("total").textContent=products.length;
  const picks=products.filter(p=>chosen.has(p.id));
  $("chosen").innerHTML=picks.map(p=>'<div class="seller-row"><div class="row-info"><b>'+esc(p.name)+'</b><small>'+fmt(p.price)+' per '+esc(p.unit)+'</small></div><button class="outline" data-remove="'+p.id+'">Remove</button></div>').join("")||
    '<p class="muted">No products selected yet.</p>';
  $("count").textContent=picks.length;
  $("copy").disabled=$("share").disabled=!picks.length;
}
function enquiry(){
 const items=products.filter(p=>chosen.has(p.id));
 return "Hello "+shop.name+", I am enquiring about these products on SupplyHQ:\n\n"+
 items.map((p,i)=>(i+1)+". "+p.name+" — "+fmt(p.price)+" per "+p.unit).join("\n")+
 "\n\nPlease confirm availability, variants, delivery costs and payment instructions before I order.\nStore: "+location.href;
}
$("grid").addEventListener("click",e=>{
 const b=e.target.closest("[data-add]");if(!b)return;
 const id=Number(b.dataset.add);chosen.has(id)?chosen.delete(id):chosen.add(id);render();
});
$("chosen").addEventListener("click",e=>{const b=e.target.closest("[data-remove]");if(b){chosen.delete(Number(b.dataset.remove));render();}});
$("search").addEventListener("input",render);
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(enquiry());$("status").hidden=false;$("status").textContent="Enquiry copied. Share with the seller."; }catch(e){$("status").hidden=false;$("status").textContent="Copy unavailable. Use Share enquiry instead.";}});
$("share").addEventListener("click",async()=>{
 if(navigator.share){try{await navigator.share({title:shop.name+" enquiry",text:enquiry()});}catch(e){if(e.name!=="AbortError")$("status").textContent=e.message;}}
 else $("copy").click();
});
(async()=>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){ $("status").textContent="Invalid or missing store link.";return;}
 try{
  const result=await api.store(slug);shop=result.store;products=result.products||[];
  document.title=shop.name+" | SupplyHQ";
  $("storeName").textContent=shop.name;$("storeDescription").textContent=shop.description||"Browse products from this independent SupplyHQ seller.";
  $("storeLocation").textContent="📍 "+shop.location;
  const digits=String(shop.public_phone||"").replace(/\D/g,"");
  if(digits.length>=10&&digits.length<=15){
   const a=document.createElement("a");a.className="button";a.target="_blank";a.rel="noopener noreferrer";
   a.href="https://wa.me/"+digits+"?text="+encodeURIComponent("Hello, I found your store "+shop.name+" on SupplyHQ.");
   a.textContent="Contact this store on WhatsApp";$("contactArea").appendChild(a);
  }
  $("status").hidden=true;render();
 }catch(e){$("status").textContent="This store is unavailable or awaiting approval. "+e.message;$("status").classList.add("error");}
})();
})();