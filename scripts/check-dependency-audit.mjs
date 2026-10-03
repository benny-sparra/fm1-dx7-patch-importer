import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Each entry needs the maintainer's approval and must be a development-only advisory with no
// patched release. It stops matching, and the audit fails, when the advisory's range changes, the
// package publishes a version after `checkedLatestVersion`, or the review date passes. Remove the
// entry once a fix ships, then run `npm run lockfile:refresh`.
export const auditAllowlist = [
  {
    advisory: 'GHSA-vfj7-8cjw-p6xm',
    packageName: 'braces',
    range: '<=3.0.3',
    checkedLatestVersion: '3.0.3',
    reviewBy: '2027-01-03',
    reason:
      'Stack exhaustion from deeply nested brace patterns. Reached only through stylelint -> ' +
      'globby/fast-glob -> micromatch, which expands the CSS globs written in package.json.',
  },
]

const blockingSeverities = new Set(['high', 'critical'])

function advisoryId(url) {
  return url.split('/').at(-1)
}

/** Lists the advisories an `npm audit --json` report traces its vulnerabilities to. */
export function reportedAdvisories(report) {
  if (report?.error || typeof report?.vulnerabilities !== 'object') {
    throw new Error('npm audit did not return a report. A registry failure is a failed audit.')
  }
  const advisories = new Map()
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const via of vulnerability.via) {
      if (typeof via === 'string') continue
      advisories.set(advisoryId(via.url), {
        advisory: advisoryId(via.url),
        packageName: via.name,
        range: via.range,
        severity: via.severity,
        title: via.title,
      })
    }
  }
  return [...advisories.values()]
}

/**
 * Compares the full and production audit reports with the allowlist and returns every reason the
 * audit fails. Packages flagged only through another package's advisory need no entry of their own.
 */
export function auditFailures({ report, productionReport, latestVersions, today, allowlist }) {
  const failures = []
  const reported = reportedAdvisories(report)
  const production = new Set(reportedAdvisories(productionReport).map((found) => found.advisory))

  for (const found of reported) {
    if (!blockingSeverities.has(found.severity)) continue
    const entry = allowlist.find((allowed) => allowed.advisory === found.advisory)
    if (!entry) {
      failures.push(`${found.advisory} (${found.packageName} ${found.range}): ${found.title}`)
    } else if (entry.packageName !== found.packageName || entry.range !== found.range) {
      failures.push(
        `${found.advisory} now reports ${found.packageName} ${found.range}; the allowlist entry ` +
          `covers ${entry.packageName} ${entry.range}. Check for a fix before renewing it.`,
      )
    }
  }

  for (const entry of allowlist) {
    if (!reported.some((found) => found.advisory === entry.advisory)) {
      failures.push(`${entry.advisory} is no longer reported. Remove its allowlist entry.`)
      continue
    }
    if (production.has(entry.advisory)) {
      failures.push(`${entry.advisory} reaches production dependencies, so it cannot be allowed.`)
    }
    if (entry.reviewBy < today) {
      failures.push(`${entry.advisory} was due for review on ${entry.reviewBy}.`)
    }
    const latest = latestVersions.get(entry.packageName)
    if (latest !== entry.checkedLatestVersion) {
      failures.push(
        `${entry.packageName} ${latest} is published after ${entry.checkedLatestVersion}. ` +
          `Run npm run lockfile:refresh and remove the ${entry.advisory} entry if it is fixed.`,
      )
    }
  }
  return failures
}

const run = promisify(execFile)

async function npmJson(args) {
  try {
    const { stdout } = await run('npm', [...args, '--json'], { maxBuffer: 64 * 1024 * 1024 })
    return JSON.parse(stdout)
  } catch (error) {
    // npm audit exits non-zero whenever it reports a vulnerability, with the report on stdout.
    if (typeof error.stdout === 'string' && error.stdout.trim()) return JSON.parse(error.stdout)
    throw error
  }
}

async function main() {
  const [report, productionReport, ...versions] = await Promise.all([
    npmJson(['audit']),
    npmJson(['audit', '--omit=dev']),
    ...auditAllowlist.map((entry) => npmJson(['view', entry.packageName, 'version'])),
  ])
  const latestVersions = new Map(
    auditAllowlist.map((entry, index) => [entry.packageName, versions[index]]),
  )
  const failures = auditFailures({
    report,
    productionReport,
    latestVersions,
    today: new Date().toISOString().slice(0, 10),
    allowlist: auditAllowlist,
  })

  if (failures.length > 0) {
    console.error('Dependency audit failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }
  const allowed = auditAllowlist.map((entry) => entry.advisory).join(', ') || 'empty'
  console.log(`No high or critical advisories outside the allowlist (${allowed}).`)
}

if (import.meta.main) await main()
