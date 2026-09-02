import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { toast } from "sonner"
import { api, type DocumentItem, type DocumentSection } from "@/lib/api"
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
import { File, FileImage, FileSpreadsheet, FileText, Download, Trash2, Upload, X } from "lucide-react"
import { type DocType, type DocTypeVariant, DocTypePicker, FileActionButton } from "@/components/files/doc-type"

export interface DocumentsHandle {
  open: () => void
  addFiles: (files: File[]) => Promise<void>
  getCount: () => number
  /** Реально загружает файлы, накопленные в буфере (пока requestId не было),
   *  на переданный id — вызывается родителем сразу после создания заявки. */
  flush: (requestId: number) => Promise<void>
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

export const Documents = forwardRef<DocumentsHandle, {
  requestId?: number
  section: DocumentSection
  onCountChange?: (count: number) => void
  readOnly?: boolean
  error?: boolean
  /** Админ видит и назначает тип документа и может удалять файлы в любой момент.
   *  Организация может удалять/загружать только пока readOnly=false. */
  admin?: boolean
  docTypeVariant?: DocTypeVariant
  /** Пока false (и не readOnly) — вложение файлов недоступно, показывается
   *  blockedHint. По умолчанию true — не влияет на остальных потребителей. */
  canAttach?: boolean
  /** Текст плейсхолдера, когда canAttach=false и блок не readOnly. */
  blockedHint?: string
}>(
  function Documents({ requestId, section, onCountChange, readOnly = false, error = false, admin = false, docTypeVariant = "payment", canAttach = true, blockedHint }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const onCountChangeRef = useRef(onCountChange)
    onCountChangeRef.current = onCountChange
    const [isDragging, setIsDragging] = useState(false)
    const [items, setItems] = useState<DocumentItem[]>([])
    const [pending, setPending] = useState<PendingUpload[]>([])
    // Файлы, выбранные до появления requestId — реально грузятся только через
    // flush(), в момент, когда заявка наконец создана (клик "Сохранить"/"Отправить").
    const [buffered, setBuffered] = useState<BufferedFile[]>([])

    useEffect(() => {
      if (!requestId) return
      const list = admin ? api.getAdminDocuments(requestId, section) : api.getDocuments(requestId, section)
      list.then(setItems).catch(() => toast.error("Не удалось загрузить список документов"))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId, section, admin])

    useEffect(() => {
      onCountChangeRef.current?.(items.length + buffered.length)
    }, [items.length, buffered.length])

    const uploadNow = async (id: number, files: File[]) => {
      const newPending: PendingUpload[] = files.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, name: f.name }))
      setPending((prev) => [...prev, ...newPending])
      await Promise.all(files.map(async (f, i) => {
        const tempId = newPending[i].id
        try {
          const doc = admin
            ? await api.uploadAdminDocument(id, section, f)
            : await api.uploadDocument(id, section, f)
          setItems((prev) => [doc, ...prev])
        } catch {
          toast.error(`Не удалось загрузить файл ${f.name}`)
        } finally {
          setPending((prev) => prev.filter((p) => p.id !== tempId))
        }
      }))
    }

    const addFiles = async (files: File[]) => {
      if (readOnly || !canAttach) return
      if (!requestId) {
        setBuffered((prev) => [
          ...prev,
          ...files.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, file: f })),
        ])
        return
      }
      await uploadNow(requestId, files)
    }

    const removeBuffered = (id: string) => setBuffered((prev) => prev.filter((b) => b.id !== id))

    const flush = async (id: number) => {
      const toUpload = buffered
      if (toUpload.length === 0) return
      setBuffered([])
      await uploadNow(id, toUpload.map((b) => b.file))
    }

    const removeItem = async (id: number) => {
      if (!requestId) return
      try {
        if (admin) await api.deleteAdminDocument(id)
        else await api.deleteDocument(requestId, id)
        setItems((prev) => prev.filter((item) => item.id !== id))
      } catch {
        toast.error("Не удалось удалить файл")
      }
    }

    const setDocType = async (id: number, docType: DocType) => {
      try {
        const updated = await api.updateAdminDocumentType(id, docType)
        setItems((prev) => prev.map((item) => item.id === id ? updated : item))
      } catch {
        toast.error("Не удалось изменить тип документа")
      }
    }

    // Организация может удалять файлы, пока заявка ещё в редактируемом
    // статусе (в т.ч. уже загруженные — если файл прикрепили по ошибке).
    // Как только заявка ушла в работу (readOnly), удалить нельзя — только
    // скачать. Админ может удалять в любой момент, вне зависимости от статуса.
    const canRemove = admin || !readOnly

    const canUpload = !readOnly && canAttach

    useImperativeHandle(ref, () => ({
      open: () => { if (canUpload) inputRef.current?.click() },
      addFiles,
      getCount: () => items.length + buffered.length,
      flush,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [items, buffered, canUpload])

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
        {...(canUpload ? dragHandlers : {})}
        tabIndex={canUpload ? 0 : undefined}
        onPaste={canUpload ? (e) => {
          const files = filesFromClipboard(e)
          if (files.length) { e.preventDefault(); addFiles(files) }
        } : undefined}
        className={canUpload ? "outline-none focus-visible:ring-2 focus-visible:ring-ring/20 rounded-xl" : undefined}
      >
        {canUpload && (
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
        )}

        {!hasContent ? (
          <div className="px-6 py-4">
            {!canUpload ? (
              <Empty className="border border-muted-foreground/10">
                <EmptyHeader>
                  <EmptyTitle>
                    {readOnly ? "Нет документов" : (blockedHint ?? "Сохраните заявку, чтобы прикрепить документы")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <Empty
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : error
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/70"
                    : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
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
            )}
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
                  {admin && (
                    <DocTypePicker value={item.doc_type} onChange={(v) => setDocType(item.id, v)} variant={docTypeVariant} />
                  )}
                  <FileActionButton
                    tooltip={`Скачать ${item.original_name}`}
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a href={item.url} download={item.original_name}>
                      <Download />
                    </a>
                  </FileActionButton>
                  {canRemove && (
                    <FileActionButton
                      tooltip={`Удалить ${item.original_name}`}
                      className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 />
                    </FileActionButton>
                  )}
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
