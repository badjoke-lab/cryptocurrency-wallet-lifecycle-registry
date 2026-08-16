import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { collectTargets, OUTCOME_CATEGORIES } from './lifecycle-monitoring-core.mjs'

const root = process.cwd()
const policyPath = path.join(root, 'config/lifecycle-monitoring.json')
const entitiesPath = path.join(root, 'data/entities.json')
const productsPath = path.join(root, 'data/products.json')
const canonicalPaths = [
  entitiesPath,
  productsPath,
  path.join(root, 'data/events.json'),
  path.join(root, 'data/evidence.json'),
]

const [policy, entities, products] = await Promise.all([
  readJson(policyPath),
  readJson(entitiesPath),
  readJson(productsPath),
])

validatePolicy(policy)
const extracted = collectTargets(entities, products, policy)
assert.ok(extracted.total_valid_targets > 0, 'expected at least one canonical official URL target')
assert.ok(extracted.targets.length <= policy.network.max_targets_per_run, 'target cap must be enforced')
assert.equal(new Set(extracted.targets.map((item) => item.target_id)).size, extracted.targets.length, 'target IDs must be unique')
assert.ok(extracted.targets.every((item) => ['entity', 'product'].includes(item.record_kind)))
assert.ok(extracted.targets.every((item) => policy.target_fields[item.record_kind].includes(item.field)))

const beforeHashes = await hashFiles(canonicalPaths)
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wlr-monitoring-'))
try {
  const result = spawnSync(process.execPath, [
    'scripts/run-lifecycle-monitoring.mjs',
    '--no-network',
    '--now', '2026-08-17T00:00:00.000Z',
    '--out-dir', tempDir,
    '--source-commit', 'validator-fixture',
  ], { cwd: root, encoding: 'utf8' })

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    throw new Error(`no-network lifecycle monitoring runner failed with status ${result.status}`)
  }

  const expectedFiles = ['monitoring-report.json', 'monitoring-state.json', 'review-queue.json', 'monitoring-summary.md']
  const written = (await fs.readdir(tempDir)).sort()
  assert.deepEqual(written, [...expectedFiles].sort(), 'runner must emit only the expected artifact files')

  const [report, state, queue] = await Promise.all([
    readJson(path.join(tempDir, 'monitoring-report.json')),
    readJson(path.join(tempDir, 'monitoring-state.json')),
    readJson(path.join(tempDir, 'review-queue.json')),
  ])

  assert.equal(report.schema, policy.output.schema_version)
  assert.equal(report.run_mode, 'no_network')
  assert.equal(report.source_commit, 'validator-fixture')
  assert.equal(report.canonical_counts.entities, entities.length)
  assert.equal(report.canonical_counts.products, products.length)
  assert.equal(report.targets.valid_total, extracted.total_valid_targets)
  assert.equal(report.targets.checked, 0)
  assert.equal(state.schema, policy.output.schema_version)
  assert.equal(state.run_mode, 'no_network')
  assert.ok(Array.isArray(state.observations))
  assert.equal(queue.schema, policy.output.schema_version)
  assert.ok(Array.isArray(queue.items))
  assert.ok(queue.items.every((item) => item.recommended_action === 'research_before_canonical_change'))
  assert.ok(state.observations.every((item) => OUTCOME_CATEGORIES.has(item.outcome)))

  const serialized = JSON.stringify({ report, state, queue }).toLowerCase()
  for (const forbiddenKey of ['"body"', '"headers"', '"cookie"', '"authorization"']) {
    assert.equal(serialized.includes(forbiddenKey), false, `monitoring artifacts must not persist ${forbiddenKey}`)
  }
  for (const forbiddenConclusion of ['mark_dead', 'mark_unsupported', 'mark_patched', 'downgrade_security']) {
    assert.equal(serialized.includes(forbiddenConclusion), false, `monitoring artifacts must not contain automatic canonical conclusion ${forbiddenConclusion}`)
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true })
}

const afterHashes = await hashFiles(canonicalPaths)
assert.deepEqual(afterHashes, beforeHashes, 'monitoring validation must not mutate canonical data')

const workflow = await fs.readFile(path.join(root, '.github/workflows/monitor-lifecycle.yml'), 'utf8')
for (const required of ['schedule:', 'workflow_dispatch:', 'contents: read', 'actions: read', 'scripts/run-lifecycle-monitoring.mjs', 'actions/upload-artifact@v4']) {
  assert.ok(workflow.includes(required), `monitoring workflow missing required token: ${required}`)
}
for (const forbidden of ['contents: write', 'pull-requests: write', 'data/entities.json >', 'data/products.json >']) {
  assert.equal(workflow.includes(forbidden), false, `monitoring workflow contains prohibited write behavior: ${forbidden}`)
}

console.log(`Lifecycle monitoring validation passed: ${entities.length} entities, ${products.length} products, ${extracted.total_valid_targets} official URL targets`)

function validatePolicy(value) {
  assert.equal(value.schema, 'wlr.lifecycle-monitoring-policy.v1')
  assert.match(value.policy_version, /^\d+\.\d+\.\d+$/)
  assert.equal(value.schedule, 'weekly')
  assert.ok(Number.isInteger(value.reverification.review_due_days) && value.reverification.review_due_days > 0)
  assert.ok(Number.isInteger(value.reverification.review_overdue_days) && value.reverification.review_overdue_days > value.reverification.review_due_days)
  assert.ok(Number.isInteger(value.network.timeout_ms) && value.network.timeout_ms >= 1000 && value.network.timeout_ms <= 30000)
  assert.ok(Number.isInteger(value.network.max_redirects) && value.network.max_redirects >= 0 && value.network.max_redirects <= 10)
  assert.ok(Number.isInteger(value.network.max_targets_per_run) && value.network.max_targets_per_run >= 1 && value.network.max_targets_per_run <= 500)
  assert.ok(Number.isInteger(value.network.concurrency) && value.network.concurrency >= 1 && value.network.concurrency <= 10)
  assert.deepEqual(value.network.accepted_schemes, ['https:', 'http:'])
  assert.deepEqual(value.target_fields.entity, ['official_url'])
  assert.deepEqual(value.target_fields.product, ['official_url'])
  assert.equal(value.output.schema_version, 'wlr.lifecycle-monitoring.v1')
  assert.equal(value.output.artifact_name, 'wlr-lifecycle-monitoring')
  assert.ok(Number.isInteger(value.output.retention_days) && value.output.retention_days >= 1 && value.output.retention_days <= 90)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function hashFiles(paths) {
  const result = {}
  for (const filePath of paths) {
    const content = await fs.readFile(filePath)
    result[path.relative(root, filePath)] = crypto.createHash('sha256').update(content).digest('hex')
  }
  return result
}
