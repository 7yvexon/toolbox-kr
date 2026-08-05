import { useState } from 'react'
import JSZip from 'jszip'
import FileDrop from '../components/FileDrop'
import { downloadBlob, formatBytes, renderImage, replaceExtension } from '../lib/files'
import { errorMessage } from '../lib/pdf'
import { validateImageBatch } from '../lib/fileValidation'
import { ToolShell } from './ImageCompressor'

export default function ImageConverter() {
  const [files, setFiles] = useState<File[]>([])
  const [outputType, setOutputType] = useState('image/jpeg')
  const [quality, setQuality] = useState(88)
  const [maxWidth, setMaxWidth] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const addFiles = async (incoming: File[]) => {
    try {
      await validateImageBatch(incoming, files)
      setFiles((current) => [...current, ...incoming])
      setError('')
    } catch (reason) {
      setError(errorMessage(reason, '이미지 파일을 확인하지 못했습니다.'))
    }
  }

  const convert = async () => {
    if (!files.length) return
    setProcessing(true); setError('')
    try {
      const extension = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg'
      const results: Array<{ blob: Blob; filename: string }> = []
      for (const file of files) {
        const { blob } = await renderImage(file, { type: outputType, quality: quality / 100, maxWidth: maxWidth || undefined })
        results.push({ blob, filename: replaceExtension(file.name, extension) })
      }
      if (results.length === 1) {
        downloadBlob(results[0].blob, results[0].filename)
      } else {
        const zip = new JSZip()
        results.forEach((result, index) => zip.file(`${String(index + 1).padStart(2, '0')}_${result.filename}`, result.blob))
        downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), `파일뚝딱_${extension}_변환_${results.length}개.zip`)
      }
    } catch (reason) {
      setError(errorMessage(reason, '이미지 형식을 변환하는 중 문제가 발생했습니다.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolShell eyebrow="IMAGE CONVERT" title="이미지 형식 변환" description="JPG, PNG, WEBP 파일을 원하는 형식으로 한꺼번에 바꾸세요.">
      {!files.length ? (
        <><FileDrop multiple accept="image/jpeg,image/png,image/webp" title="이미지를 여러 장 놓으세요" hint="최대 30장 · 전체 120MB" onFiles={addFiles} />{error && <p className="error-message drop-error">{error}</p>}</>
      ) : (
        <div className="document-workspace">
          <section className="image-list-card">
            <div className="list-heading"><div><strong>이미지 {files.length}장</strong><span>여러 장은 ZIP으로 저장됩니다</span></div><button className="button secondary small" type="button" onClick={() => { setFiles([]); setError('') }}>전체 삭제</button></div>
            <div className="document-list">
              {files.map((file, index) => <article className="document-item" key={`${file.name}-${file.lastModified}-${index}`}><span className="order-number">{index + 1}</span><span className="mini-image-icon">IMG</span><div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div><div className="order-actions"><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="삭제">×</button></div></article>)}
            </div>
            <FileDrop multiple accept="image/jpeg,image/png,image/webp" title="이미지 더 추가하기" hint="클릭하거나 끌어다 놓으세요" onFiles={addFiles} />
          </section>
          <aside className="control-card document-controls">
            <label className="field"><span>저장 형식</span><select value={outputType} onChange={(event) => setOutputType(event.target.value)}><option value="image/jpeg">JPG · 범용</option><option value="image/webp">WEBP · 웹 최적화</option><option value="image/png">PNG · 투명 배경</option></select></label>
            <label className="range-label"><span>화질 {quality}%</span><input type="range" min="40" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>
            <label className="field"><span>최대 가로 크기</span><select value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value))}><option value="0">원본 크기 유지</option><option value="2560">2560px</option><option value="1920">1920px · 웹 추천</option><option value="1280">1280px</option><option value="800">800px</option></select></label>
            {error && <p className="error-message">{error}</p>}
            <button className="button primary full" type="button" onClick={convert} disabled={processing}>{processing ? '이미지를 변환하고 있어요…' : '이미지 변환하고 다운로드'}</button>
          </aside>
        </div>
      )}
    </ToolShell>
  )
}
