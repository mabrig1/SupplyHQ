# SupplyHQ Worker API

This directory contains the server-side API for SupplyHQ.

## Runtime

- Cloudflare Workers
- Cloudflare D1
- Web Crypto API
- Paystack REST API

## Public routes

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/payments/webhook`

## Authenticated routes

- `GET /api/me`
- `POST /api/suppliers`
- `GET /api/suppliers/me`
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/rfqs`
- `GET /api/rfqs`
- `POST /api/rfqs/:id/messages`
- `POST /api/companies`
- `GET /api/companies/me`
- `POST /api/purchase-orders`
- `GET /api/purchase-orders`
- `POST /api/payments/initialize`

## Admin routes

- `POST /api/admin/bootstrap`
- `GET /api/admin/summary`
- `GET /api/admin/suppliers`
- `GET /api/admin/companies`
- `PATCH /api/admin/suppliers/:id/status`
- `PATCH /api/admin/companies/:id/status`
- `PATCH /api/admin/orders/:id/status`
- `PATCH /api/admin/rfqs/:id/status`
- `GET /api/admin/settings/commission`
- `PATCH /api/admin/settings/commission`

## Security

The API intentionally keeps secrets out of the GitHub Pages frontend.

Controls include:

- strict CORS allowlist
- PBKDF2-SHA256 password hashing
- HMAC-signed JWTs with expiration
- role checks on protected routes
- server-calculated prices and commissions
- server-enforced MOQ and stock
- idempotency keys
- signed Paystack webhooks
- audit logs
- payload limits
- best-effort rate limiting

Production deployments should additionally enable Cloudflare WAF and account-level Rate Limiting rules.

See `../DEPLOY_CLOUDFLARE.md` for deployment instructions.
