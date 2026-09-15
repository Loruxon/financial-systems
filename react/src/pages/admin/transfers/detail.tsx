import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, Files, Link2, MessageSquareText } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { BlockCard, BlockCardHeader, BlockCardContent } from "@/components/block-card"
import { SideCard, SideCardHeader, SideCardContent, SideCardFooter } from "@/components/side-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { FieldLabel } from "@/components/ui/field"
import { AmountInput } from "@/components/amount-input"
import { DatePicker } from "@/components/ui/date-picker"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GenericStatusBadge, StatusDot } from "@/components/status-badge"
import { PayerSelect } from "@/components/admin/payer-select"
import { TransferDocuments } from "./documents"
import { transferStatusConfig } from "./columns"
import { useAuth } from "@/lib/auth-context"
import { cn, fmtNum, toApiDate, toApiDecimal } from "@/lib/utils"
import { api, type BankTransfer, type BankTransferStatus, type Recipient, type AdminPayer, type Receipt } from "@/lib/api"

const ALL_STATUSES: BankTransferStatus[] = ["new", "executed"]

// Что реально прибавится к счёту: если net_amount ещё не посчитан — те же
// −0.2%, что и в остальном приложении (AdminRecipientBalanceListView).
const receiptValue = (r: Receipt) =>
  r.net_amount !== null ? parseFloat(r.net_amount) : parseFloat(r.amount) * 0.998

