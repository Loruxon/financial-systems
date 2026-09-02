import { useRef, useState } from "react"
import { Upload, X, FileText } from "lucide-react"
import { cn, formatSize, filesFromClipboard } from "@/lib/utils"

interface UploadZoneProps {
  file: File | null
  onChange: (file: File | null) => void
  accept?: string
}

export function UploadZone({ file, onChange, accept }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = filesFromClipboard(e)[0]
    if (pasted) { e.preventDefault(); onChange(pasted) }
  }

  if (file) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <button
          onClick={() => onChange(null)}
          className="shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange(f)
          e.target.value = ""
        }}
      />
      <div
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          "group flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/20",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
        )}
      >
        <div className={cn(
          "flex size-9 items-center justify-center rounded-xl transition-colors",
          isDragging ? "bg-primary/10" : "bg-muted/60 group-hover:bg-primary/10"
        )}>
          <Upload className={cn(
            "size-4 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">Перетащите, нажмите<br />или вставьте (Ctrl+V)</p>
      </div>
    </>
  )
}
