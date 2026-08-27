import { webcrypto } from 'node:crypto'
import type { Config } from '@netlify/functions'
import { koreanDate, readEvents } from '../lib/analytics.mts'
import { isFreshTimestamp, readLimitedBody } from '../lib/request.mts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  },
})

const MAX_DISCORD_REQUEST_BYTES = 64 * 1024

const verifyDiscordSignature = async (rawBody: string, request: Request) => {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim() ?? ''
  const signature = request.headers.get('x-signature-ed25519')?.trim() ?? ''
  const timestamp = request.headers.get('x-signature-timestamp')?.trim() ?? ''
  const validShape = /^[0-9a-f]{64}$/i.test(publicKey) && /^[0-9a-f]{128}$/i.test(signature) && /^\d+$/.test(timestamp)
  if (!validShape) {
    console.warn('Discord signature shape rejected', {
      publicKeyConfigured: Boolean(publicKey),
      publicKeyLength: publicKey.length,
      signatureLength: signature.length,
      timestampPresent: Boolean(timestamp),
    })
    return false
  }

  if (!isFreshTimestamp(timestamp)) return false

  try {
    const key = await webcrypto.subtle.importKey('raw', Buffer.from(publicKey, 'hex'), { name: 'Ed25519' }, false, ['verify'])
    return await webcrypto.subtle.verify('Ed25519', key, Buffer.from(signature, 'hex'), Buffer.from(timestamp + rawBody))
  } catch (error) {
    console.error('Discord signature verification error', error instanceof Error ? error.message : 'unknown error')
    return false
  }
}

const isAuthorized = (payload: Record<string, any>) => {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? ''
  const adminIds = new Set((process.env.DISCORD_ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const userId = payload.member?.user?.id ?? payload.user?.id
  if (!guildId || !adminIds.size || payload.guild_id !== guildId || typeof userId !== 'string') return false
  return adminIds.has(userId)
}

const toolLabel = (tool?: string) => tool ?? '알 수 없는 도구'

const summarizeStats = async () => {
  const date = koreanDate()
  const events = await readEvents(date)
  const pageViews = events.filter((event) => event.kind === 'page_view')
  const starts = events.filter((event) => event.kind === 'tool_start')
  const successes = events.filter((event) => event.kind === 'tool_success')
  const errors = events.filter((event) => event.kind === 'tool_error')
  const visitors = new Set(pageViews.map((event) => event.visitorId)).size
  const toolCounts = new Map<string, number>()
  for (const event of starts) toolCounts.set(toolLabel(event.tool), (toolCounts.get(toolLabel(event.tool)) ?? 0) + 1)
  const topTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const toolLine = topTools.length ? topTools.map(([tool, count]) => `${tool}: ${count}`).join('\n') : '아직 사용 기록이 없습니다.'
  return `📊 **파일정비소 오늘 통계 (${date})**\n순 방문자: **${visitors}명**\n페이지 조회: **${pageViews.length}회**\n도구 시작: **${starts.length}회**\n성공: **${successes.length}회**\n실패: **${errors.length}회**\n\n**많이 사용한 도구**\n${toolLine}`
}

const summarizeErrors = async () => {
  const events = (await readEvents(koreanDate())).filter((event) => event.kind === 'tool_error').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5)
  if (!events.length) return '✅ 오늘 기록된 변환 오류가 없습니다.'
  const lines = events.map((event) => `• ${toolLabel(event.tool)} · ${new Date(event.occurredAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · ${event.route}`)
  return `⚠️ **최근 변환 오류 ${events.length}건**\n${lines.join('\n')}`
}

const summarizeRegions = async () => {
  const events = (await readEvents(koreanDate())).filter((event) => event.kind === 'page_view')
  if (!events.length) return '📍 오늘 지역별 방문 기록이 없습니다.'

  const byRegion = new Map<string, { visitors: Set<string>; views: number }>()
  for (const event of events) {
    const region = event.region?.trim() || '지역 미상'
    const entry = byRegion.get(region) ?? { visitors: new Set<string>(), views: 0 }
    entry.visitors.add(event.visitorId)
    entry.views += 1
    byRegion.set(region, entry)
  }

  const rows = [...byRegion.entries()]
    .sort(([, a], [, b]) => b.visitors.size - a.visitors.size || b.views - a.views)
    .slice(0, 10)
    .map(([region, entry], index) => `${index + 1}. **${region}** · 방문자 ${entry.visitors.size}명 · 조회 ${entry.views}회`)

  return `📍 **오늘 지역별 방문 통계 (${koreanDate()})**\n${rows.join('\n')}\n\n※ 개인정보 보호를 위해 IP 주소는 저장하거나 표시하지 않고, 지역은 Netlify가 제공하는 대략적인 지역 정보만 집계합니다.`
}

const commandResponse = async (name: string) => {
  if (name === 'stats') return summarizeStats()
  if (name === 'errors') return summarizeErrors()
  if (name === 'regions') return summarizeRegions()
  if (name === 'status') return `🟢 **파일정비소 정상 운영 중**\n확인 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
  return '사용할 수 있는 명령어: `/stats`, `/regions`, `/status`, `/errors`'
}

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const rawBody = await readLimitedBody(request, MAX_DISCORD_REQUEST_BYTES)
  if (rawBody === null) return json({ error: 'payload_too_large' }, 413)
  if (!await verifyDiscordSignature(rawBody, request)) return json({ error: 'invalid_signature' }, 401)

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody) as Record<string, any>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (payload.type === 1) return json({ type: 1 })
  if (payload.type !== 2) return json({ type: 4, data: { content: '지원하지 않는 상호작용입니다.', flags: 64 } })
  if (!isAuthorized(payload)) return json({ type: 4, data: { content: '이 봇은 운영자 전용입니다.', flags: 64, allowed_mentions: { parse: [] } } })

  try {
    const content = await commandResponse(payload.data?.name)
    return json({ type: 4, data: { content, allowed_mentions: { parse: [] } } })
  } catch (error) {
    console.error('Discord command failed', error)
    return json({ type: 4, data: { content: '통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', flags: 64, allowed_mentions: { parse: [] } } })
  }
}

export const config: Config = {
  path: '/api/discord/interactions',
  method: 'POST',
}
