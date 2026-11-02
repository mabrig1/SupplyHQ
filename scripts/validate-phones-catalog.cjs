"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const code = fs.readFileSync("phones-catalog.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox, { timeout: 2000 });
const list = sandbox.window.MABRIG_PHONES_CATALOG;
assert.ok(Array.isArray(list) && list.length === 115, "Expected 115 catalogue photos");
assert.equal(new Set(list.map(product => product.sku)).size, list.length, "Duplicate SKUs");
const images = new Set();
let priced = 0, awaiting = 0;
for (const product of list) {
  assert.match(product.sku, /^MP-/, "Invalid SKU");
  assert.ok(typeof product.name === "string" && product.name.trim(), "Product missing name");
  assert.ok(typeof product.category === "string" && product.category.trim(), "Product missing category");
  assert.match(product.image, /^phones-media\/[A-Za-z0-9_.-]+\.jpg$/);
  assert.ok(fs.existsSync(product.image), "Missing image: " + product.image);
  assert.ok(!images.has(product.image), "Duplicate image: " + product.image);
  images.add(product.image);
  if (product.pricingStatus === "priced") {
    assert.ok(Number.isInteger(product.price) && product.price > 0, "Invalid naira price");
    priced++;
  } else {
    assert.equal(product.pricingStatus, "quote_required", "Invalid pricing status");
    assert.equal(product.price, null, "Quote-only listings must not show invented prices");
    awaiting++;
  }
}
assert.equal(priced, 84, "Expected 84 confirmed retail prices");
assert.equal(awaiting, 31, "Expected 31 quote-only products");
for (const page of ["index.html", "phones.html"]) {
  const html = fs.readFileSync(page, "utf8");
  assert.ok(html.includes('src="phones-catalog.js"'), page + " missing catalogue data");
  assert.ok(html.includes('src="phones.js"'), page + " missing catalogue renderer");
  assert.ok(html.includes('id="productGrid"'), page + " missing product grid");
}
assert.ok(fs.readFileSync("index.html", "utf8").includes("spotlight-card"), "Homepage missing product photography");
assert.ok(fs.existsSync("wholesale.html"), "Existing wholesale marketplace must remain accessible");
console.log("Validated " + list.length + " products, " + images.size + " images, " + priced + " priced / " + awaiting + " enquiries.");
