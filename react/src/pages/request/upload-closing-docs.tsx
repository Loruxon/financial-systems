import { useRef, useState } from "react"
import { FileUp, Upload, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup, FieldLabel } from "@/components/ui/field"
import { FileDropzone } from "@/components/file-dropzone"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn, formatSize, filesFromClipboard } from "@/lib/utils"

type DocKind = "transport" | "gtd" | "invoice"

const KIND_LABELS: Record<DocKind, string> = {
  transport: "Транспорт",
  gtd:       "ГТД",
  invoice:   "Инвойсы",
}

const KIND_COLORS: Record<DocKind, string> = {
  transport: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  gtd:       "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  invoice:   "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
}

function UploadZone({
  files,
  onAdd,
  onRemove,
  kind,
}: {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (name: string) => void
  kind: DocKind
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = (incoming: File[]) => {
    const existing = new Set(files.map((f) => f.name))
    onAdd(incoming.filter((f) => !existing.has(f.name)))
  }

  if (files.length === 0) {
    return <FileDropzone onFiles={handleAdd} multiple />
  }

  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); handleAdd(Array.from(e.dataTransfer.files)) },
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = filesFromClipboard(e)
    if (files.length) { e.preventDefault(); handleAdd(files) }
  }

  return (
    <div
      className="flex flex-col gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/20 rounded-xl"
      tabIndex={0}
      onPaste={handlePaste}
      {...dragHandlers}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => { if (e.target.files) handleAdd(Array.from(e.target.files)); e.target.value = "" }}
      />
      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
          <span className="flex-1 truncate text-sm">{f.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
          <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium", KIND_COLORS[kind])}>
            {KIND_LABELS[kind]}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(f.name) }}
            className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Upload className="size-3.5" />
        Добавить ещё
      </button>
    </div>
  )
}

interface UploadClosingDocsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[]) => void
}

export function UploadClosingDocsDialog({ open, onOpenChange, onUpload }: UploadClosingDocsDialogProps) {
  const [transportFiles, setTransportFiles] = useState<File[]>([])
  const [gtdFiles, setGtdFiles] = useState<File[]>([])
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])

  const makeAdder = (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (incoming: File[]) => setter((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...incoming.filter((f) => !existing.has(f.name))]
    })

  const makeRemover = (setter: React.Dispatch<React.SetStateAction<File[]>>) =>
    (name: string) => setter((prev) => prev.filter((f) => f.name !== name))

  const handleOpenChange = (next: boolean) => {
    if (!next) { setTransportFiles([]); setGtdFiles([]); setInvoiceFiles([]) }
    onOpenChange(next)
  }

  const handleSubmit = () => {
    const all = [...transportFiles, ...gtdFiles, ...invoiceFiles]
    if (all.length > 0) onUpload(all)
    handleOpenChange(false)
  }

  const goodsDone = gtdFiles.length > 0 && invoiceFiles.length > 0
  const transportDone = transportFiles.length > 0
  const canSubmit = goodsDone || transportDone

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-muted-foreground" />
            Загрузить документы
          </DialogTitle>
          <DialogDescription>
            Прикрепите закрывающие документы и инвойсы для подтверждения прохождения таможенной декларации.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="goods">
          <TabsList className="w-full">
            <TabsTrigger value="goods" className="gap-1.5">
              Товары
              {goodsDone && <Check data-icon="inline-end" className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
            </TabsTrigger>
            <TabsTrigger value="transport" className="gap-1.5">
              Транспорт
              {transportDone && <Check data-icon="inline-end" className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goods">
            <FieldGroup className="mt-4 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel>ГТД <span className="text-destructive">*</span></FieldLabel>
                <UploadZone
                  files={gtdFiles}
                  onAdd={makeAdder(setGtdFiles)}
                  onRemove={makeRemover(setGtdFiles)}
                  kind="gtd"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>Инвойсы <span className="text-destructive">*</span></FieldLabel>
                <UploadZone
                  files={invoiceFiles}
                  onAdd={makeAdder(setInvoiceFiles)}
                  onRemove={makeRemover(setInvoiceFiles)}
                  kind="invoice"
                />
              </div>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="transport">
            <FieldGroup className="mt-4 gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel>Транспортные документы <span className="text-destructive">*</span></FieldLabel>
                <UploadZone
                  files={transportFiles}
                  onAdd={makeAdder(setTransportFiles)}
                  onRemove={makeRemover(setTransportFiles)}
                  kind="transport"
                />
              </div>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground"><span className="text-destructive">*</span> — обязательно для загрузки</p>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={() => handleOpenChange(false)}>
            Пропустить
          </Button>
          <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
            Прикрепить документы
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
