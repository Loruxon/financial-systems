import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type InlineNoticeVariant = "success" | "warning" | "info"

const VARIANT_TONE: Record<InlineNoticeVariant, string> = {
  success: "bg-success text-success",
  warning: "bg-warning text-warning",
  info: "bg-primary text-primary",
}

interface InlineNoticeProps {
  variant: InlineNoticeVariant
  icon: LucideIcon
  title: string
  /** Мелкая подпись под заголовком — для компактных статус-уведомлений (факт/событие). */
  meta?: string
  /** Основной контент — для просторных уведомлений-коммуникаций (текст от человека). */
  children?: ReactNode
  /** compact — одна строка + дата (статус), comfortable — просторнее, с аватаркой (сообщение). */
  density?: "compact" | "comfortable"
  className?: string
}

// Общий инфоблок для уведомлений на страницах деталей ("Деньги пришли",
// "Сообщение от администратора" и т.п.) — тонкая цветная полоса слева вместо
// сплошной цветной заливки/рамки, тот же принцип, что у карточек-контекста в
// модалках ("Получатель" в "Привязать заявки") и у карточек статистики.
export function InlineNotice({ variant, icon: Icon, title, meta, children, density = "compact", className }: InlineNoticeProps) {
  const [barColor, iconColor] = VARIANT_TONE[variant].split(" ")
  const comfortable = density === "comfortable"

  return (
    <div className={cn(
      "relative flex overflow-hidden rounded-xl border border-border bg-card",
      comfortable ? "items-start gap-3 py-4 pl-5 pr-5" : "items-center gap-3 py-3 pl-4 pr-4",
      className
    )}>
      <div className={cn("absolute inset-y-0 left-0 w-1", barColor)} />

      {comfortable ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className={cn("size-4", iconColor)} />
        </div>
      ) : (
        <Icon className={cn("size-5 shrink-0", iconColor)} />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        {children && <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">{children}</div>}
      </div>
    </div>
  )
}
