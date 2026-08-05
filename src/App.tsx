import { lazy, Suspense, useEffect, useState } from 'react'

const ImageCompressor = lazy(() => import('./tools/ImageCompressor'))
const HeicConverter = lazy(() => import('./tools/HeicConverter'))
const ImagesToPdf = lazy(() => import('./tools/ImagesToPdf'))

type Route = '/' | '/image-compress' | '/heic-to-jpg' | '/images-to-pdf'
const tools = [
  { path: '/image-compress' as Route, icon: '↘', tone: 'lime', title: '이미지 용량 줄이기', description: '화질은 그대로, 파일은 가볍게', meta: 'JPG · PNG · WEBP' },
  { path: '/heic-to-jpg' as Route, icon: 'H', tone: 'orange', title: 'HEIC → JPG', description: '아이폰 사진을 호환되는 형식으로', meta: 'HEIC · HEIF' },
  { path: '/images-to-pdf' as Route, icon: 'P', tone: 'blue', title: '사진 → PDF', description: '여러 사진을 한 문서로 깔끔하게', meta: '최대 30장' },
]
const routeInfo: Record<Route, { title: string; description: string }> = {
  '/': { title: '파일뚝딱 — 안전한 이미지·PDF 도구', description: '이미지 압축, HEIC JPG 변환, 이미지 PDF 변환을 설치 없이 안전하게 처리하세요.' },
  '/image-compress': { title: '이미지 용량 줄이기 — 파일뚝딱', description: 'JPG, PNG, WEBP 이미지의 용량을 브라우저에서 안전하게 줄이세요.' },
  '/heic-to-jpg': { title: 'HEIC JPG 변환 — 파일뚝딱', description: '아이폰 HEIC 사진을 설치 없이 JPG로 변환하세요.' },
  '/images-to-pdf': { title: '사진 PDF 변환 — 파일뚝딱', description: '여러 장의 사진을 하나의 PDF 문서로 변환하세요.' },
}

export default function App() {
  const getRoute = () => (Object.keys(routeInfo).includes(window.location.pathname) ? window.location.pathname : '/') as Route
  const [route, setRoute] = useState<Route>(getRoute)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const pop = () => setRoute(getRoute())
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  useEffect(() => {
    const info = routeInfo[route]
    document.title = info.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', info.description)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [route])

  const navigate = (path: Route) => {
    window.history.pushState({}, '', path)
    setRoute(path)
    setMenuOpen(false)
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="nav-shell">
          <button className="brand" type="button" onClick={() => navigate('/')} aria-label="파일뚝딱 홈"><span className="brand-mark"><i></i><i></i></span><span>파일<strong>뚝딱</strong></span></button>
          <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'}>
            {tools.map((tool) => <button className={route === tool.path ? 'active' : ''} type="button" key={tool.path} onClick={() => navigate(tool.path)}>{tool.title}</button>)}
          </nav>
          <div className="header-safe"><span></span>내 기기에서 안전 처리</div>
          <button className="menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="메뉴 열기">☰</button>
        </div>
      </header>
      {route === '/' && <Home navigate={navigate} />}
      <Suspense fallback={<div className="route-loading"><span></span>도구를 준비하고 있어요…</div>}>
        {route === '/image-compress' && <ImageCompressor />}
        {route === '/heic-to-jpg' && <HeicConverter />}
        {route === '/images-to-pdf' && <ImagesToPdf />}
      </Suspense>
      <footer className="site-footer"><div className="footer-inner"><div><span className="footer-logo">파일뚝딱</span><p>복잡한 파일 작업을 가볍고 안전하게.</p></div><div className="footer-note"><span>100% 브라우저 처리</span><span>서버 저장 없음</span><span>회원가입 없음</span></div></div></footer>
    </div>
  )
}

function Home({ navigate }: { navigate: (path: Route) => void }) {
  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <div className="hero-kicker"><span></span>설치 없이, 회원가입 없이</div>
          <h1>파일 작업,<br /><em>여기서 뚝딱.</em></h1>
          <p>사진 용량부터 PDF 변환까지.<br />내 파일은 내 기기에서만 안전하게 처리돼요.</p>
          <div className="hero-actions"><button className="button primary" type="button" onClick={() => navigate('/image-compress')}>가장 많이 쓰는 도구 <span>→</span></button><span>무료 · 횟수 제한 없음</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div className="art-card card-back"><span>4.8 MB</span><strong>IMG_2841.HEIC</strong></div>
          <div className="art-card card-front"><div className="mini-picture"></div><span className="spark">✦</span><div><small>변환 완료</small><strong>642 KB</strong></div><b>−87%</b></div>
          <div className="art-sticker">파일은<br /><strong>내 기기에만</strong></div>
        </div>
      </section>
      <section className="tools-section page-shell">
        <div className="section-heading"><div><span className="eyebrow">QUICK TOOLS</span><h2>지금 필요한 도구</h2></div><p>자주 쓰는 기능부터<br />하나씩 더해가고 있어요.</p></div>
        <div className="tool-card-grid">
          {tools.map((tool, index) => (
            <button className={`tool-card ${tool.tone}`} key={tool.path} type="button" onClick={() => navigate(tool.path)}>
              <span className="tool-index">0{index + 1}</span><span className="tool-icon">{tool.icon}</span>
              <span className="tool-copy"><strong>{tool.title}</strong><span>{tool.description}</span></span>
              <span className="tool-meta">{tool.meta}</span><span className="tool-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className="promise-section"><div className="page-shell promise-inner">
        <div className="promise-title"><span className="privacy-large-icon">✓</span><div><span className="eyebrow">PRIVACY FIRST</span><h2>업로드하지 않는 게<br />가장 안전하니까.</h2></div></div>
        <p>모든 변환은 사용 중인 브라우저 안에서 끝납니다.<br />사진도, 문서도 저희 서버로 전송되지 않아요.</p>
        <div className="promise-stats"><div><strong>0</strong><span>서버 전송</span></div><div><strong>0</strong><span>파일 보관</span></div><div><strong>∞</strong><span>무료 사용</span></div></div>
      </div></section>
    </main>
  )
}
