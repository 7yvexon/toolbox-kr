import { useId, useRef, useState, type DragEvent } from 'react'

interface Props {
  accept: string
  multiple?: boolean
  title: string
  hint: string
  onFiles: (files: File[]) => void | Promise<void>
}

export default function FileDrop({ accept, multiple = false, title, hint, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const selectFiles = async (files: FileList | null) => {
    if (files?.length) await onFiles(Array.from(files))
  }
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void selectFiles(event.dataTransfer.files)
  }

  return (
    <label
      className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} aria-describedby={hintId} onChange={(event) => { void selectFiles(event.target.files); event.currentTarget.value = '' }} />
      <div className="drop-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>
      </div>
      <strong>{title}</strong>
      <span id={hintId}>{hint}</span>
      <span className="button secondary small" aria-hidden="true">파일 선택</span>
    </label>
  )
}
