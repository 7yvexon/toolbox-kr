import { useState } from 'react'
import FileDrop from '../components/FileDrop'
import { formatBytes } from '../lib/files'
import { downloadPdf, errorMessage, validatePdfBatch } from '../lib/pdf'
import { mergePdfFiles } from '../lib/pdfOperations'
import { ToolShell } from './ImageCompressor'
import { fileSizeBucket, itemCountBucket, totalFileSize, trackToolEvent } from '../lib/analytics'

export default function PdfMerge() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const addFiles = async (incoming: File[]) => {
    try {
      await validatePdfBatch(incoming, files)
      setFiles((current) => [...current, ...incoming])
      setError('')
    } catch (reason) {
      setError(errorMessage(reason, 'PDF 파일을 확인하지 못했습니다.'))
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

  const merge = async () => {
    if (files.length < 2) return
    const details = { sizeBucket: fileSizeBucket(totalFileSize(files)), countBucket: itemCountBucket(files.length), inputFormat: 'PDF', outputFormat: 'PDF' }
    trackToolEvent('pdf-merge', 'start', details)
    setProcessing(true)
    setError('')
    try {
      const output = await mergePdfFiles(files)
      await downloadPdf(output, `파일정비소_합친문서_${files.length}개.pdf`)
      trackToolEvent('pdf-merge', 'success', details)
    } catch (reason) {
      trackToolEvent('pdf-merge', 'error', details)
      setError(errorMessage(reason, 'PDF를 합치는 중 문제가 발생했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="MERGE PDF" title="PDF 합치기" description="여러 PDF를 원하는 순서대로 하나의 문서로 합쳐보세요.">
      {!files.length ? (
        <><FileDrop multiple accept="application/pdf,.pdf" title="PDF를 여러 개 놓으세요" hint="최대 10개 · 전체 150MB" onFiles={addFiles} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="document-workspace">
          <section className="image-list-card">
            <div className="list-heading"><div><strong>PDF {files.length}개</strong><span>화살표 순서대로 합쳐집니다</span></div><button className="button secondary small" type="button" onClick={() => { setFiles([]); setError('') }}>전체 삭제</button></div>
            <div className="document-list">
              {files.map((file, index) => (
                <article className="document-item" key={`${file.name}-${file.lastModified}-${index}`}>
                  <span className="order-number">{index + 1}</span><span className="mini-pdf-icon">PDF</span>
                  <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
                  <div className="order-actions">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="앞으로 이동">←</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label="뒤로 이동">→</button>
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="삭제">×</button>
                  </div>
                </article>
              ))}
            </div>
            <FileDrop multiple accept="application/pdf,.pdf" title="PDF 더 추가하기" hint="클릭하거나 끌어다 놓으세요" onFiles={addFiles} />
          </section>
          <aside className="control-card document-controls">
            <div className="pdf-summary"><div><span>문서 수</span><strong>{files.length}개</strong></div><div><span>처리 방식</span><strong>기기 내부</strong></div></div>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={merge} disabled={processing || files.length < 2}>{processing ? 'PDF를 합치고 있어요…' : 'PDF 합치고 다운로드'}</button>
          </aside>
        </div>
      )}
    </ToolShell>
  )
}
