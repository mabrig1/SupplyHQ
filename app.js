let baseProducts = [
  {id:1,name:"Premium Parboiled Rice",category:"Grains",emoji:"🍚",supplier:"Eastern Grain Depot",location:"Onitsha",price:74000,unit:"50kg bag",moq:5,stock:120,rating:4.8,tiers:[[5,74000],[20,72500],[50,71000]]},
  {id:2,name:"Local Ofada Rice",category:"Grains",emoji:"🌾",supplier:"Green Basket Foods",location:"Abeokuta",price:54500,unit:"25kg bag",moq:4,stock:68,rating:4.7,tiers:[[4,54500],[15,53000],[40,51500]]},
  {id:3,name:"Red Palm Oil",category:"Oils",emoji:"🫙",supplier:"Niger Delta Oils",location:"Port Harcourt",price:42000,unit:"25L keg",moq:3,stock:92,rating:4.9,tiers:[[3,42000],[10,40500],[30,39000]]},
  {id:4,name:"Vegetable Cooking Oil",category:"Oils",emoji:"🧴",supplier:"Prime Foods Wholesale",location:"Lagos",price:36800,unit:"25L keg",moq:4,stock:75,rating:4.6,tiers:[[4,36800],[12,35500],[36,34200]]},
  {id:5,name:"Soft Drink Assorted",category:"Beverages",emoji:"🥤",supplier:"Metro Drinks Hub",location:"Enugu",price:9700,unit:"carton",moq:10,stock:240,rating:4.8,tiers:[[10,9700],[30,9400],[80,9050]]},
  {id:6,name:"Malt Drink",category:"Beverages",emoji:"🍺",supplier:"City Beverage Depot",location:"Abuja",price:14200,unit:"carton",moq:8,stock:146,rating:4.5,tiers:[[8,14200],[25,13700],[60,13250]]},
  {id:7,name:"Baking Flour",category:"Flour & Baking",emoji:"🥣",supplier:"Millers Direct",location:"Kano",price:51500,unit:"50kg bag",moq:5,stock:89,rating:4.7,tiers:[[5,51500],[20,50000],[50,48600]]},
  {id:8,name:"Laundry Detergent",category:"Household",emoji:"🧼",supplier:"Everyday FMCG Supply",location:"Aba",price:18400,unit:"carton",moq:6,stock:105,rating:4.6,tiers:[[6,18400],[20,17750],[50,17100]]}
];

function read(key, fallback){
  try{return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));}
  catch{return fallback;}
}
function write(key,value){ localStorage.setItem(key,JSON.stringify(value)); }

let selectedCategory = "all";
let cart = read("supplyhq-cart", []);
let saved = read("supplyhq-saved", []);

function products(){
  const overrides = read("supplyhq-stock-overrides", {});
  return baseProducts.map(product => ({...product, stock:Number(overrides[product.id] ?? product.stock)}));
}

async function syncProductsFromApi(){
  if(!window.SupplyHQAPI) return;
  try{
    const data = await window.SupplyHQAPI.products();
    if(Array.isArray(data.products) && data.products.length){
      baseProducts = data.products;
      renderProducts();
    }
  }catch(error){
    console.warn("SupplyHQ API unavailable; using local product catalogue.");
  }
}

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const productDialog = document.getElementById("productDialog");
const productDetail = document.getElementById("productDetail");
const cartDialog = document.getElementById("cartDialog");
const cartContent = document.getElementById("cartContent");
const supplierDialog = document.getElementById("supplierDialog");
const rfqDialog = document.getElementById("rfqDialog");

function fmt(value){ return "₦" + Number(value).toLocaleString("en-NG"); }
function getProduct(id){ return products().find(product => product.id === Number(id)); }

