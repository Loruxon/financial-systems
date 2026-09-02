import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Link } from "react-router"
import { Wallet } from "lucide-react"
import { api, type Balance as BalanceData } from "@/lib/api"
import { cn, fmtNum } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

type Rate = { date: string; usd: string; eur: string; cny: string }

// Слотуется внутрь SidebarMenuButton (asChild) с size="lg" — коллапс до
// иконки-квадрата и layout-классы (h-auto, flex-col и т.д.) задаёт вызывающий
// компонент через className на SidebarMenuButton. asChild работает через
// Radix Slot, который клонирует className/data-*/ref на ЕДИНСТВЕННЫЙ дочерний
// элемент — поэтому их обязательно нужно принимать и прокидывать на <Link>,
// иначе они молча теряются и стили с SidebarMenuButton никогда не применятся.
export function SidebarBalance({ className, ...props }: Omit<ComponentProps<typeof Link>, "to">) {
  const { percentClient } = useAuth()
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [rate, setRate] = useState<Rate | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const refetch = async () => {
      try { setBalance(await api.getBalance()) } catch {}
    }
    refetch()
    intervalRef.current = setInterval(refetch, 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  useEffect(() => {
    api.getLatestRates().then((rates) => { if (rates[0]) setRate(rates[0]) }).catch(() => {})
  }, [])

  const available = balance ? parseFloat(balance.available) : null
  const isNegative = available !== null && available < 0

  const frozen = balance ? parseFloat(balance.frozen) : 0
  const frozenPool = available !== null ? Math.max(available, 0) + frozen : 0
  const frozenPercent = frozenPool > 0 ? Math.min(100, (frozen / frozenPool) * 100) : 0

  const currencyRows = rate && available !== null
    ? [
        { code: "USD", symbol: "$", value: available / parseFloat(rate.usd) },
        { code: "EUR", symbol: "€", value: available / parseFloat(rate.eur) },
        { code: "CNY", symbol: "¥", value: available / parseFloat(rate.cny) },
      ]
    : []

  return (
    <Link to="/statement" className={cn(className)} {...props}>
      {/* Свёрнутый сайдбар — только иконка */}
      <div className="hidden size-full items-center justify-center group-data-[collapsible=icon]:flex">
        <Wallet className={cn("size-4", isNegative ? "text-destructive" : "text-sidebar-foreground/80")} />
      </div>

      {/* Развёрнутый сайдбар — полный блок баланса */}
      <div className="flex w-full flex-col gap-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-1.5">
          <Wallet className={cn("size-3.5 shrink-0", isNegative ? "text-destructive" : "text-sidebar-foreground/70")} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">
            Текущий баланс
          </span>
        </div>

        <div>
          <span className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            balance === null ? "text-sidebar-foreground" : isNegative ? "text-destructive" : "text-success"
          )}>
            {balance === null ? "…" : `${isNegative ? "−" : ""}${fmtNum(Math.abs(available!))} ₽`}
          </span>
          {percentClient && (
            <p className="mt-1 text-[10px] font-normal text-sidebar-foreground/60">
              Тариф {parseFloat(percentClient)}%
            </p>
          )}
        </div>

        {frozen > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-sidebar-foreground/10">
              <div
                className="h-full rounded-full bg-warning transition-[width]"
                style={{ width: `${frozenPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/60">
              <span>Заморожено</span>
              <span className="tabular-nums font-medium text-warning">{fmtNum(frozen)} ₽</span>
            </div>
          </div>
        )}

        {currencyRows.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-sidebar-border pt-2.5">
            {currencyRows.map((r) => (
              <div key={r.code} className="flex items-center justify-between text-xs">
                <span className="text-sidebar-foreground/70">{r.code}</span>
                <span className="tabular-nums font-medium text-sidebar-foreground">
                  {r.symbol} {fmtNum(r.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {rate && (
          <div className="flex items-center justify-between gap-2 border-t border-sidebar-border pt-2.5 text-[10px] font-mono text-sidebar-foreground/60">
            <span className="tabular-nums">{rate.date.split("-").reverse().join(".")}</span>
            <div className="flex items-center gap-1.5 tabular-nums">
              <span>${Number(rate.usd).toFixed(2)}</span>
              <span>€{Number(rate.eur).toFixed(2)}</span>
              <span>¥{Number(rate.cny).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
