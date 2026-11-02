"use strict";
// Build a clean static artifact for Cloudflare Pages, without shipping the Worker
// runtime, schema, credentials, workflow files, documentation or build scripts.
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,".."),out=path.join(root,"dist");
const files=[
 "index.html","phones.html","wholesale.html","stores.html","store.html","sell.html",
 "account.html","admin.html","dashboard.html","procurement.html","ai.html",
 "styles.css","enhancements.css","phones.css","marketplace.css","ai-studio.css",
 "account.css","admin.css","dashboard.css","procurement.css",
 "app.js","api-client.js","phones-catalog.js","phones.js","seller.js",
 "stores.js","store.js","account.js","admin.js","dashboard.js","procurement.js",
 "ai-studio.js","sw.js","manifest.webmanifest"
];
if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const filename of files){
 const input=path.join(root,filename);
 if(!fs.existsSync(input))throw new Error("Missing static asset: "+filename);
 fs.copyFileSync(input,path.join(out,filename));
}
const photos=path.join(root,"phones-media");
if(!fs.existsSync(photos))throw new Error("phones-media source missing");
fs.mkdirSync(path.join(out,"phones-media"));
const media=fs.readdirSync(photos).filter(name=>/^[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(name));
for(const name of media)fs.copyFileSync(path.join(photos,name),path.join(out,"phones-media",name));
if(media.length!==115)throw new Error("Expected 115 product photos, found "+media.length);
// Frontend AI Studio imports the shared deterministic agent core. Only this
// explicitly public module is copied; secrets, API runtime and schema stay out.
const moduleAsset="worker/src/agent-core.js";
fs.mkdirSync(path.join(out,"worker","src"),{recursive:true});
fs.copyFileSync(path.join(root,moduleAsset),path.join(out,moduleAsset));
// Cloudflare Pages headers, applied only to the Cloudflare Pages deployment.
fs.writeFileSync(path.join(out,"_headers"),[
 "/*","  X-Content-Type-Options: nosniff",
 "  Referrer-Policy: strict-origin-when-cross-origin",
 "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
 "",
 "/worker/src/agent-core.js","  Cache-Control: public, max-age=300",
 ""
].join("\n"));
if(fs.existsSync(path.join(out,"CNAME")))throw new Error("GitHub Pages CNAME must not be part of the Cloudflare Pages build");
if(fs.existsSync(path.join(out,"worker","src","index.js")))throw new Error("Worker API runtime must not be published as a static asset");
console.log("Cloudflare Pages bundle: "+files.length+" root assets, "+media.length+" catalog photographs, shared safe agent core. Output: dist/");
