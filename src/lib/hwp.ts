import JSZip from 'jszip'

export const HWP_LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxPages: 50,
  maxRenderedPixels: 140_000_000,
  maxXmlBytes: 40 * 1024 * 1024,
  maxUncompressedBytes: 120 * 1024 * 1024,
  maxPackageEntries: 2_000,
} as const

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP_SIGNATURES = new Set(['80,75,3,4', '80,75,5,6', '80,75,7,8'])
const SHAPE_TAGS = new Set([
  'container', 'drawText', 'line', 'rect', 'ellipse', 'arc', 'polygon', 'curve',
  'connectLine', 'pic', 'img', 'ole', 'video', 'chart', 'equation',
])

const extensionOf = (filename: string) => filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
const hasPrefix = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

async function loadSafeHwpx(bytes: Uint8Array) {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false })
  } catch {
    throw new Error('HWPX_PACKAGE_INVALID: HWPX 압축 구조가 손상되었습니다.')
  }

  const entries = Object.keys(zip.files)
  if (entries.length > HWP_LIMITS.maxPackageEntries) {
    throw new Error('HWPX_PACKAGE_TOO_LARGE: HWPX 내부 파일이 지나치게 많아 안전하게 처리할 수 없습니다.')
  }
  const uncompressedBytes = entries.reduce((total, name) => {
    const entry = zip.files[name] as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } }
    return total + (entry._data?.uncompressedSize ?? 0)
  }, 0)
  if (uncompressedBytes > HWP_LIMITS.maxUncompressedBytes) {
    throw new Error('HWPX_PACKAGE_TOO_LARGE: 압축을 푼 HWPX 내용이 너무 커서 안전하게 처리할 수 없습니다.')
  }
  const sectionNames = entries
    .filter((name) => /^Contents\/section\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
  if (!sectionNames.length) {
    throw new Error('HWPX_PACKAGE_INVALID: HWPX 본문(Contents/section*.xml)이 없습니다.')
  }
  return { zip, sectionNames }
}

function validateHwpMetadata(file: File) {
  if (file.size === 0) throw new Error('EMPTY_FILE: 비어 있는 문서는 처리할 수 없습니다.')
  if (file.size > HWP_LIMITS.maxFileBytes) throw new Error('FILE_TOO_LARGE: HWP 문서는 최대 20MB까지 처리할 수 있습니다.')
  const extension = extensionOf(file.name)
  if (!['hwp', 'hwpx'].includes(extension)) throw new Error('UNSUPPORTED_EXTENSION: HWP 또는 HWPX 문서만 선택해 주세요.')
  return extension
}

async function validateHwpBytes(file: File, bytes: Uint8Array) {
  const extension = validateHwpMetadata(file)
  const header = bytes.subarray(0, 8)
  const isHwp = hasPrefix(header, OLE_SIGNATURE)
  const isHwpx = ZIP_SIGNATURES.has(Array.from(header.slice(0, 4)).join(','))
  if ((extension === 'hwp' && !isHwp) || (extension === 'hwpx' && !isHwpx)) {
    throw new Error('SIGNATURE_MISMATCH: 파일 확장자와 실제 한글 문서 형식이 일치하지 않습니다.')
  }

  // HWPX is a ZIP package. Verify its real document structure instead of trusting
  // an extension, MIME value, or ZIP signature alone.
  if (extension === 'hwpx') await loadSafeHwpx(bytes)
}

export async function validateHwpFile(file: File) {
  validateHwpMetadata(file)
  await validateHwpBytes(file, new Uint8Array(await file.arrayBuffer()))
}

export async function readHwpBytes(file: File) {
  validateHwpMetadata(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await validateHwpBytes(file, bytes)
  return bytes
}

const textFromElement = (element: Element) => Array.from(element.getElementsByTagName('*'))
  .filter((node) => node.localName === 't')
  .map((node) => node.textContent ?? '')
  .join('')
  .replace(/\s+/g, ' ')
  .trim()

const numericAttribute = (element: Element, name: string) => {
  const value = Array.from(element.attributes).find((attribute) => attribute.localName === name)?.value
  return value ? Number(value) : 0
}

export type HwpxFallbackBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; rows: string[][] }

export interface HwpxCompatibilityReport {
  blocks: HwpxFallbackBlock[]
  sectionCount: number
  paragraphCount: number
  tableCount: number
  hasMergedCells: boolean
  unsupportedFeatures: string[]
}

