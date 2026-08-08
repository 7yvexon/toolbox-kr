import { guideByPath, guides, type Guide, type GuidePath } from '../content/guides'
import { toolEducation as toolContent } from '../content/toolEducation'

export function GuidesIndex() {
  return (
    <main className="guides-page page-shell">
      <header className="guides-hero">
        <span className="eyebrow">PRACTICAL GUIDES</span>
        <h1>파일 작업을<br />실수 없이 끝내는 방법</h1>
        <p>형식만 바꾸는 방법보다 결과를 확인하고 안전하게 제출하는 기준까지 설명합니다.</p>
      </header>
      <section className="guide-index-intro" aria-labelledby="guide-index-heading">
        <div><span>처음이라면</span><h2 id="guide-index-heading">작업 전에 3가지만 확인하세요</h2></div>
        <ol><li><strong>원본 보관</strong><span>결과를 확인하기 전까지 원본 파일을 지우지 않습니다.</span></li><li><strong>지원 범위</strong><span>암호, 파일 형식과 페이지 제한을 먼저 확인합니다.</span></li><li><strong>결과 검수</strong><span>다운로드한 파일을 다시 열어 누락과 방향을 검사합니다.</span></li></ol>
      </section>
      <section className="guide-card-grid" aria-label="파일 작업 가이드">
        {guides.map((guide, index) => <GuideCard guide={guide} index={index} key={guide.path} />)}
      </section>
    </main>
  )
}

function GuideCard({ guide, index }: { guide: Guide; index: number }) {
  return <a className="guide-card" href={guide.path}><span className="guide-card-top"><span>{guide.category}</span><small>{String(index + 1).padStart(2, '0')}</small></span><strong>{guide.title}</strong><p>{guide.description}</p><span className="guide-card-bottom">읽는 시간 {guide.readTime}<b>→</b></span></a>
}

export function GuideArticle({ path }: { path: GuidePath }) {
  const guide = guideByPath[path]
  return (
    <main className="article-page page-shell">
      <nav className="breadcrumbs" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/guides">가이드</a><span>›</span><span>{guide.category}</span></nav>
      <article>
        <header className="article-header"><div className="article-meta"><span>{guide.category}</span><span>읽는 시간 {guide.readTime}</span><span>2026년 8월 8일 업데이트</span></div><h1>{guide.title}</h1><p>{guide.intro}</p></header>
        <section className="article-summary" aria-labelledby="summary-title"><span>핵심 정리</span><h2 id="summary-title">먼저 기억할 내용</h2><ul>{guide.takeaways.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <div className="article-body">
          {guide.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}
        </div>
        <section className="article-cta"><div><span>바로 작업하기</span><h2>파일은 서버에 올리지 않고<br />내 브라우저에서 처리합니다.</h2></div><a className="button primary" href={guide.toolPath}>무료 도구 열기</a></section>
        <section className="article-faq" aria-labelledby="faq-title"><span className="eyebrow">FAQ</span><h2 id="faq-title">자주 묻는 질문</h2><div>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
      </article>
      <aside className="related-guides" aria-labelledby="related-title"><div><span className="eyebrow">KEEP READING</span><h2 id="related-title">함께 읽으면 좋은 글</h2></div><div>{guide.related.map((relatedPath) => { const related = guideByPath[relatedPath]; return <a href={related.path} key={related.path}><span>{related.category}</span><strong>{related.title}</strong><b>→</b></a> })}</div></aside>
      <p className="content-note">이 글은 일반적인 파일 작업 기준을 설명합니다. 중요한 제출물은 해당 기관의 지침과 원본 프로그램의 결과를 우선 확인하세요.</p>
    </main>
  )
}

export function ToolEducation({ path }: { path: string }) {
  const entry = (awaitEntry(path))
  if (!entry) return null
  return (
    <section className="tool-education" aria-label="도구 사용 안내">
      <div className="education-column"><span className="eyebrow">WHEN TO USE</span><h2>이럴 때 사용하세요</h2><ul>{entry.bestFor.map((item) => <li key={item}>{item}</li>)}</ul></div>
      <div className="education-column warning"><span className="eyebrow">BEFORE YOU START</span><h2>처리 전에 확인하세요</h2><ul>{entry.limits.map((item) => <li key={item}>{item}</li>)}</ul></div>
      <div className="tool-faq"><span className="eyebrow">QUICK FAQ</span><h2>자주 묻는 질문</h2>{entry.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}<a href={entry.guidePath}>자세한 작업 가이드 읽기 <b>→</b></a></div>
    </section>
  )
}

function awaitEntry(path: string) {
  // Kept as a small lookup helper so tool pages stay independent from the router.
  return toolContent[path]
}
