import { describe, expect, it } from 'vitest'
import { isFreshTimestamp, readLimitedBody } from './request'

const streamedRequest = (body: string) => new Request('https://example.test/api', {
  method: 'POST',
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  }),
  duplex: 'half',
} as RequestInit)

describe('Cloudflare request limits', () => {
  it('rejects streamed bodies that exceed the byte limit', async () => {
    await expect(readLimitedBody(streamedRequest('12345'), 4)).resolves.toBeNull()
  })

  it('accepts only recent integer Unix timestamps', () => {
    const now = Date.parse('2026-08-28T00:00:00.000Z')
    expect(isFreshTimestamp('1787875200', 300, now)).toBe(true)
    expect(isFreshTimestamp('1787874899', 300, now)).toBe(false)
    expect(isFreshTimestamp('invalid', 300, now)).toBe(false)
  })
})
