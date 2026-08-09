import { createHmac, randomUUID } from 'node:crypto'
import { getStore } from '@netlify/blobs'

export const ANALYTICS_STORE = 'privacy-safe-analytics'

export const allowedRoutes = new Set([
  '/', '/about', '/contact', '/guides', '/heic-to-jpg', '/hwp-to-pdf', '/image-compress',
  '/image-convert', '/images-to-pdf', '/legal', '/pdf-merge', '/pdf-page-numbers',
  '/pdf-rotate', '/pdf-split', '/pdf-to-jpg', '/privacy', '/support', '/terms',
])

export const allowedTools = new Set([
  'hwp-to-pdf', 'image-compress', 'image-convert', 'heic-to-jpg', 'images-to-pdf',
  'pdf-merge', 'pdf-split', 'pdf-rotate', 'pdf-to-jpg', 'pdf-page-numbers',
])

export const allowedKinds = new Set(['page_view', 'tool_start', 'tool_success', 'tool_error'])
export const allowedSizeBuckets = new Set(['10MB 이하', '10~50MB', '50~100MB', '100MB 초과'])
export const allowedCountBuckets = new Set(['1개', '2~5개', '6~10개', '11개 이상'])
export const allowedPageBuckets = new Set(['1~5쪽', '6~20쪽', '21~50쪽', '51쪽 이상'])
export const allowedFormats = new Set(['HWP', 'HWPX', 'PDF', 'JPG', 'PNG', 'WEBP', 'HEIC', 'IMAGE', 'ZIP'])

export interface StoredAnalyticsEvent {
  kind: string
  visitorId: string
  route: string
  tool?: string
  region: string
  country: string
  device: '모바일' | '태블릿' | 'PC' | '기타'
  sizeBucket?: string
  countBucket?: string
  pageBucket?: string
  inputFormat?: string
  outputFormat?: string
  responseMs?: number
  occurredAt: string
}

export const koreanDate = (date = new Date()) => new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

export const previousKoreanDate = (date = new Date()) => {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  shifted.setUTCDate(shifted.getUTCDate() - 1)
  return shifted.toISOString().slice(0, 10)
}

export const dateDaysAgo = (days: number, date = new Date()) => {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  shifted.setUTCDate(shifted.getUTCDate() - days)
  return shifted.toISOString().slice(0, 10)
}

export const dailyVisitorId = (ip: string, secret: string, date: string) =>
  createHmac('sha256', secret).update(`${date}:${ip}`).digest('hex').slice(0, 24)

export const maskIp = (ip: string) => {
  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean).slice(0, 2)
    return `${groups.join(':') || '****'}:****:****:****:****:****:****`
  }
  const octets = ip.split('.')
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.***.***`
  return '***.***.***.***'
}

export const deviceCategory = (userAgent: string): StoredAnalyticsEvent['device'] => {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return '태블릿'
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return '모바일'
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return 'PC'
  return '기타'
}

export const safeRoute = (value: unknown) => {
  if (typeof value !== 'string') return '/'
  const normalized = value !== '/' ? value.replace(/\/+$/, '') : value
  if (allowedRoutes.has(normalized) || /^\/guides\/[a-z0-9-]{1,64}$/.test(normalized)) return normalized
  return '/'
}

export const optionalAllowed = (value: unknown, allowed: Set<string>) =>
  typeof value === 'string' && allowed.has(value) ? value : undefined

export const storeEvent = async (date: string, event: StoredAnalyticsEvent) => {
  const store = getStore({ name: ANALYTICS_STORE, consistency: 'strong' })
  const key = `events/${date}/${Date.now()}-${randomUUID()}`
  await store.setJSON(key, event)
}

export const readEvents = async (date: string) => {
  const store = getStore({ name: ANALYTICS_STORE, consistency: 'strong' })
  const events: StoredAnalyticsEvent[] = []
  for await (const page of store.list({ prefix: `events/${date}/`, paginate: true })) {
    const values = await Promise.all(page.blobs.map((blob) => store.get(blob.key, { type: 'json', consistency: 'strong' })))
    for (const value of values) if (value && typeof value === 'object') events.push(value as StoredAnalyticsEvent)
  }
  return events
}

export const deleteEvents = async (date: string) => {
  const store = getStore({ name: ANALYTICS_STORE, consistency: 'strong' })
  for (const prefix of [`events/${date}/`, `alerts/new-visitor/${date}/`]) {
    for await (const page of store.list({ prefix, paginate: true })) {
      await Promise.all(page.blobs.map((blob) => store.delete(blob.key)))
    }
  }
}
