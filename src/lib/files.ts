export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

export const replaceExtension = (name: string, extension: string) =>
  `${name.replace(/\.[^/.]+$/, '')}.${extension.replace(/^\./, '')}`

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const safeName = filename
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180)
  anchor.download = safeName || 'download'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')) }
    image.src = url
  })

export async function renderImage(
  file: Blob,
  options: { maxWidth?: number; type?: string; quality?: number } = {},
) {
  const image = await loadImage(file)
  validateImageDimensions(image.naturalWidth, image.naturalHeight)
  const scale = options.maxWidth && image.naturalWidth > options.maxWidth
    ? options.maxWidth / image.naturalWidth : 1
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('브라우저에서 이미지 처리를 시작할 수 없습니다.')

  const type = options.type || file.type || 'image/jpeg'
  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('변환 결과를 만들지 못했습니다.')),
      type,
      options.quality ?? 0.82,
    )
  })
  return { blob, width, height }
}
import { validateImageDimensions } from './fileValidation'
