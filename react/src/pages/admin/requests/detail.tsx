import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { ActionBtn } from "@/components/ui/action-btn"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { api, type AdminPaymentRequest, type AdminUser, type WorkScheme, type RequestStatus } from "@/lib/api"
import { cn, toApiDate, toApiDecimal, isCompleteDate, fmtNum, fileNameFromUrl, formatAccountNumber } from "@/lib/utils"
import { StatusBadge, statusConfig } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import { FileText, Files, Plus, Banknote, Settings, Eye, Download, FileUp, Calculator, ChevronDown, Check, UserRound, Layers, MessageSquareText, Pencil, CircleCheckBig, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { InlineNotice } from "@/components/inline-notice"
import { BlockCard, BlockCardHeader, BlockCardRow } from "@/components/block-card"
import { SideCard, SideCardHeader, SideCardContent, SideCardFooter } from "@/components/side-card"
import { UploadZone } from "@/components/files/upload-zone"
import { Documents, type DocumentsHandle } from "@/components/files/documents"

const ALL_STATUSES: RequestStatus[] = [
  "draft", "new", "in_review", "sent_to_bank",
  "awaiting_closing_docs", "closing_docs_review", "closed",
  "correction", "correction_review",
]

function ResultRow({ label, value, tone, suffix = "₽" }: { label: string; value: string | null; tone?: "success" | "destructive"; suffix?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-sm font-medium tabular-nums",
        tone === "success" && "text-success",
        tone === "destructive" && "text-destructive",
      )}>
        {value ?? "—"}{suffix && <> <span className="text-xs font-medium text-muted-foreground">{suffix}</span></>}
      </span>
    </div>
  )
}


