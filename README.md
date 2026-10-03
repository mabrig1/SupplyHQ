# SupplyHQ

SupplyHQ is a mobile-first B2B wholesale marketplace for consumer-goods suppliers and business buyers.

## Current MVP

### Marketplace
- Wholesale catalogue for rice, palm oil, beverages, flour and household FMCG
- Product search, categories and sorting
- Minimum order quantity (MOQ)
- Tiered bulk pricing
- Supplier/location information
- Stock visibility
- Saved products for quick reorder
- MOQ-aware cart and automatic volume-price calculation

### Orders and RFQs
- Checkout creates a persistent local order record
- WhatsApp-ready order text
- Request-for-quotation flow for negotiated bulk volumes
- Delivery location, target price and needed-by fields
- RFQ tracking in the dashboard

### Buyer dashboard
- Order count and estimated order value
- Open RFQs
- Saved goods
- Order history

### Supplier dashboard
- Incoming demand overview
- RFQ visibility
- Inventory table
- Stock updates that affect marketplace availability on the same device
- Supplier onboarding draft

### Offline/PWA
- Installable web-app manifest
- Service worker caching for marketplace and dashboard pages

## MVP limitation

This version is frontend-only. It uses localStorage to demonstrate persistent workflows on one browser/device. Sample suppliers, stock and prices are illustrative and are not live commercial offers.

## Run locally

Serve the repository with any static HTTP server:

```bash
python3 -m http.server 8080
```

Marketplace: `/index.html`  
Dashboard: `/dashboard.html`

## Next production phase

1. Authentication and role-based access for buyers, suppliers, logistics partners and admins.
2. MongoDB persistence for users, supplier profiles, inventory, carts, orders, RFQs and audit logs.
3. Supplier KYC using identity, business and location verification.
4. Paystack/Flutterwave checkout and supplier settlement rules.
5. Delivery-zone pricing, pickup options and logistics-partner integrations.
6. Admin console for supplier approval, disputes, commissions and marketplace analytics.
7. Notifications through email, SMS and WhatsApp.
8. Agentic replenishment for low-stock prediction and repeat-order suggestions.
9. Supplier RFQ bidding and private quote comparison.
10. B2B credit only through appropriate regulated lending partners and verified transaction history.

## Suggested production data model

- users
- buyer_profiles
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
- quote_responses
- saved_products
- reviews
- notifications
- audit_logs
