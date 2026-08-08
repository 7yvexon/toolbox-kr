import { lazy, Suspense, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { GuideArticle, GuidesIndex } from './components/GuidePages'
import { guideByPath, guides, type GuidePath } from './content/guides'

const ImageCompressor = lazy(() => import('./tools/ImageCompressor'))
const HeicConverter = lazy(() => import('./tools/HeicConverter'))
const ImagesToPdf = lazy(() => import('./tools/ImagesToPdf'))
const PdfMerge = lazy(() => import('./tools/PdfMerge'))
const PdfSplit = lazy(() => import('./tools/PdfSplit'))
const PdfRotate = lazy(() => import('./tools/PdfRotate'))
const PdfToImages = lazy(() => import('./tools/PdfToImages'))
const PdfPageNumbers = lazy(() => import('./tools/PdfPageNumbers'))
const ImageConverter = lazy(() => import('./tools/ImageConverter'))
const HwpToPdf = lazy(() => import('./tools/HwpToPdf'))

export type Route = '/' | '/image-compress' | '/image-convert' | '/heic-to-jpg' | '/images-to-pdf' | '/pdf-merge' | '/pdf-split' | '/pdf-rotate' | '/pdf-to-jpg' | '/pdf-page-numbers' | '/hwp-to-pdf' | '/guides' | GuidePath | '/about' | '/support' | '/privacy' | '/terms' | '/legal' | '/contact'

export const tools = [
  { path: '/hwp-to-pdf' as Route, icon: '한', tone: 'lime', category: '한글 문서', title: 'HWP·HWPX → 호환 PDF', description: '내용 확인용 이미지 PDF로 변환', meta: '정밀 변환 아님' },
  { path: '/image-compress' as Route, icon: '↘', tone: 'blue', category: '이미지', title: '이미지 용량 줄이기', description: '화질은 그대로, 파일은 가볍게', meta: 'JPG · PNG · WEBP' },
  { path: '/pdf-merge' as Route, icon: '+', tone: 'orange', category: 'PDF 편집', title: 'PDF 합치기', description: '여러 문서를 원하는 순서로 하나로', meta: '최대 10개' },
  { path: '/pdf-split' as Route, icon: 'S', tone: 'orange', category: 'PDF 편집', title: 'PDF 나누기', description: '필요한 페이지 구간만 새 문서로', meta: '최대 200페이지' },
  { path: '/pdf-to-jpg' as Route, icon: 'J', tone: 'orange', category: 'PDF 변환', title: 'PDF → JPG', description: '각 페이지를 선명한 이미지로', meta: '최대 50페이지' },
  { path: '/heic-to-jpg' as Route, icon: 'H', tone: 'blue', category: '이미지', title: 'HEIC → JPG', description: '아이폰 사진을 호환되는 형식으로', meta: 'HEIC · HEIF' },
  { path: '/images-to-pdf' as Route, icon: 'P', tone: 'blue', category: '이미지·PDF', title: '사진 → PDF', description: '여러 사진을 한 문서로 깔끔하게', meta: '최대 30장' },
  { path: '/image-convert' as Route, icon: 'C', tone: 'blue', category: '이미지', title: '이미지 형식 변환', description: 'JPG, PNG, WEBP를 한꺼번에', meta: '최대 30장' },
  { path: '/pdf-rotate' as Route, icon: '↻', tone: 'orange', category: 'PDF 편집', title: 'PDF 회전', description: '뒤집힌 페이지를 한 번에 바로잡기', meta: '90° · 180° · 270°' },
  { path: '/pdf-page-numbers' as Route, icon: '#', tone: 'orange', category: 'PDF 편집', title: 'PDF 페이지 번호', description: '제출 문서에 번호를 깔끔하게', meta: '위 · 아래' },
]

const navTools = tools.slice(0, 4)
export const routeInfo: Record<Route, { title: string; description: string }> = {
  '/': { title: '파일정비소 - 안전한 이미지·PDF 도구', description: '이미지 압축, HEIC JPG 변환, PDF 합치기와 나누기를 설치 없이 내 브라우저에서 처리하세요.' },
  '/image-compress': { title: '이미지 용량 줄이기 - 파일정비소', description: 'JPG, PNG, WEBP 이미지 용량을 브라우저에서 안전하게 줄이세요.' },
  '/image-convert': { title: '이미지 형식 변환 - 파일정비소', description: 'JPG, PNG, WEBP 이미지를 원하는 형식으로 일괄 변환하세요.' },
  '/heic-to-jpg': { title: 'HEIC JPG 변환 - 파일정비소', description: '아이폰 HEIC 사진을 설치 없이 JPG로 변환하세요.' },
  '/images-to-pdf': { title: '사진 PDF 변환 - 파일정비소', description: '여러 장의 사진을 하나의 PDF 문서로 변환하세요.' },
  '/pdf-merge': { title: 'PDF 합치기 - 파일정비소', description: '여러 PDF 파일을 원하는 순서대로 하나의 문서로 합치세요.' },
  '/pdf-split': { title: 'PDF 나누기 - 파일정비소', description: 'PDF에서 필요한 페이지 구간만 추출해 새 문서로 저장하세요.' },
  '/pdf-rotate': { title: 'PDF 회전 - 파일정비소', description: 'PDF의 모든 페이지를 90도, 180도 또는 270도 회전하세요.' },
  '/pdf-to-jpg': { title: 'PDF JPG 변환 - 파일정비소', description: 'PDF의 각 페이지를 고화질 JPG 이미지로 변환하세요.' },
  '/pdf-page-numbers': { title: 'PDF 페이지 번호 - 파일정비소', description: 'PDF 문서 위쪽 또는 아래쪽에 페이지 번호를 추가하세요.' },
  '/hwp-to-pdf': { title: 'HWP HWPX 호환 PDF 변환 - 파일정비소', description: 'HWP와 HWPX의 일반 본문과 표를 서버 업로드 없이 이미지형 호환 PDF로 만드세요.' },
  '/guides': { title: '파일 작업 가이드 - 파일정비소', description: '이미지와 PDF를 안전하게 변환하고 제출하기 위한 형식 선택, 품질 확인과 실무 체크리스트를 살펴보세요.' },
  '/support': { title: '지원 범위와 제한 - 파일정비소', description: '파일정비소의 지원 형식, 변환 방식, 제한 사항과 HWP 호환 범위를 확인하세요.' },
  '/privacy': { title: '개인정보처리방침 - 파일정비소', description: '파일정비소의 로컬 파일 처리 방식과 개인정보 보호 원칙을 확인하세요.' },
  '/terms': { title: '이용약관 - 파일정비소', description: '파일정비소 도구 사용 조건과 사용자 책임, 서비스 제한을 확인하세요.' },
  '/legal': { title: '법적 고지 - 파일정비소', description: '파일정비소에 적용되는 개인정보 보호법, 저작권법 및 향후 유료화 시 준비할 법적 사항을 확인하세요.' },
  '/about': { title: '서비스 소개 - 파일정비소', description: '파일정비소가 제공하는 브라우저 기반 이미지·PDF·HWPX 도구와 운영 원칙을 소개합니다.' },
  '/contact': { title: '문의하기 - 파일정비소', description: '파일정비소 기능 오류, 문서 호환성 및 보안 문제 문의 방법을 확인하세요.' },
  ...Object.fromEntries(guides.map((guide) => [guide.path, { title: `${guide.title} - 파일정비소`, description: guide.description }])) as Record<GuidePath, { title: string; description: string }>,
}

const normalisePath = (path: string) => path !== '/' ? path.replace(/\/+$/, '') : '/'
const getRoute = () => {
  const path = normalisePath(window.location.pathname)
  return (Object.prototype.hasOwnProperty.call(routeInfo, path) ? path : '/') as Route
}

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function updateSeo(route: Route) {
  const info = routeInfo[route]
  const canonical = new URL(route, window.location.origin).href
  const guide = route.startsWith('/guides/') ? guideByPath[route as GuidePath] : undefined
  document.title = info.title
  upsertMeta('meta[name="description"]', 'name', 'description', info.description)
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', info.title)
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', info.description)
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', guide ? 'article' : 'website')
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink) }
  canonicalLink.href = canonical
  let structuredData = document.head.querySelector<HTMLScriptElement>('#route-structured-data')
  if (!structuredData) { structuredData = document.createElement('script'); structuredData.id = 'route-structured-data'; structuredData.type = 'application/ld+json'; document.head.appendChild(structuredData) }
  structuredData.textContent = JSON.stringify(guide ? {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: guide.title, description: guide.description, datePublished: '2026-08-08', dateModified: '2026-08-08', inLanguage: 'ko-KR', mainEntityOfPage: canonical, author: { '@type': 'Organization', name: '파일정비소', url: window.location.origin } },
      { '@type': 'FAQPage', mainEntity: guide.faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: window.location.origin }, { '@type': 'ListItem', position: 2, name: '가이드', item: `${window.location.origin}/guides` }, { '@type': 'ListItem', position: 3, name: guide.title, item: canonical }] },
    ],
  } : { '@context': 'https://schema.org', '@type': route === '/guides' ? 'CollectionPage' : 'WebPage', name: info.title, description: info.description, url: canonical, inLanguage: 'ko-KR' })
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const pop = () => setRoute(getRoute())
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  useEffect(() => {
    updateSeo(route)
    window.scrollTo({ top: 0, behavior: 'auto' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [route])

  const navigate = (path: Route) => {
    if (normalisePath(window.location.pathname) !== path) window.history.pushState({}, '', path)
    setRoute(path)
    setMenuOpen(false)
  }
  const link = (path: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      navigate(path)
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">본문 바로가기</a>
      <header className="site-header">
        <div className="nav-shell">
          <a className="brand" href="/" onClick={link('/')} aria-label="파일정비소 홈"><span className="brand-mark"><i></i><i></i></span><span>파일<strong>정비소</strong></span></a>
          <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="주요 메뉴">
            {navTools.map((tool) => <a className={route === tool.path ? 'active' : ''} href={tool.path} key={tool.path} onClick={link(tool.path)}>{tool.title}</a>)}
            <a className={route === '/guides' || route.startsWith('/guides/') ? 'active' : ''} href="/guides" onClick={link('/guides')}>가이드</a>
          </nav>
          <div className="header-safe"><span></span>내 기기에서 안전 처리</div>
          <button className="menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="주요 메뉴" aria-expanded={menuOpen}>☰</button>
        </div>
      </header>
      <ErrorBoundary>
        <div id="main-content" tabIndex={-1}>
          {route === '/' && <Home navigate={navigate} />}
          <Suspense fallback={<div className="route-loading" role="status"><span></span>도구를 준비하고 있어요…</div>}>
            {route === '/image-compress' && <ImageCompressor />}
            {route === '/heic-to-jpg' && <HeicConverter />}
            {route === '/images-to-pdf' && <ImagesToPdf />}
            {route === '/pdf-merge' && <PdfMerge />}
            {route === '/pdf-split' && <PdfSplit />}
            {route === '/pdf-rotate' && <PdfRotate />}
            {route === '/pdf-to-jpg' && <PdfToImages />}
            {route === '/pdf-page-numbers' && <PdfPageNumbers />}
            {route === '/image-convert' && <ImageConverter />}
            {route === '/hwp-to-pdf' && <HwpToPdf />}
          </Suspense>
          {route === '/about' && <AboutPage />}
          {route === '/guides' && <GuidesIndex />}
          {route.startsWith('/guides/') && <GuideArticle path={route as GuidePath} />}
          {route === '/support' && <SupportPage />}
          {route === '/privacy' && <PrivacyPage />}
          {route === '/terms' && <TermsPage />}
          {route === '/legal' && <LegalNoticePage />}
          {route === '/contact' && <ContactPage />}
        </div>
      </ErrorBoundary>
      <footer className="site-footer"><div className="footer-inner"><div><span className="footer-logo">파일정비소</span><p>복잡한 파일 작업을 가볍고 안전하게.</p></div><nav className="footer-links" aria-label="서비스와 고객 지원"><span className="footer-links-title">서비스</span><a href="/guides" onClick={link('/guides')}>파일 작업 가이드</a><a href="/about" onClick={link('/about')}>서비스 소개</a><a href="/support" onClick={link('/support')}>지원 범위</a><a href="/contact" onClick={link('/contact')}>문의하기</a></nav><nav className="footer-links" aria-label="법적 정책"><span className="footer-links-title">정책</span><a href="/privacy" onClick={link('/privacy')}>개인정보처리방침</a><a href="/terms" onClick={link('/terms')}>이용약관</a><a href="/legal" onClick={link('/legal')}>법적 고지</a></nav><div className="footer-note"><span>원본 업로드 없음</span><span>회원가입 없음</span></div></div></footer>
    </div>
  )
}

function Home({ navigate }: { navigate: (path: Route) => void }) {
  return (
    <main className="home-page">
      <section className="hero"><div className="page-shell home-hero-inner"><div className="hero-copy"><div className="hero-kicker">설치 없이 바로 쓰는 파일 도구</div><h1>복잡한 파일 작업을<br /><em>더 쉽고 빠르게</em></h1><p>이미지 변환부터 PDF 편집까지 한곳에서 해결하세요.<br />파일은 서버가 아닌 내 브라우저에서 처리됩니다.</p><div className="hero-actions"><button className="button primary" type="button" onClick={() => navigate('/image-compress')}>무료로 시작하기</button><button className="button secondary" type="button" onClick={() => document.getElementById('all-tools')?.scrollIntoView({ behavior: 'smooth' })}>모든 도구 보기</button></div><div className="hero-proof"><span>회원가입 없음</span><span>횟수 제한 없음</span><span>원본 파일 저장 없음</span></div></div><div className="hero-art" aria-hidden="true"><div className="product-window"><div className="product-window-bar"><span></span><span></span><span></span><small>file-repair.local</small></div><div className="product-window-body"><div className="product-side"><b>파일정비소</b><i></i><i></i><i></i><i></i></div><div className="product-main"><span className="product-label">빠른 도구</span><strong>무엇을 도와드릴까요?</strong><div className="product-tool-grid"><span><b>↘</b>이미지 압축</span><span><b>+</b>PDF 합치기</span><span><b>S</b>PDF 나누기</span><span><b>H</b>HEIC 변환</span></div></div></div></div><div className="product-phone"><span></span><div><b>PDF</b><small>변환 완료</small><strong>2.4 MB</strong></div></div><div className="product-badge"><strong>100%</strong><span>브라우저 처리</span></div></div></div></section>
      <section className="tools-section" id="all-tools"><div className="page-shell"><div className="section-heading"><div><span className="eyebrow">FILE TOOLS</span><h2>필요한 작업을 선택하세요</h2><p>파일 종류와 작업 목적에 맞는 도구를 바로 찾을 수 있습니다.</p></div><span className="tools-count"><strong>{tools.length}</strong><span>개의 무료 도구</span></span></div><div className="tool-card-grid">{tools.map((tool, index) => <a className={`tool-card ${tool.tone}`} key={tool.path} href={tool.path} onClick={(event) => { event.preventDefault(); navigate(tool.path) }}><span className="tool-card-head"><span className="tool-icon">{tool.icon}</span><span className="tool-category">{tool.category}</span><span className="tool-index">{String(index + 1).padStart(2, '0')}</span></span><span className="tool-copy"><strong>{tool.title}</strong><span>{tool.description}</span></span><span className="tool-card-footer"><span className="tool-meta">{tool.meta}</span><span className="tool-arrow">→</span></span></a>)}</div><div className="hwp-roadmap"><span>HWP / HWPX</span><div><strong>호환 PDF 변환은 지원 범위를 먼저 알려드립니다.</strong><p>일반 본문과 표는 내용 확인용 이미지 PDF로 변환합니다. 원본과 같은 결과가 필요한 경우 한컴오피스의 PDF 저장 기능을 권장합니다.</p><button className="button secondary small" type="button" onClick={() => navigate('/hwp-to-pdf')}>지원 범위 확인하기</button></div></div></div></section>
      <section className="home-guides"><div className="page-shell"><div className="home-guides-heading"><div><span className="eyebrow">PRACTICAL GUIDES</span><h2>변환보다 중요한<br />결과 확인 방법</h2></div><p>파일 형식 선택부터 제출 전 검수까지,<br />실수하기 쉬운 부분을 먼저 읽어보세요.</p><a href="/guides" onClick={(event) => { event.preventDefault(); navigate('/guides') }}>전체 가이드 보기 <b>→</b></a></div><div className="home-guide-grid">{guides.slice(0, 3).map((guide) => <a href={guide.path} key={guide.path} onClick={(event) => { event.preventDefault(); navigate(guide.path) }}><span>{guide.category} · {guide.readTime}</span><strong>{guide.title}</strong><p>{guide.description}</p><b>읽어보기 →</b></a>)}</div></div></section>
      <section className="promise-section"><div className="page-shell promise-inner"><div className="promise-title"><span className="privacy-large-icon">✓</span><div><span className="eyebrow">PRIVATE BY DESIGN</span><h2>파일은 내 기기에<br />그대로 남습니다.</h2></div></div><p>현재 제공하는 모든 변환은 사용 중인 브라우저 안에서 끝납니다.<br />선택한 파일의 내용과 변환 결과를 운영 서버에 저장하지 않습니다.</p><div className="promise-stats"><div><strong>0</strong><span>파일 서버 전송</span></div><div><strong>0</strong><span>원본 파일 보관</span></div><div><strong>10</strong><span>무료 파일 도구</span></div></div></div></section>
    </main>
  )
}

function LegalLayout({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <main className="legal-page page-shell"><header><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>최종 업데이트: 2026년 8월 8일</p></header><div className="legal-content">{children}</div></main>
}

function SupportPage() {
  return <LegalLayout eyebrow="SUPPORT POLICY" title="지원 범위와 제한"><section><h2>결과를 보장하는 기능</h2><p>일반적인 비암호화 파일을 명시된 용량과 페이지 제한 안에서 처리합니다. PDF 합치기·나누기·회전·페이지 번호, JPG·PNG·WEBP 변환과 압축은 원본 파일을 서버로 보내지 않습니다.</p></section><section><h2>HWP/HWPX는 호환 변환입니다</h2><div className="support-table" role="table" aria-label="HWP 호환 범위"><div role="row"><strong role="columnheader">유지 대상</strong><span role="cell">일반 본문, 줄바꿈, 단순 표의 행·열·테두리</span></div><div role="row"><strong role="columnheader">보장하지 않음</strong><span role="cell">정확한 페이지 배치, 글꼴, 병합 셀, 이미지, 도형, 수식, 차트, 머리글·바닥글</span></div><div role="row"><strong role="columnheader">지원하지 않음</strong><span role="cell">암호·DRM·배포용 문서, 손상 문서, PDF → HWP/HWPX</span></div></div><p>원본과 동일한 결과는 한컴오피스의 “PDF로 저장하기”를 사용해야 합니다.</p></section><section><h2>브라우저 처리 한계</h2><p>대용량 파일은 기기 메모리에 따라 느려질 수 있습니다. 각 도구는 안전 제한을 넘는 파일을 거부하며, 원본 파일을 수정하지 않습니다.</p></section></LegalLayout>
}

function AboutPage() {
  return <LegalLayout eyebrow="ABOUT" title="서비스 소개"><section><h2>파일 문제를 빠르게 정비합니다</h2><p>파일정비소는 설치나 회원가입 없이 이미지와 PDF를 다룰 수 있는 한국어 웹 도구함입니다. 이미지 압축·형식 변환, HEIC 변환, 사진 PDF 만들기, PDF 합치기·나누기·회전·JPG 변환·페이지 번호 추가, HWP/HWPX 호환 PDF 변환을 제공합니다.</p></section><section><h2>파일은 내 기기에서 처리합니다</h2><p>현재 제공하는 변환은 사용자의 브라우저 안에서 실행됩니다. 선택한 원본 파일과 변환 결과를 파일정비소 운영 서버에 업로드하거나 보관하지 않으며, 회원가입도 요구하지 않습니다.</p></section><section><h2>할 수 없는 일은 분명히 알립니다</h2><p>HWP/HWPX 변환처럼 브라우저만으로 원본 레이아웃을 완벽히 재현할 수 없는 기능은 “호환 변환”으로 구분합니다. 지원하지 않는 문서 요소를 변환 전에 안내하고, 정확한 결과가 필요할 때 사용할 대안도 함께 설명합니다.</p></section><section><h2>운영 원칙</h2><p>지원 범위와 제한을 숨기지 않고, 실패 원인을 이해할 수 있는 오류 메시지를 제공하며, 반복 작업에도 예측 가능한 결과를 주는 도구를 지향합니다. 기능 제안과 오류 제보는 <a href="mailto:7yvexon@gmail.com">7yvexon@gmail.com</a>으로 보내 주세요.</p></section></LegalLayout>
}

function PrivacyPage() {
  return <LegalLayout eyebrow="PRIVACY" title="개인정보처리방침"><div className="legal-callout"><strong>적용 법률</strong><p>이 방침은 「개인정보 보호법」 제30조에 따라 서비스가 실제로 처리하는 정보와 이용자의 권리를 설명합니다. 원본 파일은 운영자 서버로 전송되지 않지만, 이메일 문의와 호스팅 접속 기록에는 개인정보가 포함될 수 있습니다.</p></div><section><h2>1. 처리하는 정보와 목적</h2><p>파일정비소는 현재 회원가입, 로그인, 결제, 광고 SDK, 방문 분석 SDK 또는 파일 업로드 API를 운영하지 않습니다. 따라서 서비스 운영자가 원본 파일 내용·파일명·문서 제목을 수집하거나 서버에 저장하지 않습니다. 이메일로 문의하면 발신 이메일 주소와 문의 내용은 답변 및 문제 해결을 위해 처리됩니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제15조(수집·이용), 제16조(최소 수집)</small></section><section><h2>2. 파일 처리 방식</h2><p>사용자가 선택한 이미지와 문서는 사용 중인 브라우저 메모리에서 처리됩니다. 원본 파일과 변환 결과는 파일정비소 운영 서버로 전송하지 않으며, 결과 파일은 사용자가 다운로드할 때 자신의 기기에 저장됩니다. 페이지를 닫거나 새로고침하면 브라우저에 임시로 생성된 데이터는 더 이상 서비스에서 사용할 수 없습니다.</p><small className="law-reference">운영자가 원본 파일을 수집하지 않는 구조로 개인정보 처리 범위를 최소화합니다.</small></section><section><h2>3. 접속 기록과 호스팅 사업자</h2><p>웹사이트에 접속하면 호스팅·CDN 사업자가 보안과 안정적인 전송을 위해 IP 주소, 접속 시각, 요청 URL, 브라우저 정보, 참조 URL 등의 기본 접속 로그를 처리할 수 있습니다. 이는 해당 사업자의 정책과 보관 기준에 따르며, 파일정비소는 해당 로그를 파일 내용과 결합하지 않습니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제15조, 제29조(안전성 확보 조치)</small></section><section><h2>4. 쿠키와 외부 전송</h2><p>파일정비소는 현재 로그인·맞춤 광고·행태 추적을 위한 자체 쿠키를 사용하지 않습니다. 광고, 방문 분석 또는 외부 파일 처리 기능을 도입하는 경우 적용 전에 처리 항목, 목적, 보유 기간, 제3자 제공 또는 국외 이전 여부를 이 방침에 반영하고 필요한 안내와 동의 절차를 마련합니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제17조(제3자 제공), 제18조(목적 외 이용·제공 제한)</small></section><section><h2>5. 보유 기간과 파기</h2><p>문의 이메일은 답변과 분쟁 대응에 필요한 기간 동안 이메일 서비스에 보관될 수 있으며, 목적이 달성되고 별도 보관 의무가 없으면 삭제합니다. 브라우저에서 처리한 파일은 파일정비소 서버에 저장되지 않으므로 운영자가 별도로 파기할 파일 사본이 없습니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제21조(개인정보의 파기)</small></section><section><h2>6. 이용자의 권리</h2><p>이용자는 자신에 관한 문의 정보의 열람, 정정, 삭제 또는 처리 중지를 요청할 수 있습니다. 요청자의 본인 여부와 관련 기록을 확인한 뒤 관련 법령이 허용하는 범위에서 처리합니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제35조·제36조·제37조</small></section><section><h2>7. 안전성 확보 조치</h2><p>파일을 브라우저 내부에서 처리하도록 설계하고, 비정상적으로 큰 파일과 손상된 문서를 제한하며, 배포 과정에서 의존성 취약점과 오류를 점검합니다. 문의 시 주민등록번호, 금융정보, 의료정보 등 불필요한 민감정보나 원본 문서를 보내지 마세요.</p><small className="law-reference">관련 기준: 개인정보 보호법 제29조</small></section><section><h2>8. 문의 및 방침 변경</h2><p>개인정보 관련 요청은 <a href="mailto:7yvexon@gmail.com">7yvexon@gmail.com</a>으로 보내 주세요. 이 방침은 2026년 8월 8일부터 적용되며, 중요한 변경이 있으면 적용 전에 사이트를 통해 알립니다.</p><small className="law-reference">관련 기준: 개인정보 보호법 제30조(처리방침의 수립 및 공개)</small></section></LegalLayout>
}

function TermsPage() {
  return <LegalLayout eyebrow="TERMS" title="이용약관"><section><h2>1. 목적과 적용</h2><p>이 약관은 파일정비소가 제공하는 브라우저 기반 파일 변환·편집 서비스의 이용 조건과 운영자 및 이용자의 권리·책임을 정합니다. 서비스를 이용하면 이 약관과 각 도구에 표시된 지원 범위에 동의한 것으로 봅니다.</p></section><section><h2>2. 서비스 내용</h2><p>파일정비소는 이미지 압축·변환과 PDF 편집, HWP/HWPX 호환 PDF 변환 등의 도구를 현재 무료로 제공합니다. 별도 표시가 없는 한 파일 처리는 이용자의 브라우저에서 이루어집니다. 도구별 파일 크기, 개수, 페이지 수 및 지원 형식 제한이 적용됩니다.</p></section><section><h2>3. 이용자의 의무</h2><p>이용자는 자신이 소유하거나 처리 권한을 가진 파일만 사용해야 하며, 저작권·개인정보·영업비밀 등 제3자의 권리를 침해해서는 안 됩니다. 중요한 파일은 사용 전에 원본을 별도로 보관하고, 결과물을 제출·인쇄·공유하기 전에 정확성과 누락 여부를 직접 확인해야 합니다.</p></section><section><h2>4. 변환 결과와 제한</h2><p>브라우저, 기기 성능, 파일 구조, 글꼴 및 지원하지 않는 문서 요소에 따라 결과가 달라질 수 있습니다. 특히 HWP/HWPX 기능은 내용 확인을 위한 호환 변환이며 원본의 글꼴·페이지 배치·이미지·도형·수식·병합 셀 등을 완전히 재현하지 않습니다. 정확한 원본 재현이 필요한 경우 문서 작성 프로그램의 공식 PDF 저장 기능을 사용해야 합니다.</p></section><section><h2>5. 금지 행위</h2><p>불법 자료의 처리, 악성 파일 배포, 서비스 또는 다른 이용자의 기기 방해, 자동화된 과도한 요청, 보안 기능 우회, 취약점 악용, 서비스 사칭과 제3자의 권리를 침해하는 행위를 금지합니다.</p></section><section><h2>6. 서비스의 변경과 중단</h2><p>보안 사고 대응, 점검, 브라우저 호환성, 기술적·운영상 필요에 따라 기능이나 지원 범위를 변경하거나 일시 중단할 수 있습니다. 이용자에게 중대한 영향을 주는 계획된 변경은 가능한 범위에서 사이트를 통해 미리 안내합니다.</p></section><section><h2>7. 지식재산권</h2><p>이용자가 선택한 파일과 변환 결과에 관한 권리는 해당 권리자에게 유지됩니다. 파일정비소의 상호, 화면 구성, 문구와 프로그램에 관한 권리는 운영자 또는 적법한 권리자에게 있으며, 관련 법령이나 별도 라이선스가 허용한 범위를 넘어 복제하거나 사칭할 수 없습니다.</p></section><section><h2>8. 책임의 범위</h2><p>파일정비소는 각 도구에 명시한 범위에서 서비스를 제공하기 위해 합리적으로 노력합니다. 다만 무료 서비스의 기술적 한계, 이용자의 환경이나 파일 자체의 문제, 천재지변 또는 통제할 수 없는 외부 서비스 장애로 발생한 손해에 대해서는 관련 법령이 허용하는 범위에서 책임이 제한될 수 있습니다. 운영자의 고의 또는 중대한 과실에 따른 책임까지 배제하지 않습니다.</p></section><section><h2>9. 약관 변경과 준거법</h2><p>약관을 변경할 경우 적용일과 주요 변경 내용을 사이트에 알립니다. 이 약관은 대한민국 법령에 따르며, 분쟁이 발생하면 당사자 간 협의를 우선하고 해결되지 않는 경우 관련 법령이 정한 절차와 관할에 따릅니다. 약관 문의는 <a href="mailto:7yvexon@gmail.com">7yvexon@gmail.com</a>으로 보내 주세요.</p></section></LegalLayout>
}

function LegalNoticePage() {
  return <LegalLayout eyebrow="LEGAL NOTICE" title="법적 고지"><div className="legal-callout"><strong>먼저 확인하세요</strong><p>아래 내용은 현재 파일정비소의 기능과 운영 방식에 맞춘 일반적인 법적 안내이며 개별 사안에 대한 법률 자문은 아닙니다. 유료 결제, 광고, 회원가입 또는 서버 업로드 기능을 추가하면 정책과 의무를 다시 검토해야 합니다.</p></div><section><h2>개인정보 보호의 기본 법률</h2><p>현재 개인정보 관련 운영 기준은 주로 「개인정보 보호법」입니다. 파일정비소는 제30조에 맞춰 처리방침을 공개하고, 문의 이메일을 처리할 때 제15조와 제16조의 적법한 처리·최소 수집 원칙을 따르며, 불필요해진 정보는 제21조에 따라 파기하고, 제29조의 안전성 확보 조치를 적용합니다. 이용자의 열람·정정·삭제·처리정지 요청은 제35조부터 제37조까지를 기준으로 안내합니다.</p><a className="law-link" href="https://www.law.go.kr/법령/개인정보보호법" target="_blank" rel="noreferrer">국가법령정보센터에서 개인정보 보호법 확인 ↗</a></section><section><h2>정보통신망법은 이렇게 구분합니다</h2><p>「정보통신망법」을 개인정보처리방침의 근거처럼 무조건 나열하면 오히려 부정확할 수 있습니다. 현재 파일정비소에는 게시판이나 이용자 파일 공개·유통 기능이 없으므로 불법정보 유통을 다루는 제44조의7이 핵심 운영 조항은 아닙니다. 향후 파일 공유, 공개 링크 또는 게시 기능을 추가할 때 해당 법률의 적용 범위를 별도로 검토합니다.</p><a className="law-link" href="https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률" target="_blank" rel="noreferrer">국가법령정보센터에서 정보통신망법 확인 ↗</a></section><section><h2>저작권과 파일 사용 권한</h2><p>변환 도구를 사용한다는 사실만으로 저작권 문제가 생기는 것은 아니지만, 권한 없이 타인의 저작물을 복제·배포하거나 2차적 저작물을 작성하면 권리를 침해할 수 있습니다. 이용약관에서 사용자가 소유하거나 처리 권한을 가진 파일만 사용하도록 안내하며, 침해 행위에는 「저작권법」 제136조 등 관련 규정이 적용될 수 있습니다.</p><a className="law-link" href="https://www.law.go.kr/법령/저작권법" target="_blank" rel="noreferrer">국가법령정보센터에서 저작권법 확인 ↗</a></section><section><h2>유료화 전에 추가할 내용</h2><p>현재 서비스는 무료이며 결제를 받지 않습니다. 구독이나 유료 변환권을 판매하면 「전자상거래법」 제13조에 따른 사업자 신원·거래조건 표시, 청약철회와 환불 기준, 결제 및 소비자 분쟁 처리 절차를 이용약관과 결제 화면에 추가해야 합니다. 실제 판매 방식이 정해진 뒤 통신판매업 신고 대상 여부도 확인해야 합니다.</p><a className="law-link" href="https://www.law.go.kr/법령/전자상거래등에서의소비자보호에관한법률" target="_blank" rel="noreferrer">국가법령정보센터에서 전자상거래법 확인 ↗</a></section></LegalLayout>
}

function ContactPage() {
  const candidate = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? ''
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '7yvexon@gmail.com'
  return <LegalLayout eyebrow="CONTACT" title="문의하기"><section><h2>일반 문의와 기능 제안</h2><p>파일정비소의 사용 방법, 지원 형식, 기능 제안과 운영 관련 문의는 아래 이메일로 보내 주세요. 문의 성격과 사용한 도구 이름을 제목에 적으면 내용을 확인하는 데 도움이 됩니다.</p><a className="button primary contact-link" href={`mailto:${email}?subject=${encodeURIComponent('[파일정비소 문의] ')}`}>{email}로 문의하기</a></section><section><h2>오류를 제보할 때</h2><p>사용한 도구, 운영체제, 브라우저 이름과 버전, 화면에 표시된 오류 문구, 오류가 발생하기까지의 순서를 적어 주세요. 원본 문서와 주민등록번호·연락처·의료정보 같은 개인정보는 보내지 말고, 꼭 필요하다면 개인정보를 제거한 재현용 파일만 첨부해 주세요.</p></section><section><h2>보안과 개인정보 문제</h2><p>취약점이나 개인정보 문제는 공개 게시글에 상세 내용을 남기지 말고 이메일로 비공개 제보해 주세요. 문제의 위치, 재현 방법, 예상되는 영향을 함께 보내되 실제 이용자 데이터에 접근하거나 서비스를 방해하는 테스트는 하지 마세요.</p></section></LegalLayout>
}
