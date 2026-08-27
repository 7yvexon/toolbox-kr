import {
  allowedCountBuckets,
  allowedFormats,
  allowedKinds,
  allowedPageBuckets,
  allowedRoutes,
  allowedSizeBuckets,
  allowedTools,
  dailyVisitorId,
  deviceCategory,
  koreanDate,
  maskIp,
  optionalAllowed,
  safeRoute,
  storeEvent,
  type StoredAnalyticsEvent,
} from '../_lib/analytics'
import { readLimitedBody } from '../_lib/request'

interface Env {
  ANALYTICS_KV?: KVNamespace
  ANALYTICS_HASH_SECRET?: string
  DISCORD_WEBHOOK_URL?: string
}

const json = (status: number, body = '') => new Response(status === 204 ? null : body, {
  status,
  headers: {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  },
})

const isBot = (userAgent: string) => /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget/i.test(userAgent)
const safeResponseMs = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 120_000 ? Math.round(value) : undefined
const ANALYTICS_REQUESTS_PER_MINUTE = 60

const validWebhook = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/')
  } catch { return false }
}

const notify = async (env: Env, event: StoredAnalyticsEvent, ip: string) => {
  const webhook = env.DISCORD_WEBHOOK_URL?.trim() ?? ''
  if (!validWebhook(webhook)) return
  const status = event.kind === 'page_view' ? '페이지 방문' : event.kind === 'tool_start' ? '변환 시작' : event.kind === 'tool_success' ? '변환 성공' : '변환 실패'
  const color = event.kind === 'tool_success' ? 0x22c55e : event.kind === 'tool_error' ? 0xef4444 : event.kind === 'tool_start' ? 0xf59e0b : 0x3159ed
  const fields = [
    { name: 'IP (부분 마스킹)', value: `||${maskIp(ip)}||`, inline: true },
    { name: '상태', value: status, inline: true },
    { name: '기능', value: event.tool ?? '페이지 방문', inline: true },
    { name: '접속 페이지', value: event.route, inline: true },
    { name: '대략적인 지역', value: event.region, inline: true },
    { name: '기기', value: event.device, inline: true },
  ]
  if (event.inputFormat || event.outputFormat) fields.push({ name: '형식', value: `${event.inputFormat ?? '-'} → ${event.outputFormat ?? '-'}`, inline: true })
  if (event.kind === 'page_view' && event.responseMs !== undefined) fields.push({ name: '응답시간', value: `${event.responseMs}ms\n브라우저 초기 응답 기준`, inline: true })
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: '파일정비소 운영 알림',
      allowed_mentions: { parse: [] },
      embeds: [{ title: event.kind === 'page_view' ? '익명 방문자 접속 감지' : `도구 사용: ${status}`, color, description: '원본 파일과 전체 IP 주소는 전송하지 않습니다.', fields, timestamp: event.occurredAt }],
    }),
  })
  if (!response.ok) throw new Error(`Discord webhook failed: ${response.status}`)
}

const withinAnalyticsRateLimit = async (kv: KVNamespace, ip: string, secret: string, now = Date.now()) => {
  const window = Math.floor(now / 60_000)
  const visitorId = await dailyVisitorId(ip, secret, `rate-limit:${window}`)
  const key = `rate-limits/${window}/${visitorId}`
  const count = Number(await kv.get(key))
  if (Number.isSafeInteger(count) && count >= ANALYTICS_REQUESTS_PER_MINUTE) return false
  const nextCount = Number.isSafeInteger(count) && count > 0 ? count + 1 : 1
  await kv.put(key, String(nextCount), { expirationTtl: 120 })
  return true
}

export const onRequestPost = async ({ request, env, waitUntil }: { request: Request; env: Env; waitUntil: (promise: Promise<unknown>) => void }) => {
  if (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return json(204)
  if (request.headers.get('origin') !== new URL(request.url).origin) return json(403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415)
  if (Number(request.headers.get('content-length') ?? 0) > 4_096) return json(413)
  const userAgent = request.headers.get('user-agent') ?? ''
  if (!userAgent || isBot(userAgent)) return json(204)
  if (!env.ANALYTICS_KV || !env.ANALYTICS_HASH_SECRET || env.ANALYTICS_HASH_SECRET.length < 32) return json(204)
  const ip = request.headers.get('CF-Connecting-IP')
  if (!ip) return json(403)
  try {
    if (!await withinAnalyticsRateLimit(env.ANALYTICS_KV, ip, env.ANALYTICS_HASH_SECRET)) return json(429)
  } catch (error) {
    console.error('Analytics rate limiting failed', error)
    return json(503)
  }

  let payload: Record<string, unknown>
  try {
    const rawBody = await readLimitedBody(request, 4_096)
    if (rawBody === null) return json(413)
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch { return json(400) }

  const kind = optionalAllowed(payload.kind, allowedKinds)
  if (!kind) return json(400)
  const tool = optionalAllowed(payload.tool, allowedTools)
  if (kind !== 'page_view' && !tool) return json(400)
  const cf = (request as Request & { cf?: { country?: string; region?: string; city?: string } }).cf
  const date = koreanDate()
  const event: StoredAnalyticsEvent = {
    kind,
    visitorId: await dailyVisitorId(ip, env.ANALYTICS_HASH_SECRET, date),
    route: safeRoute(payload.route),
    tool,
    country: cf?.country ?? '알 수 없음',
    region: cf?.region ?? cf?.city ?? cf?.country ?? '알 수 없음',
    device: deviceCategory(userAgent),
    sizeBucket: optionalAllowed(payload.sizeBucket, allowedSizeBuckets),
    countBucket: optionalAllowed(payload.countBucket, allowedCountBuckets),
    pageBucket: optionalAllowed(payload.pageBucket, allowedPageBuckets),
    inputFormat: optionalAllowed(payload.inputFormat, allowedFormats),
    outputFormat: optionalAllowed(payload.outputFormat, allowedFormats),
    responseMs: kind === 'page_view' ? safeResponseMs(payload.responseMs) : undefined,
    occurredAt: new Date().toISOString(),
  }

  try {
    await storeEvent(env.ANALYTICS_KV, date, event)
    waitUntil(notify(env, event, ip).catch((error) => console.error('Analytics Discord alert failed', error)))
  } catch (error) {
    console.error('Failed to store analytics event', error)
  }
  return json(204)
}
