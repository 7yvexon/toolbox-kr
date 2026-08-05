import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { addPdfPageNumbers, extractPdfRange, mergePdfFiles, rotatePdfPages } from './pdfOperations'

async function makePdfFile(pageCount: number, filename = 'fixture.pdf') {
  const document = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) document.addPage([595, 842])
  const bytes = await document.save()
  return new File([new Uint8Array(bytes)], filename, { type: 'application/pdf' })
}

describe('PDF operations', () => {
  it('merges every page in the selected document order', async () => {
    const merged = await mergePdfFiles([await makePdfFile(2, 'first.pdf'), await makePdfFile(3, 'second.pdf')])
    expect(merged.getPageCount()).toBe(5)
  })

  it('extracts an inclusive one-based page range', async () => {
    const extracted = await extractPdfRange(await makePdfFile(5), 2, 4)
    expect(extracted.getPageCount()).toBe(3)
  })

  it('rotates every page while preserving the page count', async () => {
    const rotated = await rotatePdfPages(await makePdfFile(2), 90)
    expect(rotated.getPageCount()).toBe(2)
    expect(rotated.getPages().every((page) => page.getRotation().angle === 90)).toBe(true)
  })

  it('adds page numbers and produces a readable PDF', async () => {
    const numbered = await addPdfPageNumbers(await makePdfFile(3), 5, 'bottom')
    const saved = await numbered.save()
    const reopened = await PDFDocument.load(saved)
    expect(reopened.getPageCount()).toBe(3)
    expect(saved.byteLength).toBeGreaterThan(0)
  })

  it('rejects invalid extraction ranges and rotation angles', async () => {
    const fixture = await makePdfFile(2)
    await expect(extractPdfRange(fixture, 2, 1)).rejects.toThrow('올바르게')
    await expect(rotatePdfPages(fixture, 45)).rejects.toThrow('지원하지 않는')
  })
})