export default function AdminRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [request, setRequest] = useState<AdminPaymentRequest | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [schemes, setSchemes] = useState<WorkScheme[]>([])
  const docsRef = useRef<DocumentsHandle>(null)
  const closingDocsRef = useRef<DocumentsHandle>(null)

  const [status, setStatus] = useState<RequestStatus>("new")
  const [statusSaving, setStatusSaving] = useState(false)
  const [confirmingReceived, setConfirmingReceived] = useState(false)

  const [swiftFile, setSwiftFile] = useState<File | null>(null)
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const [swiftUploading, setSwiftUploading] = useState(false)
  const [paperUploading, setPaperUploading] = useState(false)

  const [execDate, setExecDate] = useState("")
  const [execRate, setExecRate] = useState("")
  const [execDateSebes, setExecDateSebes] = useState("")
  const [execRateSebes, setExecRateSebes] = useState("")
  const [execSaving, setExecSaving] = useState(false)
  const [execSebesSaving, setExecSebesSaving] = useState(false)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateSebesLoading, setRateSebesLoading] = useState(false)
  const [rateHint, setRateHint] = useState<{ text: string; source: "ok" | "shifted" | "error" } | null>(null)
  const [rateSebesHint, setRateSebesHint] = useState<{ text: string; source: "ok" | "shifted" | "error" } | null>(null)
  const [usdRate, setUsdRate] = useState("")
  const [usdRateSebes, setUsdRateSebes] = useState("")

  const [showSwiftDownload, setShowSwiftDownload] = useState(false)
  const [showPaperDownload, setShowPaperDownload] = useState(false)
  const [showExecutionBlock, setShowExecutionBlock] = useState(false)

  const [adminNote, setAdminNote] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  const [editPayment, setEditPayment] = useState(false)
  const [editPrf, setEditPrf] = useState(false)
  const [editDocuments, setEditDocuments] = useState(false)
  const [editClosingDocs, setEditClosingDocs] = useState(false)

  const syncEditPermissions = (r: AdminPaymentRequest) => {
    setEditPayment(r.edit_payment)
    setEditPrf(r.edit_prf)
    setEditDocuments(r.edit_documents)
    setEditClosingDocs(r.edit_closing_docs)
  }

  type EditPermissionField = "edit_payment" | "edit_prf" | "edit_documents" | "edit_closing_docs"

  const toggleEditPermission = async (field: EditPermissionField, value: boolean) => {
    const updated = await api.updateAdminRequest(Number(id), { [field]: value })
    setRequest(updated)
    syncEditPermissions(updated)
  }

  const syncVisibility = (r: AdminPaymentRequest) => {
    setShowSwiftDownload(r.show_swift_download)
    setShowPaperDownload(r.show_paper_download)
    setShowExecutionBlock(r.show_execution_block)
  }

  type VisibilityField = "show_swift_download" | "show_paper_download" | "show_execution_block"

  const toggleVisibility = async (field: VisibilityField, value: boolean) => {
    const updated = await api.updateAdminRequest(Number(id), { [field]: value })
    setRequest(updated)
    syncVisibility(updated)
  }

  const handleUploadSwift = async () => {
    if (!swiftFile) return
    setSwiftUploading(true)
    try {
      const updated = await api.uploadAdminRequestFile(Number(id), "swift_document", swiftFile)
      setRequest(updated)
      syncVisibility(updated)
      await toggleVisibility("show_swift_download", true)
      setSwiftFile(null)
      toast.success("SWIFT документ загружен")
    } catch {
      toast.error("Не удалось загрузить файл")
    } finally {
      setSwiftUploading(false)
    }
  }

  const handleUploadPaper = async () => {
    if (!paperFile) return
    setPaperUploading(true)
    try {
      const updated = await api.uploadAdminRequestFile(Number(id), "paper_document", paperFile)
      setRequest(updated)
      syncVisibility(updated)
      await toggleVisibility("show_paper_download", true)
      setPaperFile(null)
      toast.success("Ордер на заявку загружен")
    } catch {
      toast.error("Не удалось загрузить файл")
    } finally {
      setPaperUploading(false)
    }
  }

  const handleDeleteSwift = async () => {
    setSwiftUploading(true)
    try {
      const updated = await api.updateAdminRequest(Number(id), { swift_document: null })
      setRequest(updated)
      syncVisibility(updated)
      await toggleVisibility("show_swift_download", false)
      toast.success("SWIFT документ удалён")
    } catch {
      toast.error("Не удалось удалить файл")
    } finally {
      setSwiftUploading(false)
    }
  }

  const handleDeletePaper = async () => {
    setPaperUploading(true)
    try {
      const updated = await api.updateAdminRequest(Number(id), { paper_document: null })
      setRequest(updated)
      syncVisibility(updated)
      await toggleVisibility("show_paper_download", false)
      toast.success("Ордер на заявку удалён")
    } catch {
      toast.error("Не удалось удалить файл")
    } finally {
      setPaperUploading(false)
    }
  }

  const syncExec = (r: AdminPaymentRequest) => {
    setExecDate(r.execution_date ? r.execution_date.split("-").reverse().join(".") : "")
    setExecRate(r.execution_rate ?? "")
    setExecDateSebes(r.execution_date_sebes ? r.execution_date_sebes.split("-").reverse().join(".") : "")
    setExecRateSebes(r.execution_rate_sebes ?? "")
  }

  const handleSaveNote = async () => {
    setNoteSaving(true)
    try {
      const updated = await api.updateAdminRequest(Number(id), { admin_note: adminNote })
      setRequest(updated)
      toast.success("Заметка сохранена")
    } catch {
      toast.error("Не удалось сохранить заметку")
    } finally {
      setNoteSaving(false)
    }
  }

  const handleReload = () => {
    api.getAdminRequest(Number(id)).then((r) => {
      setRequest(r)
      setStatus(r.status)
      syncExec(r)
      syncVisibility(r)
      syncEditPermissions(r)
      setAdminNote(r.admin_note)
    })
  }

  useEffect(() => {
    Promise.all([
      api.getAdminRequest(Number(id)),
      api.getAdminUsers(),
      api.getAdminSchemes(),
    ])
      .then(([r, users, schemeList]) => {
        setRequest(r)
        setStatus(r.status)
        syncExec(r)
        syncVisibility(r)
        syncEditPermissions(r)
        setAdminNote(r.admin_note)
        setAdmins(users)
        setSchemes(schemeList)
      })
      .catch(() => navigate("/admin/requests", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!request || !isCompleteDate(execDate)) { setRateHint(null); setRateLoading(false); setUsdRate(""); return }
    const controller = new AbortController()
    const currency = request.currency.toLowerCase() as "usd" | "eur" | "cny"
    const apiDate = toApiDate(execDate)
    setRateLoading(true)
    setRateHint(null)
    api.getRateLive(apiDate, controller.signal)
      .then((rate) => {
        const value = rate[currency]
        if (!value) {
          setRateHint({ text: `Нет курса ${request.currency} в ответе ЦБ за ${execDate}`, source: "error" })
          return
        }
        setExecRate(value)
        setUsdRate(rate.usd ?? "")
        const label = `${rate.day_of_week} ${rate.cbr_date}`
        if (rate.is_different) {
          setRateHint({ text: `Курс ЦБ · ${label} (запрошено: ${execDate})`, source: "shifted" })
        } else {
          setRateHint({ text: `Курс ЦБ · ${label}`, source: "ok" })
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') setRateHint({ text: `ЦБ недоступен — курс за ${execDate} не получен`, source: "error" }) })
      .finally(() => setRateLoading(false))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execDate, request?.currency])

  useEffect(() => {
    if (!request || !isCompleteDate(execDateSebes)) { setRateSebesHint(null); setRateSebesLoading(false); setUsdRateSebes(""); return }
    const controller = new AbortController()
    const currency = request.currency.toLowerCase() as "usd" | "eur" | "cny"
    const apiDate = toApiDate(execDateSebes)
    setRateSebesLoading(true)
    setRateSebesHint(null)
    api.getRateLive(apiDate, controller.signal)
      .then((rate) => {
        const value = rate[currency]
        if (!value) {
          setRateSebesHint({ text: `Нет курса ${request.currency} в ответе ЦБ за ${execDateSebes}`, source: "error" })
          return
        }
        setExecRateSebes(value)
        setUsdRateSebes(rate.usd ?? "")
        const label = `${rate.day_of_week} ${rate.cbr_date}`
        if (rate.is_different) {
          setRateSebesHint({ text: `Курс ЦБ · ${label} (запрошено: ${execDateSebes})`, source: "shifted" })
        } else {
          setRateSebesHint({ text: `Курс ЦБ · ${label}`, source: "ok" })
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') setRateSebesHint({ text: `ЦБ недоступен — курс за ${execDateSebes} не получен`, source: "error" }) })
      .finally(() => setRateSebesLoading(false))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execDateSebes, request?.currency])

  const handleReassignAdmin = async (adminId: number) => {
    try {
      const updated = await api.updateAdminRequest(Number(id), { assigned_admin_id: adminId })
      setRequest(updated)
      toast.success("Исполнитель изменён")
    } catch {
      toast.error("Не удалось изменить исполнителя")
    }
  }

  const handleReassignScheme = async (schemeId: number | null) => {
    try {
      const updated = await api.updateAdminRequest(Number(id), { work_scheme_id: schemeId })
      setRequest(updated)
      toast.success("Схема работы изменена")
    } catch {
      toast.error("Не удалось изменить схему работы")
    }
  }

  const handleSaveStatus = async () => {
    setStatusSaving(true)
    try {
      await api.updateAdminRequest(Number(id), { status })
      handleReload()
      window.dispatchEvent(new CustomEvent("request-notifications-changed"))
      toast.success("Статус сохранён")
    } catch {
      toast.error("Не удалось сохранить статус")
    } finally {
      setStatusSaving(false)
    }
  }

  const handleConfirmReceived = async () => {
    setConfirmingReceived(true)
    try {
      await api.updateAdminRequest(Number(id), { status: "awaiting_closing_docs" })
      handleReload()
      window.dispatchEvent(new CustomEvent("request-notifications-changed"))
      toast.success("Отмечено: деньги пришли")
    } catch {
      toast.error("Не удалось обновить статус")
    } finally {
      setConfirmingReceived(false)
    }
  }

  const handleSaveExecution = async () => {
    if (!isCompleteDate(execDate) || !execRate.trim()) return
    setExecSaving(true)
    try {
      await api.updateAdminRequest(Number(id), {
        execution_date: toApiDate(execDate),
        execution_rate: toApiDecimal(execRate),
      })
      handleReload()
      toast.success("Клиентский расчёт сохранён")
    } catch {
      toast.error("Не удалось сохранить расчёт")
    } finally {
      setExecSaving(false)
    }
  }

  const handleSaveExecutionSebes = async () => {
    if (!isCompleteDate(execDateSebes) || !execRateSebes.trim()) return
    setExecSebesSaving(true)
    try {
      await api.updateAdminRequest(Number(id), {
        execution_date_sebes: toApiDate(execDateSebes),
        execution_rate_sebes: toApiDecimal(execRateSebes),
      })
      handleReload()
      toast.success("Расчёт себестоимости сохранён")
    } catch {
      toast.error("Не удалось сохранить расчёт себестоимости")
    } finally {
      setExecSebesSaving(false)
    }
  }

  const hintClass = (source: "ok" | "shifted" | "error") =>
    source === "ok"      ? "text-xs text-emerald-600 dark:text-emerald-400" :
    source === "shifted" ? "text-xs text-amber-600 dark:text-amber-400" :
    "text-xs text-destructive"

  if (loading) return <div className="flex flex-1 items-center justify-center p-20"><Spinner className="size-6 text-muted-foreground" /></div>
  if (!request) return null

  const schemeCurrency = request.work_scheme?.currencies.find((c) => c.currency === request.currency) ?? null

  // SWIFT в базе задан в USD — для CNY показываем, во сколько юаней он превращается
  // по курсу ЦБ на дату исполнения (та же логика, что и в бэкенд-расчёте).
  const clientSwiftCnyPreview =
    request.currency === "CNY" && usdRate && execRate
      ? parseFloat(request.organization_swift_client) * parseFloat(usdRate) / parseFloat(toApiDecimal(execRate))
      : null

  // Конвертация SWIFT для CNY зависит от калькулятора конкретной схемы — не все считают "по-монгольски".
  const swiftCnyPreview =
    schemeCurrency && request.currency === "CNY" && request.work_scheme?.calculator === "calc_sebes_mongols" && usdRateSebes && execRateSebes
      ? parseFloat(schemeCurrency.swift) * parseFloat(usdRateSebes) / parseFloat(toApiDecimal(execRateSebes))
      : null

  return (
    <div className="p-10">
      <PageHeader
        title={request.invoice}
        description={`Заявка № ${request.id} · ${new Date(request.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
        badge={<>
          <StatusBadge status={request.status} />
          <span className="h-4 w-px bg-border shrink-0" />
          <span className="text-sm text-muted-foreground max-w-[180px] truncate">{request.organization_name}</span>
          <span className="h-4 w-px bg-border shrink-0" />
          <span className="text-sm text-muted-foreground max-w-[180px] truncate">{request.counterparty_name}</span>
          <span className="h-4 w-px bg-border shrink-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-auto gap-1.5 rounded-lg border-border/70 px-2 py-0.5 text-sm font-normal"
              >
                <UserRound className="size-3 text-muted-foreground shrink-0" />
                {request.assigned_admin ? (
                  <span className="font-medium">{request.assigned_admin.name || request.assigned_admin.email}</span>
                ) : (
                  <span className="text-muted-foreground">Не назначен</span>
                )}
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuGroup>
                {admins.map((admin) => {
                  const adminName = admin.name || admin.email
                  return (
                    <DropdownMenuItem key={admin.id} onClick={() => handleReassignAdmin(admin.id)} className="gap-2">
                      <span className="flex-1">{adminName}</span>
                      {request.assigned_admin?.id === admin.id && <Check className="size-3.5 shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
                {admins.length === 0 && <DropdownMenuItem disabled>Нет исполнителей</DropdownMenuItem>}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="h-4 w-px bg-border shrink-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-auto gap-1.5 rounded-lg border-border/70 px-2 py-0.5 text-sm font-normal"
              >
                <Layers className="size-3 text-muted-foreground shrink-0" />
                {request.work_scheme ? (
                  <span className="font-medium">{request.work_scheme.name}</span>
                ) : (
                  <span className="text-muted-foreground">Без схемы</span>
                )}
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuGroup>
                {schemes.map((scheme) => (
                  <DropdownMenuItem key={scheme.id} onClick={() => handleReassignScheme(scheme.id)} className="gap-2">
                    <span className="flex-1">{scheme.name}</span>
                    {request.work_scheme?.id === scheme.id && <Check className="size-3.5 shrink-0 text-primary" />}
                  </DropdownMenuItem>
                ))}
                {schemes.length === 0 && <DropdownMenuItem disabled>Нет схем</DropdownMenuItem>}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>}
        back={{ label: "К списку заявок", href: "/admin/requests" }}
        action={request.status === "sent_to_bank" && (
          <Button size="lg" onClick={handleConfirmReceived} disabled={confirmingReceived}>
            {confirmingReceived ? <Spinner data-icon="inline-start" /> : <CircleCheckBig data-icon="inline-start" />}
            Деньги пришли
          </Button>
        )}
      />

      {request.money_received && (
        <InlineNotice
          variant="success"
          icon={CircleCheckBig}
          title="Деньги пришли"
          meta={request.money_received_at
            ? `Отмечено ${new Date(request.money_received_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : "Получение подтверждено"}
          className="mb-6"
        />
      )}

      <BlockCard className="mb-6">
        <BlockCardHeader icon={<Calculator className="size-4" />} title="Расчёт исполнения" />
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[auto_auto_auto_auto_auto] divide-y md:divide-y-0 md:divide-x">

          {/* Клиентский расчёт */}
          <div className="flex flex-col gap-4 p-6 md:grid md:grid-rows-subgrid md:row-span-5 md:gap-4 md:p-6">
            <p className="md:row-start-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Клиентский расчёт</p>

            <div className="md:row-start-2 self-end">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Метод</span>
                <span className="font-medium">{request.organization_calculator}</span>
                <span className="h-3 w-px bg-border shrink-0" />
                <span className="text-muted-foreground">Процент</span>
                <span className="font-medium tabular-nums">{fmtNum(request.organization_percent_client)}%</span>
                <span className="h-3 w-px bg-border shrink-0" />
                <span className="text-muted-foreground">SWIFT</span>
                <span className="font-medium tabular-nums">
                  {fmtNum(request.organization_swift_client)}
                  {clientSwiftCnyPreview !== null && (
                    <span className="ml-1 font-normal text-muted-foreground">≈ {fmtNum(clientSwiftCnyPreview)} CNY</span>
                  )}
                </span>
              </div>
            </div>

            <div className="md:row-start-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Дата исполнения</Label>
                <DatePicker value={execDate} onChange={(v) => { setExecDate(v); setExecRate(""); setRateHint(null); setUsdRate("") }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Курс {request.currency}</Label>
                  {rateLoading && <Spinner className="size-3 text-muted-foreground" />}
                </div>
                <Input size="lg" placeholder="80,0000" value={execRate} onChange={(e) => setExecRate(e.target.value)} />
                {rateHint && <p className={hintClass(rateHint.source)}>{rateHint.text}</p>}
              </div>
            </div>

            {request.execution_costs && (
              <div className="md:row-start-4 rounded-xl border bg-muted/40 divide-y text-sm self-end">
                <ResultRow label="Затраты" value={fmtNum(request.execution_costs)} />
                <ResultRow
                  label="Остаток"
                  value={request.execution_balance ? fmtNum(request.execution_balance) : null}
                  tone={request.execution_balance && parseFloat(request.execution_balance) < 0 ? "destructive" : undefined}
                />
              </div>
            )}

            <Button
              size="lg"
              className="md:row-start-5 w-full self-end"
              disabled={execSaving || !execDate.trim() || !execRate.trim()}
              onClick={handleSaveExecution}
            >
              {execSaving && <Spinner data-icon="inline-start" />}
              Рассчитать
            </Button>
          </div>

          {/* Себестоимость */}
          <div className="flex flex-col gap-4 p-6 md:grid md:grid-rows-subgrid md:row-span-5 md:gap-4 md:p-6">
            <p className="md:row-start-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Себестоимость</p>

            <div className="md:row-start-2 self-end">
              {schemeCurrency ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Процент</span>
                  <span className="font-medium tabular-nums">{fmtNum(schemeCurrency.percent)}%</span>
                  <span className="h-3 w-px bg-border shrink-0" />
                  <span className="text-muted-foreground">SWIFT</span>
                  <span className="font-medium tabular-nums">
                    {fmtNum(schemeCurrency.swift)}
                    {swiftCnyPreview !== null && (
                      <span className="ml-1 font-normal text-muted-foreground">≈ {fmtNum(swiftCnyPreview)} CNY</span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-destructive">
                  Нет схемы работы с валютой {request.currency} — закрепите схему вверху страницы
                </p>
              )}
            </div>

            <div className="md:row-start-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Дата исполнения</Label>
                <DatePicker value={execDateSebes} onChange={(v) => { setExecDateSebes(v); setExecRateSebes(""); setRateSebesHint(null); setUsdRateSebes("") }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Курс {request.currency}</Label>
                  {rateSebesLoading && <Spinner className="size-3 text-muted-foreground" />}
                </div>
                <Input size="lg" placeholder="80,0000" value={execRateSebes} onChange={(e) => setExecRateSebes(e.target.value)} />
                {rateSebesHint && <p className={hintClass(rateSebesHint.source)}>{rateSebesHint.text}</p>}
              </div>
            </div>

            {request.execution_costs_sebes && (
              <div className="md:row-start-4 rounded-xl border bg-muted/40 divide-y text-sm self-end">
                <ResultRow label="Затраты себест." value={fmtNum(request.execution_costs_sebes)} />
                <ResultRow
                  label="Прибыль"
                  value={request.execution_profit_sebes ? fmtNum(request.execution_profit_sebes) : null}
                  tone={request.execution_profit_sebes ? (parseFloat(request.execution_profit_sebes) < 0 ? "destructive" : "success") : undefined}
                />
                {request.work_scheme?.calculator === "calc_sebes_alsafi" && request.sebes_min_fee_applied !== null && (
                  <ResultRow
                    label="Комиссия"
                    value={request.sebes_min_fee_applied ? "Минимум (KZT)" : "По проценту"}
                    suffix=""
                  />
                )}
              </div>
            )}

            <Button
              size="lg"
              className="md:row-start-5 w-full self-end"
              disabled={execSebesSaving || !execDateSebes.trim() || !execRateSebes.trim() || !schemeCurrency}
              onClick={handleSaveExecutionSebes}
            >
              {execSebesSaving && <Spinner data-icon="inline-start" />}
              Рассчитать
            </Button>
          </div>

        </div>
      </BlockCard>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        <div className="flex-1 flex flex-col gap-6">
          <BlockCard>
            <BlockCardHeader icon={<FileText className="size-4" />} title="Платёж" />
            <BlockCardRow label="Инвойс" mono>{request.invoice}</BlockCardRow>
            <BlockCardRow label="Сумма">{fmtNum(request.amount)} <span className="text-xs text-muted-foreground font-medium">{request.currency}</span></BlockCardRow>
            <BlockCardRow label="Детали">{request.details}</BlockCardRow>
            <BlockCardRow label="Контрагент">{request.counterparty_name}</BlockCardRow>
            <BlockCardRow label="Адрес контрагента">{request.counterparty_address}</BlockCardRow>
            <BlockCardRow label="Банк">{request.bank_name}</BlockCardRow>
            <BlockCardRow label="Счёт банка" mono>{formatAccountNumber(request.bank_account)}</BlockCardRow>
            <BlockCardRow label="Адрес банка">{request.bank_address}</BlockCardRow>
            <BlockCardRow label="SWIFT" mono>{request.bank_swift_code}</BlockCardRow>
          </BlockCard>

          {request.prf_organization && (
            <BlockCard>
              <BlockCardHeader icon={<Banknote className="size-4" />} title="Плательщик в РФ" />
              <BlockCardRow label="Организация">{request.prf_organization}</BlockCardRow>
              <BlockCardRow label="ИНН" mono>{request.prf_inn}</BlockCardRow>
              <BlockCardRow label="Сумма, ₽">{request.prf_amount ? fmtNum(request.prf_amount) : "—"}</BlockCardRow>
              <BlockCardRow label="Дата">{request.prf_date?.split("-").reverse().join(".")}</BlockCardRow>
              <BlockCardRow label="Получатель">{request.prf_recipient}</BlockCardRow>
            </BlockCard>
          )}

          <BlockCard>
            <BlockCardHeader
              icon={<Files className="size-4" />}
              title="Документы"
              action={
                <Button size="sm" variant="outline" onClick={() => docsRef.current?.open()}>
                  <Plus data-icon="inline-start" /> Добавить файл
                </Button>
              }
            />
            <Documents
              ref={docsRef}
              requestId={request.id}
              section="payment"
              admin
              docTypeVariant="payment"
            />
          </BlockCard>

          <BlockCard>
            <BlockCardHeader
              icon={<Files className="size-4" />}
              title="Закрывающие документы"
              action={
                <Button size="sm" variant="outline" onClick={() => closingDocsRef.current?.open()}>
                  <Plus data-icon="inline-start" /> Добавить файл
                </Button>
              }
            />
            <Documents
              ref={closingDocsRef}
              requestId={request.id}
              section="closing"
              admin
              docTypeVariant="closing"
            />
          </BlockCard>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">

          <SideCard>
            <SideCardHeader icon={<Settings className="size-4" />} title="Управление" />
            <SideCardContent>
              <div className="flex flex-col gap-1.5">
                <Label>Статус</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto py-1.5 px-3">
                      <StatusBadge status={status} />
                      <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuGroup>
                      {ALL_STATUSES.map((s) => (
                          <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="gap-2">
                            <Check className={s === status ? "size-3.5 shrink-0" : "size-3.5 shrink-0 invisible"} />
                            <span className={cn("size-2 rounded-full shrink-0", statusConfig[s].color)} />
                            <span className="truncate">{statusConfig[s].label}</span>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SideCardContent>
            <SideCardFooter>
              <Button
                size="lg"
                className="w-full"
                disabled={statusSaving || status === request.status}
                onClick={handleSaveStatus}
              >
                {statusSaving && <Spinner data-icon="inline-start" />}
                Сохранить статус
              </Button>
            </SideCardFooter>
          </SideCard>

          {request.status === "correction" && (
            <SideCard>
              <SideCardHeader icon={<Pencil className="size-4" />} title="Доступно для редактирования" />
              <SideCardContent>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Платёж", field: "edit_payment" as const, value: editPayment, set: setEditPayment },
                    { label: "Плательщик в РФ", field: "edit_prf" as const, value: editPrf, set: setEditPrf },
                    { label: "Документы", field: "edit_documents" as const, value: editDocuments, set: setEditDocuments },
                    { label: "Закрывающие документы", field: "edit_closing_docs" as const, value: editClosingDocs, set: setEditClosingDocs },
                  ].map(({ label, field, value, set }) => (
                    <div key={field} className="flex items-center gap-2">
                      <Checkbox
                        id={field}
                        checked={value}
                        onCheckedChange={(checked) => {
                          set(!!checked)
                          toggleEditPermission(field, !!checked)
                        }}
                      />
                      <Label htmlFor={field} className="font-normal cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </SideCardContent>
            </SideCard>
          )}

          <SideCard>
            <SideCardHeader icon={<MessageSquareText className="size-4" />} title="Заметка для организации" />
            <SideCardContent>
              <Textarea
                placeholder="Видно организации на странице заявки в режиме только для чтения..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </SideCardContent>
            <SideCardFooter>
              <Button
                size="lg"
                className="w-full"
                disabled={noteSaving || adminNote === request.admin_note}
                onClick={handleSaveNote}
              >
                {noteSaving && <Spinner data-icon="inline-start" />}
                Сохранить заметку
              </Button>
            </SideCardFooter>
          </SideCard>

          <SideCard>
            <SideCardHeader icon={<FileUp className="size-4" />} title="SWIFT документ" />
            <SideCardContent>
              <UploadZone file={swiftFile} onChange={setSwiftFile} accept=".pdf" />
              {!swiftFile && request.swift_document && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                  <a
                    href={request.swift_document}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{fileNameFromUrl(request.swift_document)}</span>
                  </a>
                  <ActionBtn
                    tooltip="Удалить"
                    onClick={handleDeleteSwift}
                    disabled={swiftUploading}
                    className="shrink-0 border-transparent bg-transparent text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                  >
                    <Trash2 className="size-3.5" />
                  </ActionBtn>
                </div>
              )}
            </SideCardContent>
            {swiftFile && (
              <SideCardFooter>
                <Button size="lg" className="w-full" disabled={swiftUploading} onClick={handleUploadSwift}>
                  {swiftUploading ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                  Загрузить
                </Button>
              </SideCardFooter>
            )}
          </SideCard>

          <SideCard>
            <SideCardHeader icon={<FileUp className="size-4" />} title="Ордер на заявку" />
            <SideCardContent>
              <UploadZone file={paperFile} onChange={setPaperFile} accept=".pdf" />
              {!paperFile && request.paper_document && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                  <a
                    href={request.paper_document}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{fileNameFromUrl(request.paper_document)}</span>
                  </a>
                  <ActionBtn
                    tooltip="Удалить"
                    onClick={handleDeletePaper}
                    disabled={paperUploading}
                    className="shrink-0 border-transparent bg-transparent text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                  >
                    <Trash2 className="size-3.5" />
                  </ActionBtn>
                </div>
              )}
            </SideCardContent>
            {paperFile && (
              <SideCardFooter>
                <Button size="lg" className="w-full" disabled={paperUploading} onClick={handleUploadPaper}>
                  {paperUploading ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                  Загрузить
                </Button>
              </SideCardFooter>
            )}
          </SideCard>

          {(["sent_to_bank", "awaiting_closing_docs", "closing_docs_review", "closed"] as RequestStatus[]).includes(request.status) && (
            <SideCard>
              <SideCardHeader icon={<Eye className="size-4" />} title="Видимость блоков" />
              <SideCardContent>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Скачать SWIFT", field: "show_swift_download" as const, value: showSwiftDownload, set: setShowSwiftDownload },
                    { label: "Ордер на заявку", field: "show_paper_download" as const, value: showPaperDownload, set: setShowPaperDownload },
                    { label: "Блок исполнения", field: "show_execution_block" as const, value: showExecutionBlock, set: setShowExecutionBlock },
                  ].map(({ label, field, value, set }) => (
                    <div key={field} className="flex items-center gap-2">
                      <Checkbox
                        id={field}
                        checked={value}
                        onCheckedChange={(checked) => {
                          set(!!checked)
                          toggleVisibility(field, !!checked)
                        }}
                      />
                      <Label htmlFor={field} className="font-normal cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </SideCardContent>
            </SideCard>
          )}

        </div>
      </div>
    </div>
  )
}
