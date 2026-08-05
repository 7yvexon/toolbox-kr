import { describe, expect, it } from 'vitest'
import { validateStandardImage } from './fileValidation'
import { validatePdfFile } from './pdf'

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

describe('file validation', () => {
  it('accepts a JPEG whose signature, MIME type, and extension agree', async () => {
    await expect(validateStandardImage(new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' }))).resolves.toBeUndefined()
  })

  it('rejects an image whose extension disagrees with its signature', async () => {
    await expect(validateStandardImage(new File([jpegBytes], 'photo.png', { type: 'image/jpeg' }))).rejects.toThrow('확장자')
  })

  it('accepts a PDF signature near the beginning of a document', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\n%%EOF')
    await expect(validatePdfFile(new File([bytes], 'document.pdf', { type: 'application/pdf' }))).resolves.toBeUndefined()
  })

  it('rejects a renamed non-PDF file', async () => {
    await expect(validatePdfFile(new File(['not a pdf'], 'document.pdf', { type: 'application/pdf' }))).rejects.toThrow('실제 PDF')
  })
})
