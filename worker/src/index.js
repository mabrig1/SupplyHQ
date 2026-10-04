const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
      ...extra
    }
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "https://supplyhq.mabrigkorie.org,https://mabrig1.github.io")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);
  if (!origin) return {};
  if (!allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Idempotency-Key,X-Bootstrap-Secret",
    "Access-Control-Max-Age": "86400"
  };
}

function withCors(response, cors) {
  if (!cors) return response;
  const headers = new Headers(response.headers);
  Object.entries(cors).forEach(([k,v]) => headers.set(k,v));
  return new Response(response.body, { status: response.status, headers });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function toNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

async function bodyJson(request, maxBytes = 1_000_000) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > maxBytes) throw Object.assign(new Error("Payload too large"), { status: 413 });
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(new Error("Payload too large"), { status: 413 });
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

function b64url(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function b64urlText(value) {
  return b64url(encoder.encode(value));
}

function decodeB64url(value) {
  const padded = value.replace(/-/g,"+").replace(/_/g,"/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return bytes;
}

async function hmacKey(secret, hash = "SHA-256") {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name:"HMAC", hash }, false, ["sign","verify"]);
}

async function signJwt(payload, secret) {
  const header = b64urlText(JSON.stringify({ alg:"HS256", typ:"JWT" }));
  const body = b64urlText(JSON.stringify(payload));
  const input = header + "." + body;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(input)));
  return input + "." + b64url(sig);
}

async function verifyJwt(token, secret) {
  if (!token || token.split(".").length !== 3) return null;
  const [header, body, signature] = token.split(".");
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, decodeB64url(signature), encoder.encode(header + "." + body));
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(decoder.decode(decodeB64url(body)));
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
  return payload;
}

async function hashPassword(password, saltBytes) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name:"PBKDF2",
    hash:"SHA-256",
    salt:saltBytes,
    iterations:120000
  }, baseKey, 256);
  return b64url(new Uint8Array(bits));
}

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function createUser(env, email, password, role) {
  const salt = randomBytes(16);
  const passwordHash = await hashPassword(password, salt);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO users (id,email,password_hash,password_salt,role,status,created_at) VALUES (?,?,?,?,?,'Active',datetime('now'))"
  ).bind(id, email, passwordHash, b64url(salt), role).run();
  return { id, email, role, status:"Active" };
}

async function loginUser(env, email, password) {
  const row = await env.DB.prepare(
    "SELECT id,email,password_hash,password_salt,role,status FROM users WHERE email=?"
  ).bind(email).first();
  if (!row || row.status !== "Active") return null;
  const salt = decodeB64url(row.password_salt);
  const candidate = await hashPassword(password, salt);
  if (candidate !== row.password_hash) return null;
  return { id:row.id, email:row.email, role:row.role, status:row.status };
}

async function issueSession(user, env) {
  const now = Math.floor(Date.now()/1000);
  const token = await signJwt({
    sub:user.id,
    email:user.email,
    role:user.role,
    iat:now,
    exp:now + 60*60*24
  }, env.JWT_SECRET);
  return { token, user };
}

async function authUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET);
  if (!payload) return null;
  const row = await env.DB.prepare(
    "SELECT id,email,role,status FROM users WHERE id=?"
  ).bind(payload.sub).first();
  if (!row || row.status !== "Active") return null;
  return row;
}

async function requireAuth(request, env, roles = []) {
  const user = await authUser(request, env);
  if (!user) throw Object.assign(new Error("Authentication required"), { status:401 });
  if (roles.length && !roles.includes(user.role)) throw Object.assign(new Error("Insufficient permissions"), { status:403 });
  return user;
}

const rateState = new Map();
function rateLimit(request, bucket, max, windowMs) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = bucket + ":" + ip;
  const now = Date.now();
  let entry = rateState.get(key);
  if (!entry || now > entry.reset) entry = { count:0, reset:now + windowMs };
  entry.count += 1;
  rateState.set(key, entry);
  if (rateState.size > 5000) {
    for (const [k,v] of rateState) if (now > v.reset) rateState.delete(k);
  }
  return entry.count <= max;
}

