import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Check, ChevronDown, FileText, Files, Link2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/page-header"
import { BlockCard, BlockCardHeader, BlockCardContent } from "@/components/block-card"
import { SideCard, SideCardHeader, SideCardContent, SideCardFooter } from "@/components/side-card"
import { GenericStatusBadge, StatusDot } from "@/components/status-badge"
import { toApiDecimal } from "@/lib/utils"
import { api, type OutgoingPayment, type OutgoingPaymentStatus, type Recipient, type RequestListItem } from "@/lib/api"
import { outgoingPaymentStatusConfig, formatDateTime } from "./columns"
import { OutgoingPaymentDocuments } from "./documents"
import { LinkRequestDialog } from "./link-request-dialog"

const ALL_STATUSES: OutgoingPaymentStatus[] = ["new", "in_work", "in_progress", "executed"]

export default function AdminOutgoingPaymentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [payment, setPayment] = useState<OutgoingPayment | undefined>(undefined)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [invoice, setInvoice] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState<number | null>(null)
  const [savingFields, setSavingFields] = useState(false)

  const [status, setStatus] = useState<OutgoingPaymentStatus>("new")
  const [savingStatus, setSavingStatus] = useState(false)

  const [linkOpen, setLinkOpen] = useState(false)
  const [removingRequestId, setRemovingRequestId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api.getOutgoingPayment(Number(id)),
      api.getRecipients(),
      api.getAdminRequests(),
    ])
      .then(([p, recs, reqs]) => {
        setPayment(p)
        setInvoice(p.invoice)
        setSupplierName(p.supplier_name)
        setAmount(p.amount ?? "")
        setAccountId(p.account_id)
        setStatus(p.status)
        setRecipients(recs)
        setRequests(reqs)
      })
      .catch(() => navigate("/admin/outgoing-payments", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const fieldsChanged = !!payment && (
    invoice !== payment.invoice ||
    supplierName !== payment.supplier_name ||
    amount !== (payment.amount ?? "") ||
    accountId !== payment.account_id
  )

  const handleSaveFields = async () => {
    if (!payment) return
    setSavingFields(true)
    try {
      const updated = await api.updateOutgoingPayment(payment.id, {
        invoice,
        supplier_name: supplierName,
        amount: amount.trim() ? toApiDecimal(amount) : null,
        account_id: accountId,
      })
      setPayment(updated)
      toast.success("Сохранено")
    } catch {
      toast.error("Не удалось сохранить")
    } finally {
      setSavingFields(false)
    }
  }

  const handleRemoveRequest = async (reqId: number) => {
    if (!payment) return
    setRemovingRequestId(reqId)
    try {
      setPayment(await api.setOutgoingPaymentRequests(payment.id, payment.requests.filter((id) => id !== reqId)))
    } catch {
      toast.error("Не удалось отвязать заявку")
    } finally {
      setRemovingRequestId(null)
    }
  }

  const handleSaveStatus = async () => {
    if (!payment) return
    setSavingStatus(true)
    try {
      const updated = await api.updateOutgoingPayment(payment.id, { status })
      setPayment(updated)
      toast.success("Статус сохранён")
    } catch {
      toast.error("Не удалось сохранить статус")
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) return <div className="flex flex-1 items-center justify-center p-20"><Spinner className="size-6 text-muted-foreground" /></div>
  if (!payment) return null

  return (
    <div className="p-10">
      <PageHeader
        title={payment.invoice || `Платёж №${payment.id}`}
        description={`Исходящий платёж №${payment.id} · ${formatDateTime(payment.created_at)}`}
        badge={<GenericStatusBadge cfg={outgoingPaymentStatusConfig[payment.status]} />}
        back={{ label: "К исходящим платежам", href: "/admin/outgoing-payments" }}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 flex flex-col gap-6 w-full">
          <BlockCard>
            <BlockCardHeader icon={<FileText className="size-4" />} title="Данные платежа" />
            <BlockCardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Инвойс</Label>
                  <Input size="lg" value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="INV-000000" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Наименование поставщика</Label>
                  <Input size="lg" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="ООО «Поставщик»" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Сумма, ₽</Label>
                  <Input size="lg" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Счёт списания</Label>
                  <Select
                    value={accountId != null ? String(accountId) : undefined}
                    onValueChange={(v) => setAccountId(Number(v))}
                  >
                    <SelectTrigger size="lg" className="w-full">
                      <SelectValue placeholder="Не выбран" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full md:w-auto md:self-start"
                disabled={!fieldsChanged || savingFields}
                onClick={handleSaveFields}
              >
                {savingFields && <Spinner data-icon="inline-start" />}
                Сохранить
              </Button>
            </BlockCardContent>
          </BlockCard>

          <BlockCard>
            <BlockCardHeader icon={<Files className="size-4" />} title="Документы" />
            <BlockCardContent>
              <OutgoingPaymentDocuments paymentId={payment.id} />
            </BlockCardContent>
          </BlockCard>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
          <SideCard>
            <SideCardHeader icon={<Link2 className="size-4" />} title="Заявки" />
            <SideCardContent className={payment.request_invoices.length ? "flex flex-col gap-1 py-2" : undefined}>
              {payment.request_invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Не привязаны</p>
              ) : (
                payment.request_invoices.map(({ id: reqId, invoice: reqInvoice }) => (
                  <div
                    key={reqId}
                    className="group flex items-center gap-1 rounded-md pl-2.5 pr-1 transition-colors hover:bg-muted"
                  >
                    <Link
                      to={`/admin/requests/${reqId}`}
                      className="flex-1 min-w-0 truncate py-1.5 text-sm text-foreground"
                    >
                      {reqInvoice}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                      disabled={removingRequestId === reqId}
                      onClick={() => handleRemoveRequest(reqId)}
                      aria-label={`Отвязать ${reqInvoice}`}
                    >
                      {removingRequestId === reqId ? <Spinner className="size-3.5" /> : <X className="size-3.5" />}
                    </Button>
                  </div>
                ))
              )}
            </SideCardContent>
            <SideCardFooter>
              <Button variant="outline" className="w-full" onClick={() => setLinkOpen(true)}>
                {payment.request_invoices.length ? <Plus data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
                {payment.request_invoices.length ? "Привязать ещё" : "Привязать заявку"}
              </Button>
            </SideCardFooter>
          </SideCard>

          <SideCard>
            <SideCardHeader icon={<Check className="size-4" />} title="Статус" />
            <SideCardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-1.5 px-3">
                    <span className="flex items-center gap-1.5">
                      <StatusDot dot={outgoingPaymentStatusConfig[status].dot} dotColor={outgoingPaymentStatusConfig[status].dotColor} />
                      <span className="text-sm">{outgoingPaymentStatusConfig[status].label}</span>
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuGroup>
                    {ALL_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="gap-2">
                        <Check className={s === status ? "size-3.5 shrink-0" : "size-3.5 shrink-0 invisible"} />
                        <StatusDot dot={outgoingPaymentStatusConfig[s].dot} dotColor={outgoingPaymentStatusConfig[s].dotColor} />
                        <span className="truncate">{outgoingPaymentStatusConfig[s].label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SideCardContent>
            <SideCardFooter>
              <Button
                size="lg"
                className="w-full"
                disabled={savingStatus || status === payment.status}
                onClick={handleSaveStatus}
              >
                {savingStatus && <Spinner data-icon="inline-start" />}
                Сохранить статус
              </Button>
            </SideCardFooter>
          </SideCard>
        </div>
      </div>

      <LinkRequestDialog
        payment={linkOpen ? payment : null}
        requests={requests}
        onClose={() => setLinkOpen(false)}
        onLinked={setPayment}
      />
    </div>
  )
}
