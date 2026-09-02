import { cn } from "@/lib/utils"
import { AttachmentAction } from "@/components/ui/attachment"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { DocType } from "@/lib/api"

export type { DocType }

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  invoice:   "Инвойс",
  request:   "Заявка",
  other:     "Другое",
  gtd:       "ГТД",
  transport: "Транспортные",
}

export const DOC_TYPE_COLORS: Record<DocType, string> = {
  invoice:   "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  request:   "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  other:     "bg-muted/60 text-foreground/60 border-border",
  gtd:       "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/20",
  transport: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
}

export type DocTypeVariant = "payment" | "closing"

export const DOC_TYPE_VARIANTS: Record<DocTypeVariant, DocType[]> = {
  payment: ["invoice", "request", "other"],
  closing: ["gtd", "invoice", "transport", "other"],
}

// Тип документа настраивает только администратор — организация видит и
// выбирает только сами файлы, категоризация закрывающих/платёжных документов
// это внутренняя работа бэк-офиса.
export function DocTypePicker({ value, onChange, variant = "payment" }: {
  value: DocType
  onChange: (v: DocType) => void
  variant?: DocTypeVariant
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DocType)}>
      <SelectTrigger
        size="sm"
        className={cn(
          "h-6 w-fit shrink-0 gap-1 rounded-md border px-2 py-0 text-xs font-medium shadow-none",
          DOC_TYPE_COLORS[value]
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {DOC_TYPE_VARIANTS[variant].map((type) => (
          <SelectItem key={type} value={type} className="text-xs">
            {DOC_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FileActionButton({ tooltip, className, asChild, onClick, children }: {
  tooltip: string
  className?: string
  asChild?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AttachmentAction asChild={asChild} className={className} onClick={onClick} aria-label={tooltip}>
          {children}
        </AttachmentAction>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
