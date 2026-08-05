import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from './files'

export const PDF_LIMITS = {
  maxFileBytes: 50 * 1024 * 1024,
  maxBatchBytes: 150 * 1024 * 1024,
  maxBatchFiles: 10,
  maxPagesPerFile: 200,
  maxMergedPages: 300,
  maxRenderedPages: 50,
  maxRenderedPixels: 160_000_000,
} as const

const pdfSignature = new TextEncoder().encode('%PDF-')

function containsPdfSignature(bytes: Uint8Array) {
  const limit = Math.max(0, bytes.length - pdfSignature.length)
  for (let index = 0; index <= limit; index += 1) {
    if (pdfSignature.every((value, offset) => bytes[index + offset] === value)) return true
  }
  return false
}

export async function validatePdfFile(file: File) {
  if (file.size === 0) throw new Error('비어 있는 PDF는 처리할 수 없습니다.')
  if (file.size > PDF_LIMITS.maxFileBytes) {
    throw new Error('PDF 파일 한 개는 최대 50MB까지 처리할 수 있습니다.')
  }
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  if (!containsPdfSignature(header)) throw new Error('실제 PDF 문서만 선택해 주세요.')
  if (file.type && !['application/pdf', 'application/octet-stream'].includes(file.type)) {
    throw new Error('파일 내용과 표시된 PDF 형식이 일치하지 않습니다.')
  }
}

export async function validatePdfBatch(incoming: File[], existing: File[] = []) {
  if (existing.length + incoming.length > PDF_LIMITS.maxBatchFiles) {
    throw new Error(`PDF는 최대 ${PDF_LIMITS.maxBatchFiles}개까지 한 번에 처리할 수 있습니다.`)
  }
  const totalBytes = [...existing, ...incoming].reduce((total, file) => total + file.size, 0)
  if (totalBytes > PDF_LIMITS.maxBatchBytes) {
    throw new Error('선택한 PDF의 전체 용량은 최대 150MB까지 처리할 수 있습니다.')
  }
  await Promise.all(incoming.map(validatePdfFile))
}

export async function readPdfBytes(file: File) {
  await validatePdfFile(file)
  return new Uint8Array(await file.arrayBuffer())
}

export async function loadPdf(file: File) {
  const bytes = await readPdfBytes(file)
  let document: PDFDocument
  try {
    document = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false })
  } catch {
    throw new Error('암호화되었거나 손상된 PDF는 처리할 수 없습니다.')
  }
  if (document.getPageCount() > PDF_LIMITS.maxPagesPerFile) {
    throw new Error(`PDF는 최대 ${PDF_LIMITS.maxPagesPerFile}페이지까지 처리할 수 있습니다.`)
  }
  return document
}

export async function downloadPdf(document: PDFDocument, filename: string) {
  const bytes = await document.save({ useObjectStreams: true })
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), filename)
}

export const pdfOutputName = (filename: string, suffix: string) => {
  const base = filename.replace(/\.pdf$/i, '') || '문서'
  return `${base}_${suffix}.pdf`
}

export const errorMessage = (reason: unknown, fallback: string) =>
  reason instanceof Error ? reason.message : fallback
