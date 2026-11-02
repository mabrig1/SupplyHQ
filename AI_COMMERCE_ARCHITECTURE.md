# SupplyHQ AI Commerce Studio v1 — Architecture, APIs, and verification

## Implemented and inspectable

**28 distinct executable specialist workflows** are defined in worker/src/agent-core.js, with an inspectable registry and agent-router that chooses a specialist based on user intent. The 28 consist of 13 buyer workflows, 14 seller workflows and 1 routing/orchestration workflow.

These **are not 28 autonomous LLM processes**. The workflows run deterministic, read-only calculations on real catalogue inputs; each emits selected agent name, human-readable analysis, evidence items and next actions. No agent may alter stock, publish a product, approve a seller, pay, refund, send a WhatsApp, or transfer funds.

- Public buyer workflows run immediately in the browser using the actual 115-image MABRIG Phones static catalogue, even before Cloudflare API activation.
- When backend is online, the browser combines static MABRIG items with published products of approved third-party sellers and searchable store records.
- Seller workflows require an authenticated supplier account and run against seller-owned D1 products only. The server enforces account isolation.
- Three seller writing workflows have an optional **opt-in** external OpenRouter model service. Without a key they return a clear 503 and local deterministic drafts remain available.
- The external model receives only a selected product's listing fields and business name, never credentials, personal customer data, raw WhatsApp chats, inventory of another seller or payment information.
- A database-backed daily quota enforces at most 3 external generation attempts per seller, with at most 250 model output tokens per request.
- A Worker rate limit provides basic defense; add Cloudflare WAF and account-level rate limiting for public scale.
- No API key or secret is committed to the public GitHub repository.

## Agents by audience

Buyer (13): smart-search, budget-matcher, value-ranker, product-compare, alternatives, category-explorer, stock-scout, store-discovery, seller-signal, bundle-builder, quote-writer, spec-explainer, purchase-check.

Seller (14): catalog-auditor, inventory-alert, restock-coach, price-benchmark, margin-check, duplicate-guard, seo-keywords, description-helper, social-caption, whatsapp-message, storefront-audit, category-gaps, bundle-planner, approval-guide.

Orchestrator (1): agent-router, selects and executes the specialist suggested by user intent.

## Endpoints

- GET /api/agents: public registry, capabilities, and whether external writing is configured.
- GET /api/agents/catalog: public **approved, published** store and product records only.
- POST /api/agents/run: executes one agent against server-authoritative D1 data, with supplier sign-in for seller tasks.
- POST /api/agents/compose: **explicit opt-in only**; seller authentication, own-product check, per-day D1 quota, short OpenRouter request, no automatic publishing.

MABRIG Phones products remain a GitHub Pages catalogue and are used for client-side buyer workflows. They have not been imported into D1. Server API results cannot claim access to those static items until data import is explicitly implemented.

## Optional external AI API

For Cloudflare Workers, store credentials server-side using Wrangler/Cloudflare secrets:

- OPENROUTER_API_KEY: secret. Do not commit; no frontend injection.
- OPENROUTER_MODEL: optional model slug, defaults to openai/gpt-4.1-mini.
- AI_GATEWAY_ACCOUNT and AI_GATEWAY_NAME: optional Cloudflare AI Gateway account and gateway name, to route OpenRouter through the Gateway.

The default direct endpoint is https://openrouter.ai/api/v1/chat/completions; the optional gateway route is https://gateway.ai.cloudflare.com/v1/ACCOUNT/GATEWAY/openrouter/chat/completions. Set spend caps and provider safeguards on your account.

Before launching public seller registration, configure Cloudflare D1, PRODUCT_IMAGES R2, JWT_SECRET, DNS and the prior multi-vendor migration per MULTIVENDOR_DEPLOY.md. Apply the idempotent worker/migrations/002_agent_usage.sql after confirming the production D1 target and backup. The manual GitHub Actions worker deployment workflow includes the apply_agent_schema option (default false). Deploying GitHub Pages does **not** deploy the Worker or install database tables.

## Additional integrations — prioritized and NOT YET CONNECTED

1. **Trusted seller onboarding:** optional CAC/company verification via a licensed vendor such as Dojah or another approved provider; informed consent, privacy controls, admin review and no exposure of identity documents to LLMs.
2. **Payments:** existing Paystack backend; only activate commerce payouts after webhook verification, refunds/disputes, wallet/settlement compliance, and human approval. Monnify is an alternative rail for bank transfers. Never let an agent initiate payouts independently.
3. **Logistics:** Shipbubble rate quotes, shipping labels and tracking; display a quote only after an actual API response. Address/courier prices must never be invented.
4. **Customer messaging:** Termii or official WhatsApp Business API for permissioned order updates and verification. Marketing messages require appropriate opt-in.
5. **Agent interoperability:** evaluate ACP (OpenAI/Stripe) and Google UCP; do not advertise compliance until the relevant feed/checkout interfaces pass their official test suites and partner eligibility checks.
6. **Cloudflare durable orchestration:** use Cloudflare Agents SDK, Workflows, and AI Gateway for retries, scheduling, approval workflows, instrumentation and model spend controls once the basic runtime is live and stable.

## Required validation before claiming any record

- Public registry lists 28 unique IDs.
- CI runs each workflow and verifies outputs, isolation, role access and immutable products.
- Independently test frontend rendering, published catalogue matches, auth, OpenRouter opt-in and quota enforcement.
- Measure real active seller count, completed authenticated tasks, human approval latency, API uptime, price accuracy and model token spend.
- Any claim of being the **first** or having the **highest number of agentic AI agents in Nigeria** requires an independently defined and verified competitor comparison. Do not claim that title simply from the module count.

Version: 2026-11-02. This is the initial production-frontend AI Commerce Studio; authenticated and generative Worker behavior is contingent on backend deployment and its secrets.
