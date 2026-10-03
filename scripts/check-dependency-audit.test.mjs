import { describe, expect, it } from 'vitest'

import { auditFailures, auditAllowlist, reportedAdvisories } from './check-dependency-audit.mjs'

const bracesUrl = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'

function bracesAdvisory(overrides = {}) {
  return {
    source: 1240992,
    name: 'braces',
    dependency: 'braces',
    title: 'braces vulnerable to stack-exhaustion denial of service through deeply nested patterns',
    url: bracesUrl,
    severity: 'high',
    range: '<=3.0.3',
    ...overrides,
  }
}

// Trimmed from `npm audit --json` as it reported the stylelint chain on 2026-10-03.
function bracesReport(advisory = bracesAdvisory()) {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      braces: { name: 'braces', severity: advisory.severity, via: [advisory] },
      micromatch: { name: 'micromatch', severity: advisory.severity, via: ['braces'] },
      'fast-glob': { name: 'fast-glob', severity: advisory.severity, via: ['micromatch'] },
      globby: { name: 'globby', severity: advisory.severity, via: ['fast-glob', 'micromatch'] },
      stylelint: {
        name: 'stylelint',
        severity: advisory.severity,
        via: ['fast-glob', 'globby', 'micromatch'],
      },
    },
  }
}

const emptyReport = { auditReportVersion: 2, vulnerabilities: {} }

const bracesEntry = {
  advisory: 'GHSA-vfj7-8cjw-p6xm',
  packageName: 'braces',
  range: '<=3.0.3',
  checkedLatestVersion: '3.0.3',
  reviewBy: '2027-01-03',
  reason: 'Development-only glob expansion.',
}

function failuresFor(overrides = {}) {
  return auditFailures({
    report: bracesReport(),
    productionReport: emptyReport,
    latestVersions: new Map([['braces', '3.0.3']]),
    today: '2026-10-03',
    allowlist: [bracesEntry],
    ...overrides,
  })
}

describe('reportedAdvisories', () => {
  it('traces a dependency chain to the one advisory at its root', () => {
    expect(reportedAdvisories(bracesReport())).toEqual([
      {
        advisory: 'GHSA-vfj7-8cjw-p6xm',
        packageName: 'braces',
        range: '<=3.0.3',
        severity: 'high',
        title: bracesAdvisory().title,
      },
    ])
  })

  it('treats a registry error as a failed audit', () => {
    expect(() => reportedAdvisories({ error: { code: 'ENOTFOUND' } })).toThrow(/failed audit/)
  })
})

describe('auditFailures', () => {
  it('passes an allowlisted advisory and the packages that depend on it', () => {
    expect(failuresFor()).toEqual([])
  })

  it('fails on a high advisory that is not allowlisted', () => {
    expect(failuresFor({ allowlist: [] })).toEqual([
      expect.stringContaining('GHSA-vfj7-8cjw-p6xm (braces <=3.0.3)'),
    ])
  })

  it('ignores advisories below high severity', () => {
    const report = bracesReport(bracesAdvisory({ severity: 'moderate' }))
    expect(failuresFor({ report, allowlist: [] })).toEqual([])
  })

  it('fails when the advisory range changes', () => {
    const report = bracesReport(bracesAdvisory({ range: '<3.0.5' }))
    expect(failuresFor({ report })).toEqual([expect.stringContaining('now reports braces <3.0.5')])
  })

  it('fails when the package publishes a newer version', () => {
    const latestVersions = new Map([['braces', '3.0.4']])
    expect(failuresFor({ latestVersions })).toEqual([
      expect.stringContaining('braces 3.0.4 is published after 3.0.3'),
    ])
  })

  it('fails after the review date', () => {
    expect(failuresFor({ today: '2027-01-04' })).toEqual([
      expect.stringContaining('due for review on 2027-01-03'),
    ])
  })

  it('fails when the advisory reaches production dependencies', () => {
    expect(failuresFor({ productionReport: bracesReport() })).toEqual([
      expect.stringContaining('reaches production dependencies'),
    ])
  })

  it('fails when an allowlisted advisory is no longer reported', () => {
    expect(failuresFor({ report: emptyReport })).toEqual([
      expect.stringContaining('no longer reported'),
    ])
  })
})

describe('auditAllowlist', () => {
  it('records every field an entry needs', () => {
    for (const entry of auditAllowlist) {
      expect(entry).toEqual({
        advisory: expect.stringMatching(/^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/),
        packageName: expect.any(String),
        range: expect.any(String),
        checkedLatestVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        reviewBy: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        reason: expect.any(String),
      })
    }
  })
})
