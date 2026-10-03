const products = [
  {id:1,name:"Premium Parboiled Rice",supplier:"Eastern Grain Depot",moq:5,stock:120},
  {id:2,name:"Local Ofada Rice",supplier:"Green Basket Foods",moq:4,stock:68},
  {id:3,name:"Red Palm Oil",supplier:"Niger Delta Oils",moq:3,stock:92},
  {id:4,name:"Vegetable Cooking Oil",supplier:"Prime Foods Wholesale",moq:4,stock:75},
  {id:5,name:"Soft Drink Assorted",supplier:"Metro Drinks Hub",moq:10,stock:240},
  {id:6,name:"Malt Drink",supplier:"City Beverage Depot",moq:8,stock:146},
  {id:7,name:"Baking Flour",supplier:"Millers Direct",moq:5,stock:89},
  {id:8,name:"Laundry Detergent",supplier:"Everyday FMCG Supply",moq:6,stock:105}
];

function read(key,fallback){
  try{return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));}
  catch{return fallback;}
}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function fmt(value){return "₦"+Number(value||0).toLocaleString("en-NG");}
function metric(label,value,note){return '<article class="metric"><small>'+label+'</small><strong>'+value+'</strong><em>'+note+'</em></article>';}

function supplierState(){
  const profile = read("supplyhq-supplier",null);
  const status = localStorage.getItem("supplyhq-supplier-status") || "Pending";
  return {profile,status};
}

function render(){
  const orders = read("supplyhq-orders",[]);
  const rfqs = read("supplyhq-rfqs",[]);
  const overrides = read("supplyhq-stock-overrides",{});
  const inv = products.map(p=>({...p,stock:Number(overrides[p.id] ?? p.stock)}));
  const low = inv.filter(p=>p.stock <= p.moq*3);
  const supplier = supplierState();

  document.getElementById("adminMetrics").innerHTML =
    metric("Orders",orders.length,"Buyer-created records")+
    metric("RFQs",rfqs.length,"Bulk quote requests")+
    metric("Supplier applications",supplier.profile?1:0,supplier.status+" review")+
    metric("Low-stock SKUs",low.length,"At or below 3× MOQ");

  document.getElementById("supplierQueue").innerHTML = supplier.profile
    ? '<div class="admin-card"><h4>'+supplier.profile.business+'</h4><p>'+supplier.profile.category+' • '+supplier.profile.location+'</p><p>'+supplier.profile.phone+' • Status: <b>'+supplier.status+'</b></p><div class="admin-actions"><button class="approve" onclick="setSupplierStatus(\'Approved\')">Approve</button><button onclick="setSupplierStatus(\'Needs Review\')">Needs review</button><button class="danger" onclick="setSupplierStatus(\'Rejected\')">Reject</button></div></div>'
    : '<div class="empty-state">No supplier application has been saved on this device.</div>';

  document.getElementById("adminOrders").innerHTML = orders.length
    ? orders.slice().reverse().map(o=>'<div class="admin-card"><h4>'+o.id+' • '+fmt(o.total)+'</h4><p>'+new Date(o.createdAt).toLocaleString()+' • '+o.status+'</p><div class="admin-actions"><button onclick="setOrderStatus(\''+o.id+'\',\'Confirmed\')">Confirm</button><button onclick="setOrderStatus(\''+o.id+'\',\'Delivered\')">Delivered</button></div></div>').join("")
    : '<div class="empty-state">No marketplace orders yet.</div>';

  document.getElementById("adminRfqs").innerHTML = rfqs.length
    ? rfqs.slice().reverse().map(r=>'<div class="admin-card"><h4>'+r.productName+'</h4><p>'+r.quantity+' '+r.unit+'s • '+r.deliveryLocation+'</p><p>Target: '+(r.targetPrice?fmt(r.targetPrice):"Open")+' • '+r.status+'</p><div class="admin-actions"><button onclick="setRfqStatus(\''+r.id+'\',\'Quoted\')">Mark quoted</button><button onclick="setRfqStatus(\''+r.id+'\',\'Closed\')">Close</button></div></div>').join("")
    : '<div class="empty-state">No RFQs yet.</div>';

  document.getElementById("stockWatch").innerHTML = low.length
    ? low.map(p=>'<div class="admin-card"><h4>'+p.name+'</h4><p>'+p.supplier+' • Stock '+p.stock+' • MOQ '+p.moq+'</p></div>').join("")
    : '<div class="empty-state">No products currently fall below the low-stock threshold.</div>';
}

function setSupplierStatus(status){
  localStorage.setItem("supplyhq-supplier-status",status);
  toast("Supplier status set to "+status);
  render();
}
function setOrderStatus(id,status){
  const data = read("supplyhq-orders",[]);
  const row = data.find(o=>o.id===id);
  if(row) row.status=status;
  write("supplyhq-orders",data);
  toast("Order "+id+" marked "+status);
  render();
}
function setRfqStatus(id,status){
  const data = read("supplyhq-rfqs",[]);
  const row = data.find(r=>r.id===id);
  if(row) row.status=status;
  write("supplyhq-rfqs",data);
  toast("RFQ marked "+status);
  render();
}
function toast(message){
  const node=document.getElementById("toast");
  node.textContent=message;node.classList.add("show");
  clearTimeout(window.__adminToast);
  window.__adminToast=setTimeout(()=>node.classList.remove("show"),2200);
}
render();