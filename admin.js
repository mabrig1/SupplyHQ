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

const remoteState={summary:null,suppliers:null,companies:null,orders:null,rfqs:null,commission:null};

function read(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
  catch{return fallback;}
}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function fmt(value){return "₦"+Number(value||0).toLocaleString("en-NG");}
function metric(label,value,note){return '<article class="metric"><small>'+label+'</small><strong>'+value+'</strong><em>'+note+'</em></article>';}
function apiAdmin(){const u=window.SupplyHQAPI&&window.SupplyHQAPI.user();return Boolean(u&&u.role==="admin"&&window.SupplyHQAPI.token());}

function localSupplierRows(){
  const profile=read("supplyhq-supplier",null);
  if(!profile) return [];
  return [{id:"local-supplier",...profile,status:localStorage.getItem("supplyhq-supplier-status")||"Pending",email:"Local demo"}];
}
function localCompanyRows(){
  const profile=read("supplyhq-company",null);
  if(!profile) return [];
  return [{id:"local-company",...profile,status:localStorage.getItem("supplyhq-company-status")||"Draft",owner_email:profile.email||"Local demo"}];
}

function render(){
  const orders=remoteState.orders||read("supplyhq-orders",[]);
  const rfqs=remoteState.rfqs||read("supplyhq-rfqs",[]);
  const suppliers=remoteState.suppliers||localSupplierRows();
  const companies=remoteState.companies||localCompanyRows();
  const overrides=read("supplyhq-stock-overrides",{});
  const inv=products.map(p=>({...p,stock:Number(overrides[p.id]??p.stock)}));
  const low=inv.filter(p=>p.stock<=p.moq*3);
  const summary=remoteState.summary;

  document.getElementById("adminMetrics").innerHTML=
    metric("Orders",summary?summary.orders:orders.length,"Buyer-created records")+
    metric("RFQs",summary?summary.openRfqs:rfqs.filter(r=>r.status!=="Closed").length,"Open quote requests")+
    metric("Supplier applications",summary?summary.pendingSuppliers:suppliers.filter(s=>s.status==="Pending").length,"Pending review")+
    metric("Buyer companies",summary?summary.pendingCompanies:companies.filter(c=>c.status==="Pending"||c.status==="Pending approval").length,"Pending approval");

  document.getElementById("supplierQueue").innerHTML=suppliers.length
    ? suppliers.map(s=>'<div class="admin-card"><h4>'+escapeHtml(s.business||"Supplier")+'</h4><p>'+escapeHtml(s.category||"")+' • '+escapeHtml(s.location||"")+'</p><p>'+escapeHtml(s.email||s.phone||"")+' • Status: <b>'+escapeHtml(s.status||"Pending")+'</b></p><div class="admin-actions"><button class="approve" onclick="setSupplierStatus(\''+s.id+'\',\'Approved\')">Approve</button><button onclick="setSupplierStatus(\''+s.id+'\',\'Needs Review\')">Needs review</button><button class="danger" onclick="setSupplierStatus(\''+s.id+'\',\'Rejected\')">Reject</button></div></div>').join("")
    : '<div class="empty-state">No supplier applications.</div>';

  document.getElementById("companyQueue").innerHTML=companies.length
    ? companies.map(company=>'<div class="admin-card"><h4>'+escapeHtml(company.name||"Buyer company")+'</h4><p>'+escapeHtml(company.segment||"")+' • '+escapeHtml(company.location||"")+'</p><p>'+escapeHtml(company.owner_email||company.email||"")+' • Status: <b>'+escapeHtml(company.status||"Pending")+'</b></p><div class="admin-actions"><button class="approve" onclick="setCompanyStatus(\''+company.id+'\',\'Approved\')">Approve</button><button onclick="setCompanyStatus(\''+company.id+'\',\'Needs Review\')">Needs review</button><button class="danger" onclick="setCompanyStatus(\''+company.id+'\',\'Rejected\')">Reject</button></div></div>').join("")
    : '<div class="empty-state">No buyer company profiles.</div>';

  document.getElementById("commissionRate").value=remoteState.commission??Number(localStorage.getItem("supplyhq-commission-rate")||5);

  document.getElementById("adminOrders").innerHTML=orders.length
    ? orders.slice().reverse().map(o=>'<div class="admin-card"><h4>'+escapeHtml(o.id)+' • '+fmt(o.total)+'</h4><p>'+formatDate(o.created_at||o.createdAt)+' • '+escapeHtml(o.status||"Pending")+'</p><div class="admin-actions"><button onclick="setOrderStatus(\''+o.id+'\',\'Confirmed\')">Confirm</button><button onclick="setOrderStatus(\''+o.id+'\',\'Delivered\')">Delivered</button></div></div>').join("")
    : '<div class="empty-state">No marketplace orders yet.</div>';

  document.getElementById("adminRfqs").innerHTML=rfqs.length
    ? rfqs.slice().reverse().map(q=>'<div class="admin-card"><h4>'+escapeHtml(q.product_name||q.productName||"RFQ")+'</h4><p>'+Number(q.quantity||0)+' '+escapeHtml(q.unit||"")+' • '+escapeHtml(q.delivery_location||q.deliveryLocation||"")+'</p><p>Target: '+((q.target_price||q.targetPrice)?fmt(q.target_price||q.targetPrice):"Open")+' • '+escapeHtml(q.status||"Open")+'</p><div class="admin-actions"><button onclick="setRfqStatus(\''+q.id+'\',\'Quoted\')">Mark quoted</button><button onclick="setRfqStatus(\''+q.id+'\',\'Closed\')">Close</button></div></div>').join("")
    : '<div class="empty-state">No RFQs yet.</div>';

  document.getElementById("stockWatch").innerHTML=low.length
    ? low.map(p=>'<div class="admin-card"><h4>'+escapeHtml(p.name)+'</h4><p>'+escapeHtml(p.supplier)+' • Stock '+p.stock+' • MOQ '+p.moq+'</p></div>').join("")
    : '<div class="empty-state">No products currently fall below the low-stock threshold.</div>';
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function formatDate(value){
  if(!value) return "";
  const d=new Date(value);return Number.isNaN(d.getTime())?escapeHtml(value):d.toLocaleString();
}

async function syncRemoteAdmin(){
  if(!apiAdmin()) return;
  try{
    const [summary,suppliers,companies,orders,rfqs,commission]=await Promise.all([
      window.SupplyHQAPI.adminSummary(),
      window.SupplyHQAPI.adminSuppliers(),
      window.SupplyHQAPI.adminCompanies(),
      window.SupplyHQAPI.orders(),
      window.SupplyHQAPI.rfqs(),
      window.SupplyHQAPI.getCommission()
    ]);
    remoteState.summary=summary.summary||null;
    remoteState.suppliers=suppliers.suppliers||[];
    remoteState.companies=companies.companies||[];
    remoteState.orders=orders.orders||[];
    remoteState.rfqs=rfqs.rfqs||[];
    remoteState.commission=Number(commission.commissionRate);
    render();
  }catch(error){
    toast(error.message||"Admin API sync failed");
  }
}

async function setSupplierStatus(id,status){
  if(apiAdmin()&&id!=="local-supplier"){
    try{await window.SupplyHQAPI.setSupplierStatus(id,status);await syncRemoteAdmin();toast("Supplier status updated");return;}
    catch(error){toast(error.message||"Supplier update failed");return;}
  }
  localStorage.setItem("supplyhq-supplier-status",status);render();toast("Local supplier status updated");
}
async function setCompanyStatus(id,status){
  if(apiAdmin()&&id!=="local-company"){
    try{await window.SupplyHQAPI.setCompanyStatus(id,status);await syncRemoteAdmin();toast("Company status updated");return;}
    catch(error){toast(error.message||"Company update failed");return;}
  }
  localStorage.setItem("supplyhq-company-status",status);render();toast("Local company status updated");
}
async function setOrderStatus(id,status){
  if(apiAdmin()){
    try{await window.SupplyHQAPI.setOrderStatus(id,status);await syncRemoteAdmin();toast("Order status updated");return;}
    catch(error){toast(error.message||"Order update failed");return;}
  }
  const data=read("supplyhq-orders",[]);const row=data.find(o=>o.id===id);if(row)row.status=status;write("supplyhq-orders",data);render();
}
async function setRfqStatus(id,status){
  if(apiAdmin()){
    try{await window.SupplyHQAPI.setRfqStatus(id,status);await syncRemoteAdmin();toast("RFQ status updated");return;}
    catch(error){toast(error.message||"RFQ update failed");return;}
  }
  const data=read("supplyhq-rfqs",[]);const row=data.find(q=>q.id===id);if(row)row.status=status;write("supplyhq-rfqs",data);render();
}

function toast(message){
  const node=document.getElementById("toast");node.textContent=message;node.classList.add("show");
  clearTimeout(window.__adminToast);window.__adminToast=setTimeout(()=>node.classList.remove("show"),2200);
}

document.getElementById("commissionForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const value=Math.max(0,Math.min(30,Number(document.getElementById("commissionRate").value||0)));
  if(apiAdmin()){
    try{const result=await window.SupplyHQAPI.setCommission(value);remoteState.commission=Number(result.commissionRate);toast("Server commission updated to "+value+"%");render();return;}
    catch(error){toast(error.message||"Commission update failed");return;}
  }
  localStorage.setItem("supplyhq-commission-rate",String(value));toast("Local demo commission updated to "+value+"%");render();
});

render();
syncRemoteAdmin();