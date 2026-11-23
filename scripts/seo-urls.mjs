/**
 * URL 표기 규칙 (프리렌더 스크립트용).
 *
 * 모든 페이지는 `<route>/index.html` 정적 파일로 생성되므로, Cloudflare Pages는
 * `/pdf-merge` 요청을 `/pdf-merge/`로 308 리다이렉트합니다. canonical, sitemap,
 * 내부 링크가 슬래시 없는 주소를 가리키면 구글에는 "리디렉션되는 주소"가 대표
 * 주소로 제출됩니다. 그래서 루트(`/`)를 제외한 모든 주소는 슬래시로 끝나는
 * 형태를 하나의 표기로 사용합니다.
 *
 * 같은 규칙이 `src/lib/seoUrls.ts`(React 런타임)에도 있습니다.
 * 두 구현의 일치는 `scripts/generate-static-routes.test.mjs`가 확인합니다.
 */

/** 루트는 `/`, 나머지는 끝에 슬래시를 붙인 경로를 돌려줍니다. */
export const withTrailingSlash = (route) => (route === '/' ? '/' : `${route.replace(/\/+$/, '')}/`)

/** 사이트 기준 URL과 경로를 합쳐 절대 주소를 만듭니다. */
export const absoluteUrl = (siteUrl, route) => `${siteUrl.replace(/\/+$/, '')}${withTrailingSlash(route)}`

/** 페이지 제목에서 ` - 파일정비소` 브랜드 접미사를 떼어냅니다. */
export const stripBrandSuffix = (title) => title.replace(/\s+-\s+파일정비소$/, '')
