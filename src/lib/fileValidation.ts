export const FILE_LIMITS = {
  maxFileBytes: 30 * 1024 * 1024,
  maxTotalBytes: 120 * 1024 * 1024,
  maxFiles: 30,
  maxDimension: 16_384,
  maxPixels: 40_000_000,
} as const

const genericMimeTypes = new Set(['', 'application/octet-stream'])

const extensionOf = (filename: string) => {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

const isJpeg = (bytes: Uint8Array) =>
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

const isPng = (bytes: Uint8Array) =>
  bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((value, index) => bytes[index] === value)

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length))

const isWebp = (bytes: Uint8Array) =>
  bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP'

const heicBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'])
const isHeic = (bytes: Uint8Array) =>
  bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp' && heicBrands.has(ascii(bytes, 8, 4))

async function readHeader(file: File) {
  return new Uint8Array(await file.slice(0, 32).arrayBuffer())
}

function validateBase(file: File) {
  if (file.size === 0) throw new Error('비어 있는 파일은 처리할 수 없습니다.')
  if (file.size > FILE_LIMITS.maxFileBytes) {
    throw new Error('파일 한 개는 최대 30MB까지 처리할 수 있습니다.')
  }
}

export async function validateStandardImage(file: File) {
  validateBase(file)
  const extension = extensionOf(file.name)
  const header = await readHeader(file)
  const detected = isJpeg(header)
    ? { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] }
    : isPng(header)
      ? { mime: 'image/png', extensions: ['png'] }
      : isWebp(header)
        ? { mime: 'image/webp', extensions: ['webp'] }
        : null

  if (!detected) throw new Error('실제 JPG, PNG 또는 WEBP 이미지 파일만 선택해 주세요.')
  if (!genericMimeTypes.has(file.type) && file.type !== detected.mime) {
    throw new Error('파일 내용과 표시된 이미지 형식이 일치하지 않습니다.')
  }
  if (extension && !detected.extensions.includes(extension)) {
    throw new Error('파일 확장자와 실제 이미지 형식이 일치하지 않습니다.')
  }
}

export async function validateHeic(file: File) {
  validateBase(file)
  const extension = extensionOf(file.name)
  const header = await readHeader(file)
  if (!isHeic(header)) throw new Error('실제 HEIC 또는 HEIF 파일만 선택해 주세요.')
  if (!genericMimeTypes.has(file.type) && !['image/heic', 'image/heif'].includes(file.type)) {
    throw new Error('파일 내용과 표시된 HEIC 형식이 일치하지 않습니다.')
  }
  if (extension && !['heic', 'heif'].includes(extension)) {
    throw new Error('HEIC 또는 HEIF 확장자를 가진 파일만 선택해 주세요.')
  }
}

export async function validateImageBatch(incoming: File[], existing: File[] = []) {
  if (existing.length + incoming.length > FILE_LIMITS.maxFiles) {
    throw new Error(`사진은 최대 ${FILE_LIMITS.maxFiles}장까지 추가할 수 있습니다.`)
  }
  const totalBytes = [...existing, ...incoming].reduce((total, file) => total + file.size, 0)
  if (totalBytes > FILE_LIMITS.maxTotalBytes) {
    throw new Error('전체 사진 용량은 최대 120MB까지 처리할 수 있습니다.')
  }
  await Promise.all(incoming.map(validateStandardImage))
}

export function validateImageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('올바른 이미지 크기를 확인할 수 없습니다.')
  }
  if (width > FILE_LIMITS.maxDimension || height > FILE_LIMITS.maxDimension) {
    throw new Error('가로 또는 세로가 16,384px를 넘는 이미지는 처리할 수 없습니다.')
  }
  if (width * height > FILE_LIMITS.maxPixels) {
    throw new Error('이미지 해상도가 너무 큽니다. 4천만 픽셀 이하 이미지를 사용해 주세요.')
  }
}
