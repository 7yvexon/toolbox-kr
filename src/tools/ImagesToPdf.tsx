import { useEffect, useMemo, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import FileDrop from '../components/FileDrop'
import { downloadBlob, formatBytes, renderImage } from '../lib/files'
import { validateImageBatch } from '../lib/fileValidation'
import { ToolShell } from './ImageCompressor'
import { fileSizeBucket, itemCountBucket, pageCountBucket, totalFileSize, trackToolEvent } from '../lib/analytics'

export default function ImagesToPdf() {
  const [files, setFiles] = useState<File[]>([])
  const [pageType, setPageType] = useState<'a4' | 'image'>('a4')
  const [margin, setMargin] = useState(24)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files])
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews])

  const addFiles = async (incoming: File[]) => {
    try {
      await validateImageBatch(incoming, files)
      setFiles((current) => [...current, ...incoming])
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '사진 파일을 확인하지 못했습니다.')
    }
  }
  const move = (index: number, direction: -1 | 1) => {
    setFiles((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const copy = [...current]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  const createPdf = async () => {
    if (!files.length) return
    const details = { sizeBucket: fileSizeBucket(totalFileSize(files)), countBucket: itemCountBucket(files.length), pageBucket: pageCountBucket(files.length), inputFormat: 'IMAGE', outputFormat: 'PDF' }
    trackToolEvent('images-to-pdf', 'start', details)
    setProcessing(true)
    setError('')
    try {
      const pdf = await PDFDocument.create()
      for (const file of files) {
        const rendered = await renderImage(file, { type: 'image/jpeg', quality: 0.92, maxWidth: 2800 })
        const image = await pdf.embedJpg(await rendered.blob.arrayBuffer())
        const pageWidth = pageType === 'a4' ? 595.28 : image.width
        const pageHeight = pageType === 'a4' ? 841.89 : image.height
        const page = pdf.addPage([pageWidth, pageHeight])
        const scale = Math.min((pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height)
        const width = image.width * scale
        const height = image.height * scale
        page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height })
      }
      const bytes = await pdf.save()
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `파일정비소_${files.length}장.pdf`)
      trackToolEvent('images-to-pdf', 'success', details)
    } catch (reason) {
      trackToolEvent('images-to-pdf', 'error', details)
      setError(reason instanceof Error ? reason.message : 'PDF를 만드는 중 문제가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="IMAGES TO PDF" title="사진을 PDF로 변환" description="여러 장의 사진을 원하는 순서대로 정리해 하나의 PDF로 만드세요.">
      {!files.length ? (
        <><FileDrop multiple accept="image/jpeg,image/png,image/webp" title="사진을 여러 장 놓으세요" hint="JPG, PNG, WEBP · 최대 30장, 전체 120MB" onFiles={addFiles} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="pdf-workspace">
          <section className="image-list-card">
            <div className="list-heading"><div><strong>사진 {files.length}장</strong><span>화살표로 순서를 바꿀 수 있어요</span></div><button className="button secondary small" type="button" onClick={() => setFiles([])}>전체 삭제</button></div>
            <div className="thumbnail-list">
              {previews.map(({ file, url }, index) => (
                <article className="thumbnail-item" key={`${file.name}-${file.lastModified}-${index}`}>
                  <span className="order-number">{index + 1}</span>
                  <img src={url} alt="" />
                  <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
                  <div className="order-actions">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="앞으로 이동">←</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label="뒤로 이동">→</button>
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="삭제">×</button>
                  </div>
                </article>
              ))}
            </div>
            <FileDrop multiple accept="image/jpeg,image/png,image/webp" title="사진 더 추가하기" hint="클릭하거나 끌어다 놓으세요" onFiles={addFiles} />
          </section>
          <aside className="control-card pdf-controls">
            <label className="field"><span>페이지 크기</span><select value={pageType} onChange={(e) => setPageType(e.target.value as 'a4' | 'image')}><option value="a4">A4 · 문서 제출용</option><option value="image">사진 원본 비율</option></select></label>
            <label className="field"><span>페이지 여백</span><select value={margin} onChange={(e) => setMargin(Number(e.target.value))}><option value="0">여백 없음</option><option value="12">좁게</option><option value="24">보통</option><option value="48">넓게</option></select></label>
            <div className="pdf-summary"><div><span>페이지</span><strong>{files.length}장</strong></div><div><span>처리 방식</span><strong>기기 내부</strong></div></div>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={createPdf} disabled={processing}>{processing ? 'PDF를 만들고 있어요…' : 'PDF 만들고 다운로드'}</button>
          </aside>
        </div>
      )}
    </ToolShell>
  )
}
