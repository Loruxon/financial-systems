import { useEffect, useState } from "react"
import { CheckCircle2, Link2, X } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { FieldLabel } from "@/components/ui/field"
import { cn, fmtNum } from "@/lib/utils"
import { api, type OutgoingPayment, type RequestListItem } from "@/lib/api"

// Первая строка ряда — номер инвойса, либо предсказуемый фолбэк, если его
// ещё нет (черновик или иная причина отсутствия номера) — чтобы плотность
// информации в списке была одинаковой у всех строк.
function invoiceLabel(r: RequestListItem) {
  if (r.invoice) return r.invoice
  if (r.status === "draft") {
    const d = new Date(r.created_at)
    return `Черновик от ${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`
  }
  return "Без номера"
}

function counterpartyLabel(r: RequestListItem) {
  return r.counterparty_name ? `${r.counterparty_name} · ${r.organization_name}` : r.organization_name
}

export function LinkRequestDialog({ payment, requests, onClose, onLinked }: {
  payment: OutgoingPayment | null
  requests: RequestListItem[]
  onClose: () => void
  onLinked: (updated: OutgoingPayment) => void
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (payment) setSelectedIds(payment.requests)
  }, [payment])

  const paymentAmount = payment?.amount ? parseFloat(payment.amount) : null
  const matchingRequests = requests.filter(
    (r) => r.prf_amount !== null && paymentAmount !== null && parseFloat(r.prf_amount) === paymentAmount
  )
  const otherRequests = requests.filter(
    (r) => r.prf_amount === null || paymentAmount === null || parseFloat(r.prf_amount) !== paymentAmount
  )

  const toggle = (id: number) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!payment) return
    setSaving(true)
    try {
      onLinked(await api.setOutgoingPaymentRequests(payment.id, selectedIds))
      onClose()
    } catch {
      toast.error("Не удалось сохранить привязку заявок")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            Привязать заявки
          </DialogTitle>
        </DialogHeader>

        {payment && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border overflow-hidden">
              <div className="h-1 w-full bg-primary" />
              <div className="px-4 pt-3 pb-4 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs text-muted-foreground">Поставщик</span>
                  <span className="text-sm font-semibold truncate">{payment.supplier_name || "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5 items-end shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {payment.invoice || `Платёж №${payment.id}`}
                  </span>
                  <span className="text-base font-bold tabular-nums text-primary">
                    {payment.amount ? `${fmtNum(payment.amount)} ₽` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel>
                  Заявки {selectedIds.length > 0 && <span className="text-muted-foreground font-normal">· {selectedIds.length}</span>}
                </FieldLabel>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setSelectedIds([])}
                  >
                    <X className="size-3" /> Снять все
                  </button>
                )}
              </div>
              <Command className="rounded-lg border">
                <CommandInput placeholder="Поиск по инвойсу, контрагенту..." />
                <CommandList className="max-h-[260px]">
                  <CommandEmpty>Не найдено</CommandEmpty>
                  {matchingRequests.length > 0 && (
                    <CommandGroup heading="Вероятное совпадение">
                      {matchingRequests.map((r) => {
                        const checked = selectedIds.includes(r.id)
                        return (
                          <CommandItem
                            key={r.id}
                            value={`${r.invoice} ${r.counterparty_name} ${r.organization_name}`}
                            onSelect={() => toggle(r.id)}
                            className="gap-2"
                          >
                            <div className={cn(
                              "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                            )}>
                              {checked && <CheckCircle2 className="size-3" />}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={cn(!r.invoice && "italic text-muted-foreground")}>{invoiceLabel(r)}</span>
                              <span className="text-xs text-muted-foreground truncate">{counterpartyLabel(r)}</span>
                            </div>
                            <span className="ml-auto pl-4 tabular-nums text-xs text-success shrink-0">
                              {fmtNum(r.prf_amount!)} ₽
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                  {matchingRequests.length > 0 && otherRequests.length > 0 && <CommandSeparator />}
                  {otherRequests.length > 0 && (
                    <CommandGroup heading={matchingRequests.length > 0 ? "Остальные заявки" : undefined}>
                      {otherRequests.map((r) => {
                        const checked = selectedIds.includes(r.id)
                        return (
                          <CommandItem
                            key={r.id}
                            value={`${r.invoice} ${r.counterparty_name} ${r.organization_name}`}
                            onSelect={() => toggle(r.id)}
                            className="gap-2"
                          >
                            <div className={cn(
                              "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                            )}>
                              {checked && <CheckCircle2 className="size-3" />}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={cn(!r.invoice && "italic text-muted-foreground")}>{invoiceLabel(r)}</span>
                              <span className="text-xs text-muted-foreground truncate">{counterpartyLabel(r)}</span>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>Отмена</Button>
          <Button size="lg" disabled={saving} onClick={handleSave}>
            {saving && <Spinner className="size-4" data-icon="inline-start" />} Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
