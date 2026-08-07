import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { hwpOutputName, validateHwpFile } from './hwp'

const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
const createHwpx = async () => {
  const zip = new JSZip()
  zip.file('Contents/section0.xml', '<hp:section xmlns:hp="urn:test"><hp:p><hp:run><hp:t>본문</hp:t></hp:run></hp:p></hp:section>')
  return new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
}

describe('HWP file validation', () => {
  it('accepts matching HWP and HWPX signatures', async () => {
    await expect(validateHwpFile(new File([oleHeader], '문서.hwp', { type: 'application/x-hwp' }))).resolves.toBeUndefined()
    await expect(validateHwpFile(new File([await createHwpx()], '문서.hwpx', { type: 'application/zip' }))).resolves.toBeUndefined()
  })

  it('rejects renamed files with mismatched signatures', async () => {
    await expect(validateHwpFile(new File([await createHwpx()], '가짜.hwp', { type: 'application/octet-stream' }))).rejects.toThrow('실제 한글 문서 형식')
  })

  it('rejects an ordinary ZIP renamed to HWPX', async () => {
    const zip = new JSZip()
    zip.file('notes.txt', 'not a document')
    const bytes = new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
    await expect(validateHwpFile(new File([bytes], '가짜.hwpx', { type: 'application/zip' }))).rejects.toThrow('HWPX 본문')
  })

  it('creates a clean PDF filename', () => {
    expect(hwpOutputName('보고서.HWPX')).toBe('보고서_호환.pdf')
  })
})
