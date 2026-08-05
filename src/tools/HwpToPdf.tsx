import { useState } from 'react'
import initRhwp, { HwpDocument } from '@rhwp/core'
import { PDFDocument } from 'pdf-lib'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadBlob } from '../lib/files'
import { HWP_LIMITS, hwpOutputName, readHwpBytes } from '../lib/hwp'
import { validateImageDimensions } from '../lib/fileValidation'
import { ToolShell } from './ImageCompressor'

type MeasureTextHost = typeof globalThis & {
  measureTextWidth?: (font: string, text: string) => number
}

let rhwpReady: Promise<void> | null = null

function prepareRhwp() {
  if (!rhwpReady) {
    let context: CanvasRenderingContext2D | null = null
    let lastFont = ''
    ;(globalThis as MeasureTextHost).measureTextWidth = (font, text) => {
      context ??= document.createElement('canvas').getContext('2d')
      if (!context) return text.length * 10
      if (font !== lastFont) { context.font = font; lastFont = font }
      return context.measureText(text).width
    }
    rhwpReady = initRhwp().then(() => undefined).catch((reason) => {
      rhwpReady = null
      throw reason
    })
  }
  return rhwpReady
}

const canvasToJpeg = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PDF 페이지 이미지를 만들지 못했습니다.')), 'image/jpeg', 0.94)
})

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function explainRhwpError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : ''
  if (/password|encrypt|distribution|배포|암호/i.test(message)) return '암호 또는 배포용 보호가 적용된 문서는 변환할 수 없습니다.'
  return '문서를 읽지 못했습니다. 손상되었거나 아직 지원되지 않는 HWP 기능이 포함되었을 수 있습니다.'
}

export default function HwpToPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const select = async (files: File[]) => {
    const next = files[0]
    if (!next) { setFile(null); setPageCount(0); setProgress(0); setError(''); return }
    let documentHandle: HwpDocument | null = null
    try {
      const bytes = await readHwpBytes(next)
      await prepareRhwp()
      documentHandle = new HwpDocument(bytes)
      const pages = documentHandle.pageCount()
      if (pages < 1) throw new Error('페이지가 없는 문서는 변환할 수 없습니다.')
      if (pages > HWP_LIMITS.maxPages) throw new Error(`HWP → PDF는 최대 ${HWP_LIMITS.maxPages}페이지까지 처리할 수 있습니다.`)
      setFile(next); setPageCount(pages); setProgress(0); setError('')
    } catch (reason) {
      setFile(null); setPageCount(0)
      setError(reason instanceof Error && reason.message.includes('최대') ? reason.message : explainRhwpError(reason))
    } finally {
      documentHandle?.free()
    }
  }

  const convert = async () => {
    if (!file) return
    setProcessing(true); setProgress(0); setError('')
    let documentHandle: HwpDocument | null = null
    try {
      const bytes = await readHwpBytes(file)
      await prepareRhwp()
      documentHandle = new HwpDocument(bytes)
      const pages = documentHandle.pageCount()
      if (pages > HWP_LIMITS.maxPages) throw new Error(`HWP → PDF는 최대 ${HWP_LIMITS.maxPages}페이지까지 처리할 수 있습니다.`)

      const pdf = await PDFDocument.create()
      let renderedPixels = 0
      for (let index = 0; index < pages; index += 1) {
        const canvas = document.createElement('canvas')
        documentHandle.renderPageToCanvas(index, canvas, scale)
        validateImageDimensions(canvas.width, canvas.height)
        renderedPixels += canvas.width * canvas.height
        if (renderedPixels > HWP_LIMITS.maxRenderedPixels) throw new Error('문서가 너무 커서 안전하게 처리할 수 없습니다. 변환 품질을 낮춰 다시 시도해 주세요.')

        const image = await pdf.embedJpg(await (await canvasToJpeg(canvas)).arrayBuffer())
        const width = (canvas.width / scale) * 0.75
        const height = (canvas.height / scale) * 0.75
        const page = pdf.addPage([width, height])
        page.drawImage(image, { x: 0, y: 0, width, height })
        canvas.width = 0; canvas.height = 0
        setProgress(index + 1)
        await nextFrame()
      }

      const output = await pdf.save({ useObjectStreams: true })
      downloadBlob(new Blob([new Uint8Array(output)], { type: 'application/pdf' }), hwpOutputName(file.name))
    } catch (reason) {
      setError(reason instanceof Error && (reason.message.includes('최대') || reason.message.includes('너무 커서')) ? reason.message : explainRhwpError(reason))
    } finally {
      documentHandle?.free(); setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="HWP TO PDF · BETA" title="HWP를 PDF로 변환" description="HWP·HWPX 문서를 서버에 올리지 않고 내 브라우저에서 PDF로 만드세요.">
      {!file ? (
        <><FileDrop accept=".hwp,.hwpx,application/x-hwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx" title="한글 문서를 여기에 놓으세요" hint="HWP 5.0, HWPX · 최대 20MB, 50페이지" onFiles={select} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} typeLabel={file.name.toLowerCase().endsWith('.hwpx') ? 'HWPX' : 'HWP'} detail={`${pageCount}페이지 · 서버 전송 없음`} onRemove={() => { void select([]) }} />
          <section className="control-card">
            <label className="field"><span>변환 품질</span><select value={scale} onChange={(event) => setScale(Number(event.target.value))} disabled={processing}><option value="1">보통 · 빠른 변환</option><option value="1.5">선명 · 추천</option><option value="2">매우 선명 · 큰 용량</option></select></label>
            <div className="beta-notice"><strong>베타 기능</strong><p>복잡한 표·수식·글꼴은 원본과 다를 수 있습니다. PDF는 화면 모양을 보존하는 이미지형으로 생성돼 텍스트 선택이 제한됩니다.</p></div>
            {processing && <div className="conversion-progress"><div><span>PDF 만드는 중</span><strong>{progress} / {pageCount}</strong></div><progress value={progress} max={pageCount} /></div>}
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={convert} disabled={processing}>{processing ? `${progress} / ${pageCount}페이지 변환 중…` : 'PDF로 변환하고 다운로드'}</button>
          </section>
        </div>
      )}
      <div className="how-section"><div><span>01</span><strong>파일 선택</strong><p>문서는 이 기기 밖으로 전송되지 않습니다.</p></div><div><span>02</span><strong>브라우저 변환</strong><p>오픈소스 WASM 엔진이 페이지를 안전하게 렌더링합니다.</p></div><div><span>03</span><strong>결과 확인</strong><p>다운로드한 PDF와 원본의 배치를 꼭 비교해 주세요.</p></div></div>
    </ToolShell>
  )
}
