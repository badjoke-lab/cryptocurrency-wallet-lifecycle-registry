import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  buildReverificationQueue,
  buildReviewQueue,
  collectTargets,
  compareMonitoringState,
  invalidTargetObservations,
  observeTargets,
  summarizeObservations,
  summarizeReverification,
} from './lifecycle-monitoring-core.mjs'

const args = parseArgs(process.argv.slice(2))
const repoRoot = process.cwd()
const outputDir = path.resolve(repoRoot, args['out-dir'] ?? 'monitoring-output')
assertSafeOutputDir(repoRoot, outputDir)

const now = args.now ? new Date(args.now).toISOString() : new Date().toISOString()
const noNetwork = Boolean(args['no-network'])
const sourceCommit = args['source-commit'] ?? process.env.GITHUB_SHA ?? null

const [policy, entities, products, previousState] = await Promise.all([
  readJson(path.join(repoRoot, 'config/lifecycle-monitoring.json')),
  readJson(path.join(repoRoot, 'data/entities.json')),
  readJson(path.join(repoRoot, 'data/products.json')),
  args['previous-state'] ? readJsonOptional(path.resolve(repoRoot, args['previous-state'])) : Promise.resolve(null),
])

const reverification = buildReverificationQueue(entities, products, now, policy)
const extracted = collectTargets(entities, products, policy)
const invalidObservations = invalidTargetObservations(extracted.invalid_targets, now)
const networkObservations = noNetwork ? [] : await observeTargets(extracted.targets, policy, now)
const observations = [...networkObservations, ...invalidObservations].sort((a, b) => a.target_id.localeCompare(b.target_id))
const comparison = noNetwork
  ? { baseline_initialized: previousState == null, changes: [], removed_targets: [] }
  : compareMonitoringState(observations, previousState)
const reviewQueue = buildReviewQueue(reverification, observations, comparison)

const report = {
  schema: policy.output.schema_version,
  run_mode: noNetwork ? 'no_network' : 'network',
  source_commit: sourceCommit,
  policy_version: policy.policy_version,
  started_at: now,
  finished_at: now,
  canonical_counts: { entities: entities.length, products: products.length },
  targets: {
    valid_total: extracted.total_valid_targets,
    checked: networkObservations.length,
    invalid: extracted.invalid_targets.length,
    truncated: extracted.truncated_targets.length,
    cap: policy.network.max_targets_per_run,
  },
  reverification_summary: summarizeReverification(reverification),
  observation_summary: summarizeObservations(observations),
  prior_state_available: previousState != null,
  baseline_initialized: comparison.baseline_initialized,
  changes: comparison.changes,
  removed_targets: comparison.removed_targets,
  review_queue_count: reviewQueue.length,
  errors: [],
}

const state = {
  schema: policy.output.schema_version,
  source_commit: sourceCommit,
  policy_version: policy.policy_version,
  observed_at: now,
  run_mode: report.run_mode,
  observations,
}

await fs.mkdir(outputDir, { recursive: true })
await Promise.all([
  writeJson(path.join(outputDir, 'monitoring-report.json'), report),
  writeJson(path.join(outputDir, 'monitoring-state.json'), state),
  writeJson(path.join(outputDir, 'review-queue.json'), { schema: policy.output.schema_version, generated_at: now, items: reviewQueue }),
  fs.writeFile(path.join(outputDir, 'monitoring-summary.md'), buildSummary(report, reviewQueue), 'utf8'),
])

console.log(`WLR lifecycle monitoring complete: mode=${report.run_mode} targets=${report.targets.checked}/${report.targets.valid_total} review_queue=${report.review_queue_count}`)

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    if (key === 'no-network') {
      parsed[key] = true
      continue
    }
    const value = argv[index + 1]
    if (value == null || value.startsWith('--')) throw new Error(`Missing value for --${key}`)
    parsed[key] = value
    index += 1
  }
  return parsed
}

function assertSafeOutputDir(root, outDir) {
  const relative = path.relative(root, outDir).replaceAll('\\', '/')
  if (relative.startsWith('..') || path.isAbsolute(relative)) return
  const prohibited = ['data', 'public', 'data-staging/candidates']
  if (prohibited.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) {
    throw new Error(`Monitoring output directory is prohibited: ${relative}`)
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readJsonOptional(filePath) {
  try {
    return await readJson(filePath)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function buildSummary(report, reviewQueue) {
  const lines = [
    '# WLR Lifecycle Monitoring Summary',
    '',
    `- Mode: ${report.run_mode}`,
    `- Source commit: ${report.source_commit ?? 'unknown'}`,
    `- Canonical scope: ${report.canonical_counts.entities} entities / ${report.canonical_counts.products} products`,
    `- Official URL targets: ${report.targets.valid_total}`,
    `- Network observations: ${report.targets.checked}`,
    `- Invalid canonical targets: ${report.targets.invalid}`,
    `- Truncated by cap: ${report.targets.truncated}`,
    `- Previous state available: ${report.prior_state_available}`,
    `- Baseline initialized: ${report.baseline_initialized}`,
    `- Review queue: ${report.review_queue_count}`,
    '',
    '## Reverification',
    '',
    ...Object.entries(report.reverification_summary).sort().map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Network outcomes',
    '',
    ...(Object.keys(report.observation_summary).length ? Object.entries(report.observation_summary).sort().map(([key, value]) => `- ${key}: ${value}`) : ['- Not checked in no-network mode.']),
    '',
    '## Review queue',
    '',
    ...(reviewQueue.length ? reviewQueue.slice(0, 100).map((item) => `- ${item.reason}: ${item.record_kind} ${item.id}${item.requested_url ? ` — ${item.requested_url}` : ''}`) : ['- No review signals generated.']),
    '',
    '> Monitoring signals are operational review inputs only. They are not canonical lifecycle, support, patch, safety, or security classifications.',
    '',
  ]
  return `${lines.join('\n')}\n`
}
