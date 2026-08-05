import { useState } from 'react'
import FileDrop from '../components/FileDrop'
import SelectedDocument from '../components/SelectedDocument'
import { downloadPdf, errorMessage, loadPdf, pdfOutputName } from '../lib/pdf'
import { rotatePdfPages } from '../lib/pdfOperations'
import { ToolShell } from './ImageCompressor'

export default function PdfRotate() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [rotation, setRotation] = useState(90)
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

  const rotate = async () => {
    if (!file) return
    setProcessing(true); setError('')
    try {
      const document = await rotatePdfPages(file, rotation)
      await downloadPdf(document, pdfOutputName(file.name, `${rotation}도회전`))
    } catch (reason) {
      setError(errorMessage(reason, 'PDF를 회전하는 중 문제가 발생했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="ROTATE PDF" title="PDF 회전" description="뒤집혀 저장된 PDF의 모든 페이지를 한 번에 돌려보세요.">
      {!file ? (
        <><FileDrop accept="application/pdf,.pdf" title="PDF를 여기에 놓으세요" hint="최대 50MB · 200페이지" onFiles={select} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid compact-workspace">
          <SelectedDocument file={file} detail={`${pageCount}페이지`} onRemove={() => { void select([]) }} />
          <section className="control-card">
            <div className="control-heading"><span>회전 방향</span><strong>{rotation}°</strong></div>
            <div className="choice-grid">
              {[90, 180, 270].map((value) => <button className={rotation === value ? 'choice-button active' : 'choice-button'} type="button" key={value} onClick={() => setRotation(value)}>{value === 90 ? '오른쪽 90°' : value === 180 ? '180° 뒤집기' : '왼쪽 90°'}</button>)}
            </div>
            <p className="field-note">전체 {pageCount}페이지에 동일하게 적용됩니다.</p>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={rotate} disabled={processing}>{processing ? 'PDF를 회전하고 있어요…' : '회전한 PDF 다운로드'}</button>
          </section>
        </div>
      )}
    </ToolShell>
  )
}
