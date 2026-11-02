# Connecting supplyhq.online to Cloudflare — verified deployment plan

## Verified on November 2, 2026

- The current registrar-side DNS nameservers for supplyhq.online are dns1.registrar-servers.com and dns2.registrar-servers.com (Namecheap-associated DNS). The observed IPv4 address is 192.64.119.252, not the active SupplyHQ storefront.
- Existing live production: https://supplyhq.mabrigkorie.org/ hosted from the mabrig1/SupplyHQ GitHub repository via GitHub Pages. Root CNAME stays unchanged on purpose.
- supplyhq.online's Cloudflare nameserver pair has NOT been assigned or captured in this repository. Copy the exact pair from the Cloudflare zone's Overview page after onboarding; NEVER copy nameservers for a different domain.
- The repository is now prepared to create a second independent Cloudflare Pages deployment under supplyhq.online. This avoids changing the existing production hostname.
- The new backend hostname is intended to be api.supplyhq.online, but its Worker/D1/R2 runtime is NOT deployed by this change.

## 1. Add the domain in Cloudflare

At https://dash.cloudflare.com/ select **Domains > Onboard a domain**, enter **supplyhq.online**, select Continue.
- Keep "I monetize pages that serve ads" unchecked unless there actually are ads.
- Allow legitimate search crawlers; for an AI-discoverable ecommerce catalogue, allow AI search/agent access to publicly published pages. For training crawlers, consider Disallow so public merchant listings do not automatically become training data. Review Cloudflare's current policies and your business choice.
- Choose **Free** initially and let Cloudflare scan DNS.
- REVIEW imported MX, TXT, SPF, DKIM, DMARC and any email records BEFORE changing your registrar's nameservers. Never delete email records just to make the website work.
- The old apex parking/forwarding A record 192.64.119.252 must not remain in conflict with the Pages custom-domain DNS once your new Pages project is ready.

## 2. Deploy GitHub repository to Cloudflare Pages

Open Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git. Authorize the repository **mabrig1/SupplyHQ**.
- Project name: supplyhq-marketplace (choose another unique name if taken).
- Production branch: main.
- Framework preset: None.
- Build command: node scripts/build-cloudflare-pages.cjs
- Build output directory: dist
- Root directory: repository root (leave blank).
- No static frontend API secrets or private keys should be entered.
- Click Save and Deploy, then verify the generated **<project-name>.pages.dev** URL. Check the homepage, /ai.html, /sell.html, image thumbnails and seller directory. The browser-based AI Studio still works while the backend is offline.

The build copies only explicitly allowlisted static files, the 115 phone photographs, and the deterministic agent-core module to dist/. It excludes the Worker handler, database schema, local env files, GitHub Actions workflows and the GitHub Pages CNAME file.

## 3. Attach supplyhq.online to Pages

After a successful Pages preview deployment and activation of the Cloudflare domain zone:
Cloudflare > Workers & Pages > [new Pages project] > Custom domains > Set up a domain > **supplyhq.online**. Cloudflare should provision the appropriate DNS record and TLS certificate. Do not use parking IPs or substitute Vercel's CNAME target. Add **www.supplyhq.online** as a second custom domain if you want visitors to use www; optionally redirect it to the apex for a single canonical URL.

## 4. Change nameservers at the actual registrar

From Cloudflare > Domains > supplyhq.online > Overview, copy the exact TWO nameservers Cloudflare assigned to **supplyhq.online**.
Then at the domain registrar, open supplyhq.online > Manage > Nameservers and replace the current dns1.registrar-servers.com and dns2.registrar-servers.com with the exact assigned Cloudflare nameservers.
- If the registrar is Namecheap: Domain List > Manage > Nameservers > Custom DNS > paste the two values > save.
- If DNSSEC/DS is enabled at the registrar, disable the old DNSSEC delegation before the switch; re-enable using Cloudflare's instructions after the domain is active.
- Do not use the previously seen Cloudflare nameservers for mabrigkorie.org; each zone may have a different assignment.
- Cloudflare may report Pending Nameserver Update until delegation propagates. Check its Dashboard Overview and authoritative NS records, and verify that the domain status is Active.

Do not switch nameservers before recording any existing email/other-service DNS records you need to retain.

## 5. Backend API — independent follow-on

The new Cloudflare Pages frontend selects https://api.supplyhq.online as its default API origin only when visited at supplyhq.online or www.supplyhq.online. The existing GitHub Pages hostname still uses https://api.supplyhq.mabrigkorie.org.

Once the domain is active:
1. Deploy the existing supplyhq-api Cloudflare Worker, apply required existing D1 schema and subsequent marketplace/agent migrations in sequence, attach the private R2 PRODUCT_IMAGES bucket. Keep JWT_SECRET, OpenRouter and payment secrets in Cloudflare, not GitHub.
2. In Workers & Pages > supplyhq-api > Settings > Domains & Routes, add the custom domain **api.supplyhq.online**. A Worker custom domain is managed through Cloudflare, not a GitHub Pages record.
3. CORS allowed origins in worker/wrangler.toml.example now include both old and new site hosts.
4. Verify the actual API health URL, seller account registration, photo uploads, product persistence, approved public stores and agent endpoints with explicit smoke tests. Without this step, these are frontend screens only; they must not be called live commerce operations.

## 6. Acceptance checklist

- https://supplyhq.online resolves over HTTPS and serves the MABRIG Phones homepage (115 photos).
- https://supplyhq.online/ai.html renders its real browser-based agent workflows.
- https://supplyhq.online/sell.html displays registration/store setup. Actual registration needs the separate Worker backend.
- https://supplyhq.mabrigkorie.org still loads untouched and its GitHub Pages CNAME is unchanged.
- DNS apex points to the Pages project rather than 192.64.119.252 parking.
- www redirects to the desired canonical URL or serves the same TLS-valid site.
- https://api.supplyhq.online/api/health returns success ONLY once the Worker custom domain and runtime are deployed.

## Rollback

If the new Pages project fails, keep the old site untouched at supplyhq.mabrigkorie.org. Revert or remove only the new domain's Pages attachment; do not edit the old GitHub Pages CNAME. Change registrar nameservers again only if absolutely necessary after auditing DNS, email and traffic dependencies.

Authoritative documentation: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/ and https://developers.cloudflare.com/pages/configuration/custom-domains/ and https://developers.cloudflare.com/pages/get-started/git-integration/.
