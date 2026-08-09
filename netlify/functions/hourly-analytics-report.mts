import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { ANALYTICS_STORE, koreanDate, readEvents } from '../lib/analytics.mts'

const toolLabels: Record<string, string> = {
  'hwp-to-pdf': 'HWP·HWPX→PDF', 'image-compress': '이미지 압축', 'image-convert': '이미지 형식 변환',
  'heic-to-jpg': 'HEIC→JPG', 'images-to-pdf': '사진→PDF', 'pdf-merge': 'PDF 합치기',
  'pdf-split': 'PDF 나누기', 'pdf-rotate': 'PDF 회전', 'pdf-to-jpg': 'PDF→JPG', 'pdf-page-numbers': 'PDF 페이지 번호',
}

const countBy = (values: string[]) => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

const formatTop = (values: string[], limit = 5) => {
  const entries = countBy(values).slice(0, limit)
  return entries.length ? entries.map(([name, count]) => `${name} ${count}`).join(' · ') : '활동 없음'
}

const validWebhook = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/')
  } catch { return false }
}

const koreanParts = (date: Date) => {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const iso = shifted.toISOString()
  return { date: iso.slice(0, 10), hour: Number(iso.slice(11, 13)) }
}

const labelHour = (date: Date) => {
  const parts = koreanParts(date)
  return `${parts.date} ${String(parts.hour).padStart(2, '0')}:00`
}

const measureSiteResponse = async () => {
  const siteUrl = process.env.SITE_URL?.trim() || 'https://file-repair-shop-kr.netlify.app/'
  const startedAt = Date.now()
  try {
    const response = await fetch(siteUrl, {
      method: 'HEAD',
      headers: { 'user-agent': 'FileRepairShop-HealthCheck/1.0', 'x-health-check': 'true' },
      signal: AbortSignal.timeout(8_000),
    })
    return { status: response.status, durationMs: Date.now() - startedAt }
  } catch {
    return { status: undefined, durationMs: Date.now() - startedAt }
  }
}

export default async () => {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''
  if (!validWebhook(webhook)) throw new Error('DISCORD_WEBHOOK_URL is missing or invalid.')

  const end = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000)
  const start = new Date(end.getTime() - 3_600_000)
  const startParts = koreanParts(start)
  const reportKey = `reports/hourly/${startParts.date}-${String(startParts.hour).padStart(2, '0')}`
  const store = getStore({ name: ANALYTICS_STORE, consistency: 'strong' })
  if (await store.get(reportKey, { consistency: 'strong' })) return new Response('Already reported', { status: 200 })

  const dates = [...new Set([koreanDate(start), koreanDate(end)])]
  const events = (await Promise.all(dates.map((date) => readEvents(date)))).flat().filter((event) => {
    const occurredAt = Date.parse(event.occurredAt)
    return Number.isFinite(occurredAt) && occurredAt >= start.getTime() && occurredAt < end.getTime()
  })
  const pageViews = events.filter((event) => event.kind === 'page_view')
  const starts = events.filter((event) => event.kind === 'tool_start')
  const successes = events.filter((event) => event.kind === 'tool_success')
  const errors = events.filter((event) => event.kind === 'tool_error')
  const visitors = new Set(pageViews.map((event) => event.visitorId))
  const firstVisit = new Map<string, typeof events[number]>()
  for (const event of pageViews.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) if (!firstVisit.has(event.visitorId)) firstVisit.set(event.visitorId, event)
  const successRate = starts.length ? Math.round((successes.length / starts.length) * 100) : 0
  const status = errors.length ? `⚠️ 오류 ${errors.length}건 확인 필요` : '✅ 정상'
  const siteResponse = await measureSiteResponse()
  const responseLabel = siteResponse.status
    ? `${siteResponse.status === 200 ? '✅' : '⚠️'} ${siteResponse.durationMs}ms · HTTP ${siteResponse.status}`
    : `❌ 확인 실패 · ${siteResponse.durationMs}ms`

  const body = {
    username: '파일정비소 통계봇', allowed_mentions: { parse: [] }, embeds: [{
      title: `파일정비소 시간별 운영 보고 · ${labelHour(start)}–${labelHour(end)}`,
      color: errors.length ? 0xf59e0b : 0x22c55e,
      description: '최근 1시간 집계입니다. 원본 IP·파일명·파일 내용은 저장하거나 전송하지 않습니다.',
      fields: [
        { name: '시스템 상태', value: status, inline: true },
        { name: '사이트 응답', value: `${responseLabel}\nNetlify 함수 기준 HEAD 측정`, inline: true },
        { name: '방문', value: `순 방문자 **${visitors.size}명**\n페이지 조회 **${pageViews.length}회**`, inline: true },
        { name: '도구 처리', value: `시작 **${starts.length}회**\n성공 **${successes.length}회**\n실패 **${errors.length}회**\n성공률 **${successRate}%**`, inline: true },
        { name: '지역', value: formatTop([...firstVisit.values()].map((event) => event.region)), inline: false },
        { name: '기기', value: formatTop([...firstVisit.values()].map((event) => event.device)), inline: false },
        { name: '인기 도구', value: formatTop(starts.map((event) => toolLabels[event.tool ?? ''] ?? event.tool ?? '기타')), inline: false },
      ],
      footer: { text: 'IP 비식별 집계 · 원본 통계는 31일 후 파기' }, timestamp: end.toISOString(),
    }],
  }

  const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`Discord webhook failed with ${response.status}.`)
  await store.set(reportKey, new Date().toISOString())
  return new Response(`Reported ${events.length} events`, { status: 200 })
}

export const config: Config = { schedule: '0 * * * *' }
