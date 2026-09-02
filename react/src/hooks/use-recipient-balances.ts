import { useMemo } from "react"
import type { Receipt, BankTransfer, Recipient, OutgoingPayment } from "@/lib/api"

export type RecipientBalance = {
  id: number
  name: string
  total: number
  count: number
}

export function useRecipientBalances(
  receipts: Receipt[],
  transfers: BankTransfer[],
  recipients: Recipient[],
  outgoingPayments: OutgoingPayment[] = [],
): RecipientBalance[] {
  return useMemo(() => {
    const map = new Map<number, RecipientBalance>()
    for (const rec of recipients) {
      map.set(rec.id, { id: rec.id, name: rec.name, total: parseFloat(rec.initial_balance) || 0, count: 0 })
    }
    for (const r of receipts) {
      if (r.status !== "confirmed") continue
      if (r.recipient == null) continue
      const entry = map.get(r.recipient)
      if (!entry) continue
      const net = r.net_amount != null ? parseFloat(r.net_amount) : parseFloat(r.amount) * 0.998
      map.set(r.recipient, { ...entry, total: entry.total + net, count: entry.count + 1 })
    }
    for (const t of transfers) {
      const amount = parseFloat(t.amount)
      const from = map.get(t.from_recipient)
      if (from) map.set(t.from_recipient, { ...from, total: from.total - amount })
      const to = map.get(t.to_recipient)
      if (to) map.set(t.to_recipient, { ...to, total: to.total + amount })
    }
    // Списываем только реально исполненные платежи — пока платёж "Новый"/
    // "В работе"/"На исполнении", деньги со счёта ещё физически не ушли.
    for (const op of outgoingPayments) {
      if (op.status !== "executed") continue
      if (op.account_id == null || op.amount == null) continue
      const entry = map.get(op.account_id)
      if (!entry) continue
      map.set(op.account_id, { ...entry, total: entry.total - parseFloat(op.amount) })
    }
    // Порядок карточек фиксирован (как в списке счетов из БД), а не "плавает"
    // вслед за балансом — иначе блоки перескакивали бы местами при каждом
    // поступлении/списании.
    return Array.from(map.values())
  }, [receipts, transfers, recipients, outgoingPayments])
}
