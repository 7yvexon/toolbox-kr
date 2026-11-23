/**
 * 파일정비소 URL 표기 규칙.
 *
 * 모든 페이지는 `<route>/index.html` 정적 파일로 생성되므로, Cloudflare Pages는
 * `/pdf-merge` 요청을 `/pdf-merge/`로 308 리다이렉트합니다. canonical, sitemap,
 * 내부 링크가 슬래시 없는 주소를 가리키면 구글에는 "리디렉션되는 주소"가 대표
 * 주소로 제출됩니다. 그래서 루트(`/`)를 제외한 모든 주소는 슬래시로 끝나는
 * 형태를 하나의 표기로 사용합니다.
 *
 * 같은 규칙이 `scripts/seo-urls.mjs`(프리렌더 스크립트)에도 있습니다.
 * 두 구현의 일치는 `scripts/generate-static-routes.test.mjs`가 확인합니다.
 */
export const withTrailingSlash = (path: string): string =>
  path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`
