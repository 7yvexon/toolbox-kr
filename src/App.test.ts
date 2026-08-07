import { describe, expect, it } from 'vitest'
import { routeInfo, tools } from './App'

describe('tool catalog', () => {
  it('publishes ten distinct browser tools on the home screen', () => {
    expect(tools).toHaveLength(10)
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(tools.length)
  })

  it('includes the practical PDF workflows', () => {
    const paths = tools.map((tool) => tool.path)
    expect(paths).toEqual(expect.arrayContaining(['/pdf-merge', '/pdf-split', '/pdf-rotate', '/pdf-to-jpg', '/pdf-page-numbers']))
  })

  it('includes client-side HWP to PDF conversion', () => {
    expect(tools.map((tool) => tool.path)).toContain('/hwp-to-pdf')
    expect(tools.find((tool) => tool.path === '/hwp-to-pdf')?.meta).toBe('정밀 변환 아님')
  })

  it('publishes support and policy routes', () => {
    expect(Object.keys(routeInfo)).toEqual(expect.arrayContaining(['/about', '/support', '/privacy', '/terms', '/legal', '/contact']))
  })

  it('uses the 파일정비소 brand on every route', () => {
    expect(Object.values(routeInfo).every((route) => route.title.includes('파일정비소'))).toBe(true)
  })
})
