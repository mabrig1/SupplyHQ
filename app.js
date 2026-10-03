const products = [
  {id:1,name:"Premium Parboiled Rice",category:"Grains",emoji:"🍚",supplier:"Eastern Grain Depot",location:"Onitsha",price:74000,unit:"50kg bag",moq:5,stock:120,rating:4.8,tiers:[[5,74000],[20,72500],[50,71000]]},
  {id:2,name:"Local Ofada Rice",category:"Grains",emoji:"🌾",supplier:"Green Basket Foods",location:"Abeokuta",price:54500,unit:"25kg bag",moq:4,stock:68,rating:4.7,tiers:[[4,54500],[15,53000],[40,51500]]},
  {id:3,name:"Red Palm Oil",category:"Oils",emoji:"🫙",supplier:"Niger Delta Oils",location:"Port Harcourt",price:42000,unit:"25L keg",moq:3,stock:92,rating:4.9,tiers:[[3,42000],[10,40500],[30,39000]]},
  {id:4,name:"Vegetable Cooking Oil",category:"Oils",emoji:"🧴",supplier:"Prime Foods Wholesale",location:"Lagos",price:36800,unit:"25L keg",moq:4,stock:75,rating:4.6,tiers:[[4,36800],[12,35500],[36,34200]]},
  {id:5,name:"Soft Drink Assorted",category:"Beverages",emoji:"🥤",supplier:"Metro Drinks Hub",location:"Enugu",price:9700,unit:"carton",moq:10,stock:240,rating:4.8,tiers:[[10,9700],[30,9400],[80,9050]]},
  {id:6,name:"Malt Drink",category:"Beverages",emoji:"🍺",supplier:"City Beverage Depot",location:"Abuja",price:14200,unit:"carton",moq:8,stock:146,rating:4.5,tiers:[[8,14200],[25,13700],[60,13250]]},
  {id:7,name:"Baking Flour",category:"Flour & Baking",emoji:"🥣",supplier:"Millers Direct",location:"Kano",price:51500,unit:"50kg bag",moq:5,stock:89,rating:4.7,tiers:[[5,51500],[20,50000],[50,48600]]},
  {id:8,name:"Laundry Detergent",category:"Household",emoji:"🧼",supplier:"Everyday FMCG Supply",location:"Aba",price:18400,unit:"carton",moq:6,stock:105,rating:4.6,tiers:[[6,18400],[20,17750],[50,17100]]}
];

let selectedCategory = "all";
let cart = JSON.parse(localStorage.getItem("supplyhq-cart") || "[]");

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const productDialog = document.getElementById("productDialog");
const productDetail = document.getElementById("productDetail");
const cartDialog = document.getElementById("cartDialog");
const cartContent = document.getElementById("cartContent");
const supplierDialog = document.getElementById("supplierDialog");

function fmt(value){
  return "₦" + Number(value).toLocaleString("en-NG");
}

function getProduct(id){
  return products.find(function(product){ return product.id === id; });
}

function productCard(product){
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
        '<button class="add" onclick="addToCart(' + product.id + ')">Add MOQ</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function renderProducts(){
  var q = searchInput.value.trim().toLowerCase();
  var list = products.filter(function(product){
    var categoryMatch = selectedCategory === "all" || product.category === selectedCategory;
    var haystack = [product.name, product.supplier, product.location, product.category].join(" ").toLowerCase();
    return categoryMatch && (!q || haystack.includes(q));
  });

  if(sortSelect.value === "price-low"){
    list.sort(function(a,b){ return a.price - b.price; });
  }
  if(sortSelect.value === "moq-low"){
    list.sort(function(a,b){ return a.moq - b.moq; });
  }

  grid.innerHTML = list.length
    ? list.map(productCard).join("")
    : '<div class="empty">No stock matches your search. Try another product or category.</div>';
}

function tierRows(product){
  return product.tiers.map(function(tier){
    return '<div class="tier"><span>' + tier[0] + '+ ' + product.unit + 's</span><strong>' + fmt(tier[1]) + ' each</strong></div>';
  }).join("");
}

function openProduct(id){
  var product = getProduct(id);
  if(!product) return;

  productDetail.innerHTML =
    '<div class="detail-top">' +
      '<button class="close" onclick="productDialog.close()">×</button>' +
      '<div class="emoji">' + product.emoji + '</div>' +
    '</div>' +
    '<div class="detail-body">' +
      '<span class="eyebrow">' + product.category + ' • DEMO LISTING</span>' +
      '<h2>' + product.name + '</h2>' +
      '<p class="muted">Supplied by <b>' + product.supplier + '</b> in ' + product.location + '. Volume pricing improves automatically as quantity increases.</p>' +
      '<div class="detail-grid">' +
        '<div><small>BASE PRICE</small><strong>' + fmt(product.price) + '</strong></div>' +
        '<div><small>MINIMUM ORDER</small><strong>' + product.moq + ' ' + product.unit + 's</strong></div>' +
        '<div><small>AVAILABLE STOCK</small><strong>' + product.stock + ' units</strong></div>' +
      '</div>' +
      '<h3>Volume price tiers</h3>' +
      '<div class="tiers">' + tierRows(product) + '</div>' +
      '<button class="primary full" onclick="addToCart(' + product.id + ');productDialog.close()">Add minimum order to cart</button>' +
    '</div>';

  productDialog.showModal();
}

