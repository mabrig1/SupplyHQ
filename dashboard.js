const baseProducts = [
  {id:1,name:"Premium Parboiled Rice",category:"Grains",emoji:"🍚",supplier:"Eastern Grain Depot",location:"Onitsha",price:74000,unit:"50kg bag",moq:5,stock:120},
  {id:2,name:"Local Ofada Rice",category:"Grains",emoji:"🌾",supplier:"Green Basket Foods",location:"Abeokuta",price:54500,unit:"25kg bag",moq:4,stock:68},
  {id:3,name:"Red Palm Oil",category:"Oils",emoji:"🫙",supplier:"Niger Delta Oils",location:"Port Harcourt",price:42000,unit:"25L keg",moq:3,stock:92},
  {id:4,name:"Vegetable Cooking Oil",category:"Oils",emoji:"🧴",supplier:"Prime Foods Wholesale",location:"Lagos",price:36800,unit:"25L keg",moq:4,stock:75},
  {id:5,name:"Soft Drink Assorted",category:"Beverages",emoji:"🥤",supplier:"Metro Drinks Hub",location:"Enugu",price:9700,unit:"carton",moq:10,stock:240},
  {id:6,name:"Malt Drink",category:"Beverages",emoji:"🍺",supplier:"City Beverage Depot",location:"Abuja",price:14200,unit:"carton",moq:8,stock:146},
  {id:7,name:"Baking Flour",category:"Flour & Baking",emoji:"🥣",supplier:"Millers Direct",location:"Kano",price:51500,unit:"50kg bag",moq:5,stock:89},
  {id:8,name:"Laundry Detergent",category:"Household",emoji:"🧼",supplier:"Everyday FMCG Supply",location:"Aba",price:18400,unit:"carton",moq:6,stock:105}
];

let activeRole = localStorage.getItem("supplyhq-role") || "buyer";
let activeView = "overview";

function read(key, fallback){
  try{return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));}
  catch{return fallback;}
}
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function fmt(value){ return "₦" + Number(value || 0).toLocaleString("en-NG"); }

function productsWithOverrides(){
  const overrides = read("supplyhq-stock-overrides", {});
  return baseProducts.map(p => ({...p, stock:Number(overrides[p.id] ?? p.stock)}));
}
function orders(){ return read("supplyhq-orders", []); }
function rfqs(){ return read("supplyhq-rfqs", []); }
function savedIds(){ return read("supplyhq-saved", []); }

function statusClass(status){
  return String(status || "pending").toLowerCase().replace(/\s+/g,"-");
}

function metricCard(label, value, note){
  return '<article class="metric"><small>'+label+'</small><strong>'+value+'</strong><em>'+note+'</em></article>';
}

function renderMetrics(){
  const orderData = orders();
  const rfqData = rfqs();
  const saved = savedIds();
  const inventory = productsWithOverrides();

  if(activeRole === "buyer"){
    const spend = orderData.reduce((s,o)=>s+Number(o.total||0),0);
    document.getElementById("metricGrid").innerHTML =
      metricCard("Orders", orderData.length, "Wholesale orders created") +
      metricCard("Order value", fmt(spend), "Estimated goods total") +
      metricCard("Open RFQs", rfqData.filter(r=>r.status!=="Closed").length, "Awaiting supplier quotes") +
      metricCard("Saved goods", saved.length, "Ready for quick reorder");
  }else{
    const low = inventory.filter(p=>p.stock <= p.moq * 3).length;
    document.getElementById("metricGrid").innerHTML =
      metricCard("Listed SKUs", inventory.length, "Demo inventory catalogue") +
      metricCard("Incoming orders", orderData.length, "Marketplace demand") +
      metricCard("Open RFQs", rfqData.filter(r=>r.status!=="Closed").length, "Buyer quote requests") +
      metricCard("Low stock", low, "At or below 3× MOQ");
  }
}

function orderRows(limit){
  const data = orders().slice().reverse();
  const list = typeof limit === "number" ? data.slice(0,limit) : data;
  if(!list.length) return '<div class="empty-state">No orders yet. Create one from the marketplace cart.</div>';
  return '<div class="data-list"><div class="data-row header"><span>Order</span><span>Total</span><span>Date</span><span>Status</span></div>' +
    list.map(o => '<div class="data-row"><strong>'+o.id+'</strong><span>'+fmt(o.total)+'</span><span>'+new Date(o.createdAt).toLocaleDateString()+'</span><span class="status '+statusClass(o.status)+'">'+o.status+'</span></div>').join("") +
  '</div>';
}