const setsEqual = (a: Set<number>, b: Set<number>) =>
  a.size === b.size && [...a].every((v) => b.has(v))

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AdminTransferDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminSections } = useAuth()

  const [transfer, setTransfer] = useState<BankTransfer | undefined>(undefined)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [payers, setPayers] = useState<AdminPayer[]>([])
  const [byRecipient, setByRecipient] = useState<{ id: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [payerId, setPayerId] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [savingFields, setSavingFields] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [linkReceipts, setLinkReceipts] = useState(false)
  const [accountReceipts, setAccountReceipts] = useState<Receipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<number>>(new Set())

  const [status, setStatus] = useState<BankTransferStatus>("new")
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getAdminTransfer(Number(id)),
      api.getRecipients(),
      api.getAdminPayers(),
    ])
      .then(([t, recs, pyrs]) => {
        setTransfer(t)
        setFromId(String(t.from_recipient))
        setToId(String(t.to_recipient))
        setAmount(fmtNum(t.amount))
        setDate(t.date.split("-").reverse().join("."))
        setPayerId(t.payer)
        setNote(t.note)
        setSelectedReceiptIds(new Set(t.receipts))
        setLinkReceipts(t.receipts.length > 0)
        setStatus(t.status)
        setRecipients(recs)
        setPayers(pyrs)
      })
      .catch(() => navigate("/admin/transfers", { replace: true }))
      .finally(() => setLoading(false))
    // Отдельное право доступа — у ограниченного админа с доступом только к
    // "Переводам" его может не быть, тогда просто не показываем баланс.
    if (adminSections.includes("recipient_balances")) {
      api.getRecipientBalances()
        .then((rows) => setByRecipient(rows.map((r) => ({ id: r.id, total: parseFloat(r.total) }))))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate])

  const handleFromChange = (v: string) => {
    setFromId(v)
    if (v === toId) setToId("")
    // Поступления привязаны к конкретному счёту "Откуда" — при смене счёта
    // старый выбор больше не имеет смысла.
    setLinkReceipts(false)
    setAccountReceipts([])
    setSelectedReceiptIds(new Set())
  }

  useEffect(() => {
    if (!linkReceipts || !fromId || !transfer) return
    setReceiptsLoading(true)
    api.getAdminTransferReceipts(parseInt(fromId), transfer.id)
      .then(setAccountReceipts)
      .catch(() => setError("Не удалось загрузить поступления"))
      .finally(() => setReceiptsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkReceipts, fromId, transfer?.id])

  // Если плательщик ещё не выбран вручную, а среди привязанных поступлений
  // ровно один — подставляем его плательщика, чтобы не дублировать выбор.
  useEffect(() => {
    if (payerId !== null || selectedReceiptIds.size === 0) return
    const selected = accountReceipts.filter((r) => selectedReceiptIds.has(r.id))
    const payerIds = new Set(selected.map((r) => r.payer).filter((id): id is number => id !== null))
    if (payerIds.size === 1) setPayerId([...payerIds][0])
  }, [selectedReceiptIds, accountReceipts, payerId])

  const handleLinkReceiptsChange = (checked: boolean) => {
    setLinkReceipts(checked)
    // Чекбокс — это "да/нет" для всей привязки, а не просто скрытие списка:
    // сняли галочку — привязанные поступления тоже снимаются.
    if (!checked) setSelectedReceiptIds(new Set())
  }

  const toggleReceipt = (id: number) => {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      // Сумма перевода = сумма выбранных поступлений (за вычетом −0.2%) —
      // пока выбрано хоть одно; сняли последнее — сумму не трогаем, чтобы не
      // затирать то, что уже могли ввести вручную.
      if (next.size > 0) {
        const total = accountReceipts.filter((r) => next.has(r.id)).reduce((sum, r) => sum + receiptValue(r), 0)
        setAmount(fmtNum(total))
      }
      return next
    })
  }

  const fromRecipient = recipients.find((r) => String(r.id) === fromId)
  const fromBalance = fromRecipient
    ? (byRecipient.find((b) => b.id === fromRecipient.id)?.total ?? null)
    : null

  const toRecipient = recipients.find((r) => String(r.id) === toId)
  const toBalance = toRecipient
    ? (byRecipient.find((b) => b.id === toRecipient.id)?.total ?? null)
    : null

  const toRecipients = recipients.filter((r) => String(r.id) !== fromId)
  const parsedAmount = parseFloat(toApiDecimal(amount))
  const formValid = !!fromId && !!toId && fromId !== toId && !!amount && parsedAmount > 0 && !!date

  const selectedReceiptsList = accountReceipts.filter((r) => selectedReceiptIds.has(r.id))
  const restReceiptsList = accountReceipts.filter((r) => !selectedReceiptIds.has(r.id))
  const selectedTotal = selectedReceiptsList.reduce((sum, r) => sum + receiptValue(r), 0)

  const fieldsChanged = !!transfer && (
    fromId !== String(transfer.from_recipient) ||
    toId !== String(transfer.to_recipient) ||
    toApiDecimal(amount) !== transfer.amount ||
    toApiDate(date) !== transfer.date ||
    payerId !== transfer.payer ||
    note !== transfer.note ||
    !setsEqual(selectedReceiptIds, new Set(transfer.receipts))
  )

  const handleSaveFields = async () => {
    if (!transfer || !formValid) return
    setSavingFields(true)
    setError(null)
    try {
      const updated = await api.updateAdminTransfer(transfer.id, {
        from_recipient: parseInt(fromId),
        to_recipient: parseInt(toId),
        amount: toApiDecimal(amount),
        date: toApiDate(date),
        payer: payerId,
        receipts: [...selectedReceiptIds],
        note,
      })
      setTransfer(updated)
      toast.success("Сохранено")
    } catch {
      toast.error("Не удалось сохранить")
    } finally {
      setSavingFields(false)
    }
  }

  const handleSaveStatus = async () => {
    if (!transfer) return
    setSavingStatus(true)
    try {
      const updated = await api.updateAdminTransfer(transfer.id, { status })
      setTransfer(updated)
      toast.success("Статус сохранён")
    } catch {
      toast.error("Не удалось сохранить статус")
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) return <div className="flex flex-1 items-center justify-center p-20"><Spinner className="size-6 text-muted-foreground" /></div>
  if (!transfer) return null

  return (
    <div className="p-10">
      <PageHeader
        title={`${transfer.from_recipient_name} → ${transfer.to_recipient_name}`}
        description={`Перевод №${transfer.id} · ${formatDateTime(transfer.created_at)}`}
        badge={<GenericStatusBadge cfg={transferStatusConfig[transfer.status]} />}
        back={{ label: "К переводам", href: "/admin/transfers" }}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 flex flex-col gap-6 w-full">
          <BlockCard>
            <BlockCardHeader icon={<ArrowLeftRight className="size-4" />} title="Перевод" />
            <BlockCardContent className="flex flex-col gap-4">
              {/* Route */}
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-1.5">
                  <FieldLabel>Откуда</FieldLabel>
                  <span aria-hidden />
                  <FieldLabel>Куда</FieldLabel>

                  <Select value={fromId} onValueChange={handleFromChange}>
                    <SelectTrigger className="h-10 w-full bg-card text-sm"><SelectValue placeholder="Счёт" /></SelectTrigger>
                    <SelectContent>
                      {recipients.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 justify-self-center" />
                  <Select value={toId} onValueChange={setToId} disabled={!fromId}>
                    <SelectTrigger className="h-10 w-full bg-card text-sm"><SelectValue placeholder="Счёт" /></SelectTrigger>
                    <SelectContent>
                      {toRecipients.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <span className={cn(
                    "text-xs tabular-nums font-medium",
                    fromBalance === null ? "invisible" : fromBalance > 0 ? "text-success" : "text-muted-foreground"
                  )}>
                    {fromBalance !== null && fromBalance > 0 ? `${fmtNum(fromBalance)} ₽` : "—"}
                  </span>
                  <span aria-hidden />
                  <span className={cn(
                    "text-xs tabular-nums font-medium",
                    toBalance === null ? "invisible" : toBalance > 0 ? "text-success" : "text-muted-foreground"
                  )}>
                    {toBalance !== null && toBalance > 0 ? `${fmtNum(toBalance)} ₽` : "—"}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="transfer-amount">Сумма, ₽</FieldLabel>
                  {fromBalance !== null && fromBalance > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Доступно: {fmtNum(fromBalance)} ₽
                    </span>
                  )}
                </div>
                <AmountInput
                  id="transfer-amount"
                  value={amount}
                  onChange={setAmount}
                  max={fromBalance !== null && fromBalance > 0 ? fromBalance : undefined}
                />
              </div>

              {/* Date + Payer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Дата</FieldLabel>
                  <DatePicker value={date} onChange={setDate} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Плательщик</FieldLabel>
                  <PayerSelect value={payerId} onChange={setPayerId} payers={payers} onPayerAdded={(p) => setPayers((prev) => [...prev, p])} />
                </div>
              </div>
            </BlockCardContent>
          </BlockCard>

          <BlockCard>
            <BlockCardHeader icon={<Link2 className="size-4" />} title="Поступления" />
            <BlockCardContent className="flex flex-col gap-3">
              <label className="flex items-center justify-between text-sm cursor-pointer select-none">
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={linkReceipts}
                    onCheckedChange={handleLinkReceiptsChange}
                    disabled={!fromId}
                  />
                  Привязать поступления к переводу
                </span>
                {selectedReceiptsList.length > 0 && (
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {selectedReceiptsList.length} · {fmtNum(selectedTotal)} ₽
                  </span>
                )}
              </label>
              {!fromId && (
                <p className="text-xs text-muted-foreground">Сначала выберите счёт «Откуда»</p>
              )}

              {linkReceipts && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {receiptsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Поиск по дате, плательщику, сумме..." />
                      <CommandList className="max-h-72">
                        <CommandEmpty>
                          {accountReceipts.length === 0
                            ? `На счёте «${fromRecipient?.name}» нет подтверждённых поступлений`
                            : "Ничего не найдено"}
                        </CommandEmpty>
                        {selectedReceiptsList.length > 0 && (
                          <CommandGroup heading={`Выбрано · ${selectedReceiptsList.length}`}>
                            {selectedReceiptsList.map((r) => (
                              <ReceiptItem key={r.id} receipt={r} checked onSelect={() => toggleReceipt(r.id)} />
                            ))}
                          </CommandGroup>
                        )}
                        {restReceiptsList.length > 0 && (
                          <CommandGroup heading="Поступления">
                            {restReceiptsList.map((r) => (
                              <ReceiptItem key={r.id} receipt={r} checked={false} onSelect={() => toggleReceipt(r.id)} />
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  )}
                </div>
              )}
            </BlockCardContent>
          </BlockCard>

          <BlockCard>
            <BlockCardHeader icon={<MessageSquareText className="size-4" />} title="Примечание" />
            <BlockCardContent>
              <Textarea
                placeholder="Комментарий"
                className="min-h-16 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </BlockCardContent>
          </BlockCard>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="w-full md:w-auto md:self-start"
            disabled={!fieldsChanged || !formValid || savingFields}
            onClick={handleSaveFields}
          >
            {savingFields && <Spinner data-icon="inline-start" />}
            Сохранить
          </Button>

          <BlockCard>
            <BlockCardHeader icon={<Files className="size-4" />} title="Документы" />
            <BlockCardContent>
              <TransferDocuments transferId={transfer.id} />
            </BlockCardContent>
          </BlockCard>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
          <SideCard>
            <SideCardHeader icon={<Check className="size-4" />} title="Статус" />
            <SideCardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-1.5 px-3">
                    <span className="flex items-center gap-1.5">
                      <StatusDot dot={transferStatusConfig[status].dot} dotColor={transferStatusConfig[status].dotColor} />
                      <span className="text-sm">{transferStatusConfig[status].label}</span>
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuGroup>
                    {ALL_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="gap-2">
                        <Check className={s === status ? "size-3.5 shrink-0" : "size-3.5 shrink-0 invisible"} />
                        <StatusDot dot={transferStatusConfig[s].dot} dotColor={transferStatusConfig[s].dotColor} />
                        <span className="truncate">{transferStatusConfig[s].label}</span>
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
                disabled={savingStatus || status === transfer.status}
                onClick={handleSaveStatus}
              >
                {savingStatus && <Spinner data-icon="inline-start" />}
                Сохранить статус
              </Button>
            </SideCardFooter>
          </SideCard>
        </div>
      </div>
    </div>
  )
}

function ReceiptItem({ receipt, checked, onSelect }: { receipt: Receipt; checked: boolean; onSelect: () => void }) {
  const displayDate = receipt.date.split("-").reverse().join(".")
  return (
    <CommandItem
      value={`${displayDate} ${receipt.payer_name ?? ""} ${receipt.amount}`}
      data-checked={checked}
      onSelect={onSelect}
      className="gap-2.5"
    >
      <span className="tabular-nums text-xs text-muted-foreground w-16 shrink-0">{displayDate}</span>
      <span className="flex-1 truncate">{receipt.payer_name ?? "—"}</span>
      <span className="tabular-nums text-xs font-medium shrink-0">{fmtNum(parseFloat(receipt.amount))} ₽</span>
    </CommandItem>
  )
}
