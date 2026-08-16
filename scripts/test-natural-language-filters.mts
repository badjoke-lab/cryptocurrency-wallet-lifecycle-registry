import assert from 'node:assert/strict'
import { translateNaturalLanguageFilters } from '../src/lib/natural-language-filters.ts'

const facets = {
  walletTypes: ['hardware', 'software', 'smart_contract'],
  custodyModels: ['self_custody', 'device_held_private_keys', '__not_recorded__'],
  statuses: ['active', 'deprecated', 'discontinued', 'dead'],
}

function translate(input: string) {
  return translateNaturalLanguageFilters(input, facets)
}

{
  const result = translate('hardware wallets with reviewed incidents before 2020')
  assert.equal(result.applicable, true)
  assert.deepEqual(result.filters, {
    launchTo: '2019',
    securityHistory: 'recorded',
    walletType: 'hardware',
  })
  assert.deepEqual(result.unresolved, [])
  assert.deepEqual(result.conflicts, [])
  assert.deepEqual(result.unsupported, [])
}

{
  const result = translate('software wallets with recorded remediation since 2018')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.walletType, 'software')
  assert.equal(result.filters.remediationHistory, 'recorded')
  assert.equal(result.filters.launchFrom, '2018')
}

{
  const result = translate('active self custody wallets')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.status, 'active')
  assert.equal(result.filters.custodyModel, 'self_custody')
}

{
  const result = translate('no reviewed incident recorded')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.securityHistory, 'not_recorded')
}

{
  const result = translate('no reviewed remediation recorded')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.remediationHistory, 'not_recorded')
}

{
  const result = translate('with deprecation history through 2024')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.eolHistory, 'recorded')
  assert.equal(result.filters.launchTo, '2024')
}

{
  const result = translate('between 2015 and 2020')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.launchFrom, '2015')
  assert.equal(result.filters.launchTo, '2020')
}

{
  const result = translate('most incidents')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.sort, 'incidents')
}

for (const input of ['safe wallets', 'best hardware wallets', 'wallets without incidents', 'unpatched wallets', 'no vulnerabilities']) {
  const result = translate(input)
  assert.equal(result.applicable, false, input)
  assert.ok(result.unsupported.length > 0, input)
}

{
  const result = translate('hardware software wallets')
  assert.equal(result.applicable, false)
  assert.ok(result.conflicts.some((item) => item.startsWith('walletType:')))
}

{
  const result = translate('with reviewed incidents and no reviewed incident recorded')
  assert.equal(result.applicable, false)
  assert.ok(result.conflicts.some((item) => item.startsWith('securityHistory:')))
}

{
  const result = translate('before 2015 after 2020')
  assert.equal(result.applicable, false)
  assert.ok(result.conflicts.some((item) => item.startsWith('launch range:')))
}

{
  const result = translate('hardware wallets moon')
  assert.equal(result.applicable, false)
  assert.deepEqual(result.unresolved, ['moon'])
  assert.equal(result.filters.walletType, 'hardware')
}

{
  const result = translate('custody not recorded wallets')
  assert.equal(result.applicable, true)
  assert.equal(result.filters.custodyModel, '__not_recorded__')
}

{
  const result = translate('active discontinued wallets')
  assert.equal(result.applicable, false)
  assert.ok(result.conflicts.some((item) => item.startsWith('status:')))
}

{
  const a = translate('hardware wallets with reviewed incidents before 2020')
  const b = translate('hardware wallets with reviewed incidents before 2020')
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'translator must be deterministic')
}

console.log('Natural-language filter translation fixtures passed')
