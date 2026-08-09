export type AnalyticsTool =
  | 'hwp-to-pdf'
  | 'image-compress'
  | 'image-convert'
  | 'heic-to-jpg'
  | 'images-to-pdf'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-rotate'
  | 'pdf-to-jpg'
  | 'pdf-page-numbers'

export type ToolAnalyticsAction = 'start' | 'success' | 'error'

export interface ToolAnalyticsDetails {
  sizeBucket?: string
  countBucket?: string
  pageBucket?: string
  inputFormat?: string
  outputFormat?: string
}

const analyticsEndpoint = '/api/analytics'
let lastPageView = { route: '', sentAt: 0 }

const send = (payload: object) => {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (!import.meta.env.PROD || privacyNavigator.globalPrivacyControl || navigator.doNotTrack === '1') return

  void fetch(analyticsEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
    keepalive: true,
  }).catch(() => undefined)
}

export const fileSizeBucket = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024)
  if (megabytes <= 10) return '10MB 이하'
  if (megabytes <= 50) return '10~50MB'
  if (megabytes <= 100) return '50~100MB'
  return '100MB 초과'
}

export const itemCountBucket = (count: number) => {
  if (count <= 1) return '1개'
  if (count <= 5) return '2~5개'
  if (count <= 10) return '6~10개'
  return '11개 이상'
}

export const pageCountBucket = (count: number) => {
  if (count <= 5) return '1~5쪽'
  if (count <= 20) return '6~20쪽'
  if (count <= 50) return '21~50쪽'
  return '51쪽 이상'
}

export const totalFileSize = (files: File | File[]) => {
  const list = Array.isArray(files) ? files : [files]
  return list.reduce((total, file) => total + file.size, 0)
}

export const trackPageView = (route: string) => {
  const now = Date.now()
  if (lastPageView.route === route && now - lastPageView.sentAt < 2_000) return
  lastPageView = { route, sentAt: now }
  send({ kind: 'page_view', route })
}

export const trackToolEvent = (tool: AnalyticsTool, action: ToolAnalyticsAction, details: ToolAnalyticsDetails = {}) => {
  send({ kind: `tool_${action}`, route: window.location.pathname, tool, ...details })
}
