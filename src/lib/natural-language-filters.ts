export type RecordedFilterValue = 'recorded' | 'not_recorded'
export type DiscoverySortValue = 'name' | 'verified' | 'incidents' | 'products'

export type NaturalFilterState = {
  walletType?: string
  custodyModel?: string
  status?: string
  securityHistory?: RecordedFilterValue
  remediationHistory?: RecordedFilterValue
  eolHistory?: RecordedFilterValue
  launchFrom?: string
  launchTo?: string
  sort?: DiscoverySortValue
}

export type NaturalFilterFacets = {
  walletTypes: string[]
  custodyModels: string[]
  statuses: string[]
}

export type NaturalFilterTranslation = {
  version: '1.0.0'
  input: string
  applicable: boolean
  filters: NaturalFilterState
  recognized: string[]
  unresolved: string[]
  conflicts: string[]
  unsupported: string[]
}

type FilterKey = keyof NaturalFilterState

type MutableTranslation = Omit<NaturalFilterTranslation, 'applicable'> & {
  applicable?: boolean
}

const MIN_YEAR = 1900
const FILLER_WORDS = new Set([
  'and',
  'are',
  'find',
  'for',
  'me',
  'of',
  'please',
  'show',
  'the',
  'that',
  'wallet',
  'wallets',
  'which',
  'with',
])

