# SupplyHQ

SupplyHQ is a mobile-first B2B wholesale marketplace for consumer-goods suppliers and business buyers.

## Architecture

SupplyHQ now supports a split frontend/backend architecture:

- **Frontend:** GitHub Pages
- **Frontend domain:** `https://supplyhq.mabrigkorie.org`
- **API:** Cloudflare Workers
- **API domain:** `https://api.supplyhq.mabrigkorie.org`
- **Database:** Cloudflare D1
- **Payments:** Paystack through the Worker API

The frontend remains usable before the Worker is deployed by falling back to local browser data. Once the API becomes reachable, signed-in users automatically use server-backed products, orders, RFQs, supplier onboarding, company records and payments.

## Marketplace

- Wholesale catalogue for rice, palm oil, beverages, flour and household FMCG
- Product search, categories and sorting
- Minimum order quantity (MOQ)
- Tiered bulk pricing
- Supplier/location information and stock visibility
- Saved goods and fast reorder
- MOQ-aware cart
- Multi-supplier order splitting
- API-backed order creation
- Paystack checkout initialized only through the backend

## Accounts and API security

- Buyer and supplier registration
- Secure sign-in page
- Password hashing with PBKDF2-SHA256
- HMAC-signed JWT authentication
- Server-side role authorization
- Strict browser-origin allowlist
- Server-side price, MOQ and stock enforcement
- Idempotency keys for orders and RFQs
- Server-side marketplace commission calculation
- Paystack webhook signature verification
- Audit logging
- No secret API keys in GitHub Pages JavaScript

## B2B Procurement Workspace

- Quick Order by SKU
- CSV-style SKU/quantity import
- Reusable requisition lists
- Buyer company profile and approval state
- Buyer team role concepts
- RFQ negotiation messages and counter-price entries
- Purchase-order generation from marketplace orders

## Buyer dashboard

- Order count and estimated order value
- Open RFQs
- Saved goods
- Order history
- Remote API synchronization when signed in
- Local fallback when offline/API unavailable

## Supplier dashboard

- Incoming demand overview
- RFQ visibility
- Inventory and stock controls
- Supplier settlement estimates
- Gross sales, marketplace commission and net payout views

## Admin control centre

When signed in as an API admin, the admin page can use server-enforced controls for:

- Supplier approval / review / rejection
- Buyer company approval / review / rejection
- Marketplace commission rate
- Order status
- RFQ status
- Marketplace summary metrics

Without an API admin session, the existing local demo controls remain available for UI testing only.

## Cloudflare Worker API

The backend lives in:

```
worker/
```

Important files:

- `worker/src/index.js` — Worker routes and security controls
- `worker/schema.sql` — D1 database schema
- `worker/seed.sql` — starter wholesale products
- `worker/wrangler.toml.example` — Worker/D1 binding template
- `worker/package.json` — Wrangler development/deployment scripts

Deployment instructions:

```
DEPLOY_CLOUDFLARE.md
```

## Frontend pages

- Marketplace: `/index.html`
- Account: `/account.html`
- Procurement: `/procurement.html`
- Dashboard: `/dashboard.html`
- Admin: `/admin.html`

## Open-source feature benchmark

SupplyHQ's B2B workflows were independently implemented after benchmarking public open-source projects including:

- Bagisto B2B Ecommerce
- Spree Commerce
- Mercur
- Medusa

See `FEATURE_BENCHMARK.md` for source links and implementation notes.

## Current deployment state

The GitHub Pages frontend can run immediately.

The Cloudflare Worker backend requires:

1. A D1 database named `supplyhq`.
2. The schema and seed SQL applied.
3. Worker secrets configured.
4. Worker deployment.
5. `api.supplyhq.mabrigkorie.org` attached to the Worker.
6. Paystack webhook configured if payments are enabled.

Until those steps are completed, SupplyHQ automatically keeps the existing local browser fallback so the UI remains testable.

## CI

`.github/workflows/ci.yml` syntax-checks the frontend JavaScript and Worker module on every push and pull request.
