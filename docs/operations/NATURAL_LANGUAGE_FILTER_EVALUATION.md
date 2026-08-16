# WLR Natural-Language Filter Translation Evaluation

Status: AI-era Step 9 evaluation decision and accepted implementation record
Issue: #55

## Decision

**GO for a constrained deterministic translator.**

**NO-GO for an external LLM/API, open-ended semantic search, or any translator that can create facts outside the existing structured discovery state.**

The accepted Step 9 implementation is a client-side convenience layer that compiles a small documented grammar into the already-reviewed filter controls. The explicit filter state remains the only discovery authority.

## Why this is worth adding

Step 5 already exposes deterministic wallet type, recorded custody model, lifecycle status, reviewed incident history, reviewed remediation history, reviewed EOL/deprecation history, launch-year bounds, text search, and sort controls.

A constrained text helper can reduce control-panel friction for users who know the shape they want, for example:

```text
hardware wallets with reviewed incidents before 2020
```

The translator may compile that into the same state a user could select manually:

```text
walletType = hardware
securityHistory = recorded
launchTo = 2019
```

This adds no new registry claim and no new filtering semantics.

## Why an LLM/API is rejected

WLR is currently a static registry. An external inference service would add:

- non-deterministic interpretation;
- cost/secrets/runtime dependencies;
- network failure modes;
- privacy questions for user-entered search text;
- a risk that plausible language is mistaken for reviewed registry fact;
- duplicated semantics beside the existing deterministic controls.

Those costs are not justified for a small filter-state compilation problem.

The implementation must therefore run entirely in the browser using versioned deterministic code and fixtures.

## Authority boundary

The translator may output only values that the existing registry filter UI can already represent:

```text
query
walletType
custodyModel
status
securityHistory
remediationHistory
eolHistory
launchFrom
launchTo
sort
```

The translator must not:

- alter canonical data;
- change discovery derivation rules;
- invent a custody/key model;
- infer safety, vulnerability absence, patch absence, support, or EOL;
- create a new ranking or score;
- reinterpret incident/remediation/EOL event taxonomies;
- silently broaden an unknown phrase into text-search matches;
- make a network request.

`config/structured-discovery.json`, `src/lib/discovery.ts`, and the existing explicit controls remain authoritative.

## Interaction model

The helper is separate from ordinary text search.

Accepted flow:

1. user enters a phrase in a `Describe filters` field;
2. translator parses locally;
3. UI displays the proposed filter changes as a compact preview;
4. unknown/ambiguous fragments are shown explicitly;
5. nothing changes until the user selects `Apply filters`;
6. applying sets only existing filter state;
7. the ordinary controls immediately reflect the applied values and remain editable;
8. `Reset` clears both explicit filters and translator preview/input.

There is no chatbot, generated explanation, streaming response, or prompt-history UI.

## Supported grammar v1

The grammar is intentionally narrow. Matching is case-insensitive and punctuation-tolerant. Whitespace/hyphen variants may normalize to the same phrase.

### Wallet type

The translator may match a phrase to an exact wallet type only when that value exists in the current rows.

Initial explicit aliases include:

```text
hardware / hardware wallet(s) -> hardware
software / software wallet(s) -> software
smart contract / smart-contract wallet(s) / smart account(s) -> smart_contract
```

If a mapped canonical value does not exist in the current rows, the term is unresolved rather than forced.

### Custody model

The translator may match normalized visible values that exist in current rows, plus only small explicit spelling variants such as underscore/hyphen/space differences.

`not recorded` may map to the existing missing-custody sentinel only when the phrase clearly refers to custody/key model.

The translator must not infer custody from wallet type or product wording.

### Lifecycle status

Status matching is exact against current row status values after underscore/hyphen/space normalization.

A phrase such as `active wallets` may set `status=active` only if `active` is an existing status value.

### Reviewed incident history

Positive phrases include:

```text
with reviewed incidents
with incident history
reviewed incident history
```

They compile to:

```text
securityHistory = recorded
```

Negative matching preserves coverage semantics. Accepted negative phrases include:

```text
no reviewed incident recorded
without reviewed incident records
```

They compile to:

```text
securityHistory = not_recorded
```

Ambiguous phrases such as `safe wallets`, `without incidents`, `no vulnerabilities`, or `not hacked` do **not** compile to the negative filter. They are unsupported because WLR absence-of-record is not proof of real-world absence.

### Reviewed fix/remediation history

Positive examples:

```text
with recorded remediation
with reviewed fixes
recorded fix or remediation
```

compile to `remediationHistory=recorded`.

Negative examples must explicitly describe registry coverage, such as:

```text
no reviewed fix recorded
no reviewed remediation recorded
```

compile to `remediationHistory=not_recorded`.

Phrases such as `unpatched`, `unfixed`, `vendor did not respond`, or `unsafe` are unresolved/unsupported and never mapped.

### Reviewed EOL/deprecation history

Positive examples:

```text
with recorded eol
with deprecation history
recorded eol or deprecation
```

compile to `eolHistory=recorded`.

Coverage-safe negative phrases such as `no reviewed eol recorded` may compile to `eolHistory=not_recorded`.

`still supported`, `supported forever`, or `not discontinued` must not be inferred from the inverse filter.

### Launch-year bounds

Supported deterministic patterns:

