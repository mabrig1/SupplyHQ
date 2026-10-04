# Deploy the SupplyHQ API on Cloudflare

The SupplyHQ frontend is hosted on GitHub Pages at:

- https://supplyhq.mabrigkorie.org

The API is designed to run on Cloudflare Workers at:

- https://api.supplyhq.mabrigkorie.org

## 1. Create the D1 database

In Cloudflare Dashboard:

**Workers & Pages → D1 → Create database**

Use:

```
supplyhq
```

Copy the generated D1 database ID.

## 2. Prepare Worker configuration

Inside the `worker` directory, copy:

```
wrangler.toml.example
```

to:

```
wrangler.toml
```

Then replace:

```
REPLACE_WITH_YOUR_D1_DATABASE_ID
```

with your real D1 database ID.

The Worker expects the D1 binding name:

```
DB
```

## 3. Install Wrangler

```bash
cd worker
npm install
npx wrangler login
```

## 4. Apply the database schema

```bash
npm run db:schema
npm run db:seed
```

This creates the SupplyHQ users, suppliers, companies, products, orders, RFQs, purchase orders, payments, settlements, settings and audit-log tables.

## 5. Add secrets

Generate long random values and store them only in Cloudflare.

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_BOOTSTRAP_SECRET
npx wrangler secret put PAYSTACK_SECRET_KEY
```

Never commit these values to GitHub.

Recommended minimum lengths:

- `JWT_SECRET`: 32+ random bytes
- `ADMIN_BOOTSTRAP_SECRET`: 32+ random bytes
- `PAYSTACK_SECRET_KEY`: use your Paystack secret key

## 6. Deploy

```bash
npm run deploy
```

After deployment, confirm:

```
https://<your-worker>.workers.dev/api/health
```

returns:

```json
{
  "ok": true,
  "app": "SupplyHQ API",
  "status": "online",
  "version": "1.0.0"
}
```

## 7. Add the API custom domain

In Cloudflare:

**Workers & Pages → supplyhq-api → Settings → Domains & Routes → Add Custom Domain**

Use:

```
api.supplyhq.mabrigkorie.org
```

Once active, test:

```
https://api.supplyhq.mabrigkorie.org/api/health
```

The frontend already defaults to this API URL.

## 8. Bootstrap the first admin

This can only succeed before an admin account exists.

Use a strong password and the secret stored as `ADMIN_BOOTSTRAP_SECRET`.

Example:

```bash
curl -X POST https://api.supplyhq.mabrigkorie.org/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: YOUR_BOOTSTRAP_SECRET" \
  -d '{"email":"admin@example.com","password":"REPLACE_WITH_A_LONG_PASSWORD"}'
```

After the first admin is created, further bootstrap attempts are rejected.

## 9. Configure Paystack webhook

In the Paystack dashboard, set your webhook URL to:

```
https://api.supplyhq.mabrigkorie.org/api/payments/webhook
```

The Worker verifies the `x-paystack-signature` header before accepting a payment event.

## 10. Security model

The frontend never contains:

- Paystack secret keys
- JWT signing secret
- D1 credentials
- admin bootstrap secret

The API enforces:

- strict origin allowlisting
- password hashing with PBKDF2-SHA256
- signed JWT authentication
- role-based access checks
- admin-only approval/status routes
- server-side price and MOQ calculation
- server-side stock checks
- idempotency keys for orders and RFQs
- Paystack webhook signature verification
- audit logging
- best-effort application rate limiting

For production traffic, also configure Cloudflare WAF and Rate Limiting rules in the Cloudflare dashboard.

## 11. Local frontend fallback

Before the Worker is deployed, SupplyHQ continues to work using local browser data.

Once the API becomes reachable, the marketplace automatically:

- loads products from D1
- syncs signed-in orders
- syncs RFQs
- syncs supplier onboarding
- syncs buyer company records
- uses the API for Paystack checkout

This allows GitHub Pages to remain a static frontend while all sensitive operations run server-side.
