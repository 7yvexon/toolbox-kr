import { formatBytes } from '../lib/files'

interface Props {
  file: File
  detail?: string
  onRemove: () => void
}

export default function SelectedDocument({ file, detail, onRemove }: Props) {
  return (
    <section className="selected-file-card document-selected-card">
      <div className="file-type-icon pdf-icon">PDF</div>
      <div><strong>{file.name}</strong><span>{detail || formatBytes(file.size)}</span></div>
      <button className="text-button" type="button" onClick={onRemove}>삭제</button>
    </section>
  )
}
