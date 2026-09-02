import { useRef, useState, type ClipboardEvent, type DragEvent } from "react"
import { Upload } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { cn, filesFromClipboard } from "@/lib/utils"

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  title?: string
  description?: string
  className?: string
}

// Общая пустая дропзона (пунктирная рамка + иконка + текст) для загрузки
// файлов кликом, drag-n-drop или вставкой из буфера (Ctrl+V) — используется
// везде, где нужен выбор локальных файлов до отправки на сервер.
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  title = "Загрузить файлы",
  description = "Перетащите, нажмите для выбора или вставьте (Ctrl+V)",
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dragHandlers = {
    onDragEnter: (e: DragEvent) => { e.preventDefault(); setIsDragging(true) },
    onDragLeave: (e: DragEvent) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => { e.preventDefault(); setIsDragging(false); onFiles(Array.from(e.dataTransfer.files)) },
  }

  const handlePaste = (e: ClipboardEvent) => {
    const files = filesFromClipboard(e)
    if (files.length) { e.preventDefault(); onFiles(files) }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => { if (e.target.files) onFiles(Array.from(e.target.files)); e.target.value = "" }}
      />
      <Empty
        tabIndex={0}
        onPaste={handlePaste}
        className={cn(
          "cursor-pointer border-2 outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/20",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40",
          className
        )}
        onClick={() => inputRef.current?.click()}
        {...dragHandlers}
      >
        <EmptyHeader>
          <EmptyMedia variant="icon"><Upload /></EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}