async function audit(env, actorId, action, entityType, entityId, metadata = {}) {
  try {
    await env.DB.prepare(
      "INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
    ).bind(crypto.randomUUID(), actorId || null, action, entityType, entityId || null, JSON.stringify(metadata)).run();
  } catch {}
}

function routeMatch(pathname, pattern) {
  const parts = pathname.split("/").filter(Boolean);
  const pat = pattern.split("/").filter(Boolean);
  if (parts.length !== pat.length) return null;
  const params = {};
  for (let i=0;i<pat.length;i++) {
    if (pat[i].startsWith(":")) params[pat[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (pat[i] !== parts[i]) return null;
  }
  return params;
}

function tierPrice(product, qty) {
  let tiers = [];
  try { tiers = JSON.parse(product.tiers_json || "[]"); } catch {}
  let price = Number(product.price);
  for (const tier of tiers) {
    if (qty >= Number(tier[0])) price = Number(tier[1]);
  }
  return price;
}

async function getProducts(env) {
  const result = await env.DB.prepare(
    "SELECT id,sku,name,category,emoji,supplier_name,location,price,unit,moq,stock,rating,tiers_json FROM products WHERE active=1 ORDER BY id"
  ).all();
  return (result.results || []).map(row => ({
    id:row.id, sku:row.sku, name:row.name, category:row.category, emoji:row.emoji,
    supplier:row.supplier_name, location:row.location, price:Number(row.price),
    unit:row.unit, moq:Number(row.moq), stock:Number(row.stock), rating:Number(row.rating),
    tiers:JSON.parse(row.tiers_json || "[]")
  }));
}

async function createOrder(request, env, user) {
  const input = await bodyJson(request);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    throw Object.assign(new Error("Order must contain 1 to 50 items"), { status:400 });
  }

  const idempotencyKey = cleanText(request.headers.get("Idempotency-Key"), 100);
  if (idempotencyKey) {
    const existing = await env.DB.prepare(
      "SELECT id,total,status,created_at FROM orders WHERE buyer_id=? AND idempotency_key=?"
    ).bind(user.id, idempotencyKey).first();
    if (existing) return { ...existing, total:Number(existing.total), duplicate:true };
  }

  const lines = [];
  const supplierTotals = new Map();
  let total = 0;

  for (const raw of input.items) {
    const productId = Number(raw.productId ?? raw.id);
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty <= 0) {
      throw Object.assign(new Error("Invalid order item"), { status:400 });
    }
    const product = await env.DB.prepare(
      "SELECT id,name,supplier_name,price,unit,moq,stock,tiers_json,active FROM products WHERE id=?"
    ).bind(productId).first();
    if (!product || !product.active) throw Object.assign(new Error("Product unavailable"), { status:409 });
    if (qty < Number(product.moq)) throw Object.assign(new Error(product.name + " requires MOQ " + product.moq), { status:400 });
    if (qty > Number(product.stock)) throw Object.assign(new Error("Insufficient stock for " + product.name), { status:409 });

    const unitPrice = tierPrice(product, qty);
    const subtotal = unitPrice * qty;
    total += subtotal;
    lines.push({ product, qty, unitPrice, subtotal });

    const current = supplierTotals.get(product.supplier_name) || 0;
    supplierTotals.set(product.supplier_name, current + subtotal);
  }

  const orderId = "SHQ-" + Date.now().toString().slice(-7) + "-" + crypto.randomUUID().slice(0,4).toUpperCase();
  const commissionRate = Math.max(0, Math.min(30, Number(env.COMMISSION_RATE || 5)));
  const statements = [
    env.DB.prepare(
      "INSERT INTO orders (id,buyer_id,total,status,idempotency_key,created_at) VALUES (?,?,?,'Pending',?,datetime('now'))"
    ).bind(orderId, user.id, total, idempotencyKey || null)
  ];

  for (const line of lines) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO order_items (id,order_id,product_id,product_name,supplier_name,qty,unit,unit_price,subtotal) VALUES (?,?,?,?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), orderId, line.product.id, line.product.name, line.product.supplier_name, line.qty, line.product.unit, line.unitPrice, line.subtotal)
    );
    statements.push(
      env.DB.prepare("UPDATE products SET stock=stock-?,updated_at=datetime('now') WHERE id=? AND stock>=?")
        .bind(line.qty, line.product.id, line.qty)
    );
  }

  for (const [supplierName,gross] of supplierTotals.entries()) {
    const commission = Math.round(gross * commissionRate / 100);
    statements.push(
      env.DB.prepare(
        "INSERT INTO supplier_splits (id,order_id,supplier_name,gross,commission_rate,commission,net,payout_status) VALUES (?,?,?,?,?,?,?,'Pending')"
      ).bind(crypto.randomUUID(), orderId, supplierName, gross, commissionRate, commission, gross - commission)
    );
  }

  await env.DB.batch(statements);
  await audit(env, user.id, "order.create", "order", orderId, { total, itemCount:lines.length });
  return { id:orderId, total, status:"Pending", created_at:new Date().toISOString() };
}

