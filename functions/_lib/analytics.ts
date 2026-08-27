export const ANALYTICS_TTL_SECONDS = 60 * 60 * 24 * 31
export const MAX_ANALYTICS_EVENTS_PER_READ = 10_000

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

export const safeRoute = (value: unknown) => {
  if (typeof value !== 'string') return '/'
  const normalized = value !== '/' ? value.replace(/\/+$/, '') : value
  if (allowedRoutes.has(normalized) || /^\/guides\/[a-z0-9-]{1,64}$/.test(normalized)) return normalized
  return '/'
}

export const optionalAllowed = (value: unknown, allowed: Set<string>) =>
  typeof value === 'string' && allowed.has(value) ? value : undefined

export const maskIp = (ip: string) => {
  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean).slice(0, 2)
    return `${groups.join(':') || '****'}:****:****:****:****:****:****`
  }
  const octets = ip.split('.')
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.***.***` : '***.***.***.***'
}

export const deviceCategory = (userAgent: string): StoredAnalyticsEvent['device'] => {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return '태블릿'
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return '모바일'
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return 'PC'
  return '기타'
}

export const dailyVisitorId = async (ip: string, secret: string, date: string) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${date}:${ip}`))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 24)
}

export const storeEvent = async (kv: KVNamespace, date: string, event: StoredAnalyticsEvent) => {
  const key = `events/${date}/${Date.now()}-${crypto.randomUUID()}`
  await kv.put(key, JSON.stringify(event), { expirationTtl: ANALYTICS_TTL_SECONDS })
}

export const readEvents = async (kv: KVNamespace, date: string, maxEvents = MAX_ANALYTICS_EVENTS_PER_READ) => {
  const events: StoredAnalyticsEvent[] = []
  const requestedLimit = Number.isFinite(maxEvents) ? Math.floor(maxEvents) : MAX_ANALYTICS_EVENTS_PER_READ
  const readLimit = Math.max(1, Math.min(requestedLimit, MAX_ANALYTICS_EVENTS_PER_READ))
  let inspected = 0
  let cursor: string | undefined
  do {
    const remaining = readLimit - inspected
    if (remaining <= 0) break
    const page = await kv.list({ prefix: `events/${date}/`, cursor, limit: Math.min(1000, remaining) })
    const values = await Promise.all(page.keys.map(({ name }) => kv.get<StoredAnalyticsEvent>(name, 'json')))
    for (const value of values) if (value && typeof value === 'object') events.push(value)
    inspected += page.keys.length
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor && inspected < readLimit)
  return events
}

export const deleteEvents = async (kv: KVNamespace, date: string) => {
  let cursor: string | undefined
  do {
    const page = await kv.list({ prefix: `events/${date}/`, cursor, limit: 1000 })
    await Promise.all(page.keys.map(({ name }) => kv.delete(name)))
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
}
