import { describe, expect, it } from 'vitest'
import { onRequestPost } from './analytics'

const request = (headers: HeadersInit) => new Request('https://example.test/api/analytics', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0', ...headers },
  body: JSON.stringify({ kind: 'page_view', route: '/' }),
})

describe('Cloudflare analytics protection', () => {
  it('requires a same-origin browser request', async () => {
    const response = await onRequestPost({
      request: request({}),
      env: {},
      waitUntil: () => undefined,
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('rejects a request when the per-IP rate limit is exhausted', async () => {
    const response = await onRequestPost({
      request: request({ origin: 'https://example.test', 'cf-connecting-ip': '203.0.113.10' }),
      env: {
        ANALYTICS_KV: { get: async () => '60' } as unknown as KVNamespace,
        ANALYTICS_HASH_SECRET: 'a-secure-test-secret-that-is-longer-than-32-characters',
      },
      waitUntil: () => undefined,
    })
    expect(response.status).toBe(429)
  })
})
