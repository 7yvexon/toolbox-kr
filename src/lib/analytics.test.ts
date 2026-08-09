import { describe, expect, it } from 'vitest'
import { fileSizeBucket, itemCountBucket, pageCountBucket } from './analytics'

describe('analytics buckets', () => {
  it('groups file sizes without exposing exact sizes', () => {
    expect(fileSizeBucket(10 * 1024 * 1024)).toBe('10MB 이하')
    expect(fileSizeBucket(11 * 1024 * 1024)).toBe('10~50MB')
    expect(fileSizeBucket(75 * 1024 * 1024)).toBe('50~100MB')
    expect(fileSizeBucket(101 * 1024 * 1024)).toBe('100MB 초과')
  })

  it('groups item and page counts', () => {
    expect(itemCountBucket(1)).toBe('1개')
    expect(itemCountBucket(7)).toBe('6~10개')
    expect(pageCountBucket(20)).toBe('6~20쪽')
    expect(pageCountBucket(51)).toBe('51쪽 이상')
  })
})

