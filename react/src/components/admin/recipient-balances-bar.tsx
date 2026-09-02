import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { cn, fmtNum } from "@/lib/utils"
import { api, type BankTransfer, type Receipt, type Recipient, type OutgoingPayment } from "@/lib/api"
import { useRecipientBalances } from "@/hooks/use-recipient-balances"
import { RECIPIENT_ACCENT, RECIPIENT_SLOTS } from "@/lib/constants"

// Балансы счетов-получателей (внутренние банковские счета — CIC/ATL/...), а не
// клиентских организаций (для тех отдельная страница /admin/organization-balances).
// Общий для всей админки блок: живёт в Layout, а не на отдельных страницах,
// поэтому не дублируется на каждой странице списка.
export function RecipientBalancesBar() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [outgoingPayments, setOutgoingPayments] = useState<OutgoingPayment[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getAdminIncomingPayments(),
      api.getAdminTransfers(),
      api.getRecipients(),
      api.getOutgoingPayments(),
    ])
      .then(([r, t, rec, ops]) => {
        setReceipts(r)
        setTransfers(t)
        setRecipients(rec)
        setOutgoingPayments(ops)
      })
      .catch(() => toast.error("Не удалось загрузить балансы счетов"))
      .finally(() => setLoaded(true))
  }, [])

  const byRecipient = useRecipientBalances(receipts, transfers, recipients, outgoingPayments)

  if (!loaded) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 px-4 pt-4">
        {Array.from({ length: RECIPIENT_SLOTS }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden min-h-[110px]">
            <div className="h-1 w-full bg-muted animate-pulse" />
            <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-7 w-36 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 px-4 pt-4">
      {Array.from({ length: RECIPIENT_SLOTS }).map((_, i) => {
        const rec = byRecipient[i]
        if (!rec) return (
          <div key={i} className="rounded-xl border border-dashed bg-muted/10 flex items-center justify-center min-h-[110px]">
            <span className="text-xs text-muted-foreground/30">—</span>
          </div>
        )
        const negative = rec.total < 0
        return (
          <Card key={rec.id} className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-sm">
            <div className={cn("h-1 w-full", RECIPIENT_ACCENT.bar)} />
            <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", RECIPIENT_ACCENT.iconBg)}>
                  <Building2 className={cn("size-4", RECIPIENT_ACCENT.iconColor)} />
                </div>
                <span className="text-sm font-medium leading-tight line-clamp-2 text-foreground/80">
                  {rec.name}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-2xl font-semibold tabular-nums tracking-tight",
                  negative ? "text-destructive" : RECIPIENT_ACCENT.amount
                )}>
                  {fmtNum(rec.total)} ₽
                </span>
                <span className="text-xs text-muted-foreground">На счёте</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
