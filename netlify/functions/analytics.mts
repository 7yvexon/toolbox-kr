import type { Config, Context } from '@netlify/functions'
import {
  allowedCountBuckets,
  allowedFormats,
  allowedKinds,
  allowedPageBuckets,
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
} from '../lib/analytics.mts'
import { readLimitedBody } from '../lib/request.mts'

const noStoreHeaders = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
}
const respond = (status: number, body = '') =>
  new Response(status === 204 ? null : body, { status, headers: noStoreHeaders })

const isBot = (userAgent: string) => /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget/i.test(userAgent)
const safeResponseMs = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 120_000 ? Math.round(value) : undefined

const isDiscordWebhook = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/')
  } catch {
    return false
  }
}

const notifyAnalyticsEvent = async (event: StoredAnalyticsEvent, maskedIp: string) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''
  if (!isDiscordWebhook(webhook)) return

  const status = event.kind === 'page_view'
    ? '페이지 방문'
    : event.kind === 'tool_start'
      ? '변환 시작'
      : event.kind === 'tool_success'
        ? '변환 성공'
        : '변환 실패'
  const color = event.kind === 'tool_success'
    ? 0x22c55e
    : event.kind === 'tool_error'
      ? 0xef4444
      : event.kind === 'tool_start'
        ? 0xf59e0b
        : 0x3159ed
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'IP (부분 마스킹)', value: `||${maskedIp}||`, inline: true },
    { name: '상태', value: status, inline: true },
    { name: '기능', value: event.tool ?? '페이지 방문', inline: true },
    { name: '접속 페이지', value: event.route, inline: true },
    { name: '대략적인 지역', value: event.region, inline: true },
    { name: '기기', value: event.device, inline: true },
  ]
  if (event.inputFormat || event.outputFormat) {
    fields.push({ name: '형식', value: `${event.inputFormat ?? '-'} → ${event.outputFormat ?? '-'}`, inline: true })
  }
  if (event.kind === 'page_view' && event.responseMs !== undefined) {
    fields.push({ name: '응답시간', value: `${event.responseMs}ms\n브라우저 초기 응답 기준`, inline: true })
  }

  const body = {
    username: '파일정비소 운영 알림',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: event.kind === 'page_view' ? '익명 방문자 접속 감지' : `도구 사용: ${status}`,
      color,
      description: event.kind === 'page_view'
        ? '페이지 방문, 재방문과 페이지 이동을 알립니다.'
        : '파일명·파일 내용 없이 도구 사용 상태만 알립니다.',
      fields,
      footer: { text: 'IP 일부만 표시하며 원본 파일·파일명·파일 내용은 전송하지 않음' },
      timestamp: event.occurredAt,
    }],
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Discord analytics webhook failed with ${response.status}.`)
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return respond(405)
  if (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return respond(204)

  const requestOrigin = new URL(request.url).origin
  if (request.headers.get('origin') !== requestOrigin) return respond(403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond(415)
  if (Number(request.headers.get('content-length') ?? 0) > 4_096) return respond(413)

  const userAgent = request.headers.get('user-agent') ?? ''
  if (!userAgent || isBot(userAgent)) return respond(204)

  const secret = process.env.ANALYTICS_HASH_SECRET?.trim()
  if (!secret || secret.length < 32 || !context.ip) {
    console.warn('Analytics is disabled because ANALYTICS_HASH_SECRET is missing or too short.')
    return respond(204)
  }

  let payload: Record<string, unknown>
  try {
    const rawBody = await readLimitedBody(request, 4_096)
    if (rawBody === null) return respond(413)
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return respond(400)
  }

  const kind = optionalAllowed(payload.kind, allowedKinds)
  if (!kind) return respond(400)
  const tool = optionalAllowed(payload.tool, allowedTools)
  if (kind !== 'page_view' && !tool) return respond(400)

  const date = koreanDate()
  const event: StoredAnalyticsEvent = {
    kind,
    visitorId: dailyVisitorId(context.ip, secret, date),
    route: safeRoute(payload.route),
    tool,
    country: context.geo?.country?.name || context.geo?.country?.code || '알 수 없음',
    region: context.geo?.subdivision?.name || context.geo?.country?.name || '알 수 없음',
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
    await storeEvent(date, event)
    try {
      await notifyAnalyticsEvent(event, maskIp(context.ip))
    } catch (error) {
      console.error('Failed to send analytics alert', error)
    }
    return respond(204)
  } catch (error) {
    console.error('Failed to store analytics event', error)
    return respond(204)
  }
}

export const config: Config = {
  path: '/api/analytics',
  method: 'POST',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: 'ip' },
}
