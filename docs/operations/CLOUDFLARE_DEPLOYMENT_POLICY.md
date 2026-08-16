# Cloudflare Deployment Policy

Status: required operational source of truth
Scope: Wallet Lifecycle Registry (WLR)

## Purpose

Publish WLR on Cloudflare Pages without wasting Free-plan builds or allowing branch previews to become an uncontrolled deployment path.

## Production identity

- Repository: `badjoke-lab/cryptocurrency-wallet-lifecycle-registry`
- Cloudflare Pages project: `cryptocurrency-wallet-lifecycle-registry`
- Production branch: `main`
- Canonical domain: `https://wlr.badjoke-lab.com`
- Build command: `npm run build`
- Build output directory: `out`
- Framework: Next.js static export

## Core rules

1. GitHub Actions validates every public-output change before merge.
2. Cloudflare production deploys only reviewed `main` state.
3. Automatic branch preview deployments are disabled by default.
4. Documentation-only and internal workflow changes must not consume Pages builds.
5. `config/cloudflare-pages-project.json` is the machine-readable authority for the desired Pages project state.
6. The first production deployment is deployment-sensitive and requires explicit verification of routes, metadata, public JSON, mobile layout, dark-theme contrast, incident severity badges, and Support.
7. After the initial publish, routine reviewed canonical data additions do not require a branch preview when GitHub CI covers the generated output.
8. A stale production result is not automatically a code defect. Confirm the Cloudflare deployment commit against the expected `main` commit before treating the application code as stale or broken.
9. Never store Cloudflare credentials in repository files or logs.
10. Use a scoped API token, not a Global API key.
11. Runtime configuration under `config/` is a production build input and must remain covered by Cloudflare build-watch paths.

## Machine-readable policy

Desired state is stored in:

```text
config/cloudflare-pages-project.json
```

Repository commands:

```bash
npm run cloudflare:config:print
npm run cloudflare:config:plan
npm run cloudflare:config:apply
```

`print` requires no Cloudflare credentials. `plan` and `apply` require:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The token needs Pages edit/write access for the account. Automated custom-domain DNS management additionally requires `Zone -> DNS -> Edit` scoped to the `badjoke-lab.com` zone.

## First publish

The first Pages project must be created using Cloudflare Git integration with this repository. Do not create a Direct Upload project if Git integration is the intended long-term deployment path.

Initial Pages settings:

```text
Repository: badjoke-lab/cryptocurrency-wallet-lifecycle-registry
Production branch: main
Build command: npm run build
Build output directory: out
Root directory: /
Preview deployments: disabled after initial configuration
Custom domain: wlr.badjoke-lab.com
```

After the Git-integrated project exists, use the repository Cloudflare configuration tooling to converge branch controls, build watch paths, build settings, and the required custom domain. DNS for the custom hostname must resolve as a proxied CNAME to the project `pages.dev` hostname before the domain can become active.

The initial WLR production publication was accepted from `main` commit `fbebf0c0f04a9ac517594361897e6bb4605f1bfe`. Cloudflare reported the production deployment stage successful and `wlr.badjoke-lab.com` active before closeout.

## Production verification

A deployment is accepted only after all of the following are checked against the expected `main` state:

1. Cloudflare's deployment API reports a successful production deployment for the expected `main` commit, and `/version.json` returns HTTP 200 with the expected WLR version/schema metadata.
2. `/data/manifest.json` returns HTTP 200 and reports the canonical counts.
3. `/data/entities.json`, `/data/products.json`, `/data/events.json`, and `/data/evidence.json` match the manifest counts and expected canonical `main` data.
4. Deterministic wallet/product indexes and representative wallet/product JSON return HTTP 200 and pass their schema/linkage checks.
5. `/data/stats.json` returns HTTP 200 when Stats is present and matches the deterministic derivation from the accepted canonical `main` data and central structured-discovery policy.
6. `/llms.txt` and `/ai.txt` return HTTP 200.
7. `/robots.txt` and `/sitemap.xml` return HTTP 200.
8. `/`, `/hardware/`, `/software/`, `/incidents/`, `/compare/`, `/stats/`, `/methodology/`, `/about/`, and `/support/` return final HTTP 200 after canonical redirects.
9. At least one wallet detail and one product detail route return final HTTP 200.
10. Incident severity colors remain distinct on the black theme and are not presented as wallet safety scores.
11. Support shows the temporary HEI-shared donation addresses and the editorial-independence disclosure.
12. Mobile production layout is checked in a real browser viewport and has no document-level horizontal overflow in representative primary navigation, tables/cards, wallet detail, product detail, incident timeline, Compare, Stats, or Support routes.
13. When a runtime discovery/filter configuration changes, production verification must confirm the expected exact `main` deployment and representative deterministic filter behavior.
14. Compare changes must verify repeated `wallet=` query order, duplicate and unknown selection handling, the four-wallet cap, add/remove/reset URL synchronization, deterministic lifecycle/security/support counts, and product-specific support presentation.
15. Narrow-screen Compare may scroll horizontally only inside explicit Compare viewports; the document itself must not overflow horizontally.
16. Stats changes must verify registry totals and central incident/remediation/EOL counts against canonical production JSON, expose numerator/denominator coverage, keep patch-response duration unavailable without explicit canonical linkage, and enforce lifecycle precision rules before publishing lifespan distributions.
17. Stats production QA must verify that public `stats.json` exactly matches the deterministic accepted-main derivation and that a 390px real-browser viewport has no document-level horizontal overflow.

## Deployment-sensitive files

- `config/*`
- `config/cloudflare-pages-project.json`
- `scripts/configure-cloudflare-pages-project.mjs`
- `.github/workflows/configure-cloudflare-pages.yml`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `public/_redirects`
- `public/_headers`
- `scripts/build-*`
- `scripts/sync-*`

## Prohibited practices

- enabling automatic previews for every branch without review
- using production as the first place to discover a known CI failure
- treating stale Cloudflare output as a source-code failure before checking the Cloudflare deployment commit
- committing Cloudflare credentials
- changing the canonical domain without updating `src/lib/site.ts` and the deployment policy together
- turning WLR into a live safety ranking based on incident badge color
- publishing market-share, safety-score, or inferred vendor-response metrics from registry coverage data

## Precedence

If another WLR document conflicts with this file on Cloudflare deployment behavior, this file takes precedence until deliberately changed in a reviewed PR.