async function listOrders(env, user) {
  if (user.role === "admin") {
    const result = await env.DB.prepare("SELECT id,buyer_id,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 200").all();
    return result.results || [];
  }
  const result = await env.DB.prepare(
    "SELECT id,buyer_id,total,status,created_at FROM orders WHERE buyer_id=? ORDER BY created_at DESC LIMIT 100"
  ).bind(user.id).all();
  return result.results || [];
}

async function createRfq(request, env, user) {
  const input = await bodyJson(request);
  const productId = Number(input.productId);
  const quantity = Math.floor(Number(input.quantity));
  const targetPrice = input.targetPrice ? Number(input.targetPrice) : null;
  const deliveryLocation = cleanText(input.deliveryLocation, 180);
  const neededBy = cleanText(input.neededBy, 30);
  const product = await env.DB.prepare(
    "SELECT id,name,supplier_name,unit,moq,active FROM products WHERE id=?"
  ).bind(productId).first();
  if (!product || !product.active) throw Object.assign(new Error("Product unavailable"), { status:404 });
  if (!Number.isInteger(quantity) || quantity < Number(product.moq)) throw Object.assign(new Error("Quantity is below MOQ"), { status:400 });
  if (!deliveryLocation) throw Object.assign(new Error("Delivery location is required"), { status:400 });

  const idempotencyKey = cleanText(request.headers.get("Idempotency-Key"), 100);
  if (idempotencyKey) {
    const existing = await env.DB.prepare("SELECT * FROM rfqs WHERE buyer_id=? AND idempotency_key=?")
      .bind(user.id, idempotencyKey).first();
    if (existing) return existing;
  }

  const id = "RFQ-" + Date.now().toString().slice(-7) + "-" + crypto.randomUUID().slice(0,4).toUpperCase();
  await env.DB.prepare(
    "INSERT INTO rfqs (id,buyer_id,product_id,product_name,supplier_name,unit,quantity,target_price,delivery_location,needed_by,status,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,'Open',?,datetime('now'))"
  ).bind(id,user.id,product.id,product.name,product.supplier_name,product.unit,quantity,targetPrice,deliveryLocation,neededBy||null,idempotencyKey||null).run();
  await audit(env,user.id,"rfq.create","rfq",id,{productId,quantity});
  return { id, productName:product.name, supplier:product.supplier_name, unit:product.unit, quantity, targetPrice, deliveryLocation, neededBy, status:"Open" };
}

