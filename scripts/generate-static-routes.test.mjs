/**
 * 프리렌더 산출물(dist)의 SEO 표기가 의도대로 나오는지 실제 스크립트를 실행해 확인합니다.
 *
 * Cloudflare Pages는 `/pdf-merge` → `/pdf-merge/` 308 리다이렉트를 걸기 때문에
 * canonical, sitemap `<loc>`, 프리렌더 내부 링크가 모두 슬래시로 끝나야 합니다.
 * 빌드된 `dist/`를 건드리지 않도록 임시 디렉터리에서 생성기를 실행합니다.
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withTrailingSlash as runtimeWithTrailingSlash } from '../src/lib/seoUrls'
import { absoluteUrl, stripBrandSuffix, withTrailingSlash } from './seo-urls.mjs'

const execFileAsync = promisify(execFile)
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const siteUrl = 'https://seo-test.example'
const rootUrl = `${siteUrl}/`

const readDist = async (workdir, path) => readFile(join(workdir, 'dist', path), 'utf8')
const extractLocs = (sitemap) => [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
const extractJsonLd = (html) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]))
const graphNodes = (html) => extractJsonLd(html).flatMap((block) => block['@graph'] ?? [block])
const anchorHrefs = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((match) => match[1])

let workdir

beforeAll(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'static-routes-'))
  await mkdir(join(workdir, 'dist'), { recursive: true })
  // Vite가 만드는 dist/index.html 자리에 저장소의 index.html 템플릿을 둡니다.
  await writeFile(join(workdir, 'dist', 'index.html'), await readFile(join(repoRoot, 'index.html'), 'utf8'))
  await execFileAsync(process.execPath, [join(repoRoot, 'scripts', 'generate-static-routes.mjs')], {
    cwd: workdir,
    env: { ...process.env, NODE_ENV: 'production', VITE_SITE_URL: siteUrl },
  })
}, 60_000)

afterAll(async () => {
  if (workdir) await rm(workdir, { recursive: true, force: true })
})

describe('url rules', () => {
  it('keeps the root bare and gives every other route a trailing slash', () => {
    expect(withTrailingSlash('/')).toBe('/')
    expect(withTrailingSlash('/pdf-merge')).toBe('/pdf-merge/')
    expect(withTrailingSlash('/pdf-merge/')).toBe('/pdf-merge/')
    expect(withTrailingSlash('/guides/pdf-merge')).toBe('/guides/pdf-merge/')
    expect(absoluteUrl(siteUrl, '/pdf-merge')).toBe(`${siteUrl}/pdf-merge/`)
  })

  it('uses the same rule as the React runtime helper', () => {
    for (const route of ['/', '/pdf-merge', '/pdf-merge/', '/guides/hwp-to-pdf', '/about']) {
      expect(runtimeWithTrailingSlash(route)).toBe(withTrailingSlash(route))
    }
  })

  it('drops the brand suffix from page headings', () => {
    expect(stripBrandSuffix('PDF 합치기 - 파일정비소')).toBe('PDF 합치기')
    expect(stripBrandSuffix('PDF 합치기')).toBe('PDF 합치기')
  })
})

describe('prerendered output', () => {
  it('lists only first-class urls in the sitemap', async () => {
    const locs = extractLocs(await readDist(workdir, 'sitemap.xml'))
    expect(locs.length).toBeGreaterThanOrEqual(28)
    expect(locs).toContain(rootUrl)
    expect(locs.filter((loc) => loc !== rootUrl).every((loc) => loc.endsWith('/'))).toBe(true)
    expect(locs.some((loc) => loc === `${siteUrl}/pdf-merge`)).toBe(false)
  })

  it('writes every route as a directory index with a matching canonical', async () => {
    const rootHtml = await readDist(workdir, 'index.html')
    expect(rootHtml).toContain(`<link rel="canonical" href="${rootUrl}" />`)

    const toolHtml = await readDist(workdir, 'pdf-merge/index.html')
    expect(toolHtml).toContain(`<link rel="canonical" href="${siteUrl}/pdf-merge/" />`)
    expect(toolHtml).toContain(`<meta property="og:url" content="${siteUrl}/pdf-merge/" />`)

    const guideHtml = await readDist(workdir, 'guides/pdf-merge/index.html')
    expect(guideHtml).toContain(`<link rel="canonical" href="${siteUrl}/guides/pdf-merge/" />`)
  })

  it('links internally with trailing slashes so crawlers never hit a 308', async () => {
    for (const path of ['index.html', 'pdf-merge/index.html', 'guides/pdf-merge/index.html', 'about/index.html']) {
      const hrefs = anchorHrefs(await readDist(workdir, path)).filter((href) => href.startsWith('/'))
      expect(hrefs.length).toBeGreaterThan(0)
      expect(hrefs.filter((href) => href !== '/' && !href.endsWith('/'))).toEqual([])
    }
  })

  it('describes tool pages with SoftwareApplication and BreadcrumbList', async () => {
    const nodes = graphNodes(await readDist(workdir, 'pdf-merge/index.html'))
    const app = nodes.find((node) => node['@type'] === 'SoftwareApplication')
    expect(app).toBeDefined()
    expect(app.name).toBe('PDF 합치기')
    expect(app.url).toBe(`${siteUrl}/pdf-merge/`)
    expect(app.applicationCategory).toBe('UtilitiesApplication')
    expect(app.operatingSystem).toBe('Web')
    expect(app.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'KRW' })

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb.itemListElement.map((item) => item.item)).toEqual([rootUrl, `${siteUrl}/pdf-merge/`])
    expect(breadcrumb.itemListElement.map((item) => item.position)).toEqual([1, 2])
  })

  it('gives guide pages a three-level breadcrumb and no SoftwareApplication', async () => {
    const nodes = graphNodes(await readDist(workdir, 'guides/pdf-merge/index.html'))
    expect(nodes.some((node) => node['@type'] === 'SoftwareApplication')).toBe(false)
    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb.itemListElement.map((item) => item.item)).toEqual([rootUrl, `${siteUrl}/guides/`, `${siteUrl}/guides/pdf-merge/`])
    expect(breadcrumb.itemListElement.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('leaves policy pages with a breadcrumb but no application markup', async () => {
    const nodes = graphNodes(await readDist(workdir, 'about/index.html'))
    expect(nodes.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true)
    expect(nodes.some((node) => node['@type'] === 'SoftwareApplication')).toBe(false)
  })

  it('keeps the home page website markup and adds no duplicate graph', async () => {
    const html = await readDist(workdir, 'index.html')
    expect(html).toContain('id="website-structured-data"')
    expect(html).not.toContain('id="static-route-structured-data"')
    expect(graphNodes(html).map((node) => node['@type'])).toEqual(['WebSite'])
  })

  it('matches the prerendered h1 to the heading the app renders', async () => {
    const guideHtml = await readDist(workdir, 'guides/pdf-merge/index.html')
    const h1 = guideHtml.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''
    expect(h1).toBe('PDF 합치기 전에 확인해야 할 페이지 순서와 보안')
    expect(h1).not.toContain('파일정비소')
  })
})

describe('404 page', () => {
  it('ships a Korean not-found page that links back to the tools', async () => {
    const html = await readFile(join(repoRoot, 'public', '404.html'), 'utf8')
    expect(html).toContain('lang="ko"')
    expect(html).toContain('페이지를 찾을 수 없습니다')
    expect(html).toContain('name="robots" content="noindex,follow"')
    expect(anchorHrefs(html)).toContain('/')
  })
})