function productCard(product){
  const isSaved = saved.includes(product.id);
  return '<article class="product-card">' +
    '<div class="product-visual"><span class="stock">' + product.stock + ' ' + product.unit + 's in stock</span>' + product.emoji + '</div>' +
    '<div class="product-body">' +
      '<span class="eyebrow">' + product.category + '</span>' +
      '<h3>' + product.name + '</h3>' +
      '<div class="supplier">' + product.supplier + ' • ' + product.location + '</div>' +
      '<div class="rating">★ ' + product.rating + ' · Demo supplier</div>' +
      '<div class="price">' + fmt(product.price) + '</div>' +
      '<div class="unit">per ' + product.unit + '</div>' +
      '<div class="moq">Minimum order: ' + product.moq + ' ' + product.unit + 's</div>' +
      '<div class="card-actions">' +
        '<button class="outline" onclick="openProduct(' + product.id + ')">Details</button>' +
        '<button class="outline save-btn '+(isSaved?"saved":"")+'" onclick="toggleSave(' + product.id + ')">'+(isSaved?"Saved":"Save")+'</button>' +
        '<button class="add" onclick="addToCart(' + product.id + ')">Add MOQ</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function renderProducts(){
  const q = searchInput.value.trim().toLowerCase();
  let list = products().filter(product => {
    const categoryMatch = selectedCategory === "all" || product.category === selectedCategory;
    const haystack = [product.name,product.supplier,product.location,product.category].join(" ").toLowerCase();
    return categoryMatch && (!q || haystack.includes(q));
  });
  if(sortSelect.value==="price-low") list.sort((a,b)=>a.price-b.price);
  if(sortSelect.value==="moq-low") list.sort((a,b)=>a.moq-b.moq);
  if(sortSelect.value==="stock-high") list.sort((a,b)=>b.stock-a.stock);
  grid.innerHTML = list.length ? list.map(productCard).join("") : '<div class="empty">No stock matches your search. Try another product or category.</div>';
}

function tierRows(product){
  return product.tiers.map(tier => '<div class="tier"><span>'+tier[0]+'+ '+product.unit+'s</span><strong>'+fmt(tier[1])+' each</strong></div>').join("");
}

function openProduct(id){
  const product = getProduct(id);
  if(!product) return;
  productDetail.innerHTML =
    '<div class="detail-top"><button class="close" onclick="productDialog.close()">×</button><div class="emoji">'+product.emoji+'</div></div>' +
    '<div class="detail-body">' +
      '<span class="eyebrow">'+product.category+' • DEMO LISTING</span>' +
      '<h2>'+product.name+'</h2>' +
      '<p class="muted">Supplied by <b>'+product.supplier+'</b> in '+product.location+'. Volume pricing improves automatically as quantity increases.</p>' +
      '<div class="detail-grid"><div><small>BASE PRICE</small><strong>'+fmt(product.price)+'</strong></div><div><small>MINIMUM ORDER</small><strong>'+product.moq+' '+product.unit+'s</strong></div><div><small>AVAILABLE STOCK</small><strong>'+product.stock+' units</strong></div></div>' +
      '<h3>Volume price tiers</h3><div class="tiers">'+tierRows(product)+'</div>' +
      '<div class="detail-actions"><button class="outline" onclick="openRfq('+product.id+');productDialog.close()">Request quote</button><button class="primary" onclick="addToCart('+product.id+');productDialog.close()">Add MOQ to cart</button></div>' +
    '</div>';
  productDialog.showModal();
}

function priceFor(product, qty){
  const tiers = product.tiers.slice().reverse();
  const match = tiers.find(tier => qty >= tier[0]);
  return match ? match[1] : product.price;
}

function toggleSave(id){
  id = Number(id);
  saved = saved.includes(id) ? saved.filter(x=>x!==id) : [...saved,id];
  write("supplyhq-saved", saved);
  renderProducts();
  toast(saved.includes(id) ? "Saved for quick reorder" : "Removed from saved goods");
}

function addToCart(id){
  const product = getProduct(id);
  if(!product) return;
  const item = cart.find(entry=>entry.id===product.id);
  if(item) item.qty += product.moq; else cart.push({id:product.id,qty:product.moq});
  saveCart();
  toast(product.name+" added to cart");
}

function saveCart(){
  write("supplyhq-cart",cart);
  document.getElementById("cartCount").textContent = cart.reduce((total,item)=>total+item.qty,0);
}

function changeQty(id,direction){
  const product = getProduct(id);
  const item = cart.find(entry=>entry.id===id);
  if(!product || !item) return;
  item.qty = Math.max(0,item.qty+direction*product.moq);
  cart = cart.filter(entry=>entry.qty>0);
  saveCart();
  openCart();
}

