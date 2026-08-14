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
8. A stale production result is not automatically a code defect. Compare `/version.json` with the expected `main` commit first.
9. Never store Cloudflare credentials in repository files or logs.
10. Use a scoped API token, not a Global API key.

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

The token needs Pages edit/write access for the account.

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

After the Git-integrated project exists, use the repository `Configure Cloudflare Pages` workflow in `plan` mode and then `apply` mode to converge branch controls, build watch paths, build settings, and the required custom domain.

## Production verification

A deployment is accepted only after all of the following are checked against the expected `main` commit:

1. `/version.json` returns HTTP 200 and reports the expected commit.
2. `/data/manifest.json` returns HTTP 200 and reports the canonical counts.
3. `/data/entities.json`, `/data/products.json`, `/data/events.json`, and `/data/evidence.json` match the manifest counts.
4. `/llms.txt` and `/ai.txt` return HTTP 200.
5. `/robots.txt` and `/sitemap.xml` return HTTP 200.
6. `/`, `/hardware/`, `/software/`, `/incidents/`, `/methodology/`, `/about/`, and `/support/` return HTTP 200.
7. At least one wallet detail and one product detail route return HTTP 200.
8. Incident severity colors remain distinct on the black theme and are not presented as wallet safety scores.
9. Support shows the temporary HEI-shared donation addresses and the editorial-independence disclosure.
10. Mobile layout has no horizontal overflow in the primary navigation, tables/cards, wallet detail, incident timeline, or Support address blocks.

## Deployment-sensitive files

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
- treating stale Cloudflare output as a source-code failure before checking `/version.json`
- committing Cloudflare credentials
- changing the canonical domain without updating `src/lib/site.ts` and the deployment policy together
- turning WLR into a live safety ranking based on incident badge color

## Precedence

If another WLR document conflicts with this file on Cloudflare deployment behavior, this file takes precedence until deliberately changed in a reviewed PR.