function priceFor(product, qty){
  var tiers = product.tiers.slice().reverse();
  var match = tiers.find(function(tier){ return qty >= tier[0]; });
  return match ? match[1] : product.price;
}

function addToCart(id){
  var product = getProduct(id);
  if(!product) return;

  var item = cart.find(function(entry){ return entry.id === id; });
  if(item){
    item.qty += product.moq;
  }else{
    cart.push({id:id, qty:product.moq});
  }

  saveCart();
  toast(product.name + " added to cart");
}

function saveCart(){
  localStorage.setItem("supplyhq-cart", JSON.stringify(cart));
  document.getElementById("cartCount").textContent = cart.reduce(function(total,item){
    return total + item.qty;
  },0);
}

function changeQty(id, direction){
  var product = getProduct(id);
  var item = cart.find(function(entry){ return entry.id === id; });
  if(!product || !item) return;

  item.qty = Math.max(0, item.qty + direction * product.moq);
  cart = cart.filter(function(entry){ return entry.qty > 0; });
  saveCart();
  openCart();
}

function cartRow(row){
  return '<div class="cart-item">' +
    '<div class="icon">' + row.emoji + '</div>' +
    '<div><b>' + row.name + '</b><small>' + row.qty + ' × ' + row.unit + ' @ ' + fmt(row.final) + '</small></div>' +
    '<div class="qty">' +
      '<button onclick="changeQty(' + row.id + ',-1)">−</button>' +
      '<b>' + row.qty + '</b>' +
      '<button onclick="changeQty(' + row.id + ',1)">+</button>' +
    '</div>' +
  '</div>';
}

function openCart(){
  if(!cart.length){
    cartContent.innerHTML =
      '<div class="modal-card">' +
        '<button class="close" onclick="cartDialog.close()">×</button>' +
        '<span class="eyebrow">YOUR ORDER</span>' +
        '<h2>Your cart is empty</h2>' +
        '<p class="muted">Add wholesale stock to prepare an order.</p>' +
      '</div>';
    if(!cartDialog.open) cartDialog.showModal();
    return;
  }

  var rows = cart.map(function(item){
    var product = getProduct(item.id);
    return Object.assign({}, product, {qty:item.qty, final:priceFor(product,item.qty)});
  });

  var total = rows.reduce(function(sum,row){
    return sum + row.final * row.qty;
  },0);

  cartContent.innerHTML =
    '<div class="modal-card">' +
      '<button class="close" onclick="cartDialog.close()">×</button>' +
      '<span class="eyebrow">WHOLESALE ORDER</span>' +
      '<h2>Review your cart</h2>' +
      '<div class="cart-list">' + rows.map(cartRow).join("") + '</div>' +
      '<div class="cart-total"><span>Estimated goods total</span><span>' + fmt(total) + '</span></div>' +
      '<p class="muted">Delivery cost and final stock confirmation are handled before payment.</p>' +
      '<button class="primary full" onclick="checkoutWhatsApp()">Prepare WhatsApp order</button>' +
    '</div>';

  if(!cartDialog.open) cartDialog.showModal();
}

function checkoutWhatsApp(){
  var lines = cart.map(function(item){
    var product = getProduct(item.id);
    return "• " + product.name + ": " + item.qty + " " + product.unit + "s @ " + fmt(priceFor(product,item.qty));
  });

  var msg = "Hello, I want to place this wholesale order through SupplyHQ:\n\n" +
    lines.join("\n") +
    "\n\nPlease confirm stock, delivery and payment details.";

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(msg).then(function(){
      toast("Order text copied — ready to send on WhatsApp");
    }).catch(function(){
      window.prompt("Copy your SupplyHQ order:", msg);
    });
  }else{
    window.prompt("Copy your SupplyHQ order:", msg);
  }
}

function toast(message){
  var node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.__supplyhqToast);
  window.__supplyhqToast = setTimeout(function(){
    node.classList.remove("show");
  },2400);
}

document.querySelectorAll(".cat").forEach(function(button){
  button.addEventListener("click", function(){
    document.querySelectorAll(".cat").forEach(function(item){
      item.classList.remove("active");
    });
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input", renderProducts);
document.getElementById("searchBtn").addEventListener("click", renderProducts);
sortSelect.addEventListener("change", renderProducts);

document.querySelectorAll('[data-scroll="marketplace"]').forEach(function(button){
  button.addEventListener("click", function(){
    document.getElementById("marketplace").scrollIntoView();
  });
});

["cartBtn","mobileCart"].forEach(function(id){
  document.getElementById(id).addEventListener("click", openCart);
});

["supplierBtn","supplierBtn2","mobileSupplier"].forEach(function(id){
  document.getElementById(id).addEventListener("click", function(){
    supplierDialog.showModal();
  });
});

document.getElementById("supplierForm").addEventListener("submit", function(event){
  if(event.submitter && event.submitter.value === "cancel") return;
  var data = Object.fromEntries(new FormData(event.currentTarget));
  localStorage.setItem("supplyhq-supplier", JSON.stringify(data));
  setTimeout(function(){ toast("Supplier profile saved for verification"); },100);
});

saveCart();
renderProducts();

if("serviceWorker" in navigator){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){});
  });
}