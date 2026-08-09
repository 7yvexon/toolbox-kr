import { koreanDate, readEvents } from '../../_lib/analytics'

interface Env {
  ANALYTICS_KV?: KVNamespace
  DISCORD_PUBLIC_KEY?: string
  DISCORD_GUILD_ID?: string
  DISCORD_ADMIN_USER_IDS?: string
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' },
})

const verifySignature = async (rawBody: string, request: Request, env: Env) => {
  const publicKey = env.DISCORD_PUBLIC_KEY?.trim() ?? ''
  const signature = request.headers.get('x-signature-ed25519')?.trim() ?? ''
  const timestamp = request.headers.get('x-signature-timestamp')?.trim() ?? ''
  if (!/^[0-9a-f]{64}$/i.test(publicKey) || !/^[0-9a-f]{128}$/i.test(signature) || !/^\d+$/.test(timestamp)) return false
  try {
    const key = await crypto.subtle.importKey('raw', Uint8Array.from(publicKey.match(/.{2}/g)!, (part) => Number.parseInt(part, 16)), { name: 'Ed25519' }, false, ['verify'])
    return await crypto.subtle.verify('Ed25519', key, Uint8Array.from(signature.match(/.{2}/g)!, (part) => Number.parseInt(part, 16)), new TextEncoder().encode(timestamp + rawBody))
  } catch { return false }
}

const authorized = (payload: Record<string, any>, env: Env) => {
  const ids = new Set((env.DISCORD_ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const userId = payload.member?.user?.id ?? payload.user?.id
  return Boolean(env.DISCORD_GUILD_ID && ids.size && payload.guild_id === env.DISCORD_GUILD_ID && typeof userId === 'string' && ids.has(userId))
}

const countBy = (values: string[]) => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

const commandResponse = async (name: string, env: Env) => {
  if (!env.ANALYTICS_KV) return '분석 저장소가 아직 연결되지 않았습니다.'
  const events = await readEvents(env.ANALYTICS_KV, koreanDate())
  const pageViews = events.filter((event) => event.kind === 'page_view')
  const starts = events.filter((event) => event.kind === 'tool_start')
  const successes = events.filter((event) => event.kind === 'tool_success')
  const errors = events.filter((event) => event.kind === 'tool_error')
  if (name === 'status') return `✅ 파일정비소 Cloudflare 운영 중\n확인 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
  if (name === 'stats') return `📊 오늘 통계 (${koreanDate()})\n방문자: **${new Set(pageViews.map((event) => event.visitorId)).size}명**\n페이지 조회: **${pageViews.length}회**\n도구 시작: **${starts.length}회**\n성공: **${successes.length}회**\n실패: **${errors.length}회**`
  if (name === 'regions') {
    const rows = countBy(pageViews.map((event) => event.region)).slice(0, 10).map(([region, count], index) => `${index + 1}. ${region} · ${count}회`)
    return `📍 오늘 지역 통계\n${rows.length ? rows.join('\n') : '아직 방문 기록이 없습니다.'}`
  }
  if (name === 'errors') {
    const rows = countBy(errors.map((event) => event.tool ?? '알 수 없음')).slice(0, 10).map(([tool, count]) => `${tool} · ${count}회`)
    return `⚠️ 오늘 변환 오류\n${rows.length ? rows.join('\n') : '오늘 오류가 없습니다.'}`
  }
  return '사용법: `/stats`, `/regions`, `/status`, `/errors`'
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const rawBody = await request.text()
  if (!await verifySignature(rawBody, request, env)) return json({ error: 'invalid_signature' }, 401)
  let payload: Record<string, any>
  try { payload = JSON.parse(rawBody) as Record<string, any> } catch { return json({ error: 'invalid_json' }, 400) }
  if (payload.type === 1) return json({ type: 1 })
  if (payload.type !== 2) return json({ type: 4, data: { content: '지원하지 않는 상호작용입니다.', flags: 64 } })
  if (!authorized(payload, env)) return json({ type: 4, data: { content: '운영자 전용 명령어입니다.', flags: 64, allowed_mentions: { parse: [] } } })
  return json({ type: 4, data: { content: await commandResponse(payload.data?.name, env), allowed_mentions: { parse: [] } } })
}
