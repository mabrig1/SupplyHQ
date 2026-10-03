const products = [
  {id:1,sku:"RICE-PB50",name:"Premium Parboiled Rice",unit:"50kg bag",price:74000,moq:5,supplier:"Eastern Grain Depot"},
  {id:2,sku:"RICE-OF25",name:"Local Ofada Rice",unit:"25kg bag",price:54500,moq:4,supplier:"Green Basket Foods"},
  {id:3,sku:"PALM-25L",name:"Red Palm Oil",unit:"25L keg",price:42000,moq:3,supplier:"Niger Delta Oils"},
  {id:4,sku:"VEGOIL-25",name:"Vegetable Cooking Oil",unit:"25L keg",price:36800,moq:4,supplier:"Prime Foods Wholesale"},
  {id:5,sku:"SOFT-CRT",name:"Soft Drink Assorted",unit:"carton",price:9700,moq:10,supplier:"Metro Drinks Hub"},
  {id:6,sku:"MALT-CRT",name:"Malt Drink",unit:"carton",price:14200,moq:8,supplier:"City Beverage Depot"},
  {id:7,sku:"FLOUR-50",name:"Baking Flour",unit:"50kg bag",price:51500,moq:5,supplier:"Millers Direct"},
  {id:8,sku:"DETERG-CRT",name:"Laundry Detergent",unit:"carton",price:18400,moq:6,supplier:"Everyday FMCG Supply"}
];

let quickRows = [{sku:"",qty:""}];
let activeRfqId = null;

