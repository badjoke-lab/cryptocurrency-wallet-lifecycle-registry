import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const [translator, helper, client, spec] = await Promise.all([
  fs.readFile('src/lib/natural-language-filters.ts', 'utf8'),
  fs.readFile('src/components/natural-filter-helper.tsx', 'utf8'),
  fs.readFile('src/components/entity-table-client.tsx', 'utf8'),
  fs.readFile('docs/operations/NATURAL_LANGUAGE_FILTER_EVALUATION.md', 'utf8'),
])

for (const required of [
  'translateNaturalLanguageFilters',
  'securityHistory',
  'remediationHistory',
  'eolHistory',
  'launchFrom',
  'launchTo',
  'unsupported',
  'conflicts',
  'unresolved',
]) {
  assert.ok(translator.includes(required), `translator missing required behavior token: ${required}`)
}

for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'openai', 'anthropic']) {
  assert.equal(translator.toLowerCase().includes(forbidden.toLowerCase()), false, `translator must not use external inference/network behavior: ${forbidden}`)
  assert.equal(helper.toLowerCase().includes(forbidden.toLowerCase()), false, `helper must not use external inference/network behavior: ${forbidden}`)
}

assert.ok(helper.includes('Apply filters'), 'helper must require explicit Apply filters action')
assert.ok(helper.includes('disabled={!translation.applicable}'), 'Apply filters must fail closed for unresolved/conflicting/unsupported input')
assert.ok(helper.includes('Unsupported claim/ranking language'), 'helper must explain unsupported safety/ranking language')
assert.ok(helper.includes('no AI service or semantic inference is used'), 'helper must disclose deterministic local behavior')
assert.ok(client.includes('NaturalFilterHelper'), 'registry controls must render the deterministic helper')
assert.ok(client.includes('applyNaturalFilters'), 'registry must explicitly map translator output into existing filter state')
assert.ok(client.includes("setQuery('')"), 'natural filter application must not silently combine with literal search')
assert.ok(client.includes('setHelperResetToken'), 'registry reset must clear helper state')
assert.ok(client.includes('Security history') && client.includes('Fix / remediation') && client.includes('EOL / deprecation'), 'explicit structured controls must remain present')

for (const requiredSpec of [
  'GO for a constrained deterministic translator',
  'NO-GO for an external LLM/API',
  'preview',
  'Apply filters',
  'without incidents',
  'unpatched',
  '390x844',
]) {
  assert.ok(spec.includes(requiredSpec), `Step 9 evaluation spec missing acceptance boundary: ${requiredSpec}`)
}

console.log('Natural-language filter implementation boundary validation passed')
