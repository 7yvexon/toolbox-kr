import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { loadPdf, PDF_LIMITS } from './pdf'

export async function mergePdfFiles(files: File[]) {
  const output = await PDFDocument.create()
  let totalPages = 0
  for (const file of files) {
    const source = await loadPdf(file)
    totalPages += source.getPageCount()
    if (totalPages > PDF_LIMITS.maxMergedPages) {
      throw new Error(`합친 결과는 최대 ${PDF_LIMITS.maxMergedPages}페이지까지 만들 수 있습니다.`)
    }
    const pages = await output.copyPages(source, source.getPageIndices())
    pages.forEach((page) => output.addPage(page))
  }
  return output
}

export async function extractPdfRange(file: File, startPage: number, endPage: number) {
  const source = await loadPdf(file)
  const pageCount = source.getPageCount()
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage > pageCount || startPage > endPage) {
    throw new Error('시작 페이지와 끝 페이지를 올바르게 입력해 주세요.')
  }
  const output = await PDFDocument.create()
  const indices = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage - 1 + index)
  const pages = await output.copyPages(source, indices)
  pages.forEach((page) => output.addPage(page))
  return output
}

export async function rotatePdfPages(file: File, rotation: number) {
  if (![90, 180, 270].includes(rotation)) throw new Error('지원하지 않는 회전 각도입니다.')
  const document = await loadPdf(file)
  document.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + rotation) % 360)))
  return document
}

export async function addPdfPageNumbers(file: File, startNumber: number, position: 'bottom' | 'top') {
  if (!Number.isInteger(startNumber) || startNumber < 1) throw new Error('시작 번호는 1 이상의 정수로 입력해 주세요.')
  const document = await loadPdf(file)
  const font = await document.embedFont(StandardFonts.Helvetica)
  const fontSize = 10
  document.getPages().forEach((page, index) => {
    const label = String(startNumber + index)
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(label, fontSize)
    const y = position === 'bottom' ? 18 : height - 28
    page.drawRectangle({ x: width / 2 - textWidth / 2 - 7, y: y - 4, width: textWidth + 14, height: 18, color: rgb(1, 1, 1), opacity: 0.8 })
    page.drawText(label, { x: width / 2 - textWidth / 2, y, size: fontSize, font, color: rgb(0.12, 0.16, 0.13) })
  })
  return document
}
