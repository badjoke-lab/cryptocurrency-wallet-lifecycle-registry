import fs from 'node:fs'
import process from 'node:process'

const CONFIG_PATH = 'config/cloudflare-pages-project.json'
const API_BASE = 'https://api.cloudflare.com/client/v4'
const VALID_MODES = new Set(['print', 'plan', 'apply'])
const GITHUB_SOURCE = {
  owner: 'badjoke-lab',
  owner_id: '227710934',
  repo_name: 'cryptocurrency-wallet-lifecycle-registry',
  repo_id: '1333853655',
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function parseMode(argv) {
  const raw = argv.find((arg) => arg.startsWith('--')) ?? '--print'
  const mode = raw.slice(2)
  if (!VALID_MODES.has(mode)) {
    fail(`Unsupported mode: ${mode}. Use --print, --plan, or --apply.`)
  }
  return mode
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) fail(`Missing ${CONFIG_PATH}`)
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

  if (parsed.schema_version !== '1.0.0') fail('Unsupported Cloudflare policy schema_version.')
  if (!parsed.project_name) fail('Cloudflare policy requires project_name.')
  if (!parsed.production_branch) fail('Cloudflare policy requires production_branch.')
  if (!parsed.build_config || typeof parsed.build_config !== 'object') fail('Cloudflare policy requires build_config.')
  if (!parsed.source_config || typeof parsed.source_config !== 'object') fail('Cloudflare policy requires source_config.')
  if (parsed.source_config.preview_deployment_setting !== 'none') fail('WLR policy requires preview_deployment_setting to be none.')
  if (parsed.source_config.production_deployments_enabled !== true) fail('WLR policy requires production_deployments_enabled to be true.')
  if (!Array.isArray(parsed.custom_domains)) fail('Cloudflare policy requires custom_domains array.')

  return parsed
}

async function cloudflareRequest(path, init = {}, options = {}) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    fail('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for plan/apply modes.')
  }

  const response = await fetch(`${API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const body = await response.json().catch(() => null)
  if (options.allowNotFound && response.status === 404) return null

  if (!response.ok || !body?.success) {
    const details = body?.errors?.map((error) => `${error.code}: ${error.message}`).join('; ')
    fail(`Cloudflare API request failed (${response.status}): ${details || 'unknown error'}`)
  }

  return body.result
}

function selectedState(project, domains = []) {
  const source = project?.source
  const config = source?.config ?? {}
  const build = project?.build_config ?? {}
  return {
    project_name: project?.name ?? null,
    production_branch: project?.production_branch ?? null,
    source_type: source?.type ?? null,
    build_config: {
      build_command: build.build_command ?? '',
      destination_dir: build.destination_dir ?? '',
      root_dir: build.root_dir ?? '',
    },
    production_deployments_enabled: config.production_deployments_enabled ?? null,
    preview_deployment_setting: config.preview_deployment_setting ?? null,
    pr_comments_enabled: config.pr_comments_enabled ?? null,
    path_includes: config.path_includes ?? [],
    path_excludes: config.path_excludes ?? [],
    custom_domains: domains.map((domain) => domain.name ?? domain).sort(),
  }
}

function desiredState(policy) {
  return {
    project_name: policy.project_name,
    production_branch: policy.production_branch,
    source_type: 'github',
    build_config: policy.build_config,
    production_deployments_enabled: policy.source_config.production_deployments_enabled,
    preview_deployment_setting: policy.source_config.preview_deployment_setting,
    pr_comments_enabled: policy.source_config.pr_comments_enabled,
    path_includes: policy.source_config.path_includes,
    path_excludes: policy.source_config.path_excludes,
    custom_domains: [...policy.custom_domains].sort(),
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

function stable(value) {
  return JSON.stringify(canonicalize(value), null, 2)
}

function sourceConfig(policy) {
  return {
    deployments_enabled: true,
    owner: GITHUB_SOURCE.owner,
    owner_id: GITHUB_SOURCE.owner_id,
    repo_name: GITHUB_SOURCE.repo_name,
    repo_id: GITHUB_SOURCE.repo_id,
    production_branch: policy.production_branch,
    production_deployments_enabled: policy.source_config.production_deployments_enabled,
    preview_deployment_setting: policy.source_config.preview_deployment_setting,
    pr_comments_enabled: policy.source_config.pr_comments_enabled,
    path_includes: policy.source_config.path_includes,
    path_excludes: policy.source_config.path_excludes,
    preview_branch_includes: [],
    preview_branch_excludes: [],
  }
}

function buildCreatePayload(policy) {
  return {
    name: policy.project_name,
    production_branch: policy.production_branch,
    build_config: policy.build_config,
    source: {
      type: 'github',
      config: sourceConfig(policy),
    },
  }
}

function buildPatch(currentProject, policy) {
  const source = currentProject?.source
  if (!source || source.type !== 'github') {
    fail('The existing Pages project must use GitHub source integration.')
  }

  return {
    production_branch: policy.production_branch,
    build_config: {
      ...currentProject.build_config,
      ...policy.build_config,
    },
    source: {
      type: source.type,
      config: {
        ...source.config,
        ...sourceConfig(policy),
      },
    },
  }
}

async function getDomains(projectName) {
  return cloudflareRequest(`/pages/projects/${encodeURIComponent(projectName)}/domains`)
}

async function ensureDomains(policy, currentDomains) {
  const present = new Set(currentDomains.map((domain) => domain.name ?? domain))
  for (const domain of policy.custom_domains) {
    if (present.has(domain)) continue
    console.log(`Attaching custom domain ${domain}...`)
    await cloudflareRequest(`/pages/projects/${encodeURIComponent(policy.project_name)}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
  }
}

