import { useState } from 'react'
import JSZip from 'jszip'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadBlob } from '../lib/files'
import { validateImageDimensions } from '../lib/fileValidation'
import { errorMessage, PDF_LIMITS, readPdfBytes } from '../lib/pdf'
import { ToolShell } from './ImageCompressor'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('JPG 이미지를 만들지 못했습니다.')), 'image/jpeg', quality))

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [quality, setQuality] = useState(90)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const select = async (files: File[]) => {
    const next = files[0]
    if (!next) { setFile(null); setPageCount(0); setError(''); return }
    let loadingTask: ReturnType<typeof getDocument> | null = null
    let pdfDocument: Awaited<ReturnType<typeof getDocument>['promise']> | null = null
    try {
      const bytes = await readPdfBytes(next)
      loadingTask = getDocument({ data: bytes })
      pdfDocument = await loadingTask.promise
      if (pdfDocument.numPages > PDF_LIMITS.maxRenderedPages) throw new Error(`PDF → JPG는 최대 ${PDF_LIMITS.maxRenderedPages}페이지까지 처리할 수 있습니다.`)
      setFile(next); setPageCount(pdfDocument.numPages); setError('')
    } catch (reason) {
      setFile(null); setPageCount(0); setError(errorMessage(reason, 'PDF 파일을 확인하지 못했습니다.'))
    } finally {
      await loadingTask?.destroy()
    }
  }

  const convert = async () => {
    if (!file) return
    setProcessing(true); setError('')
    let loadingTask: ReturnType<typeof getDocument> | null = null
    let pdfDocument: Awaited<ReturnType<typeof getDocument>['promise']> | null = null
    try {
      const bytes = await readPdfBytes(file)
      loadingTask = getDocument({ data: bytes })
      pdfDocument = await loadingTask.promise
      const results: Blob[] = []
      let totalPixels = 0
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber)
        const viewport = page.getViewport({ scale })
        validateImageDimensions(viewport.width, viewport.height)
        totalPixels += viewport.width * viewport.height
        if (totalPixels > PDF_LIMITS.maxRenderedPixels) throw new Error('선택한 해상도로 처리하기에는 전체 PDF가 너무 큽니다. 해상도를 낮춰 다시 시도해 주세요.')
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('브라우저에서 PDF 페이지를 그릴 수 없습니다.')
        await page.render({ canvas, canvasContext: context, viewport }).promise
        results.push(await canvasToJpeg(canvas, quality / 100))
        canvas.width = 0; canvas.height = 0; page.cleanup()
      }
      const base = file.name.replace(/\.pdf$/i, '') || '문서'
      if (results.length === 1) {
        downloadBlob(results[0], `${base}_1페이지.jpg`)
      } else {
        const zip = new JSZip()
        const digits = String(results.length).length
        results.forEach((blob, index) => zip.file(`${base}_${String(index + 1).padStart(digits, '0')}페이지.jpg`, blob))
        downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), `${base}_JPG_${results.length}장.zip`)
      }
    } catch (reason) {
      setError(errorMessage(reason, 'PDF를 JPG로 변환하는 중 문제가 발생했습니다.'))
    } finally {
      await loadingTask?.destroy(); setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="PDF TO JPG" title="PDF를 JPG로 변환" description="PDF의 각 페이지를 선명한 JPG 이미지로 저장하세요.">
      {!file ? (
        <><FileDrop accept="application/pdf,.pdf" title="PDF를 여기에 놓으세요" hint="최대 50MB · 변환은 50페이지까지" onFiles={select} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} detail={`${pageCount}페이지 · 여러 장은 ZIP 저장`} onRemove={() => { void select([]) }} />
          <section className="control-card">
            <label className="field"><span>이미지 해상도</span><select value={scale} onChange={(event) => setScale(Number(event.target.value))}><option value="1">보통 · 빠른 변환</option><option value="1.5">선명 · 추천</option><option value="2">매우 선명 · 큰 용량</option></select></label>
            <label className="range-label"><span>JPG 화질 {quality}%</span><input type="range" min="60" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>
            <p className="field-note">총 {pageCount}장의 JPG가 생성됩니다.</p>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={convert} disabled={processing}>{processing ? '페이지를 이미지로 바꾸고 있어요…' : 'JPG로 변환하고 다운로드'}</button>
          </section>
        </div>
      )}
    </ToolShell>
  )
}
