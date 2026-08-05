import { describe, expect, it } from 'vitest'
import { hwpOutputName, validateHwpFile } from './hwp'

const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])

describe('HWP file validation', () => {
  it('accepts matching HWP and HWPX signatures', async () => {
    await expect(validateHwpFile(new File([oleHeader], '문서.hwp', { type: 'application/x-hwp' }))).resolves.toBeUndefined()
    await expect(validateHwpFile(new File([zipHeader], '문서.hwpx', { type: 'application/zip' }))).resolves.toBeUndefined()
  })

  it('rejects renamed files with mismatched signatures', async () => {
    await expect(validateHwpFile(new File([zipHeader], '가짜.hwp', { type: 'application/octet-stream' }))).rejects.toThrow('실제 한글 문서 형식')
  })

  it('creates a clean PDF filename', () => {
    expect(hwpOutputName('보고서.HWPX')).toBe('보고서.pdf')
  })
})