function cartRow(row){
  return '<div class="cart-item"><div class="icon">'+row.emoji+'</div><div><b>'+row.name+'</b><small>'+row.qty+' × '+row.unit+' @ '+fmt(row.final)+'</small></div><div class="qty"><button onclick="changeQty('+row.id+',-1)">−</button><b>'+row.qty+'</b><button onclick="changeQty('+row.id+',1)">+</button></div></div>';
}

function cartRows(){
  return cart.map(item=>{
    const product = getProduct(item.id);
    return product ? {...product,qty:item.qty,final:priceFor(product,item.qty)} : null;
  }).filter(Boolean);
}

function openCart(){
  if(!cart.length){
    cartContent.innerHTML = '<div class="modal-card"><button class="close" onclick="cartDialog.close()">×</button><span class="eyebrow">YOUR ORDER</span><h2>Your cart is empty</h2><p class="muted">Add wholesale stock to prepare an order.</p></div>';
    if(!cartDialog.open) cartDialog.showModal();
    return;
  }
  const rows = cartRows();
  const total = rows.reduce((sum,row)=>sum+row.final*row.qty,0);
  cartContent.innerHTML =
    '<div class="modal-card"><button class="close" onclick="cartDialog.close()">×</button><span class="eyebrow">WHOLESALE ORDER</span><h2>Review your cart</h2>' +
    '<div class="cart-list">'+rows.map(cartRow).join("")+'</div>' +
    '<div class="cart-total"><span>Estimated goods total</span><span>'+fmt(total)+'</span></div>' +
    '<p class="muted">Delivery cost and final stock confirmation are handled before payment. Placing the order creates a dashboard record.</p>' +
    '<button class="primary full" onclick="placeOrder(false)">Create order & prepare WhatsApp text</button>' +
    '<button class="outline full" onclick="placeOrder(true)">Create order & pay with Paystack</button></div>';
  if(!cartDialog.open) cartDialog.showModal();
}

async function placeOrder(payNow=false){
  const rows = cartRows();
  if(!rows.length) return;
  if(payNow && (!window.SupplyHQAPI || !window.SupplyHQAPI.token())){
    toast("Sign in before starting a secure payment");
    setTimeout(()=>{ window.location.href="account.html"; },700);
    return;
  }
  const total = rows.reduce((sum,row)=>sum+row.final*row.qty,0);
  const now = new Date();
  const commissionRate = Number(localStorage.getItem("supplyhq-commission-rate") || 5);
  const splitMap = {};
  rows.forEach(row=>{
    const subtotal = row.final * row.qty;
    if(!splitMap[row.supplier]) splitMap[row.supplier] = {supplier:row.supplier,gross:0,items:0};
    splitMap[row.supplier].gross += subtotal;
    splitMap[row.supplier].items += 1;
  });
  const supplierSplits = Object.values(splitMap).map(split=>({
    ...split,
    commissionRate,
    commission: Math.round(split.gross * commissionRate / 100),
    net: Math.round(split.gross * (1 - commissionRate / 100)),
    payoutStatus: "Pending"
  }));
  const order = {
    id:"SHQ-"+String(now.getTime()).slice(-7),
    total,
    status:"Pending",
    createdAt:now.toISOString(),
    items:rows.map(row=>({id:row.id,name:row.name,qty:row.qty,unit:row.unit,price:row.final,supplier:row.supplier})),
    supplierSplits
  };
  let finalOrder = order;
  if(window.SupplyHQAPI && window.SupplyHQAPI.token()){
    try{
      const remote = await window.SupplyHQAPI.createOrder(rows.map(row=>({productId:row.id,qty:row.qty})));
      if(remote && remote.order){
        finalOrder = {...order,...remote.order,items:order.items,supplierSplits:order.supplierSplits};
      }
    }catch(error){
      toast("API order sync failed — saved locally");
    }
  }
  const orderData = read("supplyhq-orders",[]);
  orderData.push(finalOrder);
  write("supplyhq-orders",orderData);

  const lines = rows.map(row=>"• "+row.name+": "+row.qty+" "+row.unit+"s @ "+fmt(row.final));
  const msg = "Hello, I want to place SupplyHQ order "+finalOrder.id+":\n\n"+lines.join("\n")+"\n\nEstimated goods total: "+fmt(finalOrder.total || total)+"\nPlease confirm stock, delivery and payment details.";

  if(payNow){
    try{
      const payment=await window.SupplyHQAPI.initializePayment(finalOrder.id);
      if(payment && payment.payment && payment.payment.authorization_url){
        cart=[];
        saveCart();
        cartDialog.close();
        window.location.href=payment.payment.authorization_url;
        return;
      }
    }catch(error){
      toast(error.message || "Payment could not be started");
      return;
    }
  }

  cart = [];
  saveCart();
  cartDialog.close();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(msg).then(()=>toast("Order created and WhatsApp text copied")).catch(()=>window.prompt("Copy your SupplyHQ order:",msg));
  }else{
    window.prompt("Copy your SupplyHQ order:",msg);
  }
}

