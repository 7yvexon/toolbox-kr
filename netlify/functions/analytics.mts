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

const noStoreHeaders = { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' }
const respond = (status: number, body = '') =>
  new Response(status === 204 ? null : body, { status, headers: noStoreHeaders })

const isBot = (userAgent: string) => /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget/i.test(userAgent)

const isDiscordWebhook = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/')
  } catch {
    return false
  }
}

const notifyVisitor = async (event: StoredAnalyticsEvent, maskedIp: string) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''
  if (!isDiscordWebhook(webhook)) return

  const body = {
    username: '파일정비소 방문 알림',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: '익명 방문자 접속 감지',
      color: 0x3159ed,
      description: '파일정비소에 방문자가 접속했습니다. 같은 방문자의 재방문과 페이지 이동도 알림을 보냅니다.',
      fields: [
        { name: 'IP (부분 마스킹)', value: `||${maskedIp}||`, inline: true },
        { name: '접속 페이지', value: event.route, inline: true },
        { name: '대략적인 지역', value: event.region, inline: true },
        { name: '기기', value: event.device, inline: true },
      ],
      footer: { text: 'IP 일부만 표시하며 원본 파일·파일명·파일 내용은 전송하지 않음' },
      timestamp: event.occurredAt,
    }],
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Discord new visitor webhook failed with ${response.status}.`)
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
    const rawBody = await request.text()
    if (rawBody.length > 4_096) return respond(413)
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
    occurredAt: new Date().toISOString(),
  }

  try {
    await storeEvent(date, event)
    if (kind === 'page_view') {
      try {
        await notifyVisitor(event, maskIp(context.ip))
      } catch (error) {
        console.error('Failed to send visitor alert', error)
      }
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
