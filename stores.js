(() => {
"use strict";
const api=window.SupplyHQAPI,grid=document.getElementById("storesGrid"),status=document.getElementById("status");
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let all=[];
function render(){
 const q=document.getElementById("search").value.trim().toLowerCase();
 const stores=all.filter(s=>(s.name+" "+s.location+" "+s.description).toLowerCase().includes(q));
 grid.innerHTML=stores.map(s=>'<a class="store-card" href="store.html?shop='+encodeURIComponent(s.slug)+'"><small>APPROVED SELLER</small><h3>'+escape(s.name)+'</h3><p>'+escape(s.description||"Shop products from this seller")+'</p><p>📍 '+escape(s.location)+'</p><span class="badge">'+Number(s.product_count)+' products</span></a>').join("");
 if(!stores.length)grid.innerHTML='<div class="empty">No approved stores match this search yet. New shops appear here after review and publication.</div>';
 document.getElementById("total").textContent=all.length;
}
document.getElementById("search").addEventListener("input",render);
(async()=>{try{
 const data=await api.stores();all=data.stores||[];
 status.hidden=true;render();
}catch(e){status.textContent="Store directory is unavailable: "+e.message+". Please try again when the backend is connected.";status.classList.add("error");}})();
})();