import { describe, expect, it } from 'vitest'
import { tools } from './App'

describe('tool catalog', () => {
  it('publishes nine distinct browser tools on the home screen', () => {
    expect(tools).toHaveLength(9)
    expect(new Set(tools.map((tool) => tool.path)).size).toBe(tools.length)
  })

  it('includes the practical PDF workflows', () => {
    const paths = tools.map((tool) => tool.path)
    expect(paths).toEqual(expect.arrayContaining(['/pdf-merge', '/pdf-split', '/pdf-rotate', '/pdf-to-jpg', '/pdf-page-numbers']))
  })
})
