import { describe, expect, it } from 'vitest'
import { dailyVisitorId, deviceCategory, koreanDate, previousKoreanDate, safeRoute, visitorAlertKey } from './analytics.mts'

describe('server analytics privacy helpers', () => {
  it('creates a stable ID only for the same date', () => {
    const secret = 'a-secure-test-secret-that-is-longer-than-32-characters'
    const today = dailyVisitorId('203.0.113.10', secret, '2026-08-09')
    expect(today).toBe(dailyVisitorId('203.0.113.10', secret, '2026-08-09'))
    expect(today).not.toBe(dailyVisitorId('203.0.113.10', secret, '2026-08-10'))
    expect(today).not.toContain('203.0.113.10')
  })

  it('uses Korean calendar dates for collection and reports', () => {
    const beforeMidnightUtc = new Date('2026-08-08T15:10:00.000Z')
    expect(koreanDate(beforeMidnightUtc)).toBe('2026-08-09')
    expect(previousKoreanDate(beforeMidnightUtc)).toBe('2026-08-08')
  })

  it('scopes new visitor alert markers to one visitor and one day', () => {
    expect(visitorAlertKey('2026-08-09', 'visitor-a')).toBe('alerts/new-visitor/2026-08-09/visitor-a')
    expect(visitorAlertKey('2026-08-10', 'visitor-a')).not.toBe(visitorAlertKey('2026-08-09', 'visitor-a'))
  })

  it('allows known routes and reduces device information', () => {
    expect(safeRoute('/pdf-merge/')).toBe('/pdf-merge')
    expect(safeRoute('/admin/private')).toBe('/')
    expect(deviceCategory('Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile')).toBe('모바일')
    expect(deviceCategory('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('PC')
  })
})
