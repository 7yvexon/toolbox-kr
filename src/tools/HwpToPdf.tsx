import { useRef, useState } from 'react'
import initRhwp, { HwpDocument } from '@rhwp/core'
import { PDFDocument } from 'pdf-lib'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadBlob } from '../lib/files'
import {
  HWP_LIMITS,
  hwpErrorMessage,
  hwpOutputName,
  inspectHwpx,
  readHwpBytes,
  type HwpxCompatibilityReport,
  type HwpxFallbackBlock,
} from '../lib/hwp'
import { validateImageDimensions } from '../lib/fileValidation'
import { fileSizeBucket, pageCountBucket, trackToolEvent } from '../lib/analytics'
import { ToolShell } from './ImageCompressor'

type MeasureTextHost = typeof globalThis & {
  measureTextWidth?: (font: string, text: string) => number
}

type OpenedDocument =
  | { kind: 'hwp'; handle: HwpDocument; pages: number }
  | { kind: 'hwpx'; report: HwpxCompatibilityReport }

class ConversionCancelled extends Error {}

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
const isHwpx = (file: File) => file.name.toLowerCase().endsWith('.hwpx')

async function openDocument(file: File): Promise<OpenedDocument> {
  const bytes = await readHwpBytes(file)
  if (isHwpx(file)) return { kind: 'hwpx', report: await inspectHwpx(bytes) }

  await prepareRhwp()
  let handle: HwpDocument | null = null
  try {
    handle = new HwpDocument(bytes)
    const pages = handle.pageCount()
    if (pages < 1) throw new Error('페이지가 없는 문서는 변환할 수 없습니다.')
    if (pages > HWP_LIMITS.maxPages) throw new Error(`HWP 문서는 최대 ${HWP_LIMITS.maxPages}페이지까지 처리할 수 있습니다.`)
    return { kind: 'hwp', handle, pages }
  } catch (reason) {
    handle?.free()
    throw reason
  }
}

const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    const next = line + char
    if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = char } else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

async function createFallbackPdf(
  blocks: HwpxFallbackBlock[],
  scale: number,
  shouldCancel: () => boolean,
  onPage: (page: number) => void,
) {
  const pdf = await PDFDocument.create()
  const width = Math.round(1240 * scale)
  const height = Math.round(1754 * scale)
  const margin = 80 * scale
  const pageWidth = width - margin * 2
  const lineHeight = 32 * scale
  const pageBottom = height - margin
  const maxTableLines = Math.max(1, Math.floor((pageBottom - margin - 18 * scale) / lineHeight))
  let canvas = document.createElement('canvas')
  let context: CanvasRenderingContext2D | null = null
  let y = margin
  let hasContent = false

  const beginPage = () => {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    context = canvas.getContext('2d')
    if (!context) throw new Error('호환 PDF 화면을 만들 수 없습니다.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#111827'
    context.font = `${Math.round(25 * scale)}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`
    context.textBaseline = 'alphabetic'
    y = margin
    hasContent = false
  }
  const flushPage = async () => {
    if (!hasContent) return
    if (shouldCancel()) throw new ConversionCancelled('사용자가 변환을 취소했습니다.')
    const image = await pdf.embedJpg(await (await canvasToJpeg(canvas)).arrayBuffer())
    const page = pdf.addPage([595, 842])
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 })
    canvas.width = 0
    canvas.height = 0
    onPage(pdf.getPageCount())
    await nextFrame()
    beginPage()
  }

  beginPage()
  for (const block of blocks) {
    if (shouldCancel()) throw new ConversionCancelled('사용자가 변환을 취소했습니다.')
    if (block.kind === 'paragraph') {
      const lines = wrapCanvasText(context!, block.text, pageWidth)
      for (const line of lines) {
        if (y + lineHeight > pageBottom) await flushPage()
        context!.fillStyle = '#111827'
        context!.fillText(line, margin, y + lineHeight * 0.8)
        y += lineHeight
        hasContent = true
      }
      y += 10 * scale
      continue
    }

    const colCount = Math.max(...block.rows.map((row) => row.length), 1)
    const colWidth = pageWidth / colCount
    const firstSegmentHeight = (row: string[]) => {
      const lines = Math.max(...Array.from({ length: colCount }, (_, index) => wrapCanvasText(context!, row[index] ?? '', colWidth - 20 * scale).length), 1)
      return Math.max(42 * scale, Math.min(maxTableLines, lines) * lineHeight + 16 * scale)
    }
    for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
      const row = block.rows[rowIndex]
      const cellLines = Array.from({ length: colCount }, (_, index) => wrapCanvasText(context!, row[index] ?? '', colWidth - 20 * scale))
      const totalLines = Math.max(...cellLines.map((lines) => lines.length), 1)
      for (let offset = 0; offset < totalLines; offset += maxTableLines) {
        const segmentLines = Math.min(maxTableLines, totalLines - offset)
        const rowHeight = Math.max(42 * scale, segmentLines * lineHeight + 16 * scale)
        if (rowIndex === 0 && offset === 0 && block.rows.length > 1 && hasContent && y + rowHeight + firstSegmentHeight(block.rows[1]) > pageBottom) await flushPage()
        if (y + rowHeight > pageBottom) await flushPage()
        context!.fillStyle = rowIndex === 0 ? '#eef2f7' : '#ffffff'
        context!.fillRect(margin, y, pageWidth, rowHeight)
        context!.strokeStyle = '#667085'
        context!.lineWidth = Math.max(1, scale)
        for (let col = 0; col < colCount; col += 1) {
          const x = margin + col * colWidth
          context!.strokeRect(x, y, colWidth, rowHeight)
          context!.fillStyle = '#111827'
          cellLines[col].slice(offset, offset + segmentLines).forEach((line, lineIndex) => {
            context!.fillText(line, x + 10 * scale, y + (lineIndex + 1) * lineHeight)
          })
        }
        y += rowHeight
        hasContent = true
      }
    }
    y += 18 * scale
  }
  await flushPage()
  if (!pdf.getPageCount()) throw new Error('PDF로 만들 수 있는 내용이 없습니다.')
  return { bytes: await pdf.save({ useObjectStreams: true }), pages: pdf.getPageCount() }
}

