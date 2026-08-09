import { createPublicKey, verify } from 'node:crypto'
import type { Config } from '@netlify/functions'
import { koreanDate, readEvents } from '../lib/analytics.mts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const publicKeyDerPrefix = Buffer.from('302a300506032b6570032100', 'hex')

const verifyDiscordSignature = (rawBody: string, request: Request) => {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim() ?? ''
  const signature = request.headers.get('x-signature-ed25519')?.trim() ?? ''
  const timestamp = request.headers.get('x-signature-timestamp')?.trim() ?? ''
  if (!/^[0-9a-f]{128}$/i.test(publicKey) || !/^[0-9a-f]{128}$/i.test(signature) || !/^\d+$/.test(timestamp)) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false

  try {
    const key = createPublicKey({
      key: Buffer.concat([publicKeyDerPrefix, Buffer.from(publicKey, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signature, 'hex'))
  } catch {
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

const commandResponse = async (name: string) => {
  if (name === 'stats') return summarizeStats()
  if (name === 'errors') return summarizeErrors()
  if (name === 'status') return `🟢 **파일정비소 정상 운영 중**\n확인 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
  return '사용할 수 있는 명령어: `/stats`, `/status`, `/errors`'
}

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const rawBody = await request.text()
  if (!verifyDiscordSignature(rawBody, request)) return json({ error: 'invalid_signature' }, 401)

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
