export const HWP_LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxPages: 50,
  maxRenderedPixels: 140_000_000,
} as const

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP_SIGNATURES = new Set(['80,75,3,4', '80,75,5,6', '80,75,7,8'])
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream'])

const extensionOf = (filename: string) => filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
const hasPrefix = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

export async function validateHwpFile(file: File) {
  if (file.size === 0) throw new Error('비어 있는 문서는 처리할 수 없습니다.')
  if (file.size > HWP_LIMITS.maxFileBytes) throw new Error('HWP 문서는 최대 20MB까지 처리할 수 있습니다.')

  const extension = extensionOf(file.name)
  if (!['hwp', 'hwpx'].includes(extension)) throw new Error('HWP 또는 HWPX 확장자를 가진 문서만 선택해 주세요.')

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isHwp = hasPrefix(header, OLE_SIGNATURE)
  const isHwpx = ZIP_SIGNATURES.has(Array.from(header.slice(0, 4)).join(','))
  if ((extension === 'hwp' && !isHwp) || (extension === 'hwpx' && !isHwpx)) {
    throw new Error('파일 확장자와 실제 한글 문서 형식이 일치하지 않습니다.')
  }

  const allowedMimes = extension === 'hwp'
    ? new Set(['application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp'])
    : new Set(['application/zip', 'application/x-zip-compressed', 'application/vnd.hancom.hwpx', 'application/hwp+zip'])
  if (!GENERIC_MIME_TYPES.has(file.type) && !allowedMimes.has(file.type)) {
    throw new Error('파일 내용과 표시된 한글 문서 형식이 일치하지 않습니다.')
  }
}

export async function readHwpBytes(file: File) {
  await validateHwpFile(file)
  return new Uint8Array(await file.arrayBuffer())
}

export const hwpOutputName = (filename: string) => `${filename.replace(/\.hwpx?$/i, '') || '한글문서'}.pdf`
