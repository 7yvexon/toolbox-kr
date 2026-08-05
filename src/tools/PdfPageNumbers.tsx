import { useState } from 'react'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadPdf, errorMessage, loadPdf, pdfOutputName } from '../lib/pdf'
import { addPdfPageNumbers } from '../lib/pdfOperations'
import { ToolShell } from './ImageCompressor'

export default function PdfPageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [startNumber, setStartNumber] = useState(1)
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const select = async (files: File[]) => {
    const next = files[0]
    if (!next) { setFile(null); setPageCount(0); setError(''); return }
    try {
      const document = await loadPdf(next)
      setFile(next); setPageCount(document.getPageCount()); setError('')
    } catch (reason) {
      setFile(null); setPageCount(0); setError(errorMessage(reason, 'PDF 파일을 확인하지 못했습니다.'))
    }
  }

  const addNumbers = async () => {
    if (!file || !Number.isInteger(startNumber) || startNumber < 1) {
      setError('시작 번호는 1 이상의 정수로 입력해 주세요.')
      return
    }
    setProcessing(true); setError('')
    try {
      const document = await addPdfPageNumbers(file, startNumber, position)
      await downloadPdf(document, pdfOutputName(file.name, '페이지번호'))
    } catch (reason) {
      setError(errorMessage(reason, '페이지 번호를 넣는 중 문제가 발생했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="PAGE NUMBERS" title="PDF 페이지 번호" description="제출용 문서에 페이지 번호를 깔끔하게 추가하세요.">
      {!file ? (
        <><FileDrop accept="application/pdf,.pdf" title="PDF를 여기에 놓으세요" hint="최대 50MB · 200페이지" onFiles={select} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} detail={`${pageCount}페이지`} onRemove={() => { void select([]) }} />
          <section className="control-card">
            <label className="field"><span>첫 페이지 번호</span><input type="number" min="1" value={startNumber} onChange={(event) => setStartNumber(Number(event.target.value))} /></label>
            <label className="field"><span>번호 위치</span><select value={position} onChange={(event) => setPosition(event.target.value as 'bottom' | 'top')}><option value="bottom">아래 가운데</option><option value="top">위 가운데</option></select></label>
            <p className="field-note">{startNumber}부터 {startNumber + pageCount - 1}까지 번호가 들어갑니다.</p>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={addNumbers} disabled={processing}>{processing ? '번호를 넣고 있어요…' : '페이지 번호 넣고 다운로드'}</button>
          </section>
        </div>
      )}
    </ToolShell>
  )
}
