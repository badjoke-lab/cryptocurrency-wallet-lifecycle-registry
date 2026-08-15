# Wallet Lifecycle Registry — AI-era Registry Specification

Status: planned / mandatory future-work reference

## Goal
WLR must be a historical cryptocurrency-wallet lifecycle and evidence registry, not a wallet recommendation/ranking site.

## Required work
- Preserve the project identity as a historical registry of cryptocurrency wallets.
- Model evidence-backed lifecycle: release -> major product/security change -> vulnerability/incident -> vendor response/patch -> replacement/migration -> EOL/discontinuation/current state.
- Cover hardware and software wallets while keeping product/version identity explicit enough to avoid false merges.
- Expose provenance, source scope, confidence, last verification and unresolved uncertainty.
- Provide deterministic per-wallet/product machine-readable JSON derived from canonical data.
- Add structured filters for hardware/software, custody/key model where supported, lifecycle status, incident/vulnerability, patch/response, EOL and dates.
- Add Compare for lifecycle/security/support facts, not subjective safety ranking.
- Add Stats for incidents, response/patch timelines, EOL/product lifespan, wallet types and registry coverage/quality.
- Automated discovery may create staging candidates only; canonical publication requires review.

## Non-goals
No wallet investment/recommendation ranking, AI-generated canonical security claims, prompt buttons or chatbot-first product.

## Mandatory reference
All future WLR design, schema, ingestion, UI, monitoring, Compare, Stats and machine-readable work must consult this file. Existing stricter safety/evidence rules prevail.