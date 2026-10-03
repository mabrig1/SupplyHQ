# SupplyHQ Feature Benchmark

SupplyHQ reviewed public open-source commerce projects to identify useful B2B and marketplace patterns. The features below were reimplemented for SupplyHQ's own frontend prototype; third-party source code was not copied into this repository.

## Bagisto B2B Ecommerce
Repository: https://github.com/bagisto/b2b-ecommerce  
License: MIT

Patterns benchmarked:
- Company registration and admin approval
- Company users and role-based access concepts
- Quick Order by SKU / CSV
- Requisition lists for repeat purchasing
- Request for Quote
- Buyer/seller quotation negotiation
- Purchase orders
- Company-specific catalogs and pricing concepts

SupplyHQ implementation:
- Procurement workspace
- Quick Order by SKU and CSV-style paste
- Reusable requisition lists
- Buyer company profile and approval state
- Demo company roles
- RFQ negotiation thread
- Purchase-order records

## Spree Commerce
Repository: https://github.com/spree/spree  
License: BSD-3-Clause

Patterns benchmarked:
- Multi-vendor marketplace
- Configurable seller onboarding
- Order splitting per seller
- Commission engine
- Payout ledger
- B2B price lists and volume tiers
- Customer/company segmentation
- Multi-location fulfillment concepts

SupplyHQ implementation:
- Multi-supplier order splits
- Configurable demo marketplace commission
- Supplier gross / commission / net settlement view
- Existing volume price tiers
- Supplier and buyer approval workflows

## Mercur
Repository: https://github.com/mercurjs/mercur  
License: MIT for the open-source core

Patterns benchmarked:
- Dedicated admin and vendor panels
- Multi-vendor offers/catalogs
- Marketplace commissions
- Supplier payouts
- API-first marketplace separation

SupplyHQ implementation:
- Separate marketplace, procurement, supplier/buyer dashboard and admin surfaces
- Supplier settlement ledger
- Admin marketplace controls
- Architecture roadmap separating storefront and backend responsibilities

## Medusa
Repository: https://github.com/medusajs/medusa  
License model: open-core; core commerce modules are MIT licensed

Patterns benchmarked:
- Modular commerce primitives
- Extensible order, payment, stock and fulfillment architecture
- B2B / marketplace use cases built on a commerce core

SupplyHQ implementation:
- Production roadmap keeps marketplace, procurement, inventory, RFQ, payments and fulfillment as separable domain modules.

## Important

The current SupplyHQ repository is still a frontend prototype using browser localStorage. These features demonstrate workflows and data contracts; they are not a substitute for server-side authentication, database persistence, payment verification, KYC, authorization, or settlement controls in production.
