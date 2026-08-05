import { formatBytes } from '../lib/files'

interface Props {
  file: File
  detail?: string
  typeLabel?: string
  onRemove: () => void
}

export default function SelectedDocument({ file, detail, typeLabel = 'PDF', onRemove }: Props) {
  return (
    <section className="selected-file-card document-selected-card">
      <div className="file-type-icon pdf-icon">{typeLabel}</div>
      <div><strong>{file.name}</strong><span>{detail || formatBytes(file.size)}</span></div>
      <button className="text-button" type="button" onClick={onRemove}>삭제</button>
    </section>
  )
}
