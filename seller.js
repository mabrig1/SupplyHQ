(() => {
"use strict";
const api=window.SupplyHQAPI,$=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>"₦"+Number(n).toLocaleString("en-NG",{maximumFractionDigits:2});
let state={store:null,profile:null,products:[]},previewUrls=[];
function notice(message,error=false){const n=$("status");n.textContent=message;n.className="message"+(error?" error":"");}
function fields(form,data){for(const [key,value] of Object.entries(data||{})){const field=form.elements.namedItem(key);if(field && "value" in field)field.value=value??"";}}
function readForm(form){return Object.fromEntries(new FormData(form).entries());}
function clearPreviews(){previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls=[];}
function allowedPublish(){return state.profile?.status==="Approved";}
function clearProduct(){
  $("productForm").reset();fields($("productForm"),{id:"",imageKey:"",stock:1,unit:"each",status:"Draft"});
  $("saveProduct").textContent="Save product";$("uploadNotice").textContent="";
}
function renderInventory(){
  clearPreviews();
  $("productCount").textContent=state.products.length+" products";
  if(!state.products.length){$("inventory").className="empty";$("inventory").textContent="No products yet. Add your first product above.";return;}
  $("inventory").className="";
  $("inventory").innerHTML=state.products.map(p=>'<div class="seller-row" data-product="'+p.id+'">'+
     (p.imageUrl?'<img data-img="'+p.id+'" alt="'+esc(p.name)+' product photo">':'<div style="width:65px;font-size:35px">📦</div>')+
     '<div class="row-info"><strong>'+esc(p.name)+'</strong><small>'+esc(p.category)+' · '+fmt(p.price)+' · Qty '+Number(p.stock)+'</small>'+
     '<span class="badge '+(p.status==="Draft"?"pending":"")+'">'+esc(p.status)+'</span></div>'+
     '<div class="actions"><button class="outline" data-edit="'+p.id+'" type="button">Edit</button>'+
     '<button class="outline" data-archive="'+p.id+'" type="button">Archive</button></div></div>').join("");
  state.products.filter(p=>p.imageUrl).forEach(async p=>{
    const el=$("inventory").querySelector('img[data-img="'+p.id+'"]');
    if(!el) return;
    try{
      const url=api.mediaUrl(p.imageUrl);
      const response=await fetch(url,{headers:{Authorization:"Bearer "+api.token()}});
      if(!response.ok) return;
      const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);
      previewUrls.push(objectUrl);
      if(el.isConnected)el.src=objectUrl;
    }catch(e){/* Fallback without image, product details remain visible. */}
  });
}
function render(){
  $("workspace").hidden=false;
  const p=state.profile,s=state.store;
  if(p) fields($("profileForm"),p);
  if(s){
    fields($("storeForm"),{...s,publicPhone:s.public_phone});
    $("slugInput").readOnly=true;
    const link="store.html?shop="+encodeURIComponent(s.slug);
    $("storeLink").hidden=false;
    $("storeLink").innerHTML='Your store link: <a href="'+link+'" target="_blank" rel="noopener">'+esc(location.origin+location.pathname.replace(/[^/]+$/,"")+link)+'</a>';
  }
  $("approvalInfo").textContent=!p?"Submit your business details to request approval.":
    p.status==="Approved"?"Approved seller — you can publish products now.":
    "Seller review: "+p.status+". Your store and drafts are private until approved by SupplyHQ.";
  $("approvalInfo").className="message"+(p?.status==="Rejected"?" error":"");
  $("productStatus").querySelector('option[value="Published"]').disabled=!allowedPublish();
  if(!allowedPublish() && $("productStatus").value==="Published")$("productStatus").value="Draft";
  $("productsPanel").querySelectorAll("input,select,textarea,button").forEach(el=>{
    if(el.id==="clearProduct")return;
    if(el.id==="productStatus")return;
    el.disabled=!s;
  });
  renderInventory();
}
async function refresh(){
  const u=api.user();
  if(!u||!api.token()){notice("Create a seller account or sign in to manage your store.");$("signedOut").hidden=false;return;}
  if(u.role!=="supplier"){notice("This account is not registered as a seller.",true);$("buyerOnly").hidden=false;return;}
  try{
    const result=await api.sellerStore();
    state={store:result.store,profile:result.profile,products:result.products||[]};
    render();
    notice(state.store?"Your seller workspace is ready. "+(allowedPublish()?"Publishing enabled.":"Awaiting seller approval."):"Start by saving your seller profile and store details.");
    $("sellerAccess").textContent="Open seller workspace";
    $("sellerAccess").href="#workspace";
  }catch(e){notice("Seller backend unavailable: "+(e.message||"Connection failed")+". No changes have been saved.",true);}
}
$("profileForm").addEventListener("submit",async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('button[type="submit"]');b.disabled=true;
  try{
    await api.createSupplier(readForm(e.currentTarget));
    notice("Seller profile saved. Approval is controlled by SupplyHQ.");
    await refresh();
  }catch(err){notice(err.message,true);}finally{b.disabled=false;}
});
$("storeForm").addEventListener("submit",async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('button[type="submit"]');b.disabled=true;
  try{
    const data=readForm(e.currentTarget);
    data.slug=state.store?.slug || data.slug?.toLowerCase();
    await api.saveSellerStore(data);await refresh();
    notice("Store saved. Add your products below.");
  }catch(err){notice(err.message,true);}finally{b.disabled=false;}
});
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const b=$("saveProduct");b.disabled=true;
  const form=e.currentTarget, data=readForm(form);
  try{
    if(!state.store)throw new Error("Create your store before adding products");
    const photo=$("productImage").files[0];
    if(photo){
      $("uploadNotice").textContent="Uploading image securely…";
      const result=await api.uploadSellerImage(photo);
      data.imageKey=result.key;
    }
    delete data.image;
    if(!allowedPublish())data.status="Draft";
    if(data.id)await api.updateSellerProduct(data.id,data);
    else await api.createSellerProduct(data);
    clearProduct();await refresh();
    notice("Product saved. "+(data.status==="Published"?"It is published in your store.":"Drafts become public only after approval and publication."));
  }catch(err){notice(err.message||"Could not save the product",true);}
  finally{b.disabled=false;$("uploadNotice").textContent="";}
});
$("inventory").addEventListener("click",async e=>{
  const edit=e.target.closest("[data-edit]"),archive=e.target.closest("[data-archive]");
  const id=Number((edit||archive)?.dataset.edit||(edit||archive)?.dataset.archive);
  const p=state.products.find(p=>p.id===id);if(!p)return;
  if(edit){
    fields($("productForm"),{...p,imageKey:p.image_key});
    $("productImage").value="";
    if(!allowedPublish())$("productStatus").value="Draft";
    $("saveProduct").textContent="Save changes";
    $("uploadNotice").textContent=p.image_key?"Existing photo retained unless replaced.":"";
    $("productForm").scrollIntoView({behavior:"smooth",block:"start"});
  }else if(archive){
    if(!confirm("Archive this product? It will disappear from the public store."))return;
    try{await api.archiveSellerProduct(id);await refresh();notice("Product archived.");}
    catch(err){notice(err.message,true);}
  }
});
$("clearProduct").addEventListener("click",clearProduct);
refresh();
})();