function openRfq(id){
  const product = getProduct(id);
  if(!product) return;
  document.getElementById("rfqProductId").value = product.id;
  document.getElementById("rfqProductLabel").textContent = product.name+" • "+product.supplier;
  const q = document.getElementById("rfqQuantity");
  q.min = product.moq;
  q.value = Math.max(product.moq*3,product.moq);
  rfqDialog.showModal();
}

function toast(message){
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.__supplyhqToast);
  window.__supplyhqToast = setTimeout(()=>node.classList.remove("show"),2400);
}

document.querySelectorAll(".cat").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll(".cat").forEach(item=>item.classList.remove("active"));
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input",renderProducts);
document.getElementById("searchBtn").addEventListener("click",renderProducts);
sortSelect.addEventListener("change",renderProducts);
document.querySelectorAll('[data-scroll="marketplace"]').forEach(button=>button.addEventListener("click",()=>document.getElementById("marketplace").scrollIntoView()));
["cartBtn","mobileCart"].forEach(id=>document.getElementById(id).addEventListener("click",openCart));
["supplierBtn","supplierBtn2","mobileSupplier"].forEach(id=>document.getElementById(id).addEventListener("click",()=>supplierDialog.showModal()));

document.getElementById("supplierForm").addEventListener("submit",async event=>{
  if(event.submitter && event.submitter.value==="cancel") return;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  write("supplyhq-supplier",data);
  localStorage.setItem("supplyhq-role","supplier");
  if(window.SupplyHQAPI && window.SupplyHQAPI.token()){
    try{
      await window.SupplyHQAPI.createSupplier(data);
      setTimeout(()=>toast("Supplier profile synced for verification"),100);
      return;
    }catch(error){
      setTimeout(()=>toast("Supplier profile saved locally; API sync pending"),100);
      return;
    }
  }
  setTimeout(()=>toast("Supplier profile saved locally — sign in to sync"),100);
});

document.getElementById("rfqForm").addEventListener("submit",async event=>{
  if(event.submitter && event.submitter.value==="cancel") return;
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  const product = getProduct(form.productId);
  if(!product) return;
  const rfqData = read("supplyhq-rfqs",[]);
  let rfq = {
    id:"RFQ-"+String(Date.now()).slice(-7),
    productId:product.id,
    productName:product.name,
    supplier:product.supplier,
    unit:product.unit,
    quantity:Number(form.quantity),
    targetPrice:Number(form.targetPrice||0),
    deliveryLocation:form.deliveryLocation,
    neededBy:form.neededBy||"",
    status:"Open",
    createdAt:new Date().toISOString()
  };
  if(window.SupplyHQAPI && window.SupplyHQAPI.token()){
    try{
      const remote = await window.SupplyHQAPI.createRfq({
        productId:product.id,
        quantity:rfq.quantity,
        targetPrice:rfq.targetPrice,
        deliveryLocation:rfq.deliveryLocation,
        neededBy:rfq.neededBy
      });
      if(remote && remote.rfq) rfq = {...rfq,...remote.rfq};
    }catch(error){
      toast("RFQ saved locally; API sync pending");
    }
  }
  rfqData.push(rfq);
  write("supplyhq-rfqs",rfqData);
  rfqDialog.close();
  event.currentTarget.reset();
  toast("RFQ submitted to your dashboard");
});

saveCart();
renderProducts();
syncProductsFromApi();

window.addEventListener("storage",renderProducts);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}