import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { ANALYTICS_STORE, dateDaysAgo, deleteEvents, previousKoreanDate, readEvents } from '../lib/analytics.mts'

const countBy = (values: string[]) => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

const formatTop = (values: string[], limit = 6) => {
  const entries = countBy(values).slice(0, limit)
  return entries.length ? entries.map(([name, count]) => `${name} ${count}`).join(' · ') : '기록 없음'
}

const toolLabels: Record<string, string> = {
  'hwp-to-pdf': 'HWP·HWPX→PDF',
  'image-compress': '이미지 압축',
  'image-convert': '이미지 형식 변환',
  'heic-to-jpg': 'HEIC→JPG',
  'images-to-pdf': '사진→PDF',
  'pdf-merge': 'PDF 합치기',
  'pdf-split': 'PDF 나누기',
  'pdf-rotate': 'PDF 회전',
  'pdf-to-jpg': 'PDF→JPG',
  'pdf-page-numbers': 'PDF 페이지 번호',
}

const validWebhook = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/')
  } catch {
    return false
  }
}

export default async () => {
  await deleteEvents(dateDaysAgo(31))

  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''
  if (!validWebhook(webhook)) throw new Error('DISCORD_WEBHOOK_URL is missing or invalid.')

  const date = previousKoreanDate()
  const store = getStore({ name: ANALYTICS_STORE, consistency: 'strong' })
  if (await store.get(`reports/${date}`, { consistency: 'strong' })) return new Response('Already reported', { status: 200 })

  const events = await readEvents(date)
  const visitors = new Set(events.map((event) => event.visitorId))
  const pageViews = events.filter((event) => event.kind === 'page_view')
  const starts = events.filter((event) => event.kind === 'tool_start')
  const successes = events.filter((event) => event.kind === 'tool_success')
  const errors = events.filter((event) => event.kind === 'tool_error')

  const firstVisit = new Map<string, typeof events[number]>()
  for (const event of pageViews) if (!firstVisit.has(event.visitorId)) firstVisit.set(event.visitorId, event)

  const visitsPerVisitor = countBy(pageViews.map((event) => event.visitorId)).map(([, count]) => count)
  const multiPageVisitors = visitsPerVisitor.filter((count) => count > 1).length
  const toolUsage = starts.map((event) => toolLabels[event.tool ?? ''] ?? event.tool ?? '기타')
  const successRate = starts.length ? Math.round((successes.length / starts.length) * 100) : 0

  const body = {
    username: '파일정비소 통계봇',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `파일정비소 일일 보고 · ${date}`,
      color: errors.length ? 0xf59e0b : 0x3159ed,
      description: '파일명과 파일 내용, 원본 IP는 수집하거나 전송하지 않습니다.',
      fields: [
        { name: '방문', value: `추정 순 방문자 **${visitors.size}명**\n페이지 조회 **${pageViews.length}회**\n2회 이상 조회 **${multiPageVisitors}명**`, inline: true },
        { name: '도구 처리', value: `시작 **${starts.length}회**\n성공 **${successes.length}회**\n오류 **${errors.length}회** · 성공률 **${successRate}%**`, inline: true },
        { name: '지역', value: formatTop([...firstVisit.values()].map((event) => event.region)), inline: false },
        { name: '기기', value: formatTop([...firstVisit.values()].map((event) => event.device)), inline: false },
        { name: '인기 도구', value: formatTop(toolUsage), inline: false },
        { name: '파일 크기 구간', value: formatTop(starts.flatMap((event) => event.sizeBucket ? [event.sizeBucket] : [])), inline: false },
      ],
      footer: { text: '당일용 익명 식별값 · 통계 원본 31일 보관' },
      timestamp: new Date().toISOString(),
    }],
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Discord webhook failed with ${response.status}.`)

  await store.set(`reports/${date}`, new Date().toISOString())
  return new Response(`Reported ${events.length} events`, { status: 200 })
}

export const config: Config = { schedule: '10 15 * * *' }
