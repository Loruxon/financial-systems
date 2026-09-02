import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RequestStatus } from "@/lib/api"

export type StatusCfg = {
  label: string
  // Плоский цвет точки (8px, bg-*) — единый source of truth для компактных
  // мест (выпадающие фильтры), не зависит от dot/dotColor ниже, которые
  // обслуживают более богатое представление в StatusBadge (pulse/check/alert).
  color: string
  className: string
  dot: "static" | "pulse" | "check" | "alert"
  dotColor: string
}

export const statusConfig: Record<RequestStatus, StatusCfg> = {
  draft:        { label: "Черновик",          color: "bg-gray-400",    dot: "static", dotColor: "bg-gray-400   dark:bg-gray-500",   className: "bg-gray-500/10   text-gray-600   dark:text-gray-400"   },
  new:          { label: "Новая",              color: "bg-blue-500",    dot: "pulse",  dotColor: "bg-blue-500",                     className: "bg-blue-500/10   text-blue-700   dark:text-blue-400"   },
  in_review:    { label: "На проверке",        color: "bg-amber-500",   dot: "static", dotColor: "bg-amber-500",                    className: "bg-amber-500/10  text-amber-700  dark:text-amber-400"  },
  sent_to_bank: { label: "Отправлена в банк",  color: "bg-teal-600",    dot: "static", dotColor: "bg-teal-600",                     className: "bg-teal-500/10   text-teal-700   dark:text-teal-400"   },
  awaiting_closing_docs: { label: "Ожидание закр. документов", color: "bg-sky-500",    dot: "static", dotColor: "bg-sky-500",     className: "bg-sky-500/10    text-sky-700    dark:text-sky-400"    },
  closing_docs_review:   { label: "Проверка закр. документов", color: "bg-violet-500", dot: "static", dotColor: "bg-violet-500", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  closed:       { label: "Закрыта",            color: "bg-emerald-500", dot: "check",  dotColor: "text-emerald-600 dark:text-emerald-400", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  correction:   { label: "Исправление",        color: "bg-destructive", dot: "alert",  dotColor: "text-destructive",                        className: "bg-destructive/10 text-destructive"                     },
  correction_review: { label: "Проверка исправлений", color: "bg-amber-500", dot: "static", dotColor: "bg-amber-500",              className: "bg-amber-500/10  text-amber-700  dark:text-amber-400"  },
}

// Тот же цвет, что и текст бейджа статуса (className уже содержит его),
// но без фона — для мест, где нужен просто цветной текст/иконка (например
// иконка в панели уведомлений), без дублирования палитры отдельным полем.
export function statusTextColor(status: RequestStatus): string {
  return statusConfig[status].className
    .split(/\s+/)
    .filter((c) => c.startsWith("text-") || c.startsWith("dark:text-"))
    .join(" ")
}

export function StatusDot({ dot, dotColor }: { dot: StatusCfg["dot"]; dotColor: string }) {
  if (dot === "check") {
    return <Check className={cn("size-3 shrink-0", dotColor)} />
  }
  if (dot === "alert") {
    return <AlertCircle className={cn("size-3 shrink-0", dotColor)} />
  }
  if (dot === "pulse") {
    return (
      <span className="relative flex size-2 shrink-0">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dotColor)} />
        <span className={cn("relative inline-flex size-2 rounded-full", dotColor)} />
      </span>
    )
  }
  return <span className={cn("size-2 rounded-full shrink-0", dotColor)} />
}

// Общий рендер бейджа по готовому конфигу — переиспользуется для любого
// статус-набора (не только заявок), чтобы не плодить второй похожий
// компонент ради того же самого визуального паттерна "точка + подпись".
export function GenericStatusBadge({ cfg, className }: { cfg: StatusCfg; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-current/15",
      cfg.className,
      className
    )}>
      <StatusDot dot={cfg.dot} dotColor={cfg.dotColor} />
      {cfg.label}
    </span>
  )
}

interface StatusBadgeProps {
  status: RequestStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <GenericStatusBadge cfg={statusConfig[status]} className={className} />
}
