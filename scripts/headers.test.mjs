import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `public/_headers` is the only place the production CSP lives, and a missing
 * origin there silently breaks a feature in production instead of at build
 * time (AdSense, and now the Cloudflare Pages Web Analytics beacon).
 */
const headersFile = readFileSync(join(import.meta.dirname, '..', 'public', '_headers'), 'utf8')
const cspLine = headersFile.split('\n').find((line) => line.trim().startsWith('Content-Security-Policy:'))
const directives = new Map(
  (cspLine ?? '')
    .replace(/^\s*Content-Security-Policy:/, '')
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...values] = directive.split(/\s+/)
      return [name, values]
    }),
)

describe('public/_headers CSP', () => {
  it('is present and locks down the default and framing sources', () => {
    expect(cspLine).toBeTruthy()
    expect(directives.get('default-src')).toEqual(["'self'"])
    expect(directives.get('frame-ancestors')).toEqual(["'none'"])
    expect(directives.get('object-src')).toEqual(["'none'"])
  })

  it('allows the Cloudflare Web Analytics beacon script and collection endpoint', () => {
    expect(directives.get('script-src')).toContain('https://static.cloudflareinsights.com')
    expect(directives.get('connect-src')).toContain('https://cloudflareinsights.com')
  })

  it('allows the AdSense loader without opening script-src to inline code', () => {
    expect(directives.get('script-src')).toContain('https://pagead2.googlesyndication.com')
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'")
  })
})
