import { useState } from 'react'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadPdf, errorMessage, loadPdf, pdfOutputName } from '../lib/pdf'
import { extractPdfRange } from '../lib/pdfOperations'
import { ToolShell } from './ImageCompressor'

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const select = async (files: File[]) => {
    const next = files[0]
    if (!next) { setFile(null); setPageCount(0); setError(''); return }
    try {
      const document = await loadPdf(next)
      const count = document.getPageCount()
      setFile(next); setPageCount(count); setStartPage(1); setEndPage(count); setError('')
    } catch (reason) {
      setFile(null); setPageCount(0); setError(errorMessage(reason, 'PDF 파일을 확인하지 못했습니다.'))
    }
  }

  const extract = async () => {
    if (!file) return
    if (startPage < 1 || endPage > pageCount || startPage > endPage) {
      setError('시작 페이지와 끝 페이지를 올바르게 입력해 주세요.')
      return
    }
    setProcessing(true); setError('')
    try {
      const output = await extractPdfRange(file, startPage, endPage)
      await downloadPdf(output, pdfOutputName(file.name, `${startPage}-${endPage}페이지`))
    } catch (reason) {
      setError(errorMessage(reason, 'PDF 페이지를 추출하는 중 문제가 발생했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="SPLIT PDF" title="PDF 나누기" description="필요한 페이지 구간만 골라 새 PDF로 저장하세요.">
      {!file ? (
        <><FileDrop accept="application/pdf,.pdf" title="PDF를 여기에 놓으세요" hint="최대 50MB · 200페이지" onFiles={select} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} detail={`${pageCount}페이지`} onRemove={() => { void select([]) }} />
          <section className="control-card">
            <div className="control-heading"><span>추출할 범위</span><strong>{endPage - startPage + 1}장</strong></div>
            <div className="range-fields">
              <label className="field"><span>시작 페이지</span><input type="number" min="1" max={pageCount} value={startPage} onChange={(event) => setStartPage(Number(event.target.value))} /></label>
              <label className="field"><span>끝 페이지</span><input type="number" min="1" max={pageCount} value={endPage} onChange={(event) => setEndPage(Number(event.target.value))} /></label>
            </div>
            <p className="field-note">전체 {pageCount}페이지 중 연속된 구간을 추출합니다.</p>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={extract} disabled={processing}>{processing ? '페이지를 추출하고 있어요…' : '선택한 페이지 다운로드'}</button>
          </section>
        </div>
      )}
    </ToolShell>
  )
}
