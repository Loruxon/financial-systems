import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { toast } from "sonner"
import { File, FileImage, FileSpreadsheet, FileText, Download, Trash2, Upload, X } from "lucide-react"
import { api, type OutgoingPaymentDocumentItem } from "@/lib/api"
import { cn, formatSize, filesFromClipboard } from "@/lib/utils"
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
} from "@/components/ui/attachment"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { FileActionButton } from "@/components/files/doc-type"

// Плоский список документов исходящего платежа — без раздела/типа документа
// и без ограничений доступа (админ всегда может грузить/удалять), поэтому
// не переиспользуем requests/Documents — там своя, более сложная модель.

export interface OutgoingPaymentDocumentsHandle {
  getCount: () => number
  /** Реально загружает файлы, накопленные в буфере (пока платежа не было),
   *  на переданный id — вызывается родителем сразу после создания платежа. */
  flush: (paymentId: number) => Promise<void>
}

interface PendingUpload {
  id: string
  name: string
}

interface BufferedFile {
  id: string
  file: File
}

function DocIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
  const isSheet = ["xlsx", "xls", "csv"].includes(ext)
  const isDoc = ["pdf", "doc", "docx", "txt", "rtf"].includes(ext)
  const Icon = isImage ? FileImage : isSheet ? FileSpreadsheet : isDoc ? FileText : File
  return <Icon />
}

function formatUploadTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export const OutgoingPaymentDocuments = forwardRef<OutgoingPaymentDocumentsHandle, { paymentId?: number }>(
  function OutgoingPaymentDocuments({ paymentId }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [items, setItems] = useState<OutgoingPaymentDocumentItem[]>([])
    const [pending, setPending] = useState<PendingUpload[]>([])
    // Файлы, выбранные до создания платежа — реально грузятся только через
    // flush(), сразу после того, как платёж сохранён и получил id.
    const [buffered, setBuffered] = useState<BufferedFile[]>([])

    useEffect(() => {
      if (!paymentId) return
      api.getOutgoingPaymentDocuments(paymentId)
        .then(setItems)
        .catch(() => toast.error("Не удалось загрузить список документов"))
    }, [paymentId])

    const uploadNow = async (id: number, files: File[]) => {
      const newPending: PendingUpload[] = files.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, name: f.name }))
      setPending((prev) => [...prev, ...newPending])
      await Promise.all(files.map(async (f, i) => {
        const tempId = newPending[i].id
        try {
          const doc = await api.uploadOutgoingPaymentDocument(id, f)
          setItems((prev) => [doc, ...prev])
        } catch {
          toast.error(`Не удалось загрузить файл ${f.name}`)
        } finally {
          setPending((prev) => prev.filter((p) => p.id !== tempId))
        }
      }))
    }

    const addFiles = async (files: File[]) => {
      if (!paymentId) {
        setBuffered((prev) => [
          ...prev,
          ...files.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, file: f })),
        ])
        return
      }
      await uploadNow(paymentId, files)
    }

    const removeBuffered = (id: string) => setBuffered((prev) => prev.filter((b) => b.id !== id))

    const flush = async (id: number) => {
      const toUpload = buffered
      if (toUpload.length === 0) return
      setBuffered([])
      await uploadNow(id, toUpload.map((b) => b.file))
    }

    const removeItem = async (id: number) => {
      try {
        await api.deleteOutgoingPaymentDocument(id)
        setItems((prev) => prev.filter((item) => item.id !== id))
      } catch {
        toast.error("Не удалось удалить файл")
      }
    }

    useImperativeHandle(ref, () => ({
      getCount: () => items.length + buffered.length,
      flush,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [items, buffered])

    const hasContent = items.length > 0 || pending.length > 0 || buffered.length > 0

    const dragHandlers = {
      onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault()
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        addFiles(Array.from(e.dataTransfer.files))
      },
    }

    return (
      <div
        {...dragHandlers}
        tabIndex={0}
        onPaste={(e) => {
          const files = filesFromClipboard(e)
          if (files.length) { e.preventDefault(); addFiles(files) }
        }}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring/20 rounded-xl"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files))
            e.target.value = ""
          }}
        />

        {!hasContent ? (
          <div className="px-6 py-4">
            <Empty
              className={cn(
                "cursor-pointer border-2 transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
              )}
              onClick={() => inputRef.current?.click()}
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Upload />
                </EmptyMedia>
                <EmptyTitle>Нет документов</EmptyTitle>
                <EmptyDescription>Перетащите файлы, нажмите для выбора или вставьте (Ctrl+V)</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className={cn("flex flex-col gap-2 p-3 transition-colors", isDragging && "bg-primary/5")}>
            {buffered.map((b) => (
              <Attachment key={b.id} state="idle" className="w-full">
                <AttachmentMedia>
                  <DocIcon name={b.file.name} />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{b.file.name}</AttachmentTitle>
                  <AttachmentDescription>{formatSize(b.file.size)} · будет загружен при сохранении</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <FileActionButton
                    tooltip={`Убрать ${b.file.name}`}
                    className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeBuffered(b.id)}
                  >
                    <X />
                  </FileActionButton>
                </AttachmentActions>
              </Attachment>
            ))}
            {pending.map((p) => (
              <Attachment key={p.id} state="uploading" className="w-full">
                <AttachmentMedia>
                  <Spinner />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{p.name}</AttachmentTitle>
                  <AttachmentDescription>Загрузка...</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
            {items.map((item) => (
              <Attachment key={item.id} state="done" className="w-full">
                <AttachmentMedia>
                  <DocIcon name={item.original_name} />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{item.original_name}</AttachmentTitle>
                  <AttachmentDescription>
                    {formatSize(item.size)} · {formatUploadTime(item.uploaded_at)}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <FileActionButton
                    tooltip={`Скачать ${item.original_name}`}
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a href={item.url} download={item.original_name}>
                      <Download />
                    </a>
                  </FileActionButton>
                  <FileActionButton
                    tooltip={`Удалить ${item.original_name}`}
                    className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 />
                  </FileActionButton>
                </AttachmentActions>
              </Attachment>
            ))}
            {isDragging && (
              <div className="flex items-center justify-center gap-2 border-t px-6 py-3">
                <Upload className="size-4 text-primary" />
                <p className="text-sm text-primary">Отпустите файлы для загрузки</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)
