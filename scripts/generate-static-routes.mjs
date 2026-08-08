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
  '/guides': ['파일 작업 가이드 - 파일정비소', '이미지와 PDF를 안전하게 변환하고 제출하기 위한 형식 선택, 품질 확인과 실무 체크리스트를 살펴보세요.'],
  '/guides/image-file-size': ['이미지 용량 줄이기: 화질과 파일 크기를 함께 지키는 방법 - 파일정비소', 'JPG·PNG·WEBP 이미지 용량이 커지는 이유와 제출용, 웹용, 메신저용으로 알맞게 줄이는 기준을 설명합니다.'],
  '/guides/image-format': ['JPG·PNG·WEBP 차이와 이미지 형식 선택 기준 - 파일정비소', '사진, 투명 배경, 문서 캡처, 웹 게시물에 맞춰 JPG·PNG·WEBP 중 어떤 형식을 선택해야 하는지 비교합니다.'],
  '/guides/heic-to-jpg': ['아이폰 HEIC 사진이 안 열릴 때 JPG로 바꾸는 방법 - 파일정비소', 'HEIC 파일이 윈도우나 제출 사이트에서 열리지 않는 이유, JPG 변환 시 주의할 점과 재발 방지 설정을 안내합니다.'],
  '/guides/images-to-pdf': ['여러 장의 사진을 한 개 PDF로 만드는 순서와 주의사항 - 파일정비소', '영수증, 과제, 증빙사진을 원하는 순서로 정리해 하나의 PDF로 만들 때 확인해야 할 크기와 방향을 설명합니다.'],
  '/guides/pdf-merge': ['PDF 합치기 전에 확인해야 할 페이지 순서와 보안 - 파일정비소', '여러 PDF를 한 파일로 합칠 때 순서를 실수하지 않는 방법, 암호 문서와 개인정보 문서의 주의사항을 설명합니다.'],
  '/guides/pdf-split': ['PDF에서 필요한 페이지만 안전하게 추출하는 방법 - 파일정비소', '긴 PDF에서 특정 페이지 구간을 새 파일로 만들 때 페이지 번호를 정확히 확인하고 개인정보 노출을 줄이는 방법을 안내합니다.'],
  '/guides/pdf-rotate': ['거꾸로 된 PDF 페이지 방향을 바로잡는 방법 - 파일정비소', '스캔 PDF가 옆으로 눕거나 뒤집혔을 때 90도·180도·270도 회전 값을 고르는 기준과 저장 후 확인사항을 설명합니다.'],
  '/guides/pdf-to-jpg': ['PDF를 JPG로 바꿀 때 해상도와 페이지 수 정하기 - 파일정비소', 'PDF 페이지를 이미지로 저장해야 하는 상황과 글자가 흐려지지 않도록 해상도를 선택하는 기준을 설명합니다.'],
  '/guides/pdf-page-numbers': ['PDF 페이지 번호를 넣기 전 알아둘 표지와 시작 번호 - 파일정비소', '보고서와 제출 문서에 페이지 번호를 넣을 때 위치, 표지 포함 여부, 기존 번호 중복을 확인하는 방법을 안내합니다.'],
  '/guides/hwp-to-pdf': ['HWP·HWPX를 PDF로 바꿀 때 표와 글꼴이 달라지는 이유 - 파일정비소', '한글 문서를 PDF로 변환할 때 표, 글꼴, 이미지, 페이지 배치가 달라지는 원인과 정확도가 필요할 때 사용할 방법을 설명합니다.'],
  '/about': ['서비스 소개 - 파일정비소', '파일정비소가 제공하는 브라우저 기반 이미지·PDF·HWPX 도구와 운영 원칙을 소개합니다.'],
  '/support': ['지원 범위와 제한 - 파일정비소', '파일정비소의 지원 형식, 변환 방식과 HWP 호환 범위를 확인하세요.'],
  '/privacy': ['개인정보처리방침 - 파일정비소', '파일정비소의 로컬 파일 처리 방식과 개인정보 보호 원칙을 확인하세요.'],
  '/terms': ['이용약관 - 파일정비소', '파일정비소 도구 사용 조건과 서비스 제한을 확인하세요.'],
  '/legal': ['법적 고지 - 파일정비소', '파일정비소에 적용되는 개인정보 보호법, 저작권법 및 향후 유료화 시 준비할 법적 사항을 확인하세요.'],
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
  const lastModified = new Date().toISOString().slice(0, 10)
  const urls = Object.keys(routes).map((route) => `  <url><loc>${configuredUrl}${route === '/' ? '/' : route}</loc><lastmod>${lastModified}</lastmod></url>`).join('\n')
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${configuredUrl}/sitemap.xml\n`)
}
