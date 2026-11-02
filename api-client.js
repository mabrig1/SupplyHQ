(function () {
  const NEW_DOMAIN = ["supplyhq.online","www.supplyhq.online"].includes(window.location.hostname);
  const DEFAULT_API = NEW_DOMAIN ? "https://api.supplyhq.online" : "https://api.supplyhq.mabrigkorie.org";
  const API_URL = (localStorage.getItem("supplyhq-api-url") || DEFAULT_API).replace(/\/$/, "");
  const TOKEN_KEY = "supplyhq-auth-token";
  const USER_KEY = "supplyhq-auth-user";

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  }

  function user() {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setSession(data, remember) {
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(TOKEN_KEY, data.token);
    target.setItem(USER_KEY, JSON.stringify(data.user));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token()) headers.set("Authorization", "Bearer " + token());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 12000);

    try {
      const response = await fetch(API_URL + path, {
        ...options,
        headers,
        signal: controller.signal,
        body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
      });
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
      if (!response.ok) {
        const error = new Error((data && (data.error || data.message)) || ("HTTP " + response.status));
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function health() {
    return request("/api/health", { timeout: 5000 });
  }

  async function register(payload, remember = true) {
    const data = await request("/api/auth/register", { method: "POST", body: payload });
    setSession(data, remember);
    return data;
  }

  async function login(payload, remember = true) {
    const data = await request("/api/auth/login", { method: "POST", body: payload });
    setSession(data, remember);
    return data;
  }

  async function me() {
    return request("/api/me");
  }

  async function products() {
    return request("/api/products", { timeout: 8000 });
  }

  async function createOrder(items) {
    return request("/api/orders", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: { items }
    });
  }

  async function orders() {
    return request("/api/orders");
  }

  async function createRfq(payload) {
    return request("/api/rfqs", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: payload
    });
  }

  async function rfqs() {
    return request("/api/rfqs");
  }

  async function addRfqMessage(id, payload) {
    return request("/api/rfqs/" + encodeURIComponent(id) + "/messages", { method: "POST", body: payload });
  }

  async function createSupplier(payload) {
    return request("/api/suppliers", { method: "POST", body: payload });
  }

  async function supplierProfile() {
    return request("/api/suppliers/me");
  }

  async function saveCompany(payload) {
    return request("/api/companies", { method: "POST", body: payload });
  }

  async function company() {
    return request("/api/companies/me");
  }

  async function createPurchaseOrder(orderId) {
    return request("/api/purchase-orders", { method: "POST", body: { orderId } });
  }

  async function purchaseOrders() {
    return request("/api/purchase-orders");
  }

  async function initializePayment(orderId) {
    return request("/api/payments/initialize", { method: "POST", body: { orderId } });
  }

  async function adminSummary() {
    return request("/api/admin/summary");
  }

  async function adminSuppliers() {
    return request("/api/admin/suppliers");
  }

  async function adminCompanies() {
    return request("/api/admin/companies");
  }

  async function setCompanyStatus(id, status) {
    return request("/api/admin/companies/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status } });
  }

  async function getCommission() {
    return request("/api/admin/settings/commission");
  }

  async function setCommission(rate) {
    return request("/api/admin/settings/commission", { method: "PATCH", body: { rate } });
  }

  async function setSupplierStatus(id, status) {
    return request("/api/admin/suppliers/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status } });
  }

  async function setOrderStatus(id, status) {
    return request("/api/admin/orders/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status } });
  }

  async function setRfqStatus(id, status) {
    return request("/api/admin/rfqs/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status } });
  }

  // Public store directory and individual shops.
  async function stores(){ return request("/api/stores"); }
  async function store(slug){ return request("/api/stores/"+encodeURIComponent(slug)); }
  // Authenticated seller operations; no other seller's records can be addressed.
  async function sellerStore(){ return request("/api/seller/store"); }
  async function saveSellerStore(payload){ return request("/api/seller/store",{method:"POST",body:payload}); }
  async function createSellerProduct(payload){ return request("/api/seller/products",{method:"POST",body:payload}); }
  async function updateSellerProduct(id,payload){ return request("/api/seller/products/"+encodeURIComponent(id),{method:"PATCH",body:payload}); }
  async function archiveSellerProduct(id){ return request("/api/seller/products/"+encodeURIComponent(id),{method:"DELETE"}); }
  async function uploadSellerImage(file) {
    if(!token()) throw new Error("Please sign in to upload");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>5_000_000 || !file.size) {
      throw new Error("Choose a JPEG, PNG or WebP under 5 MB");
    }
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(API_URL+"/api/seller/media",{
        method:"POST",
        headers:{"Authorization":"Bearer "+token(),"Content-Type":file.type,"Accept":"application/json"},
        body:file,signal:controller.signal
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Image upload failed");
      return data;
    }finally{clearTimeout(timeout);}
  }
  function mediaUrl(path) {
    return typeof path==="string" && /^\/api\/store-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)
      ? API_URL+path : "";
  }

  window.SupplyHQAPI = {
    API_URL,
    stores,
    store,
    sellerStore,
    saveSellerStore,
    createSellerProduct,
    updateSellerProduct,
    archiveSellerProduct,
    uploadSellerImage,
    mediaUrl,
    token,
    user,
    setSession,
    clearSession,
    request,
    health,
    register,
    login,
    me,
    products,
    createOrder,
    orders,
    createRfq,
    rfqs,
    addRfqMessage,
    createSupplier,
    supplierProfile,
    saveCompany,
    company,
    createPurchaseOrder,
    purchaseOrders,
    initializePayment,
    adminSummary,
    adminSuppliers,
    adminCompanies,
    setCompanyStatus,
    getCommission,
    setCommission,
    setSupplierStatus,
    setOrderStatus,
    setRfqStatus
  };
})();