/**
 * Reads the safe, content-preserving subset used by compatibility PDF output.
 * It deliberately reports layout features that cannot be reproduced instead of
 * silently claiming an exact conversion.
 */
export async function inspectHwpx(bytes: Uint8Array): Promise<HwpxCompatibilityReport> {
  const { zip, sectionNames } = await loadSafeHwpx(bytes)
  const parser = new DOMParser()
  const blocks: HwpxFallbackBlock[] = []
  const unsupported = new Set<string>()
  let paragraphCount = 0
  let tableCount = 0
  let hasMergedCells = false
  let totalXmlBytes = 0

  if (Object.keys(zip.files).some((name) => /^BinData\//i.test(name) && !zip.files[name].dir)) {
    unsupported.add('문서에 포함된 이미지')
  }

  for (const name of sectionNames) {
    const source = await zip.file(name)!.async('string')
    totalXmlBytes += new TextEncoder().encode(source).byteLength
    if (totalXmlBytes > HWP_LIMITS.maxXmlBytes) {
      throw new Error('HWPX_XML_TOO_LARGE: HWPX 본문이 너무 커서 브라우저에서 안전하게 처리할 수 없습니다.')
    }
    const xml = parser.parseFromString(source, 'application/xml')
    if (xml.getElementsByTagName('parsererror').length > 0) {
      throw new Error('HWPX_XML_INVALID: HWPX 본문 XML이 손상되었습니다.')
    }

    const allNodes = Array.from(xml.getElementsByTagName('*'))
    allNodes.forEach((node) => {
      if (SHAPE_TAGS.has(node.localName)) {
        if (node.localName === 'equation') unsupported.add('수식')
        else if (node.localName === 'chart') unsupported.add('차트')
        else if (['pic', 'img'].includes(node.localName)) unsupported.add('문서에 포함된 이미지')
        else unsupported.add('도형·그리기 개체')
      }
      if (['header', 'footer', 'footNote', 'endNote'].includes(node.localName)) unsupported.add('머리글·바닥글·각주')
      if (node.localName === 'tc' && (numericAttribute(node, 'rowSpan') > 1 || numericAttribute(node, 'colSpan') > 1)) {
        hasMergedCells = true
        unsupported.add('병합된 표 셀')
      }
    })

    const visit = (element: Element) => {
      if (element.localName === 'p') {
        paragraphCount += 1
        const tables = Array.from(element.getElementsByTagName('*')).filter((node) => node.localName === 'tbl')
        const table = tables[0]
        if (table) {
          tableCount += 1
          if (tables.length > 1) unsupported.add('중첩 표')
          const rows = Array.from(table.getElementsByTagName('*'))
            .filter((node) => node.localName === 'tr')
            .map((row) => Array.from(row.children).filter((node) => node.localName === 'tc').map(textFromElement))
            .filter((row) => row.some(Boolean))
          if (rows.length) blocks.push({ kind: 'table', rows })
        } else {
          const text = textFromElement(element)
          if (text) blocks.push({ kind: 'paragraph', text })
        }
        return
      }
      Array.from(element.children).forEach(visit)
    }
    Array.from(xml.documentElement.children).forEach(visit)
  }

  if (!blocks.length) throw new Error('HWPX_NO_CONTENT: 변환할 수 있는 본문이나 표를 찾지 못했습니다.')
  return {
    blocks,
    sectionCount: sectionNames.length,
    paragraphCount,
    tableCount,
    hasMergedCells,
    unsupportedFeatures: [...unsupported],
  }
}

export const extractHwpxFallbackBlocks = async (bytes: Uint8Array) => (await inspectHwpx(bytes)).blocks

export const hwpOutputName = (filename: string) => `${filename.replace(/\.hwpx?$/i, '') || '한글문서'}_호환.pdf`

export function hwpErrorMessage(reason: unknown) {
  const raw = reason instanceof Error ? reason.message : ''
  const message = raw.replace(/^[A-Z_]+:\s*/, '')
  if (/password|encrypt|distribution|배포|암호|drm/i.test(raw)) return '암호·DRM·배포용 보호가 적용된 문서는 지원하지 않습니다. 한컴오피스에서 보호를 해제한 사본을 사용해 주세요.'
  if (message) return message
  return '문서를 읽지 못했습니다. 파일이 손상되었거나 지원하지 않는 한글 문서일 수 있습니다.'
}
