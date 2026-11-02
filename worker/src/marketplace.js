/* Seller-owned storefront API. All database queries are tenant-scoped. */
const bad = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
const money = n => Number.isFinite(Number(n)) && Number(n)>=1 && Number(n)<=1000000000
  ? Math.round(Number(n)*100)/100 : bad("Price must be between ₦1 and ₦1,000,000,000");
const stockNumber = n => Number.isInteger(Number(n)) && Number(n)>=0 && Number(n)<=1000000
  ? Number(n) : bad("Stock must be a whole number from 0 to 1,000,000");
const slugValid = v => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length>=3 && v.length<=40;
const reserved = new Set(["admin","api","account","support","supplyhq","mabrig-phones","stores","shop","new","seller","login","register"]);
const text = (x,max) => String(x??"").trim().slice(0,max);
const productPublic = x => ({
  id:x.id, name:x.name, category:x.category, description:x.description,
  price:Number(x.price),stock:Number(x.stock),unit:x.unit,
  imageUrl:x.image_key ? "/api/store-media/"+encodeURIComponent(x.image_key) : null,
  createdAt:x.created_at
});
function imageFormat(bytes, type) {
  if(type==="image/jpeg" && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return "jpg";
  if(type==="image/png" && bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 &&
    bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10) return "png";
  if(type==="image/webp" && String.fromCharCode(...bytes.slice(0,4))==="RIFF" &&
     String.fromCharCode(...bytes.slice(8,12))==="WEBP") return "webp";
  bad("Unsupported or invalid image. Use JPEG, PNG or WebP.");
}
async function ownerStore(env,user) {
  const store = await env.DB.prepare(
    "SELECT s.*, sp.status AS approval FROM merchant_stores s JOIN supplier_profiles sp ON sp.user_id=s.owner_user_id WHERE s.owner_user_id=?"
  ).bind(user.id).first();
  return store;
}
async function requireStore(env,user) {
  const s=await ownerStore(env,user);
  if(!s) bad("Create your store profile first",404);
  return s;
}
function validateProduct(input) {
  const name=text(input.name,120), category=text(input.category,60);
  const unit=text(input.unit||"each",32), description=text(input.description,1200);
  if(name.length<3 || category.length<2 || unit.length<1) bad("Product name, category and unit are required");
  if(/[<>]/.test(name+category+unit+description)) bad("HTML tags are not allowed in product fields");
  return {name,category,unit,description,price:money(input.price),stock:stockNumber(input.stock)};
}
async function imageOwned(env,storeId,imageKey) {
  if(imageKey===null || imageKey===undefined || imageKey==="") return null;
  const key=text(imageKey,48);
  if(!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) bad("Invalid image reference");
  const row=await env.DB.prepare("SELECT key FROM merchant_uploads WHERE key=? AND store_id=?").bind(key,storeId).first();
  if(!row) bad("Image does not belong to this store",403);
  return key;
}
export async function marketplace(request,env,utils) {
  const {json,requireAuth,authUser,bodyJson,routeMatch,audit}=utils;
  const url=new URL(request.url), path=url.pathname.replace(/\/+$/,"")||"/", method=request.method.toUpperCase();

  if(method==="GET" && path==="/api/stores") {
    const rows=await env.DB.prepare(
      "SELECT s.slug,s.name,s.description,s.location,COUNT(p.id) AS product_count FROM merchant_stores s "+
      "JOIN supplier_profiles sp ON sp.user_id=s.owner_user_id AND sp.status='Approved' "+
      "JOIN merchant_products p ON p.store_id=s.id AND p.status='Published' "+
      "GROUP BY s.id ORDER BY s.updated_at DESC LIMIT 100"
    ).all();
    return json({stores:(rows.results||[]).map(s=>({...s,product_count:Number(s.product_count)}))});
  }

  const publicStore=routeMatch(path,"/api/stores/:slug");
  if(method==="GET" && publicStore) {
    if(!slugValid(publicStore.slug)) bad("Store not found",404);
    const store=await env.DB.prepare(
      "SELECT s.id,s.slug,s.name,s.description,s.location,s.public_phone FROM merchant_stores s "+
      "JOIN supplier_profiles sp ON sp.user_id=s.owner_user_id "+
      "WHERE s.slug=? AND sp.status='Approved'"
    ).bind(publicStore.slug).first();
    if(!store) bad("Store is not published or awaiting review",404);
    const rows=await env.DB.prepare(
      "SELECT id,name,category,description,price,stock,unit,image_key,created_at FROM merchant_products "+
      "WHERE store_id=? AND status='Published' ORDER BY updated_at DESC LIMIT 100"
    ).bind(store.id).all();
    const {id,...safeStore}=store;
    return json({store:safeStore,products:(rows.results||[]).map(productPublic)});
  }

  const imageRoute=routeMatch(path,"/api/store-media/:key");
  if(method==="GET" && imageRoute) {
    if(!env.PRODUCT_IMAGES) return json({error:"Image storage is not configured"},503);
    const key=imageRoute.key;
    if(!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) bad("Image not found",404);
    const media=await env.DB.prepare(
      "SELECT m.store_id,m.owner_user_id FROM merchant_uploads m WHERE m.key=?"
    ).bind(key).first();
    if(!media) bad("Image not found",404);
    const publicImage=await env.DB.prepare(
      "SELECT p.id FROM merchant_products p "+
      "JOIN merchant_stores s ON s.id=p.store_id "+
      "JOIN supplier_profiles sp ON sp.user_id=s.owner_user_id "+
      "WHERE p.store_id=? AND p.image_key=? AND p.status='Published' AND sp.status='Approved' LIMIT 1"
    ).bind(media.store_id,key).first();
    if(!publicImage) {
      const user=await authUser(request,env);
      if(!user || user.id!==media.owner_user_id) bad("Image not available",404);
    }
    const item=await env.PRODUCT_IMAGES.get("stores/"+media.store_id+"/"+key);
    if(!item) bad("Image not found",404);
    const type=key.endsWith(".png")?"image/png":key.endsWith(".webp")?"image/webp":"image/jpeg";
    return new Response(item.body,{headers:{
      "Content-Type":type,
      "X-Content-Type-Options":"nosniff",
      "Cache-Control": publicImage ? "public, max-age=300" : "private, no-store"
    }});
  }

  if(!path.startsWith("/api/seller/")) return null;
  const user=await requireAuth(request,env,["supplier"]);
  if(method==="GET" && path==="/api/seller/store") {
    const store=await ownerStore(env,user);
    const profile=await env.DB.prepare(
      "SELECT business,phone,location,status FROM supplier_profiles WHERE user_id=?"
    ).bind(user.id).first();
    const products=store?await env.DB.prepare(
      "SELECT id,name,category,description,price,stock,unit,image_key,status,created_at,updated_at "+
      "FROM merchant_products WHERE store_id=? AND status!='Archived' ORDER BY updated_at DESC LIMIT 100"
    ).bind(store.id).all():{results:[]};
    return json({store:store||null,profile:profile||null,products:(products.results||[]).map(p=>({
      ...p,price:Number(p.price),stock:Number(p.stock),
      imageUrl:p.image_key?"/api/store-media/"+encodeURIComponent(p.image_key):null
    }))});
  }

  if(method==="POST" && path==="/api/seller/store") {
    const profile=await env.DB.prepare("SELECT id,status FROM supplier_profiles WHERE user_id=?").bind(user.id).first();
    if(!profile) bad("Submit your supplier profile before creating a store",409);
    const input=await bodyJson(request,25000);
    const name=text(input.name,100),description=text(input.description,500),
      location=text(input.location,120),publicPhone=text(input.publicPhone,35);
    if(name.length<3 || location.length<2) bad("Store name and city are required");
    if(/[<>]/.test(name+description+location+publicPhone)) bad("HTML tags are not allowed");
    const existing=await ownerStore(env,user);
    if(existing){
      await env.DB.prepare(
        "UPDATE merchant_stores SET name=?,description=?,location=?,public_phone=?,updated_at=datetime('now') WHERE owner_user_id=?"
      ).bind(name,description,location,publicPhone,user.id).run();
      await audit(env,user.id,"store.update","merchant_store",existing.id,{});
    }else{
      const slug=text(input.slug,40).toLowerCase();
      if(!slugValid(slug)||reserved.has(slug)) bad("Choose a unique store URL of 3–40 letters, digits or hyphens");
      const taken=await env.DB.prepare("SELECT id FROM merchant_stores WHERE slug=?").bind(slug).first();
      if(taken) bad("Store URL is taken. Choose another.",409);
      const id=crypto.randomUUID();
      try{
        await env.DB.prepare(
          "INSERT INTO merchant_stores (id,owner_user_id,slug,name,description,location,public_phone,created_at,updated_at) "+
          "VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))"
        ).bind(id,user.id,slug,name,description,location,publicPhone).run();
      }catch(e){if(/UNIQUE|constraint/i.test(String(e)))bad("Store URL already used",409);throw e;}
      await audit(env,user.id,"store.create","merchant_store",id,{slug});
    }
    return json({store:await ownerStore(env,user)},existing?200:201);
  }

  if(method==="POST" && path==="/api/seller/media") {
    if(!env.PRODUCT_IMAGES) return json({error:"Image uploads require the PRODUCT_IMAGES R2 bucket"},503);
    const store=await requireStore(env,user);
    const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM merchant_uploads WHERE store_id=?")
      .bind(store.id).first();
    if(Number(count.n)>=250) bad("Store image upload limit reached",409);
    const type=(request.headers.get("Content-Type")||"").split(";")[0].trim().toLowerCase();
    if(!["image/jpeg","image/png","image/webp"].includes(type)) bad("Upload a JPEG, PNG or WebP image");
    const length=Number(request.headers.get("Content-Length")||"0");
    if(length>5_000_000) bad("Image is too large (maximum 5 MB)",413);
    const data=new Uint8Array(await request.arrayBuffer());
    if(data.length<32 || data.length>5_000_000) bad("Image must be between 32 bytes and 5 MB",413);
    const ext=imageFormat(data,type), key=crypto.randomUUID()+"."+ext;
    await env.PRODUCT_IMAGES.put("stores/"+store.id+"/"+key,data,{httpMetadata:{contentType:type}});
    try{
      await env.DB.prepare(
        "INSERT INTO merchant_uploads (key,store_id,owner_user_id,created_at) VALUES (?,?,?,datetime('now'))"
      ).bind(key,store.id,user.id).run();
    }catch(e){
      await env.PRODUCT_IMAGES.delete("stores/"+store.id+"/"+key);
      throw e;
    }
    await audit(env,user.id,"store.media.upload","merchant_upload",key,{storeId:store.id});
    return json({key,imageUrl:"/api/store-media/"+key},201);
  }

  if(method==="POST" && path==="/api/seller/products") {
    const store=await requireStore(env,user);
    const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM merchant_products WHERE store_id=? AND status!='Archived'")
      .bind(store.id).first();
    if(Number(count.n)>=100) bad("Store product limit reached (100)",409);
    const input=await bodyJson(request,25000),p=validateProduct(input);
    const key=await imageOwned(env,store.id,input.imageKey);
    const status=input.status==="Published" ? "Published" : "Draft";
    if(status==="Published" && store.approval!=="Approved") bad("Store must be approved before publishing products",403);
    const row=await env.DB.prepare(
      "INSERT INTO merchant_products (store_id,name,category,description,price,stock,unit,image_key,status,created_at,updated_at) "+
      "VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now')) RETURNING id"
    ).bind(store.id,p.name,p.category,p.description,p.price,p.stock,p.unit,key,status).first();
    await audit(env,user.id,"store.product.create","merchant_product",String(row.id),{});
    return json({id:row.id,status},201);
  }

  const edit=routeMatch(path,"/api/seller/products/:id");
  if(edit && ["PATCH","DELETE"].includes(method)) {
    const store=await requireStore(env,user);
    const id=Number(edit.id);
    if(!Number.isSafeInteger(id) || id<1) bad("Invalid product ID");
    const old=await env.DB.prepare(
      "SELECT * FROM merchant_products WHERE id=? AND store_id=? AND status!='Archived'"
    ).bind(id,store.id).first();
    if(!old) bad("Product does not belong to your store",404);
    if(method==="DELETE") {
      await env.DB.prepare("UPDATE merchant_products SET status='Archived',updated_at=datetime('now') WHERE id=? AND store_id=?")
        .bind(id,store.id).run();
      await audit(env,user.id,"store.product.archive","merchant_product",String(id),{});
      return json({ok:true});
    }
    const input=await bodyJson(request,25000);
    const p=validateProduct({...old,...input});
    const key=await imageOwned(env,store.id,input.imageKey===undefined?old.image_key:input.imageKey);
    const status=input.status===undefined?old.status:
      input.status==="Published"?"Published":"Draft";
    if(status==="Published" && store.approval!=="Approved") bad("Store must be approved before publishing products",403);
    await env.DB.prepare(
      "UPDATE merchant_products SET name=?,category=?,description=?,price=?,stock=?,unit=?,image_key=?,status=?,updated_at=datetime('now') "+
      "WHERE id=? AND store_id=?"
    ).bind(p.name,p.category,p.description,p.price,p.stock,p.unit,key,status,id,store.id).run();
    await audit(env,user.id,"store.product.update","merchant_product",String(id),{});
    return json({ok:true,id,status});
  }

  return json({error:"Seller route not found"},404);
}
