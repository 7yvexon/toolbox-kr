import { useEffect, useMemo, useState } from 'react'
import heic2any from 'heic2any'
import FileDrop from '../components/FileDrop'
import { downloadBlob, formatBytes, replaceExtension } from '../lib/files'
import { ToolShell } from './ImageCompressor'

export default function HeicConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [quality, setQuality] = useState(88)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const resultUrl = useMemo(() => result ? URL.createObjectURL(result) : '', [result])

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl) }, [resultUrl])
  const select = (files: File[]) => { setFile(files[0] || null); setResult(null); setError('') }

  const convert = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: quality / 100 })
      setResult(Array.isArray(converted) ? converted[0] : converted)
    } catch {
      setError('이 HEIC 파일을 변환하지 못했습니다. 다른 파일로 다시 시도해 주세요.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="HEIC TO JPG" title="HEIC를 JPG로 변환" description="아이폰 사진을 어디서나 열리는 JPG 파일로 바꿔보세요.">
      {!file ? (
        <FileDrop accept=".heic,.heif,image/heic,image/heif" title="HEIC 사진을 여기에 놓으세요" hint="HEIC, HEIF · 최대 30MB" onFiles={select} />
      ) : (
        <div className="workspace-grid compact-workspace">
          <section className="selected-file-card">
            <div className="file-type-icon">HEIC</div>
            <div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>
            <button className="text-button" type="button" onClick={() => select([])}>삭제</button>
          </section>
          <section className="control-card">
            <div className="control-heading"><span>JPG 화질</span><strong>{quality}%</strong></div>
            <label className="range-label">
              <input type="range" min="50" max="100" value={quality} onChange={(e) => { setQuality(Number(e.target.value)); setResult(null) }} />
              <div className="range-ends"><span>작은 용량</span><span>원본에 가깝게</span></div>
            </label>
            {error && <p className="error-message">{error}</p>}
            {result ? (
              <div className="result-panel heic-result">
                <img src={resultUrl} alt="변환된 JPG 미리보기" />
                <div><span>변환 완료</span><strong>{formatBytes(result.size)}</strong></div>
                <button className="button primary full" type="button" onClick={() => downloadBlob(result, replaceExtension(file.name, 'jpg'))}>JPG 다운로드</button>
              </div>
            ) : (
              <button className="button primary full" type="button" onClick={convert} disabled={processing}>{processing ? '변환하고 있어요…' : 'JPG로 변환하기'}</button>
            )}
          </section>
        </div>
      )}
    </ToolShell>
  )
}
