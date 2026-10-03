# SupplyHQ

A mobile-first wholesale marketplace MVP for consumer-goods suppliers and business buyers.

## Included in this MVP
- Wholesale catalog for rice, palm oil, beverages, flour and household FMCG
- Product search and category filtering
- Minimum order quantity (MOQ)
- Tiered bulk pricing
- Supplier verification labels and location
- Stock visibility
- Cart with MOQ-aware quantity controls
- Automatic quantity-tier price recalculation
- WhatsApp-ready order text
- Supplier onboarding form
- Offline shell via service worker / PWA manifest
- LocalStorage persistence for cart and supplier draft

## Run locally
Open `index.html` directly, or serve the folder with any static web server.

Example:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

## Production roadmap
1. Authentication: retailer, supplier, logistics, admin roles.
2. Database: suppliers, products, price tiers, inventory, orders, payments, delivery zones.
3. Supplier KYC: CAC/identity/business-location verification.
4. Payments: Paystack/Flutterwave, transfer references, escrow/settlement rules.
5. Logistics: pickup, third-party delivery partners, delivery fee quotes.
6. Admin: supplier approval, dispute handling, commissions, order analytics.
7. Agentic replenishment: low-stock alerts and suggested repeat orders for retailers.
8. RFQ: buyers post volume requirements; suppliers bid privately.
9. B2B credit: only after verified transaction history and a regulated lending partner.

## Suggested data model
- users
- supplier_profiles
- products
- product_price_tiers
- inventory
- delivery_zones
- carts
- orders
- order_items
- payments
- supplier_settlements
- quote_requests
- reviews
- audit_logs

This first build is frontend-only and uses illustrative sample prices; production prices should be supplied by verified merchants.