async function listRfqs(env, user) {
  let result;
  if (user.role === "admin") {
    result = await env.DB.prepare("SELECT * FROM rfqs ORDER BY created_at DESC LIMIT 200").all();
  } else {
    result = await env.DB.prepare("SELECT * FROM rfqs WHERE buyer_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
  }
  const rows = result.results || [];
  for (const row of rows) {
    const messages = await env.DB.prepare(
      "SELECT id,actor_role,message,amount,created_at FROM rfq_messages WHERE rfq_id=? ORDER BY created_at"
    ).bind(row.id).all();
    row.messages = (messages.results || []).map(m => ({
      id:m.id, actor:m.actor_role, message:m.message, amount:m.amount ? Number(m.amount) : 0, createdAt:m.created_at
    }));
  }
  return rows;
}

async function addRfqMessage(request, env, user, rfqId) {
  const rfq = await env.DB.prepare("SELECT id,buyer_id,status FROM rfqs WHERE id=?").bind(rfqId).first();
  if (!rfq) throw Object.assign(new Error("RFQ not found"), { status:404 });
  if (user.role !== "admin" && user.id !== rfq.buyer_id && user.role !== "supplier") {
    throw Object.assign(new Error("Not permitted"), { status:403 });
  }
  const input = await bodyJson(request);
  const message = cleanText(input.message, 2000);
  const amount = input.amount ? toNumber(input.amount,0,1_000_000_000) : null;
  if (!message) throw Object.assign(new Error("Message is required"), { status:400 });
  const actorRole = user.role === "admin" ? "Admin" : (user.role === "supplier" ? "Supplier" : "Buyer");
  await env.DB.prepare(
    "INSERT INTO rfq_messages (id,rfq_id,user_id,actor_role,message,amount,created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
  ).bind(crypto.randomUUID(),rfqId,user.id,actorRole,message,amount).run();
  if (actorRole === "Supplier" && amount) {
    await env.DB.prepare("UPDATE rfqs SET status='Quoted',updated_at=datetime('now') WHERE id=?").bind(rfqId).run();
  }
  await audit(env,user.id,"rfq.message","rfq",rfqId,{actorRole,amount});
  return { ok:true };
}

async function initializePaystack(request, env, user) {
  if (!env.PAYSTACK_SECRET_KEY) throw Object.assign(new Error("Payments are not configured"), { status:503 });
  const input = await bodyJson(request);
  const orderId = cleanText(input.orderId, 80);
  const order = await env.DB.prepare(
    "SELECT id,total,status FROM orders WHERE id=? AND buyer_id=?"
  ).bind(orderId,user.id).first();
  if (!order) throw Object.assign(new Error("Order not found"), { status:404 });
  if (["Paid","Delivered"].includes(order.status)) throw Object.assign(new Error("Order is already paid"), { status:409 });

  const reference = "SHQPAY-" + Date.now() + "-" + crypto.randomUUID().slice(0,6).toUpperCase();
  const callback = env.PAYSTACK_CALLBACK_URL || "https://supplyhq.mabrigkorie.org/dashboard.html";
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method:"POST",
    headers:{
      "Authorization":"Bearer " + env.PAYSTACK_SECRET_KEY,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      email:user.email,
      amount:Math.round(Number(order.total)*100),
      reference,
      callback_url:callback,
      metadata:{ order_id:order.id, buyer_id:user.id }
    })
  });
  const data = await response.json();
  if (!response.ok || !data.status) throw Object.assign(new Error(data.message || "Payment initialization failed"), { status:502 });

  await env.DB.prepare(
    "INSERT INTO payments (id,order_id,buyer_id,provider,reference,amount,status,created_at) VALUES (?,?,?,'paystack',?,?, 'Initialized',datetime('now'))"
  ).bind(crypto.randomUUID(),order.id,user.id,reference,Number(order.total)).run();
  await audit(env,user.id,"payment.initialize","order",order.id,{reference});
  return { reference, authorization_url:data.data.authorization_url, access_code:data.data.access_code };
}

async function verifyPaystackSignature(raw, signature, secret) {
  if (!signature || !secret) return false;
  const key = await hmacKey(secret, "SHA-512");
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(raw)));
  const hex = [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
  return hex === signature.toLowerCase();
}

async function paystackWebhook(request, env) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const valid = await verifyPaystackSignature(raw, signature, env.PAYSTACK_SECRET_KEY);
  if (!valid) return json({ error:"Invalid signature" }, 401);
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error:"Invalid payload" },400); }
  if (event.event === "charge.success") {
    const reference = event.data && event.data.reference;
    const payment = await env.DB.prepare("SELECT id,order_id FROM payments WHERE reference=?").bind(reference).first();
    if (payment) {
      await env.DB.batch([
        env.DB.prepare("UPDATE payments SET status='Paid',provider_payload_json=?,updated_at=datetime('now') WHERE id=?")
          .bind(JSON.stringify(event.data),payment.id),
        env.DB.prepare("UPDATE orders SET status='Paid',updated_at=datetime('now') WHERE id=?").bind(payment.order_id)
      ]);
      await audit(env,null,"payment.paid","order",payment.order_id,{reference});
    }
  }
  return json({ received:true });
}