export default function HwpToPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [report, setReport] = useState<HwpxCompatibilityReport | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const cancelRequested = useRef(false)

  const reset = () => {
    cancelRequested.current = true
    setFile(null)
    setPageCount(0)
    setProgress(0)
    setError('')
    setReport(null)
    setAcknowledged(false)
  }

  const select = async (files: File[]) => {
    const next = files[0]
    if (!next) { reset(); return }
    let handle: HwpDocument | null = null
    try {
      setError('')
      setProgress(0)
      setPageCount(0)
      setAcknowledged(false)
      const opened = await openDocument(next)
      if (opened.kind === 'hwp') {
        handle = opened.handle
        setPageCount(opened.pages)
        setReport(null)
      } else {
        setReport(opened.report)
      }
      setFile(next)
    } catch (reason) {
      console.error('HWP/HWPX selection failed', reason)
      setFile(null)
      setReport(null)
      setError(hwpErrorMessage(reason))
    } finally {
      handle?.free()
    }
  }

  const convert = async () => {
    if (!file || !acknowledged) return
    const details = {
      sizeBucket: fileSizeBucket(file.size),
      pageBucket: pageCount ? pageCountBucket(pageCount) : undefined,
      inputFormat: isHwpx(file) ? 'HWPX' : 'HWP',
      outputFormat: 'PDF',
    }
    trackToolEvent('hwp-to-pdf', 'start', details)
    cancelRequested.current = false
    setProcessing(true)
    setProgress(0)
    setError('')
    let handle: HwpDocument | null = null
    try {
      const opened = await openDocument(file)
      if (opened.kind === 'hwpx') {
        const output = await createFallbackPdf(opened.report.blocks, scale, () => cancelRequested.current, setProgress)
        setPageCount(output.pages)
        downloadBlob(new Blob([new Uint8Array(output.bytes)], { type: 'application/pdf' }), hwpOutputName(file.name))
        trackToolEvent('hwp-to-pdf', 'success', { ...details, pageBucket: pageCountBucket(output.pages) })
        return
      }

      handle = opened.handle
      const pdf = await PDFDocument.create()
      let renderedPixels = 0
      for (let index = 0; index < opened.pages; index += 1) {
        if (cancelRequested.current) throw new ConversionCancelled('사용자가 변환을 취소했습니다.')
        const canvas = document.createElement('canvas')
        handle.renderPageToCanvas(index, canvas, scale)
        validateImageDimensions(canvas.width, canvas.height)
        renderedPixels += canvas.width * canvas.height
        if (renderedPixels > HWP_LIMITS.maxRenderedPixels) throw new Error('문서가 너무 커서 안전하게 처리할 수 없습니다. 변환 품질을 낮춰 다시 시도해 주세요.')
        const image = await pdf.embedJpg(await (await canvasToJpeg(canvas)).arrayBuffer())
        const width = (canvas.width / scale) * 0.75
        const height = (canvas.height / scale) * 0.75
        const page = pdf.addPage([width, height])
        page.drawImage(image, { x: 0, y: 0, width, height })
        canvas.width = 0
        canvas.height = 0
        setProgress(index + 1)
        await nextFrame()
      }
      const output = await pdf.save({ useObjectStreams: true })
      downloadBlob(new Blob([new Uint8Array(output)], { type: 'application/pdf' }), hwpOutputName(file.name))
      trackToolEvent('hwp-to-pdf', 'success', details)
    } catch (reason) {
      trackToolEvent('hwp-to-pdf', 'error', details)
      if (reason instanceof ConversionCancelled) setError('변환을 취소했습니다. 원본 파일은 변경되지 않았습니다.')
      else setError(hwpErrorMessage(reason))
    } finally {
      handle?.free()
      setProcessing(false)
    }
  }

  const unsupported = report?.unsupportedFeatures ?? []
  const detail = pageCount
    ? `${pageCount}페이지 · 서버 전송 없음`
    : report
      ? `본문 ${report.paragraphCount}개 · 표 ${report.tableCount}개 · 서버 전송 없음`
      : '서버 전송 없음'

  return (
    <ToolShell eyebrow="HWP TO COMPATIBILITY PDF" title="HWP·HWPX를 호환 PDF로" description="내용 확인용 이미지 PDF를 내 브라우저에서 만듭니다. 원본과 동일한 정밀 변환은 제공하지 않습니다.">
      {!file ? (
        <><FileDrop accept=".hwp,.hwpx,application/x-hwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx" title="한글 문서를 여기에 놓으세요" hint="HWP 5.0, HWPX · 최대 20MB, 50페이지" onFiles={select} />{error && <p className="error-message drop-error" role="alert">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} typeLabel={isHwpx(file) ? 'HWPX' : 'HWP'} detail={detail} onRemove={reset} />
          <section className="control-card" aria-busy={processing}>
            <div className="support-status warning"><strong>정밀 변환 아님</strong><span>텍스트 검색이 제한되는 이미지형 호환 PDF입니다.</span></div>
            {report && <div className="document-report"><strong>문서 사전 점검</strong><dl><div><dt>본문</dt><dd>{report.paragraphCount}개</dd></div><div><dt>표</dt><dd>{report.tableCount}개</dd></div><div><dt>구역</dt><dd>{report.sectionCount}개</dd></div></dl>{unsupported.length > 0 ? <p><b>원본대로 유지되지 않는 요소:</b> {unsupported.join(', ')}</p> : <p className="success-note">본문과 일반 표를 호환 PDF로 만들 수 있습니다.</p>}</div>}
            <label className="field"><span>출력 품질</span><select value={scale} onChange={(event) => setScale(Number(event.target.value))} disabled={processing}><option value="1">보통 · 빠른 변환</option><option value="1.5">선명 · 추천</option><option value="2">매우 선명 · 큰 용량</option></select></label>
            <label className="acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={processing} /><span>원본과 동일한 PDF가 아니며, 결과를 직접 확인해야 한다는 점을 이해했습니다.</span></label>
            {processing && <div className="conversion-progress" aria-live="polite"><div><span>PDF 만드는 중</span><strong>{progress}{pageCount ? ` / ${pageCount}` : ''}페이지</strong></div><progress value={pageCount ? progress : undefined} max={pageCount || undefined} /></div>}
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="button primary full" type="button" onClick={convert} disabled={processing || !acknowledged}>{processing ? '호환 PDF 변환 중…' : '호환 PDF 만들고 다운로드'}</button>
            {processing && <button className="button secondary full cancel-button" type="button" onClick={() => { cancelRequested.current = true }}>변환 취소</button>}
          </section>
        </div>
      )}
      <div className="exact-conversion-help"><strong>원본과 똑같은 PDF가 필요하다면</strong><p>한컴오피스의 <b>파일 → PDF로 저장하기</b>를 사용해야 합니다. 브라우저만으로는 한컴의 글꼴·배치 엔진을 동일하게 재현할 수 없습니다. PDF → HWP/HWPX도 정확도를 보장할 수 없어 제공하지 않습니다.</p></div>
      <div className="how-section"><div><span>01</span><strong>파일 사전 점검</strong><p>형식과 HWPX 내부 구조, 지원하지 않는 요소를 먼저 확인합니다.</p></div><div><span>02</span><strong>명시적 호환 변환</strong><p>일반 본문과 표를 이미지형 PDF로 만들며 파일은 업로드하지 않습니다.</p></div><div><span>03</span><strong>결과 대조</strong><p>제출·인쇄 전 원본과 페이지를 반드시 비교하세요.</p></div></div>
    </ToolShell>
  )
}