const UNSUPPORTED_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\bsafest\b/gi, label: 'safest' },
  { regex: /\bsafe\s+wallets?\b/gi, label: 'safe wallets' },
  { regex: /\bbest\b/gi, label: 'best' },
  { regex: /\brecommended\b/gi, label: 'recommended' },
  { regex: /\bunpatched\b/gi, label: 'unpatched' },
  { regex: /\bunfixed\b/gi, label: 'unfixed' },
  { regex: /\bno\s+vulnerabilit(?:y|ies)\b/gi, label: 'no vulnerabilities' },
  { regex: /\bwithout\s+incidents?\b/gi, label: 'without incidents' },
  { regex: /\bnot\s+hacked\b/gi, label: 'not hacked' },
  { regex: /\bstill\s+supported\b/gi, label: 'still supported' },
  { regex: /\bsupported\s+forever\b/gi, label: 'supported forever' },
]

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function blankMatches(text: string, regex: RegExp, onMatch: (matched: string, match: RegExpExecArray) => void) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`
  const matcher = new RegExp(regex.source, flags)
  let working = text
  const matches = [...text.matchAll(matcher)]
  for (const match of matches) {
    const matched = match[0]
    onMatch(matched, match as RegExpExecArray)
    const start = match.index ?? 0
    working = `${working.slice(0, start)}${' '.repeat(matched.length)}${working.slice(start + matched.length)}`
  }
  return working
}

function setFilter(result: MutableTranslation, key: FilterKey, value: string, phrase: string) {
  const current = result.filters[key]
  if (current !== undefined && current !== value) {
    result.conflicts.push(`${String(key)}: ${String(current)} vs ${value}`)
    result.recognized.push(phrase)
    return
  }
  ;(result.filters as Record<string, string>)[key] = value
  result.recognized.push(phrase)
}

function validYear(year: number) {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= 9999
}

function addYearRangeConflict(result: MutableTranslation) {
  const from = result.filters.launchFrom ? Number(result.filters.launchFrom) : null
  const to = result.filters.launchTo ? Number(result.filters.launchTo) : null
  if (from !== null && to !== null && from > to && !result.conflicts.some((item) => item.startsWith('launch range:'))) {
    result.conflicts.push(`launch range: ${from} is after ${to}`)
  }
}

function mapDynamicFacet(
  working: string,
  result: MutableTranslation,
  values: string[],
  key: 'walletType' | 'custodyModel' | 'status',
  extraAliases: Record<string, string[]> = {},
) {
  const normalizedValues = new Map(values.map((value) => [normalizeValue(value), value]))
  const aliases: Array<{ phrase: string; value: string }> = []

  for (const [normalized, value] of normalizedValues) {
    aliases.push({ phrase: normalized, value })
  }
  for (const [value, phrases] of Object.entries(extraAliases)) {
    if (!values.includes(value)) continue
    for (const phrase of phrases) aliases.push({ phrase: normalizeValue(phrase), value })
  }

  aliases.sort((a, b) => b.phrase.length - a.phrase.length || a.phrase.localeCompare(b.phrase))
  for (const alias of aliases) {
    const regex = new RegExp(`\\b${escapeRegExp(alias.phrase).replace(/\\ /g, '\\s+')}\\b`, 'gi')
    working = blankMatches(working, regex, (matched) => setFilter(result, key, alias.value, matched.trim()))
  }
  return working
}

export function translateNaturalLanguageFilters(
  input: string,
  facets: NaturalFilterFacets,
): NaturalFilterTranslation {
  const result: MutableTranslation = {
    version: '1.0.0',
    input,
    filters: {},
    recognized: [],
    unresolved: [],
    conflicts: [],
    unsupported: [],
  }

  let working = input.toLowerCase().replace(/[“”"']/g, ' ').replace(/[,:;!?()]+/g, ' ')

  for (const pattern of UNSUPPORTED_PATTERNS) {
    working = blankMatches(working, pattern.regex, (matched) => {
      result.unsupported.push(pattern.label)
      result.recognized.push(matched.trim())
    })
  }

  const yearRangePatterns: Array<{ regex: RegExp; apply: (a: number, b?: number) => void }> = [
    {
      regex: /\bbetween\s+(\d{4})\s+and\s+(\d{4})\b/gi,
      apply: (a, b) => {
        if (!validYear(a) || b === undefined || !validYear(b)) return result.conflicts.push('launch range contains an unsupported year')
        setFilter(result, 'launchFrom', String(a), `between ${a} and ${b}`)
        setFilter(result, 'launchTo', String(b), `between ${a} and ${b}`)
      },
    },
    {
      regex: /\bfrom\s+(\d{4})\s+to\s+(\d{4})\b/gi,
      apply: (a, b) => {
        if (!validYear(a) || b === undefined || !validYear(b)) return result.conflicts.push('launch range contains an unsupported year')
        setFilter(result, 'launchFrom', String(a), `from ${a} to ${b}`)
        setFilter(result, 'launchTo', String(b), `from ${a} to ${b}`)
      },
    },
    {
      regex: /\b(\d{4})\s*[-–]\s*(\d{4})\b/gi,
      apply: (a, b) => {
        if (!validYear(a) || b === undefined || !validYear(b)) return result.conflicts.push('launch range contains an unsupported year')
        setFilter(result, 'launchFrom', String(a), `${a}-${b}`)
        setFilter(result, 'launchTo', String(b), `${a}-${b}`)
      },
    },
  ]

  for (const pattern of yearRangePatterns) {
    working = blankMatches(working, pattern.regex, (matched, match) => {
      result.recognized.push(matched.trim())
      pattern.apply(Number(match[1]), match[2] ? Number(match[2]) : undefined)
    })
  }

  const singleYearPatterns: Array<{ regex: RegExp; key: 'launchFrom' | 'launchTo'; offset: number }> = [
    { regex: /\b(?:launched\s+)?before\s+(\d{4})\b/gi, key: 'launchTo', offset: -1 },
    { regex: /\b(?:launched\s+)?after\s+(\d{4})\b/gi, key: 'launchFrom', offset: 1 },
    { regex: /\b(?:launched\s+)?(?:through|until)\s+(\d{4})\b/gi, key: 'launchTo', offset: 0 },
    { regex: /\b(?:launched\s+)?since\s+(\d{4})\b/gi, key: 'launchFrom', offset: 0 },
    { regex: /\bfrom\s+(\d{4})\b/gi, key: 'launchFrom', offset: 0 },
  ]

  for (const pattern of singleYearPatterns) {
    working = blankMatches(working, pattern.regex, (matched, match) => {
      const rawYear = Number(match[1])
      const year = rawYear + pattern.offset
      result.recognized.push(matched.trim())
      if (!validYear(rawYear) || !validYear(year)) {
        result.conflicts.push(`unsupported launch year: ${rawYear}`)
        return
      }
      setFilter(result, pattern.key, String(year), matched.trim())
    })
  }

  const phraseFilters: Array<{ regex: RegExp; key: FilterKey; value: string }> = [
    { regex: /\b(?:with\s+)?reviewed\s+incident\s+history\b/gi, key: 'securityHistory', value: 'recorded' },
    { regex: /\bwith\s+reviewed\s+incidents?\b/gi, key: 'securityHistory', value: 'recorded' },
    { regex: /\bwith\s+incident\s+history\b/gi, key: 'securityHistory', value: 'recorded' },
    { regex: /\bno\s+reviewed\s+incident\s+recorded\b/gi, key: 'securityHistory', value: 'not_recorded' },
    { regex: /\bwithout\s+reviewed\s+incident\s+records?\b/gi, key: 'securityHistory', value: 'not_recorded' },
    { regex: /\bwith\s+recorded\s+remediation\b/gi, key: 'remediationHistory', value: 'recorded' },
    { regex: /\bwith\s+reviewed\s+fix(?:es)?\b/gi, key: 'remediationHistory', value: 'recorded' },
    { regex: /\brecorded\s+fix\s+(?:or|\/)\s+remediation\b/gi, key: 'remediationHistory', value: 'recorded' },
    { regex: /\bno\s+reviewed\s+fix\s+recorded\b/gi, key: 'remediationHistory', value: 'not_recorded' },
    { regex: /\bno\s+reviewed\s+remediation\s+recorded\b/gi, key: 'remediationHistory', value: 'not_recorded' },
    { regex: /\bwith\s+recorded\s+(?:eol|end\s+of\s+life)\b/gi, key: 'eolHistory', value: 'recorded' },
    { regex: /\bwith\s+deprecation\s+history\b/gi, key: 'eolHistory', value: 'recorded' },
    { regex: /\brecorded\s+(?:eol|end\s+of\s+life)\s+(?:or|\/)\s+deprecation\b/gi, key: 'eolHistory', value: 'recorded' },
    { regex: /\bno\s+reviewed\s+(?:eol|end\s+of\s+life)\s+recorded\b/gi, key: 'eolHistory', value: 'not_recorded' },
    { regex: /\bmost\s+incidents\b/gi, key: 'sort', value: 'incidents' },
    { regex: /\bmost\s+products\b/gi, key: 'sort', value: 'products' },
    { regex: /\b(?:recently\s+verified|newest\s+verification)\b/gi, key: 'sort', value: 'verified' },
    { regex: /\b(?:alphabetical|by\s+name)\b/gi, key: 'sort', value: 'name' },
  ]

  for (const pattern of phraseFilters) {
    working = blankMatches(working, pattern.regex, (matched) => setFilter(result, pattern.key, pattern.value, matched.trim()))
  }

  working = mapDynamicFacet(
    working,
    result,
    facets.walletTypes,
    'walletType',
    {
      hardware: ['hardware wallet', 'hardware wallets'],
      software: ['software wallet', 'software wallets'],
      smart_contract: ['smart contract wallet', 'smart contract wallets', 'smart account', 'smart accounts'],
    },
  )

  const custodyValues = facets.custodyModels.filter((value) => value !== '__not_recorded__')
  working = mapDynamicFacet(working, result, custodyValues, 'custodyModel')
  if (facets.custodyModels.includes('__not_recorded__')) {
    working = blankMatches(working, /\b(?:custody|key\s+model)\s+not\s+recorded\b/gi, (matched) => {
      setFilter(result, 'custodyModel', '__not_recorded__', matched.trim())
    })
  }

  working = mapDynamicFacet(working, result, facets.statuses, 'status')

  addYearRangeConflict(result)

  const unresolvedTokens = working
    .replace(/[-–/]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !FILLER_WORDS.has(token))

  result.recognized = unique(result.recognized.map((item) => item.trim()).filter(Boolean))
  result.unsupported = unique(result.unsupported)
  result.conflicts = unique(result.conflicts)
  result.unresolved = unique(unresolvedTokens)
  result.applicable =
    Object.keys(result.filters).length > 0 &&
    result.unresolved.length === 0 &&
    result.conflicts.length === 0 &&
    result.unsupported.length === 0

  return result as NaturalFilterTranslation
}
