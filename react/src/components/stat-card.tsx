import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatCardVariant = "success" | "destructive" | "warning" | "neutral"

// Единое правило цвета для ЛЮБЫХ карточек с денежными суммами в проекте —
// цвет не решается вручную за каждым разом, а привязан к смыслу через variant:
//   success     — приход (пришли деньги)
//   destructive — расход (ушли деньги) — тот же красный, что и у списаний в таблицах
//   warning     — ожидание/статус (не приход и не расход — например "заморожено")
//   neutral     — нейтральная информация без денежного знака — без цветной полосы
const VARIANT_STYLES: Record<StatCardVariant, {
  bar: string
  iconBg: string
  iconColor: string
  amountColor: string
}> = {
  success:     { bar: "bg-success",     iconBg: "bg-success/10",     iconColor: "text-success",     amountColor: "text-success" },
  destructive: { bar: "bg-destructive", iconBg: "bg-destructive/10", iconColor: "text-destructive", amountColor: "text-destructive" },
  warning:     { bar: "bg-warning",     iconBg: "bg-warning/10",     iconColor: "text-warning",     amountColor: "text-warning" },
  neutral:     { bar: "bg-transparent", iconBg: "bg-muted",          iconColor: "text-muted-foreground", amountColor: "text-muted-foreground" },
}

interface StatCardProps {
  variant: StatCardVariant
  title: string
  subtitle?: string
  amount: string
  icon: LucideIcon
  headerAction?: ReactNode
  className?: string
}

export function StatCard({ variant, title, subtitle, amount, icon: Icon, headerAction, className }: StatCardProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-sm", className)}>
      <div className={cn("h-1 w-full", s.bar)} />
      <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", s.iconBg)}>
              <Icon className={cn("size-4", s.iconColor)} />
            </div>
            <span className="text-sm font-medium text-foreground/80 leading-tight">{title}</span>
          </div>
          {headerAction}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={cn("text-2xl font-semibold tabular-nums tracking-tight", s.amountColor)}>
            {amount}
          </span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}
