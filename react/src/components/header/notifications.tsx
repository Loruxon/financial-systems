import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Bell, CircleCheckBig, FileUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { statusTextColor } from "@/components/status-badge"

// Каждая запись строго привязана к конкретному статусу заявки — счётчик
// считается напрямую по факту status === .... Цвет иконки берём из
// statusConfig (тот же source of truth, что и у бейджа статуса в таблице),
// а не задаём отдельно — иначе цвета неизбежно расходятся.
const CFG = {
  sent_to_bank: {
    label: "Деньги пришли",
    sub: "Подтвердите получение",
    icon: CircleCheckBig,
    filter: "sent_to_bank",
  },
  awaiting_closing_docs: {
    label: "Закрывающие документы",
    sub: "Загрузите документы",
    icon: FileUp,
    filter: "awaiting_closing_docs",
  },
  correction: {
    label: "Требует исправления",
    sub: "Проверьте заявки",
    icon: AlertCircle,
    filter: "correction",
  },
} as const

type AlertStatus = keyof typeof CFG

export function Notifications() {
  const [counts, setCounts] = useState<Partial<Record<AlertStatus, number>>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = async () => {
    try {
      const list = await api.getRequests()
      setCounts({
        sent_to_bank:          list.filter((r) => r.status === "sent_to_bank").length          || undefined,
        awaiting_closing_docs: list.filter((r) => r.status === "awaiting_closing_docs").length || undefined,
        correction:            list.filter((r) => r.status === "correction").length            || undefined,
      })
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refetch()
    intervalRef.current = setInterval(refetch, 60_000)
    window.addEventListener("request-notifications-changed", refetch)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener("request-notifications-changed", refetch)
    }
  }, [])

  const active = (Object.entries(counts) as [AlertStatus, number][]).filter(([, n]) => !!n)
  const total = active.reduce((sum, [, n]) => sum + (n ?? 0), 0)

  if (total === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-50" />
            <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {total > 99 ? "99+" : total}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 border border-border bg-card p-1 ring-0">
        <DropdownMenuGroup>
          {active.map(([status, count]) => {
            const { label, sub, icon: Icon, filter } = CFG[status]
            return (
              <DropdownMenuItem key={status} asChild className="gap-3 border-b border-border/60 py-2.5 last:border-0">
                <Link to="/request" state={{ filter }}>
                  <Icon className={cn("size-4 shrink-0", statusTextColor(status))} />
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{sub}</span>
                  </div>
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
