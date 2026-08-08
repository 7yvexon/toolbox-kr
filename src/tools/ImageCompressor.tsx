import { useEffect, useMemo, useState, type ReactNode } from 'react'
import FileDrop from '../components/FileDrop'
import { downloadBlob, formatBytes, renderImage, replaceExtension } from '../lib/files'
import { validateStandardImage } from '../lib/fileValidation'
import { ToolEducation } from '../components/GuidePages'

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [quality, setQuality] = useState(78)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [outputType, setOutputType] = useState('image/jpeg')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const sourceUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file])
  const resultUrl = useMemo(() => result ? URL.createObjectURL(result) : '', [result])

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
  }, [sourceUrl, resultUrl])

  const choose = async (files: File[]) => {
    const nextFile = files[0] || null
    setResult(null)
    if (!nextFile) {
      setFile(null)
      setError('')
      return
    }
    try {
      await validateStandardImage(nextFile)
      setFile(nextFile)
      setError('')
    } catch (reason) {
      setFile(null)
      setError(reason instanceof Error ? reason.message : '이미지 파일을 확인하지 못했습니다.')
    }
  }

  const compress = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      const rendered = await renderImage(file, {
        maxWidth: maxWidth || undefined,
        type: outputType,
        quality: quality / 100,
      })
      setResult(rendered.blob)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '압축 중 문제가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const extension = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg'
  const savedPercent = file && result ? Math.round((1 - result.size / file.size) * 100) : 0

  return (
    <ToolShell eyebrow="IMAGE COMPRESS" title="이미지 용량 줄이기" description="화질은 자연스럽게 유지하고, 제출 가능한 크기로 빠르게 줄여보세요.">
      {!file ? (
        <><FileDrop accept="image/jpeg,image/png,image/webp" title="이미지를 여기에 놓으세요" hint="JPG, PNG, WEBP · 최대 30MB" onFiles={choose} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="workspace-grid">
          <section className="preview-card">
            <div className="preview-image-wrap">
              <img src={resultUrl || sourceUrl} alt="선택한 이미지 미리보기" />
              {result && <span className="result-badge">압축 완료</span>}
            </div>
            <div className="file-summary">
              <div><strong>{file.name}</strong><span>원본 {formatBytes(file.size)}</span></div>
              <button className="text-button" type="button" onClick={() => { void choose([]) }}>다른 파일</button>
            </div>
          </section>

          <section className="control-card">
            <div className="control-heading"><span>압축 설정</span><strong>{quality}%</strong></div>
            <label className="range-label">
              <span>화질</span>
              <input type="range" min="30" max="95" value={quality} onChange={(e) => { setQuality(Number(e.target.value)); setResult(null) }} />
              <div className="range-ends"><span>작은 용량</span><span>선명한 화질</span></div>
            </label>
            <label className="field">
              <span>최대 가로 크기</span>
              <select value={maxWidth} onChange={(e) => { setMaxWidth(Number(e.target.value)); setResult(null) }}>
                <option value="0">원본 크기 유지</option>
                <option value="2560">2560px</option>
                <option value="1920">1920px · 웹 추천</option>
                <option value="1280">1280px</option>
                <option value="800">800px · 문서 첨부</option>
              </select>
            </label>
            <label className="field">
              <span>저장 형식</span>
              <select value={outputType} onChange={(e) => { setOutputType(e.target.value); setResult(null) }}>
                <option value="image/jpeg">JPG · 작은 용량</option>
                <option value="image/webp">WEBP · 웹 최적화</option>
                <option value="image/png">PNG · 투명 배경</option>
              </select>
            </label>
            {error && <p className="error-message">{error}</p>}
            {result ? (
              <div className="result-panel">
                <div><span>결과 용량</span><strong>{formatBytes(result.size)}</strong></div>
                <div><span>절약</span><strong className={savedPercent > 0 ? 'success' : ''}>{savedPercent > 0 ? `${savedPercent}%` : '형식 변환됨'}</strong></div>
                <button className="button primary full" type="button" onClick={() => downloadBlob(result, replaceExtension(file.name, extension))}>압축 이미지 다운로드</button>
              </div>
            ) : (
              <button className="button primary full" type="button" onClick={compress} disabled={processing}>{processing ? '압축하고 있어요…' : '이미지 압축하기'}</button>
            )}
          </section>
        </div>
      )}
    </ToolShell>
  )
}

export function ToolShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="tool-page page-shell">
      <header className="tool-header">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="privacy-pill">
          <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-2.9 8.4-7 10-4.1-1.6-7-5.4-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>
          파일은 서버에 업로드되지 않아요
        </div>
      </header>
      {children}
      <section className="how-section">
        <div><span>01</span><strong>파일을 선택하세요</strong><p>드래그하거나 버튼을 눌러 불러옵니다.</p></div>
        <div><span>02</span><strong>옵션을 정하세요</strong><p>원하는 크기와 품질을 선택합니다.</p></div>
        <div><span>03</span><strong>바로 저장하세요</strong><p>처리가 끝난 파일을 기기에 저장합니다.</p></div>
      </section>
      <ToolEducation path={window.location.pathname.replace(/\/+$/, '') || '/'} />
    </main>
  )
}
