import { useEffect, useRef, useState } from "react"
import { Plus, FileSpreadsheet, CircleCheck, CircleX, ChevronsUpDown, Info, ChevronDown, AlertTriangle, ArrowRight, TrendingUp, Upload } from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { FileDropzone } from "@/components/file-dropzone"
import { RepeatableFormRow } from "@/components/repeatable-form-row"
import { AddRowButton } from "@/components/add-row-button"
import { Spinner } from "@/components/ui/spinner"
import { cn, fmtNum, toApiDate } from "@/lib/utils"
import { api, type Recipient, type AdminPayer } from "@/lib/api"
import { columns, type ReceiptEntry } from "./columns"

// ─── Excel parsing ────────────────────────────────────────────────────────────

interface ParsedRow {
  date: string          // YYYY-MM-DD if valid, raw string if not
  amount: number
  recipientName: string // raw text from Excel
  payerName: string     // raw text from Excel
  valid: boolean
  error?: string
}

function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, dateNF: "dd.mm.yyyy" })

        resolve(rows.map((row) => {
          const dateRaw      = row["Дата"]        ?? row["дата"]        ?? row["date"]      ?? row["DATE"]
          const amountRaw    = row["Сумма"]        ?? row["сумма"]       ?? row["Сумма, ₽"]  ?? row["amount"]  ?? row["AMOUNT"]
          const recipientRaw = String(row["Получатель"]  ?? row["получатель"]  ?? row["recipient"] ?? "").trim()
          const payerRaw     = String(row["Плательщик"]  ?? row["плательщик"]  ?? row["payer"]     ?? "").trim()

          if (!dateRaw || !amountRaw) {
            return { date: String(dateRaw ?? ""), amount: 0, recipientName: recipientRaw, payerName: payerRaw, valid: false, error: "Нет нужных колонок" }
          }

          const amountNum = Number(String(amountRaw).replace(/[^\d.,]/g, "").replace(",", "."))
          if (isNaN(amountNum) || amountNum <= 0) {
            return { date: String(dateRaw), amount: 0, recipientName: recipientRaw, payerName: payerRaw, valid: false, error: "Неверная сумма" }
          }

          const dateStr  = String(dateRaw)
          const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
          const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          const apiDate  = dotMatch ? `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}` : isoMatch ? dateStr : ""

          if (!apiDate) {
            return { date: dateStr, amount: amountNum, recipientName: recipientRaw, payerName: payerRaw, valid: false, error: "Неверный формат даты" }
          }

          return { date: apiDate, amount: amountNum, recipientName: recipientRaw, payerName: payerRaw, valid: true }
        }))
      } catch {
        reject(new Error("Не удалось прочитать файл"))
      }
    }
    reader.onerror = () => reject(new Error("Ошибка чтения файла"))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Format guide ─────────────────────────────────────────────────────────────

function FormatGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="size-4 shrink-0" />
        <span className="flex-1 text-left font-medium text-foreground/80">Как подготовить файл</span>
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-4 pt-3 pb-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Файл <span className="font-medium text-foreground">.xlsx</span>, первый лист. Все четыре колонки обязательны:
          </p>
          {/* Example table — looks like actual Excel */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    { label: "Дата",        hint: "ДД.ММ.ГГГГ" },
                    { label: "Сумма",       hint: "число"       },
                    { label: "Получатель",  hint: "текст"       },
                    { label: "Плательщик",  hint: "текст"       },
                  ].map(({ label, hint }) => (
                    <th key={label} className="px-3 py-2 text-left">
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">({hint})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y bg-card font-mono text-xs text-muted-foreground">
                <tr>
                  <td className="px-3 py-2">08.07.2026</td>
                  <td className="px-3 py-2">10 000,00</td>
                  <td className="px-3 py-2">YERZEN</td>
                  <td className="px-3 py-2">ООО &quot;АЛФ МАРКЕТ&quot;</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">09.07.2026</td>
                  <td className="px-3 py-2">25 500,00</td>
                  <td className="px-3 py-2">KAPITAL</td>
                  <td className="px-3 py-2">ИП Иванов И.И.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg bg-muted/40 border px-3 py-2.5 text-xs text-muted-foreground flex gap-2">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              Получатель и Плательщик сопоставляются с записями в системе по названию.
              Если имя не распознано — назначьте вручную на шаге проверки.
              Строки без Получателя или Плательщика импортированы не будут.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Recipient combobox ───────────────────────────────────────────────────────

function RecipientSelect({ value, onChange, recipients, compact }: {
  value: number | null
  onChange: (id: number | null) => void
  recipients: Recipient[]
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = recipients.find((r) => r.id === value) ?? null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-input bg-transparent transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
            "dark:bg-input/30",
            compact ? "h-7 px-2 text-xs" : "h-10 px-3 text-sm"
          )}
        >
          <span className={cn("truncate", selected ? "" : "text-foreground-secondary")}>
            {selected?.name ?? (compact ? "Выбрать…" : "Выберите получателя")}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command>
          <CommandInput placeholder="Поиск по получателю..." />
          <CommandList>
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {recipients.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.name}
                  data-checked={value === r.id}
                  onSelect={() => { onChange(r.id); setOpen(false) }}
                >
                  {r.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Payer combobox ──────────────────────────────────────────────────────────

function PayerSelect({ value, onChange, payers, compact }: {
  value: number | null
  onChange: (id: number | null) => void
  payers: AdminPayer[]
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = payers.find((p) => p.id === value) ?? null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-input bg-transparent transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
            "dark:bg-input/30",
            compact ? "h-7 px-2 text-xs" : "h-10 px-3 text-sm"
          )}
        >
          <span className={cn("truncate", selected ? "" : "text-foreground-secondary")}>
            {compact
              ? (selected?.name ?? "Выбрать…")
              : (selected ? `${selected.name} · ИНН ${selected.inn}` : "Выберите плательщика")}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px]" align="start">
        <Command>
          <CommandInput placeholder="Поиск по названию или ИНН..." />
          <CommandList>
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {payers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.inn} ${p.organization_name}`}
                  data-checked={value === p.id}
                  onSelect={() => { onChange(p.id); setOpen(false) }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">ИНН {p.inn} · {p.organization_name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Manual bulk entry dialog ─────────────────────────────────────────────────

interface ManualRow {
  key: string
  date: string
  amount: string
  recipientId: number | null
  payerId: number | null
}

function makeRow(): ManualRow {
  return { key: Math.random().toString(36).slice(2), date: "", amount: "", recipientId: null, payerId: null }
}

function ManualBulkDialog({ open, onClose, onAdded, recipients, payers }: {
  open: boolean
  onClose: () => void
  onAdded: (entries: ReceiptEntry[]) => void
  recipients: Recipient[]
  payers: AdminPayer[]
}) {
  const [rows, setRows] = useState<ManualRow[]>(() => [makeRow()])
  const [saving, setSaving] = useState(false)

  const update = (key: string, patch: Partial<ManualRow>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  const remove = (key: string) =>
    setRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev)

  const handleClose = () => { setRows([makeRow()]); onClose() }

  const validRows = rows.filter(r =>
    /^\d{2}\.\d{2}\.\d{4}$/.test(r.date) &&
    r.amount && parseFloat(r.amount) > 0 &&
    r.recipientId !== null &&
    r.payerId !== null
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const created = await api.createAdminIncomingPaymentsBulk(validRows.map(r => ({
        date: toApiDate(r.date),
        amount: r.amount,
        recipient: r.recipientId,
        payer: r.payerId,
      })))
      onAdded(created.map(receipt => ({
        id: receipt.id,
        date: receipt.date,
        amount: parseFloat(receipt.amount),
        recipient: receipt.recipient_name ?? "",
        payer: receipt.payer_name ?? "",
        organization: receipt.organization_name ?? "",
      })))
      handleClose()
    } catch {
      toast.error("Не удалось добавить поступления")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="xl"
        // Осознанное исключение из общего правила "закрытие по клику на
        // overlay": форма может содержать несколько заполненных строк,
        // случайный клик мимо был бы обиднее, чем лишний шаг через "Отмена".
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Добавить поступления
          </DialogTitle>
          <DialogDescription>Все поля обязательны</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            {rows.map((row, idx) => {
              const complete =
                /^\d{2}\.\d{2}\.\d{4}$/.test(row.date) &&
                !!row.amount && parseFloat(row.amount) > 0 &&
                row.recipientId !== null &&
                row.payerId !== null
              return (
                <RepeatableFormRow
                  key={row.key}
                  label="Поступление"
                  index={idx}
                  complete={complete}
                  onRemove={() => remove(row.key)}
                  removeDisabled={rows.length === 1}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Дата</FieldLabel>
                      <DatePicker value={row.date} onChange={date => update(row.key, { date })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Сумма, ₽</FieldLabel>
                      <Input
                        size="lg"
                        type="number"
                        placeholder="0,00"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={e => update(row.key, { amount: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Получатель</FieldLabel>
                      <RecipientSelect
                        value={row.recipientId}
                        onChange={id => update(row.key, { recipientId: id })}
                        recipients={recipients}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Плательщик</FieldLabel>
                      <PayerSelect
                        value={row.payerId}
                        onChange={id => update(row.key, { payerId: id })}
                        payers={payers}
                      />
                    </div>
                  </div>
                </RepeatableFormRow>
              )
            })}
          </div>

          <AddRowButton onClick={() => setRows(prev => [...prev, makeRow()])}>
            Добавить строку
          </AddRowButton>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={handleClose}>Отмена</Button>
          <Button size="lg" disabled={validRows.length === 0 || saving} onClick={handleSave}>
            {saving && <Spinner className="size-4" data-icon="inline-start" />}
            Добавить{validRows.length > 0 ? ` ${validRows.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Import dialog ────────────────────────────────────────────────────────────

type ImportStep = "upload" | "review"

function ImportDialog({ open, onClose, onImported, recipients, payers }: {
  open: boolean
  onClose: () => void
  onImported: (entries: ReceiptEntry[]) => void
  recipients: Recipient[]
  payers: AdminPayer[]
}) {
  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // named-entry mapping: Excel name → DB id (auto-matched, adjustable in mapping section)
  const [recipientMap, setRecipientMap] = useState<Record<string, number | null>>({})
  const [payerMap, setPayerMap] = useState<Record<string, number | null>>({})

  // per-row manual override for rows that had no name in the file: row index → DB id
  const [rowRecipientOverrides, setRowRecipientOverrides] = useState<Record<number, number | null>>({})
  const [rowPayerOverrides, setRowPayerOverrides] = useState<Record<number, number | null>>({})

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) return
    setFile(f)
    setPreview(null)
    setParseError(null)
    setIsParsing(true)
    try {
      const rows = await parseExcelFile(f)
      setPreview(rows)

      const uniqueRNames = [...new Set(rows.filter(r => r.recipientName).map(r => r.recipientName))]
      const uniquePNames = [...new Set(rows.filter(r => r.payerName).map(r => r.payerName))]

      const rm: Record<string, number | null> = {}
      const pm: Record<string, number | null> = {}
      uniqueRNames.forEach(name => {
        rm[name] = recipients.find(r => r.name.toLowerCase() === name.toLowerCase())?.id ?? null
      })
      uniquePNames.forEach(name => {
        pm[name] = payers.find(p => p.name.toLowerCase() === name.toLowerCase())?.id ?? null
      })
      setRecipientMap(rm)
      setPayerMap(pm)
      setStep("review")
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Ошибка парсинга")
    } finally {
      setIsParsing(false)
    }
  }

  const handleReset = () => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setParseError(null)
    setRecipientMap({})
    setPayerMap({})
    setRowRecipientOverrides({})
    setRowPayerOverrides({})
  }

  const handleClose = () => { handleReset(); onClose() }

  const handleImport = async () => {
    if (!preview) return
    setIsImporting(true)
    try {
      const created = await api.createAdminIncomingPaymentsBulk(
        readyRows.map(r => ({
          date: r.date,
          amount: String(r.amount),
          recipient: r.recipientId,
          payer: r.payerId,
        }))
      )
      onImported(created.map(receipt => ({
        id: receipt.id,
        date: receipt.date,
        amount: parseFloat(receipt.amount),
        recipient: receipt.recipient_name ?? "",
        payer: receipt.payer_name ?? "",
        organization: receipt.organization_name ?? "",
      })))
      handleClose()
    } catch {
      toast.error("Не удалось импортировать поступления")
    } finally {
      setIsImporting(false)
    }
  }

  // Fully resolved rows: attach recipientId/payerId + ready flag
  const resolvedRows = (preview ?? []).map((row, i) => {
    const recipientId = row.recipientName
      ? (recipientMap[row.recipientName] ?? null)
      : (rowRecipientOverrides[i] ?? null)
    const payerId = row.payerName
      ? (payerMap[row.payerName] ?? null)
      : (rowPayerOverrides[i] ?? null)
    return { ...row, i, recipientId, payerId, ready: row.valid && recipientId !== null && payerId !== null }
  })

  const errorRows    = resolvedRows.filter(r => !r.valid)
  const validRows    = resolvedRows.filter(r => r.valid)
  const readyRows    = resolvedRows.filter(r => r.ready)
  const notReadyRows = resolvedRows.filter(r => r.valid && !r.ready)

  const unmatchedR = Object.entries(recipientMap).filter(([, id]) => id === null).map(([n]) => n)
  const unmatchedP = Object.entries(payerMap).filter(([, id]) => id === null).map(([n]) => n)
  const hasUnmatched     = unmatchedR.length > 0 || unmatchedP.length > 0
  const showMappingBlock = Object.keys(recipientMap).length > 0 || Object.keys(payerMap).length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        // Шире стандартного "lg": на шаге проверки нужна таблица предпросмотра
        // строк из Excel, которой тесно в обычной ширине формы.
        className="sm:max-w-2xl"
        // Осознанное исключение из общего правила "закрытие по клику на
        // overlay": многошаговый импорт с разбором файла — случайное закрытие
        // на этапе сопоставления обиднее, чем лишний клик по крестику.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-muted-foreground" />
            Импорт из Excel
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Загрузите файл .xlsx с поступлениями"
              : `${file?.name} · ${preview?.length ?? 0} строк`}
          </DialogDescription>
        </DialogHeader>

        {/* Скроллится только тело диалога — шапка и футер всегда на виду,
            даже когда таблица предпросмотра на шаге "review" высокая. */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <FormatGuide />

            <FileDropzone
              onFiles={(files) => { const f = files[0]; if (f) handleFile(f) }}
              accept=".xlsx,.xls"
              title="Загрузить файл"
              description="Перетащите .xlsx или нажмите для выбора"
            />

            {isParsing && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Spinner className="size-4" /> Читаем файл…
              </div>
            )}
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === "review" && preview && (
          <div className="flex flex-col gap-4">

            {/* File chip */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-2.5">
              <FileSpreadsheet className="size-4 shrink-0 text-[#217346]" />
              <span className="flex-1 truncate text-sm font-medium">{file?.name}</span>
              <button
                onClick={handleReset}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Изменить
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="flex items-center gap-1.5">
                <CircleCheck className="size-4 text-emerald-500" />
                <span className="font-medium tabular-nums">{readyRows.length}</span>
                <span className="text-muted-foreground">готово к импорту</span>
              </span>
              {notReadyRows.length > 0 && (
                <>
                  <div className="w-px h-3.5 bg-border" />
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                    <span className="font-medium tabular-nums">{notReadyRows.length}</span>
                    <span className="text-muted-foreground">не заполнено</span>
                  </span>
                </>
              )}
              {errorRows.length > 0 && (
                <>
                  <div className="w-px h-3.5 bg-border" />
                  <span className="flex items-center gap-1.5">
                    <CircleX className="size-4 text-destructive" />
                    <span className="font-medium tabular-nums text-destructive">{errorRows.length}</span>
                    <span className="text-muted-foreground">с ошибкой</span>
                  </span>
                </>
              )}
            </div>

            {/* Name mapping section */}
            {showMappingBlock && (
              <div className="rounded-xl border overflow-hidden">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b",
                  hasUnmatched
                    ? "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/8 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                )}>
                  {hasUnmatched
                    ? <AlertTriangle className="size-4 shrink-0" />
                    : <CircleCheck className="size-4 shrink-0" />}
                  {hasUnmatched
                    ? `Сопоставление — ${unmatchedR.length + unmatchedP.length} ${(unmatchedR.length + unmatchedP.length) === 1 ? "имя не найдено" : "имени не найдено"}`
                    : "Все имена распознаны"}
                </div>

                <div className="p-4 flex flex-col gap-5">
                  {Object.keys(recipientMap).length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Получатели
                      </p>
                      <div className="flex flex-col gap-2">
                        {Object.keys(recipientMap).map(name => (
                          <div key={name} className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                recipientMap[name] !== null ? "bg-emerald-500" : "bg-amber-400"
                              )} />
                              <span className="text-sm font-mono truncate text-muted-foreground" title={name}>{name}</span>
                            </div>
                            <ArrowRight className="size-3 text-muted-foreground/40 shrink-0 justify-self-center" />
                            <RecipientSelect
                              value={recipientMap[name]}
                              onChange={(id) => setRecipientMap(m => ({ ...m, [name]: id }))}
                              recipients={recipients}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(payerMap).length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Плательщики
                      </p>
                      <div className="flex flex-col gap-2">
                        {Object.keys(payerMap).map(name => (
                          <div key={name} className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                payerMap[name] !== null ? "bg-emerald-500" : "bg-amber-400"
                              )} />
                              <span className="text-sm font-mono truncate text-muted-foreground" title={name}>{name}</span>
                            </div>
                            <ArrowRight className="size-3 text-muted-foreground/40 shrink-0 justify-self-center" />
                            <PayerSelect
                              value={payerMap[name]}
                              onChange={(id) => setPayerMap(m => ({ ...m, [name]: id }))}
                              payers={payers}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Предпросмотр</p>
              <div className="overflow-hidden rounded-xl border">
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Дата</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Получатель</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Плательщик</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Сумма, ₽</th>
                        <th className="px-3 py-2.5 w-6" />
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                      {resolvedRows.map((row) => {
                        const rName = row.recipientId != null ? recipients.find(r => r.id === row.recipientId)?.name : null
                        const pName = row.payerId   != null ? payers.find(p => p.id === row.payerId)?.name   : null
                        return (
                          <tr key={row.i} className={cn(
                            !row.valid         && "bg-destructive/5",
                            row.valid && !row.ready && "bg-amber-500/5"
                          )}>
                            <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">{row.i + 1}</td>
                            <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                              {row.valid ? row.date.split("-").reverse().join(".") : (row.date || "—")}
                            </td>
                            <td className="px-3 py-1.5 w-[160px] max-w-[160px]">
                              {row.recipientName
                                ? rName
                                  ? <span className="text-xs font-medium truncate block" title={rName}>{rName}</span>
                                  : <span className="text-xs text-amber-600 dark:text-amber-400 truncate block" title={row.recipientName}>{row.recipientName}</span>
                                : <RecipientSelect
                                    compact
                                    value={rowRecipientOverrides[row.i] ?? null}
                                    onChange={(id) => setRowRecipientOverrides(m => ({ ...m, [row.i]: id }))}
                                    recipients={recipients}
                                  />}
                            </td>
                            <td className="px-3 py-1.5 w-[160px] max-w-[160px]">
                              {row.payerName
                                ? pName
                                  ? <span className="text-xs font-medium truncate block" title={pName}>{pName}</span>
                                  : <span className="text-xs text-amber-600 dark:text-amber-400 truncate block" title={row.payerName}>{row.payerName}</span>
                                : <PayerSelect
                                    compact
                                    value={rowPayerOverrides[row.i] ?? null}
                                    onChange={(id) => setRowPayerOverrides(m => ({ ...m, [row.i]: id }))}
                                    payers={payers}
                                  />}
                            </td>
                            <td className="px-3 py-2 text-xs tabular-nums font-medium whitespace-nowrap">
                              {row.valid ? `${fmtNum(row.amount)} ₽` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {row.ready
                                ? <CircleCheck className="size-3.5 text-emerald-500" />
                                : row.valid
                                  ? <AlertTriangle className="size-3.5 text-amber-500" />
                                  : <span title={row.error}><CircleX className="size-3.5 text-destructive" /></span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {(errorRows.length > 0 || notReadyRows.length > 0) && (
                <p className="text-xs text-muted-foreground">
                  Будут пропущены:{" "}
                  {errorRows.length > 0 && <span className="text-destructive font-medium">{errorRows.length} с ошибкой </span>}
                  {notReadyRows.length > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">{notReadyRows.length} без получателя/плательщика</span>}
                </p>
              )}
            </div>
          </div>
        )}

        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" size="lg" onClick={handleClose}>Отмена</Button>
          {step === "review" && (
            <Button size="lg" disabled={readyRows.length === 0 || isImporting} onClick={handleImport}>
              {isImporting
                ? <Spinner className="size-4" data-icon="inline-start" />
                : <FileSpreadsheet data-icon="inline-start" />}
              Импортировать{readyRows.length > 0 ? ` ${readyRows.length}` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminIncomingPaymentsPage() {
  const [entries, setEntries] = useState<ReceiptEntry[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [payers, setPayers] = useState<AdminPayer[]>([])
  const [loading, setLoading] = useState(true)
  const [manualOpen, setManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const p1 = api.getRecipients()
      .then(setRecipients)
      .catch(() => toast.error("Не удалось загрузить счета"))
    const p2 = api.getAdminPayers()
      .then(setPayers)
      .catch(() => toast.error("Не удалось загрузить плательщиков"))
    const p3 = api.getAdminIncomingPayments()
      .then((data) => setEntries(data.map((r) => ({
        id: r.id,
        date: r.date,
        amount: parseFloat(r.amount),
        recipient: r.recipient_name ?? "",
        payer: r.payer_name ?? "",
        organization: r.organization_name ?? "",
      }))))
      .catch(() => toast.error("Не удалось загрузить поступления"))
    Promise.allSettled([p1, p2, p3]).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Поступления"
          description="Реестр входящих платежей"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet data-icon="inline-start" /> Импорт из Excel
              </Button>
              <Button size="lg" onClick={() => setManualOpen(true)}>
                <Plus data-icon="inline-start" /> Добавить вручную
              </Button>
            </div>
          }
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={entries}
            defaultColumnVisibility={{ id: false }}
            columnLabels={{
              id: "ID",
              date: "Дата",
              organization: "Организация",
              direction: "Направление платежа",
              amount: "Сумма",
            }}
          />
        )}
      </div>

      <ManualBulkDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        recipients={recipients}
        payers={payers}
        onAdded={(entries) => setEntries((prev) => [...entries, ...prev])}
      />
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        recipients={recipients}
        payers={payers}
        onImported={(imported) => setEntries((prev) => [...imported, ...prev])}
      />
    </div>
  )
}