function rfqRows(limit){
  const data = rfqs().slice().reverse();
  const list = typeof limit === "number" ? data.slice(0,limit) : data;
  if(!list.length) return '<div class="empty-state">No RFQs yet. Request a quote from any product page.</div>';
  return '<div class="data-list"><div class="data-row header"><span>Request</span><span>Quantity</span><span>Target</span><span>Status</span></div>' +
    list.map(r => '<div class="data-row"><strong>'+r.productName+'</strong><span>'+r.quantity+' '+r.unit+'s</span><span>'+(r.targetPrice ? fmt(r.targetPrice) : "Open")+'</span><span class="status open">'+r.status+'</span></div>').join("") +
  '</div>';
}

function renderSaved(){
  const products = productsWithOverrides();
  const ids = savedIds();
  const items = products.filter(p=>ids.includes(p.id));
  document.getElementById("savedGrid").innerHTML = items.length
    ? items.map(p => '<article class="saved-item"><div class="emoji">'+p.emoji+'</div><h4>'+p.name+'</h4><p>'+p.supplier+' • '+p.location+'</p><strong>'+fmt(p.price)+'</strong><br><a href="index.html#marketplace">Reorder from marketplace</a></article>').join("")
    : '<div class="empty-state">No saved goods yet. Use the Save button on marketplace products.</div>';
}

function renderInventory(){
  const products = productsWithOverrides();
  document.getElementById("inventoryTable").innerHTML = products.map(p =>
    '<div class="inventory-row"><div><strong>'+p.name+'</strong><div class="muted">'+p.supplier+' • '+p.unit+'</div></div><span>MOQ '+p.moq+'</span><input id="stock-'+p.id+'" type="number" min="0" value="'+p.stock+'" aria-label="Stock for '+p.name+'"><button onclick="saveStock('+p.id+')">Update stock</button></div>'
  ).join("");
}

function renderAll(){
  document.querySelectorAll(".role-btn").forEach(b=>b.classList.toggle("active",b.dataset.role===activeRole));
  document.getElementById("workspaceLabel").textContent = activeRole.toUpperCase()+" WORKSPACE";
  document.querySelectorAll("[data-supplier-only]").forEach(el=>el.style.display = activeRole==="supplier" ? "" : "none");
  if(activeRole==="buyer" && activeView==="inventory") activeView="overview";
  renderMetrics();
  document.getElementById("recentOrders").innerHTML = orderRows(4);
  document.getElementById("recentRfqs").innerHTML = rfqRows(4);
  document.getElementById("ordersTable").innerHTML = orderRows();
  document.getElementById("rfqTable").innerHTML = rfqRows();
  renderSaved();
  renderInventory();
  showView(activeView);
}

function showView(view){
  activeView = view;
  document.querySelectorAll(".dash-view").forEach(v=>v.classList.remove("active"));
  const target = document.getElementById(view+"View");
  if(target) target.classList.add("active");
  document.querySelectorAll(".dash-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.getElementById("viewTitle").textContent = view.charAt(0).toUpperCase()+view.slice(1);
}

function saveStock(id){
  const input = document.getElementById("stock-"+id);
  const overrides = read("supplyhq-stock-overrides", {});
  overrides[id] = Math.max(0, Number(input.value || 0));
  write("supplyhq-stock-overrides", overrides);
  toast("Stock updated on this device");
  renderAll();
}

function toast(message){
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.__dashToast);
  window.__dashToast = setTimeout(()=>node.classList.remove("show"),2200);
}

document.querySelectorAll(".role-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    activeRole = btn.dataset.role;
    localStorage.setItem("supplyhq-role", activeRole);
    renderAll();
  });
});
document.querySelectorAll(".dash-nav button").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
document.querySelectorAll("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.jump)));

document.getElementById("resetDemo").addEventListener("click",()=>{
  ["supplyhq-orders","supplyhq-rfqs","supplyhq-saved","supplyhq-stock-overrides"].forEach(k=>localStorage.removeItem(k));
  toast("Demo marketplace data reset");
  renderAll();
});

renderAll();