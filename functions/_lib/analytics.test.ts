import { describe, expect, it } from 'vitest'
import { dailyVisitorId, deviceCategory, koreanDate, maskIp, safeRoute } from './analytics'

describe('analytics privacy helpers', () => {
  it('creates a stable visitor ID only for the same date', async () => {
    const secret = 'a-secure-test-secret-that-is-longer-than-32-characters'
    const today = await dailyVisitorId('203.0.113.10', secret, '2026-08-09')
    expect(today).toBe(await dailyVisitorId('203.0.113.10', secret, '2026-08-09'))
    expect(today).not.toBe(await dailyVisitorId('203.0.113.10', secret, '2026-08-10'))
    expect(today).not.toBe(await dailyVisitorId('203.0.113.11', secret, '2026-08-09'))
    expect(today).toHaveLength(24)
    expect(today).not.toContain('203.0.113.10')
  })

  it('uses Korean calendar dates for collection and reports', () => {
    expect(koreanDate(new Date('2026-08-08T15:10:00.000Z'))).toBe('2026-08-09')
    expect(koreanDate(new Date('2026-08-08T14:59:59.000Z'))).toBe('2026-08-08')
  })

  it('masks IPv4 and IPv6 addresses before alert delivery', () => {
    expect(maskIp('203.0.113.10')).toBe('203.0.***.***')
    expect(maskIp('2001:db8:abcd:1234:5678:90ab:cdef:1')).toBe('2001:db8:****:****:****:****:****:****')
    expect(maskIp('not-an-address')).toBe('***.***.***.***')
  })

  it('allows known routes and reduces device information', () => {
    expect(safeRoute('/pdf-merge/')).toBe('/pdf-merge')
    expect(safeRoute('/guides/pdf-merge')).toBe('/guides/pdf-merge')
    expect(safeRoute('/admin/private')).toBe('/')
    expect(safeRoute(undefined)).toBe('/')
    expect(deviceCategory('Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile')).toBe('모바일')
    expect(deviceCategory('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('태블릿')
    expect(deviceCategory('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('PC')
  })
})
