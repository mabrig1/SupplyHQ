# SupplyHQ multi-vendor marketplace deployment

## Seller experience

- Visitors register as suppliers via account.html?seller=1.
- A signed-in supplier uses sell.html to save a supplier profile, claim a unique immutable store URL, upload JPEG/PNG/WebP product photos, set NGN prices, units and stock, and create draft or published listings.
- Individual public shops appear at store.html?shop=the-store-slug after administrator approval, and the public directory is stores.html.
- Listings remain private until the existing supplier-approval workflow marks the owner Approved. The seller must then publish the listing.
- Buyers can copy/share enquiries; this workflow does not process payment or confirm inventory.
- Original MABRIG Phones catalogue and wholesale page remain unchanged.

## Required Cloudflare infrastructure

A successful GitHub Pages deployment does not by itself activate authenticated stores or image uploads.

1. Create a **private** Cloudflare R2 bucket named supplyhq-product-images, before deploying the updated Worker. Do not enable public bucket access.
2. Existing Cloudflare D1 database supplyhq must be configured under binding DB, with its real ID. Preserve/backup data before applying SQL migrations.
3. Apply additive, idempotent worker/migrations/001_marketplace.sql to the existing D1 database, without re-seeding old products.
4. Deploy Worker with new worker/src/marketplace.js and R2 binding PRODUCT_IMAGES (specified in worker/wrangler.toml.example).
5. In Cloudflare configure JWT_SECRET and ADMIN_BOOTSTRAP_SECRET securely. No secret keys go in browser code or committed files.
6. Confirm ALLOWED_ORIGINS has the exact customer site origin and API custom domain api.supplyhq.mabrigkorie.org routes to the deployed Worker.
7. Existing GitHub Actions "Deploy SupplyHQ API" is a manually run workflow. It requires repository secrets CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_D1_DATABASE_ID. Set apply_marketplace=true for the first schema upgrade; leave seed_products=false to preserve existing data. R2 bucket must already exist.
8. Approve seller applications in the existing SupplyHQ admin page. Until approved, sellers can save drafts but shoppers cannot view them.

For local tests: change directory to worker; run npm install; copy wrangler.toml.example to wrangler.toml; supply the D1 database ID; then run npm run db:marketplace:local and npm run dev.

For a remote production migration, run npm run db:marketplace from worker directory after confirming a backup and target account, then npm run deploy (or use the guarded deployment workflow). Do not run without correct credentials and target account.

## Live verification checklist

1. GET https://api.supplyhq.mabrigkorie.org/api/health returns an online response.
2. Register supplier -> save profile -> create unique shop -> upload an image -> save a draft. Refresh and verify persistence.
3. Before approval, public storefront is unavailable and not listed in the directory.
4. After administrator approval, seller publishes product and buyer can open its unique URL with image, price and enquiry buttons.
5. Create a second seller and verify no access to first owner's draft products, images or admin functions.
6. Original MABRIG Phones and wholesale pages still render.

## Known boundaries

This release provides store registration, product CRUD, image uploads and enquiry flows. It does NOT provide checkout, payment splitting, shipping, identity verification or stock guarantees. Seller accounts use the project's existing email/password API; email ownership verification and CAPTCHA should be implemented before unrestricted public signups at scale.

Upload restrictions: JPEG/PNG/WebP only, up to 5 MB each; R2 stays private. Per-shop limits are 100 active/draft products, 3 draft image uploads while approval is pending and 250 images once approved. Archive does not automatically delete R2 media; implement image retention policy before large-scale use. Third-party sellers set their own prices: MABRIG Phones' original 30% markup is not applied to third-party sellers.
