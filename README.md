# SupplyHQ

SupplyHQ is a mobile-first B2B wholesale marketplace for consumer-goods suppliers and business buyers.

## Current MVP

### Marketplace
- Wholesale catalogue for rice, palm oil, beverages, flour and household FMCG
- Product search, categories and sorting
- Minimum order quantity (MOQ)
- Tiered bulk pricing
- Supplier/location information and stock visibility
- Saved goods and fast reorder
- MOQ-aware cart and automatic volume-price calculation
- Multi-supplier order splitting with supplier settlement records

### B2B Procurement Workspace
- Quick Order by SKU
- CSV-style SKU/quantity import
- Reusable requisition lists
- Buyer company profile and approval state
- Buyer team members with Buyer, Approver, Finance and Viewer roles
- RFQ negotiation messages and counter-price entries
- Purchase-order generation from marketplace orders

### Orders and RFQs
- Checkout creates a persistent local order record
- WhatsApp-ready order text
- Request-for-quotation flow for negotiated bulk volumes
- Delivery location, target price and needed-by fields
- RFQ status and negotiation tracking

### Buyer dashboard
- Order count and estimated order value
- Open RFQs
- Saved goods
- Order history
- Procurement workspace link

### Supplier dashboard
- Incoming demand overview
- RFQ visibility
- Inventory and stock controls
- Supplier selector for demo settlement ledgers
- Gross sales, platform commission and estimated net payout
- Settlement readiness based on order state

### Admin control centre
- Supplier approval / review / rejection
- Buyer company approval / review / rejection
- Marketplace commission configuration
- Order status control
- RFQ status control
- Inventory watch

### Offline/PWA
- Installable web-app manifest
- Service worker caching for marketplace, procurement, dashboard and admin pages

## Open-source feature benchmark

SupplyHQ's B2B workflows were independently implemented after benchmarking public open-source projects including:

- Bagisto B2B Ecommerce: company approval, company users/roles, quick order, requisition lists, RFQ negotiation and purchase orders.
- Spree Commerce: B2B price lists, customer groups, seller onboarding, multi-seller order splitting, commission and payout concepts.
- Mercur: vendor/admin panel separation, marketplace offers, commissions and payout workflows.
- Medusa: modular commerce architecture and extensible commerce primitives.

See `FEATURE_BENCHMARK.md` for source links and implementation notes.

## MVP limitation

This version remains frontend-only. It uses localStorage to demonstrate persistent workflows on one browser/device. Sample suppliers, stock and prices are illustrative and are not live commercial offers.

## Run locally

Serve the repository with any static HTTP server:

```bash
python3 -m http.server 8080
```

Marketplace: `/index.html`  
Procurement: `/procurement.html`  
Dashboard: `/dashboard.html`  
Admin: `/admin.html`

## Next production phase

1. Authentication and server-enforced role-based access for buyers, company users, suppliers and admins.
2. MongoDB or PostgreSQL persistence for profiles, catalogs, inventory, carts, orders, purchase orders and RFQs.
3. Supplier KYC using identity, business and location verification.
4. Paystack/Flutterwave checkout and real supplier settlement ledger.
5. Delivery-zone pricing, pickup options and logistics-partner integrations.
6. Notifications through email, SMS and WhatsApp.
7. Customer/company-specific catalogs and negotiated pricing.
8. Agentic replenishment for low-stock prediction and repeat-order suggestions.
9. Supplier quote bidding and private quote comparison.
10. B2B credit only through appropriate regulated lending partners and verified transaction history.

## Suggested production data model

- users
- companies
- company_users
- company_roles
- buyer_profiles
- supplier_profiles
- supplier_requirements
- products
- product_price_tiers
- company_catalogs
- inventory
- delivery_zones
- carts
- requisition_lists
- orders
- order_items
- supplier_order_splits
- payments
- supplier_settlements
- quote_requests
- quote_messages
- purchase_orders
- saved_products
- reviews
- notifications
- audit_logs