function read(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function fmt(value){return "₦"+Number(value||0).toLocaleString("en-NG");}
function productBySku(sku){return products.find(p=>p.sku===String(sku||"").trim().toUpperCase());}
function productById(id){return products.find(p=>p.id===Number(id));}

function toast(message){
  const node=document.getElementById("toast");
  node.textContent=message;node.classList.add("show");
  clearTimeout(window.__procToast);
  window.__procToast=setTimeout(()=>node.classList.remove("show"),2200);
}

function renderQuickRows(){
  const wrap=document.getElementById("quickRows");
  wrap.innerHTML=quickRows.map((row,index)=>{
    const p=productBySku(row.sku);
    const qty=Number(row.qty||0);
    const match=p ? p.name+" • MOQ "+p.moq+" "+p.unit+"s"+(qty && qty<p.moq ? " • quantity will be raised to MOQ" : "") : (row.sku ? "No SKU match" : "Waiting for SKU");
    return '<div class="quick-row">'+
      '<input aria-label="SKU" value="'+String(row.sku||"").replace(/"/g,"&quot;")+'" oninput="updateQuickRow('+index+',\'sku\',this.value)" placeholder="e.g. RICE-PB50">'+
      '<input aria-label="Quantity" type="number" min="1" value="'+(row.qty||"")+'" oninput="updateQuickRow('+index+',\'qty\',this.value)" placeholder="Qty">'+
      '<div class="match">'+match+'</div>'+
      '<button class="remove" onclick="removeQuickRow('+index+')" aria-label="Remove row">×</button>'+
    '</div>';
  }).join("");
}

function updateQuickRow(index,key,value){
  quickRows[index][key]=value;
  renderQuickRows();
}
function removeQuickRow(index){
  quickRows.splice(index,1);
  if(!quickRows.length) quickRows=[{sku:"",qty:""}];
  renderQuickRows();
}
function normalizedQuickItems(){
  return quickRows.map(row=>{
    const p=productBySku(row.sku);
    if(!p) return null;
    const requested=Math.max(1,Number(row.qty||p.moq));
    return {id:p.id,sku:p.sku,name:p.name,qty:Math.max(p.moq,requested),unit:p.unit,price:p.price,supplier:p.supplier};
  }).filter(Boolean);
}

function addItemsToCart(items){
  const cart=read("supplyhq-cart",[]);
  items.forEach(item=>{
    const existing=cart.find(x=>x.id===item.id);
    if(existing) existing.qty+=item.qty; else cart.push({id:item.id,qty:item.qty});
  });
  write("supplyhq-cart",cart);
}

function renderSkuHelp(){
  document.getElementById("skuHelp").innerHTML=products.map(p=>'<div><b>'+p.sku+'</b><span>'+p.name+' • MOQ '+p.moq+'</span></div>').join("");
}

function renderLists(){
  const lists=read("supplyhq-requisition-lists",[]);
  const node=document.getElementById("requisitionLists");
  node.innerHTML=lists.length ? lists.slice().reverse().map(list=>{
    const total=list.items.reduce((s,i)=>s+i.price*i.qty,0);
    return '<article class="list-card"><h4>'+list.name+'</h4><p>'+list.items.length+' SKU(s) • '+fmt(total)+' indicative value</p><p>'+list.items.map(i=>i.sku+" × "+i.qty).join(" · ")+'</p><div class="list-actions"><button onclick="addListToCart(\''+list.id+'\')">Add to cart</button><button onclick="loadListIntoQuick(\''+list.id+'\')">Edit in Quick Order</button><button onclick="deleteList(\''+list.id+'\')">Delete</button></div></article>';
  }).join("") : '<div class="empty-state">No requisition lists yet. Build a Quick Order and save it as a reusable list.</div>';
}

function addListToCart(id){
  const list=read("supplyhq-requisition-lists",[]).find(x=>x.id===id);
  if(!list) return;
  addItemsToCart(list.items);
  toast("Requisition list added to cart");
}
function loadListIntoQuick(id){
  const list=read("supplyhq-requisition-lists",[]).find(x=>x.id===id);
  if(!list) return;
  quickRows=list.items.map(i=>({sku:i.sku,qty:i.qty}));
  renderQuickRows();
  activateTab("quick");
  toast("List loaded into Quick Order");
}
function deleteList(id){
  write("supplyhq-requisition-lists",read("supplyhq-requisition-lists",[]).filter(x=>x.id!==id));
  renderLists();
}

function renderQuotes(){
  const rfqs=read("supplyhq-rfqs",[]);
  const list=document.getElementById("quoteList");
  list.innerHTML=rfqs.length ? rfqs.slice().reverse().map(r=>'<article class="quote-card '+(r.id===activeRfqId?"active":"")+'"><h4>'+r.productName+'</h4><p>'+r.id+' • '+r.quantity+' '+r.unit+'s</p><p>Status: '+r.status+' • Target '+(r.targetPrice?fmt(r.targetPrice):"open")+'</p><button onclick="openQuote(\''+r.id+'\')">Open negotiation</button></article>').join("") : '<div class="empty-state">No RFQs yet. Create one from a marketplace product.</div>';
  renderQuoteThread();
}

function openQuote(id){
  activeRfqId=id;
  renderQuotes();
}

function renderQuoteThread(){
  const node=document.getElementById("quoteThread");
  if(!activeRfqId){
    node.className="quote-thread empty-state";
    node.textContent="Select an RFQ.";
    return;
  }
  const rfq=read("supplyhq-rfqs",[]).find(r=>r.id===activeRfqId);
  if(!rfq){
    activeRfqId=null;
    node.textContent="RFQ not found.";
    return;
  }
  const messages=rfq.messages||[];
  node.className="quote-thread";
  node.innerHTML='<div class="msg"><strong>SupplyHQ</strong><div>RFQ opened for '+rfq.quantity+' '+rfq.unit+'s of '+rfq.productName+'.</div><small>Target '+(rfq.targetPrice?fmt(rfq.targetPrice):"not specified")+'</small></div>'+
    (messages.length ? messages.map(m=>'<div class="msg '+(m.actor==="Supplier"?"supplier":"")+'"><strong>'+m.actor+(m.amount?" • "+fmt(m.amount):"")+'</strong><div>'+m.message+'</div><small>'+new Date(m.createdAt).toLocaleString()+'</small></div>').join("") : '<div class="empty-state">No negotiation messages yet.</div>');
}

function renderPOs(){
  const orders=read("supplyhq-orders",[]);
  const pos=read("supplyhq-purchase-orders",[]);
  const node=document.getElementById("purchaseOrders");
  if(!orders.length){
    node.innerHTML='<div class="empty-state">No marketplace orders yet. Place an order before generating a purchase order.</div>';
    return;
  }
  node.innerHTML=orders.slice().reverse().map(order=>{
    const po=pos.find(p=>p.orderId===order.id);
    return '<article class="po-card"><h4>'+order.id+' • '+fmt(order.total)+'</h4><p>'+new Date(order.createdAt).toLocaleDateString()+' • '+order.status+'</p>'+
      (po?'<p><b>'+po.poNumber+'</b> • Created '+new Date(po.createdAt).toLocaleDateString()+'</p><div class="po-actions"><button onclick="copyPO(\''+po.id+'\')">Copy PO text</button></div>':'<div class="po-actions"><button onclick="generatePO(\''+order.id+'\')">Generate purchase order</button></div>')+
    '</article>';
  }).join("");
}

function generatePO(orderId){
  const orders=read("supplyhq-orders",[]);
  const order=orders.find(o=>o.id===orderId);
  if(!order) return;
  const pos=read("supplyhq-purchase-orders",[]);
  if(pos.some(p=>p.orderId===orderId)) return;
  const company=read("supplyhq-company",{name:"Buyer Company",location:""});
  const po={
    id:"PO-"+Date.now(),
    poNumber:"SHQ-PO-"+String(Date.now()).slice(-6),
    orderId,
    companyName:company.name||"Buyer Company",
    createdAt:new Date().toISOString(),
    total:order.total,
    items:order.items||[]
  };
  pos.push(po);
  write("supplyhq-purchase-orders",pos);
  renderPOs();
  toast("Purchase order generated");
}

function copyPO(id){
  const po=read("supplyhq-purchase-orders",[]).find(p=>p.id===id);
  if(!po) return;
  const lines=(po.items||[]).map(i=>"• "+i.name+" — "+i.qty+" "+i.unit+"s @ "+fmt(i.price));
  const text=[po.poNumber,po.companyName,"Order: "+po.orderId,"Date: "+new Date(po.createdAt).toLocaleDateString(),"",...lines,"","Total: "+fmt(po.total)].join("\n");
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast("PO text copied")).catch(()=>window.prompt("Copy purchase order:",text));
  else window.prompt("Copy purchase order:",text);
}

function renderCompany(){
  const company=read("supplyhq-company",{name:"",segment:"Retailer",location:"",email:""});
  const form=document.getElementById("companyForm");
  ["name","segment","location","email"].forEach(key=>{if(form.elements[key]) form.elements[key].value=company[key]||"";});
  const status=localStorage.getItem("supplyhq-company-status")||"Draft";
  document.getElementById("companyStatus").innerHTML='<div class="company-state"><b>Company status: '+status+'</b><div class="muted small">Production onboarding can gate wholesale pricing and catalogs until approval.</div></div>';
  const users=read("supplyhq-company-users",[]);
  document.getElementById("companyUsers").innerHTML=users.length ? users.map((u,index)=>'<article class="company-user"><h4>'+u.name+'</h4><p>'+u.email+' • '+u.role+'</p><button onclick="removeCompanyUser('+index+')">Remove</button></article>').join("") : '<div class="empty-state">No team members yet.</div>';
}
function removeCompanyUser(index){
  const users=read("supplyhq-company-users",[]);
  users.splice(index,1);write("supplyhq-company-users",users);renderCompany();
}

function activateTab(tab){
  document.querySelectorAll(".proc-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelectorAll(".proc-tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(tab+"Tab").classList.add("active");
}

document.querySelectorAll(".proc-tabs button").forEach(btn=>btn.addEventListener("click",()=>activateTab(btn.dataset.tab)));
document.getElementById("addQuickRow").addEventListener("click",()=>{quickRows.push({sku:"",qty:""});renderQuickRows();});
document.getElementById("importCsv").addEventListener("click",()=>{
  const lines=document.getElementById("csvInput").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const rows=lines.map(line=>{const [sku,qty]=line.split(",");return {sku:(sku||"").trim().toUpperCase(),qty:(qty||"").trim()};});
  if(rows.length){quickRows=rows;renderQuickRows();toast(rows.length+" CSV row(s) imported");}
});
document.getElementById("quickAddCart").addEventListener("click",()=>{
  const items=normalizedQuickItems();
  if(!items.length){toast("Add at least one valid SKU");return;}
  addItemsToCart(items);toast(items.length+" SKU(s) added to cart");
});
document.getElementById("saveAsList").addEventListener("click",()=>{
  if(!normalizedQuickItems().length){toast("Add valid SKUs before saving");return;}
  document.getElementById("nameListDialog").showModal();
});
document.getElementById("nameListForm").addEventListener("submit",event=>{
  if(event.submitter?.value==="cancel") return;
  const name=document.getElementById("listName").value.trim();
  if(!name) return;
  const lists=read("supplyhq-requisition-lists",[]);
  lists.push({id:"RL-"+Date.now(),name,createdAt:new Date().toISOString(),items:normalizedQuickItems()});
  write("supplyhq-requisition-lists",lists);
  event.currentTarget.reset();
  renderLists();
  toast("Requisition list saved");
});
document.getElementById("quoteMessageForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(!activeRfqId){toast("Select an RFQ first");return;}
  const rfqs=read("supplyhq-rfqs",[]);
  const rfq=rfqs.find(r=>r.id===activeRfqId);
  if(!rfq) return;
  rfq.messages=rfq.messages||[];
  const actor=document.getElementById("quoteActor").value;
  const amount=Number(document.getElementById("quoteAmount").value||0);
  const message=document.getElementById("quoteMessage").value.trim();
  rfq.messages.push({actor,amount,message,createdAt:new Date().toISOString()});
  if(actor==="Supplier" && amount) rfq.status="Quoted";
  write("supplyhq-rfqs",rfqs);
  event.currentTarget.reset();
  renderQuotes();
  toast("Negotiation message added");
});
document.getElementById("companyForm").addEventListener("submit",event=>{
  event.preventDefault();
  write("supplyhq-company",Object.fromEntries(new FormData(event.currentTarget)));
  if(!localStorage.getItem("supplyhq-company-status")) localStorage.setItem("supplyhq-company-status","Pending approval");
  renderCompany();toast("Company profile saved");
});
document.getElementById("addCompanyUser").addEventListener("click",()=>document.getElementById("userDialog").showModal());
document.getElementById("userForm").addEventListener("submit",event=>{
  if(event.submitter?.value==="cancel") return;
  const users=read("supplyhq-company-users",[]);
  users.push(Object.fromEntries(new FormData(event.currentTarget)));
  write("supplyhq-company-users",users);
  event.currentTarget.reset();renderCompany();toast("Company user added");
});

renderQuickRows();
renderSkuHelp();
renderLists();
renderQuotes();
renderPOs();
renderCompany();