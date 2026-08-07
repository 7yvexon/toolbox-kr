import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const routes = {
  '/': ['파일정비소 - 안전한 이미지·PDF 도구', '이미지 압축, HEIC JPG 변환, PDF 합치기와 나누기를 설치 없이 내 브라우저에서 처리하세요.'],
  '/image-compress': ['이미지 용량 줄이기 - 파일정비소', 'JPG, PNG, WEBP 이미지 용량을 브라우저에서 안전하게 줄이세요.'],
  '/image-convert': ['이미지 형식 변환 - 파일정비소', 'JPG, PNG, WEBP 이미지를 원하는 형식으로 일괄 변환하세요.'],
  '/heic-to-jpg': ['HEIC JPG 변환 - 파일정비소', '아이폰 HEIC 사진을 설치 없이 JPG로 변환하세요.'],
  '/images-to-pdf': ['사진 PDF 변환 - 파일정비소', '여러 장의 사진을 하나의 PDF 문서로 변환하세요.'],
  '/pdf-merge': ['PDF 합치기 - 파일정비소', '여러 PDF 파일을 원하는 순서대로 하나의 문서로 합치세요.'],
  '/pdf-split': ['PDF 나누기 - 파일정비소', 'PDF에서 필요한 페이지 구간만 추출해 새 문서로 저장하세요.'],
  '/pdf-rotate': ['PDF 회전 - 파일정비소', 'PDF의 모든 페이지를 90도, 180도 또는 270도 회전하세요.'],
  '/pdf-to-jpg': ['PDF JPG 변환 - 파일정비소', 'PDF의 각 페이지를 고화질 JPG 이미지로 변환하세요.'],
  '/pdf-page-numbers': ['PDF 페이지 번호 - 파일정비소', 'PDF 문서 위쪽 또는 아래쪽에 페이지 번호를 추가하세요.'],
  '/hwp-to-pdf': ['HWP HWPX 호환 PDF 변환 - 파일정비소', 'HWP와 HWPX의 일반 본문과 표를 서버 업로드 없이 이미지형 호환 PDF로 만드세요.'],
  '/about': ['서비스 소개 - 파일정비소', '파일정비소가 제공하는 브라우저 기반 이미지·PDF·HWPX 도구와 운영 원칙을 소개합니다.'],
  '/support': ['지원 범위와 제한 - 파일정비소', '파일정비소의 지원 형식, 변환 방식과 HWP 호환 범위를 확인하세요.'],
  '/privacy': ['개인정보처리방침 - 파일정비소', '파일정비소의 로컬 파일 처리 방식과 개인정보 보호 원칙을 확인하세요.'],
  '/terms': ['이용약관 - 파일정비소', '파일정비소 도구 사용 조건과 서비스 제한을 확인하세요.'],
  '/contact': ['문의하기 - 파일정비소', '파일정비소 기능 오류, 문서 호환성 및 보안 문제 문의 방법을 확인하세요.'],
}

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const dist = resolve('dist')
const template = await readFile(resolve(dist, 'index.html'), 'utf8')
const localEnv = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '')
const rawSiteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || localEnv.VITE_SITE_URL || '').replace(/\/$/, '')
let configuredUrl = ''
if (rawSiteUrl) {
  const parsed = new URL(rawSiteUrl)
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('VITE_SITE_URL must use HTTPS in production.')
  }
  configuredUrl = parsed.href.replace(/\/$/, '')
}

for (const [route, [title, description]] of Object.entries(routes)) {
  const canonical = configuredUrl ? `${configuredUrl}${route === '/' ? '/' : route}` : ''
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
  if (canonical) html = html.replace('</head>', `    <link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${canonical}" />\n  </head>`)
  if (route === '/') await writeFile(resolve(dist, 'index.html'), html)
  else {
    const directory = resolve(dist, route.slice(1))
    await mkdir(directory, { recursive: true })
    await writeFile(resolve(directory, 'index.html'), html)
  }
}

if (configuredUrl) {
  const urls = Object.keys(routes).map((route) => `  <url><loc>${configuredUrl}${route === '/' ? '/' : route}</loc></url>`).join('\n')
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${configuredUrl}/sitemap.xml\n`)
}
