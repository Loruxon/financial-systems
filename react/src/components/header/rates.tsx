import { useEffect, useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type Rate = { date: string; usd: string; eur: string; cny: string }

function fmt(val: string) {
  return Number(val).toFixed(4)
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

const CURRENCIES = [
  { key: "usd", symbol: "$", label: "USD" },
  { key: "eur", symbol: "€", label: "EUR" },
  { key: "cny", symbol: "¥", label: "CNY" },
] as const

function RateItem({ symbol, label, value, prevValue }: {
  symbol: string
  label: string
  value: string
  prevValue?: string
}) {
  const current = Number(value)
  const prev = prevValue !== undefined ? Number(prevValue) : null
  const delta = prev !== null && prev !== 0 ? ((current - prev) / prev) * 100 : null
  const isUp = delta !== null && delta > 0.005
  const isDown = delta !== null && delta < -0.005

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground">
        {symbol}{fmt(value)}
      </span>
      {(isUp || isDown) && (
        <span className={cn(
          "text-[10px] font-medium tabular-nums",
          isUp ? "text-success" : "text-destructive"
        )}>
          {isUp ? "▲" : "▼"}{Math.abs(delta!).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

export function Rates() {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getLatestRates()
      .then(setRates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Spinner className="size-3.5 text-muted-foreground/50" />
  }

  if (rates.length === 0) return null

  const current = rates[0]
  const prev = rates[1]

  const items: ReactNode[] = []
  CURRENCIES.forEach(({ key, symbol, label }, i) => {
    if (i > 0) items.push(<div key={`div-${key}`} className="h-[60%] w-px shrink-0 self-center bg-border" />)
    items.push(
      <RateItem key={key} symbol={symbol} label={label} value={current[key]} prevValue={prev?.[key]} />
    )
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex h-8 items-center gap-3.5 rounded-lg border border-foreground/15 bg-card px-5">
          {items}
        </div>
      </TooltipTrigger>
      <TooltipContent>Обновлено {fmtDate(current.date)}</TooltipContent>
    </Tooltip>
  )
}
