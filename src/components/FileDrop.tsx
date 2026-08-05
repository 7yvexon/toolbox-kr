import { useRef, useState, type DragEvent } from 'react'

interface Props {
  accept: string
  multiple?: boolean
  title: string
  hint: string
  onFiles: (files: File[]) => void
}

export default function FileDrop({ accept, multiple = false, title, hint, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const selectFiles = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files))
  }
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    selectFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
    >
      <input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} onChange={(event) => selectFiles(event.target.files)} />
      <div className="drop-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>
      </div>
      <strong>{title}</strong>
      <span>{hint}</span>
      <button className="button secondary small" type="button">파일 선택</button>
    </div>
  )
}