async function handler(request, env) {
  if (!env.DB) return json({ error:"D1 database binding DB is missing" },500);
  if (!env.JWT_SECRET) return json({ error:"JWT_SECRET is not configured" },500);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/,"") || "/";
  const method = request.method.toUpperCase();

  if (!rateLimit(request, path.startsWith("/api/auth") ? "auth" : "api", path.startsWith("/api/auth") ? 15 : 180, 60_000)) {
    return json({ error:"Too many requests" },429,{"Retry-After":"60"});
  }

  if (method === "GET" && path === "/api/health") {
    return json({ ok:true, app:"SupplyHQ API", status:"online", version:"1.0.0" });
  }

  if (method === "POST" && path === "/api/auth/register") {
    const input = await bodyJson(request,100_000);
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    const role = input.role === "supplier" ? "supplier" : "buyer";
    if (!isEmail(email)) throw Object.assign(new Error("Valid email required"),{status:400});
    if (password.length < 10 || password.length > 128) throw Object.assign(new Error("Password must be 10 to 128 characters"),{status:400});
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (existing) throw Object.assign(new Error("Email is already registered"),{status:409});
    const user = await createUser(env,email,password,role);
    await audit(env,user.id,"auth.register","user",user.id,{role});
    return json(await issueSession(user,env),201);
  }

  if (method === "POST" && path === "/api/auth/login") {
    const input = await bodyJson(request,100_000);
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    const user = await loginUser(env,email,password);
    if (!user) throw Object.assign(new Error("Invalid email or password"),{status:401});
    await audit(env,user.id,"auth.login","user",user.id,{});
    return json(await issueSession(user,env));
  }

  if (method === "POST" && path === "/api/admin/bootstrap") {
    const supplied = request.headers.get("X-Bootstrap-Secret") || "";
    if (!env.ADMIN_BOOTSTRAP_SECRET || supplied !== env.ADMIN_BOOTSTRAP_SECRET) {
      throw Object.assign(new Error("Bootstrap authorization failed"),{status:403});
    }
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").first();
    if (Number(count.n) > 0) throw Object.assign(new Error("Admin is already configured"),{status:409});
    const input = await bodyJson(request,100_000);
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    if (!isEmail(email) || password.length < 12) throw Object.assign(new Error("Admin email and 12+ character password required"),{status:400});
    const user = await createUser(env,email,password,"admin");
    await audit(env,user.id,"admin.bootstrap","user",user.id,{});
    return json({ ok:true, user },201);
  }

  if (method === "POST" && path === "/api/payments/webhook") {
    return paystackWebhook(request,env);
  }

  if (method === "GET" && path === "/api/products") {
    return json({ products:await getProducts(env) });
  }

  const productMatch = routeMatch(path,"/api/products/:id");
  if (method === "GET" && productMatch) {
    const product = await env.DB.prepare(
      "SELECT id,sku,name,category,emoji,supplier_name,location,price,unit,moq,stock,rating,tiers_json FROM products WHERE id=? AND active=1"
    ).bind(Number(productMatch.id)).first();
    if (!product) throw Object.assign(new Error("Product not found"),{status:404});
    return json({
      product:{
        id:product.id,sku:product.sku,name:product.name,category:product.category,emoji:product.emoji,
        supplier:product.supplier_name,location:product.location,price:Number(product.price),unit:product.unit,
        moq:Number(product.moq),stock:Number(product.stock),rating:Number(product.rating),tiers:JSON.parse(product.tiers_json||"[]")
      }
    });
  }

  if (method === "GET" && path === "/api/me") {
    const user = await requireAuth(request,env);
    return json({ user });
  }

  if (method === "POST" && path === "/api/suppliers") {
    const user = await requireAuth(request,env,["supplier","admin"]);
    const input = await bodyJson(request);
    const business = cleanText(input.business,160);
    const phone = cleanText(input.phone,50);
    const category = cleanText(input.category,100);
    const location = cleanText(input.location,160);
    if (!business || !phone || !location) throw Object.assign(new Error("Business, phone and location are required"),{status:400});
    const existing = await env.DB.prepare("SELECT id FROM supplier_profiles WHERE user_id=?").bind(user.id).first();
    const id = existing ? existing.id : crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO supplier_profiles (id,user_id,business,phone,category,location,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'Pending',datetime('now'),datetime('now')) ON CONFLICT(user_id) DO UPDATE SET business=excluded.business,phone=excluded.phone,category=excluded.category,location=excluded.location,updated_at=datetime('now')"
    ).bind(id,user.id,business,phone,category,location).run();
    await audit(env,user.id,"supplier.upsert","supplier",id,{});
    return json({ supplier:{id,business,phone,category,location,status:"Pending"} },201);
  }

  if (method === "GET" && path === "/api/suppliers/me") {
    const user = await requireAuth(request,env,["supplier","admin"]);
    const row = await env.DB.prepare("SELECT * FROM supplier_profiles WHERE user_id=?").bind(user.id).first();
    return json({ supplier:row || null });
  }

  if (method === "POST" && path === "/api/orders") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    return json({ order:await createOrder(request,env,user) },201);
  }

  if (method === "GET" && path === "/api/orders") {
    const user = await requireAuth(request,env);
    return json({ orders:await listOrders(env,user) });
  }

  if (method === "POST" && path === "/api/rfqs") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    return json({ rfq:await createRfq(request,env,user) },201);
  }

  if (method === "GET" && path === "/api/rfqs") {
    const user = await requireAuth(request,env);
    return json({ rfqs:await listRfqs(env,user) });
  }

  const msgMatch = routeMatch(path,"/api/rfqs/:id/messages");
  if (method === "POST" && msgMatch) {
    const user = await requireAuth(request,env);
    return json(await addRfqMessage(request,env,user,msgMatch.id),201);
  }

  if (method === "POST" && path === "/api/companies") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    const input = await bodyJson(request);
    const name = cleanText(input.name,180);
    const segment = cleanText(input.segment,80);
    const location = cleanText(input.location,180);
    const email = normalizeEmail(input.email || user.email);
    if (!name || !location) throw Object.assign(new Error("Company name and location are required"),{status:400});
    const existing = await env.DB.prepare("SELECT id FROM companies WHERE owner_user_id=?").bind(user.id).first();
    const id = existing ? existing.id : crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO companies (id,owner_user_id,name,segment,location,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'Pending',datetime('now'),datetime('now')) ON CONFLICT(owner_user_id) DO UPDATE SET name=excluded.name,segment=excluded.segment,location=excluded.location,email=excluded.email,updated_at=datetime('now')"
    ).bind(id,user.id,name,segment,location,email).run();
    await audit(env,user.id,"company.upsert","company",id,{});
    return json({ company:{id,name,segment,location,email,status:"Pending"} },201);
  }

  if (method === "GET" && path === "/api/companies/me") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    const row = await env.DB.prepare("SELECT * FROM companies WHERE owner_user_id=?").bind(user.id).first();
    return json({ company:row || null });
  }

  if (method === "POST" && path === "/api/purchase-orders") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    const input = await bodyJson(request);
    const orderId = cleanText(input.orderId,80);
    const order = await env.DB.prepare("SELECT id,total FROM orders WHERE id=? AND buyer_id=?").bind(orderId,user.id).first();
    if (!order) throw Object.assign(new Error("Order not found"),{status:404});
    const existing = await env.DB.prepare("SELECT * FROM purchase_orders WHERE order_id=?").bind(orderId).first();
    if (existing) return json({ purchaseOrder:existing });
    const id = crypto.randomUUID();
    const number = "SHQ-PO-" + Date.now().toString().slice(-7);
    await env.DB.prepare(
      "INSERT INTO purchase_orders (id,po_number,order_id,buyer_id,total,status,created_at) VALUES (?,?,?,?,?,'Issued',datetime('now'))"
    ).bind(id,number,orderId,user.id,Number(order.total)).run();
    await audit(env,user.id,"purchase_order.create","purchase_order",id,{orderId});
    return json({ purchaseOrder:{id,po_number:number,order_id:orderId,total:Number(order.total),status:"Issued"} },201);
  }

  if (method === "GET" && path === "/api/purchase-orders") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    const result = user.role === "admin"
      ? await env.DB.prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 200").all()
      : await env.DB.prepare("SELECT * FROM purchase_orders WHERE buyer_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
    return json({ purchaseOrders:result.results || [] });
  }

  if (method === "POST" && path === "/api/payments/initialize") {
    const user = await requireAuth(request,env,["buyer","admin"]);
    return json({ payment:await initializePaystack(request,env,user) },201);
  }

  if (method === "GET" && path === "/api/admin/summary") {
    await requireAuth(request,env,["admin"]);
    const [orders,rfqs,suppliers,companies] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n,COALESCE(SUM(total),0) AS total FROM orders").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM rfqs WHERE status!='Closed'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM supplier_profiles WHERE status='Pending'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM companies WHERE status='Pending'").first()
    ]);
    return json({ summary:{
      orders:Number(orders.n), orderValue:Number(orders.total), openRfqs:Number(rfqs.n),
      pendingSuppliers:Number(suppliers.n), pendingCompanies:Number(companies.n)
    }});
  }

  if (method === "GET" && path === "/api/admin/suppliers") {
    await requireAuth(request,env,["admin"]);
    const result = await env.DB.prepare(
      "SELECT sp.*,u.email FROM supplier_profiles sp JOIN users u ON u.id=sp.user_id ORDER BY sp.created_at DESC LIMIT 200"
    ).all();
    return json({ suppliers:result.results || [] });
  }

  const supplierStatus = routeMatch(path,"/api/admin/suppliers/:id/status");
  if (method === "PATCH" && supplierStatus) {
    const admin = await requireAuth(request,env,["admin"]);
    const input = await bodyJson(request);
    const status = ["Approved","Needs Review","Rejected","Pending"].includes(input.status) ? input.status : null;
    if (!status) throw Object.assign(new Error("Invalid supplier status"),{status:400});
    await env.DB.prepare("UPDATE supplier_profiles SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,supplierStatus.id).run();
    await audit(env,admin.id,"supplier.status","supplier",supplierStatus.id,{status});
    return json({ ok:true,status });
  }

  const orderStatus = routeMatch(path,"/api/admin/orders/:id/status");
  if (method === "PATCH" && orderStatus) {
    const admin = await requireAuth(request,env,["admin"]);
    const input = await bodyJson(request);
    const status = ["Pending","Confirmed","Paid","Processing","Dispatched","Delivered","Cancelled"].includes(input.status) ? input.status : null;
    if (!status) throw Object.assign(new Error("Invalid order status"),{status:400});
    await env.DB.prepare("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,orderStatus.id).run();
    if (status === "Delivered") {
      await env.DB.prepare("UPDATE supplier_splits SET payout_status='Ready' WHERE order_id=?").bind(orderStatus.id).run();
    }
    await audit(env,admin.id,"order.status","order",orderStatus.id,{status});
    return json({ ok:true,status });
  }

  const rfqStatus = routeMatch(path,"/api/admin/rfqs/:id/status");
  if (method === "PATCH" && rfqStatus) {
    const admin = await requireAuth(request,env,["admin"]);
    const input = await bodyJson(request);
    const status = ["Open","Quoted","Accepted","Closed"].includes(input.status) ? input.status : null;
    if (!status) throw Object.assign(new Error("Invalid RFQ status"),{status:400});
    await env.DB.prepare("UPDATE rfqs SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,rfqStatus.id).run();
    await audit(env,admin.id,"rfq.status","rfq",rfqStatus.id,{status});
    return json({ ok:true,status });
  }

  return json({ error:"Route not found" },404);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request,env);
    if (cors === null) return json({ error:"Origin not allowed" },403);
    if (request.method === "OPTIONS") return withCors(new Response(null,{status:204}),cors);

    try {
      return withCors(await handler(request,env),cors);
    } catch (error) {
      const status = error && error.status ? error.status : 500;
      const message = status >= 500 ? "Internal server error" : (error.message || "Request failed");
      if (status >= 500) console.error(error);
      return withCors(json({ error:message },status),cors);
    }
  }
};