```text
before YYYY
launched before YYYY
through YYYY
until YYYY

after YYYY
launched after YYYY
since YYYY

from YYYY
from YYYY to YYYY
between YYYY and YYYY
YYYY-YYYY
```

Semantics:

- `before 2020` -> `launchTo=2019`
- `through 2020` / `until 2020` -> `launchTo=2020`
- `after 2020` -> `launchFrom=2021`
- `since 2020` -> `launchFrom=2020`
- `between 2015 and 2020` -> inclusive `launchFrom=2015`, `launchTo=2020`

Unsupported years or contradictory ranges fail closed.

### Sort intent

Only unambiguous phrases map to existing sort values:

```text
name / alphabetical -> name
recently verified / newest verification -> verified
most incidents -> incidents
most products -> products
```

`best`, `safest`, `top wallets`, and similar ranking language are unsupported and never map to a sort.

### Remaining text search

The v1 translator does **not** automatically dump unrecognized words into ordinary text search.

This is deliberate: doing so makes failed parsing look successful and can turn ambiguous natural language into accidental string matches.

## Conflict behavior

The translator fails closed on conflicting instructions, including examples such as:

```text
hardware software wallets
active discontinued wallets
before 2015 after 2020
with reviewed incidents and no reviewed incident recorded
```

A conflict prevents `Apply filters` until the phrase is edited or the conflicting fragment is removed.

The parser does not choose one interpretation based on token order.

## Unknown and unsafe language

The preview distinguishes:

- `recognized` filter clauses;
- `unresolved` text;
- `conflict` errors;
- `unsupported safety/ranking language`.

Unsupported terms such as `safe`, `safest`, `best`, `recommended`, `unpatched`, and `no vulnerabilities` receive a neutral explanation that WLR filters reviewed records rather than making that claim.

No assistant-like prose generation is used.

## Determinism

Given the same:

- translator version;
- phrase;
- available facet values;

output must be byte-equivalent JSON.

The parser exposes a pure function used by both the UI and Node fixture tests.

Representative result shape:

```json
{
  "version": "1.0.0",
  "input": "hardware wallets with reviewed incidents before 2020",
  "applicable": true,
  "filters": {
    "walletType": "hardware",
    "securityHistory": "recorded",
    "launchTo": "2019"
  },
  "recognized": [
    "hardware wallets",
    "with reviewed incidents",
    "before 2020"
  ],
  "unresolved": [],
  "conflicts": [],
  "unsupported": []
}
```

No result field contains a canonical claim about an individual wallet.

## Validation fixtures

Implementation includes positive, negative, conflict, unresolved, and unsupported fixtures covering at least:

```text
hardware wallets with reviewed incidents before 2020
software wallets with recorded remediation since 2018
active self custody wallets
no reviewed incident recorded
no reviewed remediation recorded
with deprecation history through 2024
between 2015 and 2020
most incidents
safe wallets
best hardware wallets
wallets without incidents
unpatched wallets
hardware software wallets
with reviewed incidents and no reviewed incident recorded
before 2015 after 2020
```

Tests verify exact filter output and fail-closed behavior.

## UI safeguards

- helper is visually subordinate to explicit structured controls;
- preview appears before apply;
- no automatic application while typing;
- explicit controls remain accessible and editable;
- translator status is announced accessibly;
- unsupported language never appears as a filter chip;
- mobile layout has no document-level horizontal overflow at the 390px production QA viewport;
- normal text search continues to mean literal reviewed-label string matching.

## Accepted implementation and production verification

The approved deterministic design was implemented in PR #57.

- accepted main commit: `5bc7da11e9b28b78ea76ae61e9cfe205c2469171`
- post-merge `Validate WLR`: run #91 / id `31961378981`, success
- exact Cloudflare production deployment: `7a400185-f72b-4d7d-befa-64378aeca370`
- production domain alias: `https://wlr.badjoke-lab.com`
- accepted real-browser QA: `Verify WLR Step 9 Production v2`, run id `31961529400`, success

Production browser verification established:

- `hardware wallets with reviewed incidents before 2020` previewed `Type: hardware`, `Security history: Recorded`, and `Launch to: 2019`, then applied to the ordinary explicit controls and returned 4 reviewed records;
- `safe wallets` failed closed as unsupported claim/ranking language;
- `wallets without incidents` failed closed rather than being converted into absence-of-reviewed-incident coverage;
- `hardware software wallets` failed closed as a conflicting wallet-type request;
- `no reviewed incident recorded` was accepted as the coverage-safe existing `not_recorded` filter;
- after apply, ordinary Status remained manually editable;
- Reset cleared the helper input and all tested structured controls;
- after the initial page load settled, all tested translator interactions generated zero network requests;
- 390x844 real-browser layout had `innerWidth=390`, `clientWidth=390`, `scrollWidth=390`, and no helper/input/button boxes outside the viewport.

The first browser QA attempt used a brittle `label > span` selector and failed before exercising the product. It did not indicate a production defect; v2 used the helper's stable accessibility selector and completed successfully. No production code change was required after accepted main `5bc7da11...`.

## Final evaluation

The value/cost tradeoff is favorable only under the constrained design above. It improves access to an already-stable filter system while preserving WLR's evidence and determinism boundaries.

Step 9 is therefore complete for **deterministic constrained translation only**. Any future proposal to replace it with LLM-backed semantic interpretation requires a new specification and explicit review; it is not covered by this approval.