const mode = parseMode(process.argv.slice(2))
const policy = readConfig()

if (mode === 'print') {
  console.log(JSON.stringify(desiredState(policy), null, 2))
  process.exit(0)
}

const projectPath = `/pages/projects/${encodeURIComponent(policy.project_name)}`
let current = await cloudflareRequest(projectPath, {}, { allowNotFound: true })
const desiredSelected = desiredState(policy)

if (!current) {
  console.log(`Cloudflare Pages project ${policy.project_name} does not exist.`)
  console.log('Desired selected Cloudflare Pages state:')
  console.log(JSON.stringify(desiredSelected, null, 2))

  if (mode === 'plan') {
    console.log('Apply mode will create a GitHub-integrated Pages project, apply policy, attach domains, and verify.')
    process.exit(0)
  }

  console.log('Creating GitHub-integrated Cloudflare Pages project...')
  await cloudflareRequest('/pages/projects', {
    method: 'POST',
    body: JSON.stringify(buildCreatePayload(policy)),
  })
  current = await cloudflareRequest(projectPath)
}

let currentDomains = await getDomains(policy.project_name)
let currentSelected = selectedState(current, currentDomains)

console.log('Current selected Cloudflare Pages state:')
console.log(JSON.stringify(currentSelected, null, 2))
console.log('Desired selected Cloudflare Pages state:')
console.log(JSON.stringify(desiredSelected, null, 2))

if (stable(currentSelected) === stable(desiredSelected)) {
  console.log('Cloudflare Pages project already matches repository policy.')
  process.exit(0)
}

if (mode === 'plan') {
  console.log('Configuration differs. Re-run with --apply to update the project.')
  process.exit(0)
}

const patch = buildPatch(current, policy)
await cloudflareRequest(projectPath, {
  method: 'PATCH',
  body: JSON.stringify(patch),
})
await ensureDomains(policy, currentDomains)

const verified = await cloudflareRequest(projectPath)
const verifiedDomains = await getDomains(policy.project_name)
const verifiedSelected = selectedState(verified, verifiedDomains)

console.log('Verified selected Cloudflare Pages state:')
console.log(JSON.stringify(verifiedSelected, null, 2))

if (stable(verifiedSelected) !== stable(desiredSelected)) {
  fail('Cloudflare Pages configuration verification failed after apply.')
}

console.log('Cloudflare Pages project configuration applied and verified.')
