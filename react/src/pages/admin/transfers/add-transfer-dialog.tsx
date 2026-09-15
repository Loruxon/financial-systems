import { useEffect, useState } from "react"
import { ArrowLeftRight, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { FieldLabel } from "@/components/ui/field"
import { AmountInput } from "@/components/amount-input"
import { DatePicker } from "@/components/ui/date-picker"
import { PayerSelect } from "@/components/admin/payer-select"
import { cn, fmtNum, toApiDate, toApiDecimal } from "@/lib/utils"
import { api, type BankTransfer, type Recipient, type AdminPayer, type Receipt } from "@/lib/api"

export function AddTransferDialog({ open, recipients, balances, payers, onPayerAdded, onClose, onCreated }: {
  open: boolean
  recipients: Recipient[]
  balances: { id: number; total: number }[]
  payers: AdminPayer[]
  onPayerAdded: (payer: AdminPayer) => void
  onClose: () => void
  onCreated: (t: BankTransfer) => void
}) {
  const today = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [payerId, setPayerId] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [linkReceipts, setLinkReceipts] = useState(false)
  const [accountReceipts, setAccountReceipts] = useState<Receipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<number>>(new Set())

  const reset = () => {
    setFromId(""); setToId(""); setAmount(""); setDate(today); setPayerId(null); setNote("")
    setError(null); setLinkReceipts(false); setAccountReceipts([]); setSelectedReceiptIds(new Set())
  }

  const handleClose = () => { reset(); onClose() }

  const handleFromChange = (v: string) => {
    setFromId(v)
    if (v === toId) setToId("")
    setAmount("")
    // Поступления привязаны к конкретному счёту "Откуда" — при смене счёта
    // старый выбор больше не имеет смысла.
    setLinkReceipts(false)
    setAccountReceipts([])
    setSelectedReceiptIds(new Set())
  }

  useEffect(() => {
    if (!linkReceipts || !fromId) return
    setReceiptsLoading(true)
    api.getAdminTransferReceipts(parseInt(fromId))
      .then(setAccountReceipts)
      .catch(() => setError("Не удалось загрузить поступления"))
      .finally(() => setReceiptsLoading(false))
  }, [linkReceipts, fromId])

  // Если плательщик ещё не выбран вручную, а среди привязанных поступлений
  // ровно один — подставляем его плательщика, чтобы не дублировать выбор.
  useEffect(() => {
    if (payerId !== null || selectedReceiptIds.size === 0) return
    const selected = accountReceipts.filter((r) => selectedReceiptIds.has(r.id))
    const payerIds = new Set(selected.map((r) => r.payer).filter((id): id is number => id !== null))
    if (payerIds.size === 1) setPayerId([...payerIds][0])
  }, [selectedReceiptIds, accountReceipts, payerId])

  const toggleReceipt = (id: number) => {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const fromRecipient = recipients.find((r) => String(r.id) === fromId)
  const fromBalance = fromRecipient
    ? (balances.find((b) => b.id === fromRecipient.id)?.total ?? null)
    : null

  const toRecipient = recipients.find((r) => String(r.id) === toId)
  const toBalance = toRecipient
    ? (balances.find((b) => b.id === toRecipient.id)?.total ?? null)
    : null

  const toRecipients = recipients.filter((r) => String(r.id) !== fromId)
  const parsedAmount = parseFloat(toApiDecimal(amount))
  const canSubmit = fromId && toId && fromId !== toId && amount && parsedAmount > 0 && date

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      onCreated(await api.createAdminTransfer({
        from_recipient: parseInt(fromId),
        to_recipient: parseInt(toId),
        amount: toApiDecimal(amount),
        date: toApiDate(date),
        payer: payerId,
        receipts: [...selectedReceiptIds],
        note,
      }))
      handleClose()
    } catch {
      setError("Не удалось создать перевод")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-muted-foreground" />
            Перевод между счетами
          </DialogTitle>
          <DialogDescription>Внутренний перевод средств</DialogDescription>
        </DialogHeader>

        <form id="add-transfer-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

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

          <div className="border-t border-border" />

          {/* Date + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Дата</FieldLabel>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Плательщик</FieldLabel>
              <PayerSelect value={payerId} onChange={setPayerId} payers={payers} onPayerAdded={onPayerAdded} />
            </div>
          </div>

          {/* Link receipts */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox
                checked={linkReceipts}
                onCheckedChange={(v) => setLinkReceipts(!!v)}
                disabled={!fromId}
              />
              Привязать поступления
            </label>
            {linkReceipts && (
              <div className="rounded-lg border border-border max-h-44 overflow-y-auto">
                {receiptsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : accountReceipts.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">
                    На счёте «{fromRecipient?.name}» нет подтверждённых поступлений
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {accountReceipts.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedReceiptIds.has(r.id)}
                          onCheckedChange={() => toggleReceipt(r.id)}
                        />
                        <span className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                          {r.date.split("-").reverse().join(".")}
                        </span>
                        <span className="flex-1 truncate text-xs">{r.payer_name ?? "—"}</span>
                        <span className="tabular-nums text-xs font-medium whitespace-nowrap">
                          {fmtNum(parseFloat(r.amount))} ₽
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="transfer-note">Примечание</FieldLabel>
            <Textarea
              id="transfer-note"
              placeholder="Комментарий"
              className="min-h-12 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={handleClose}>Отмена</Button>
          <Button size="lg" type="submit" form="add-transfer-form" disabled={!canSubmit || saving}>
            {saving && <Spinner className="size-4" data-icon="inline-start" />} Перевести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
