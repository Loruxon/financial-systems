import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronsUpDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface FilterButtonProps {
  icon?: LucideIcon
  /** Подпись, когда ничего не выбрано, и одновременно префикс для счётчика ("Статус: 2"). */
  label: string
  /** Показывается вместо label, когда выбрано ровно одно значение. */
  selectedLabel?: string
  /** Если выбрано больше одного значения — вместо перечисления показываем "label: count". */
  count?: number
  onClear: () => void
  contentClassName?: string
  children: ReactNode
  /** Управляемое состояние открытия — нужно фильтрам с явным "Применить"/пресетами
   *  (например DateRangeFilter), которым надо закрыть панель программно.
   *  Если не передано, компонент управляет открытием сам. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Единый компонент для всех dropdown-фильтров проекта (Статус, Контрагент,
// Организация, Исполнитель, Дата создания и т.п.) — сама панель выбора
// (children) у каждого своя, но кнопка-триггер и его состояния (пусто/
// активно/несколько значений) везде одинаковые.
export function FilterButton({ icon: Icon, label, selectedLabel, count, onClear, contentClassName, children, open: openProp, onOpenChange }: FilterButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const active = !!selectedLabel || !!count
  const displayText = count && count > 1 ? `${label}: ${count}` : selectedLabel ?? label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 flex items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/20",
            active
              ? "border-foreground/50 bg-muted text-foreground"
              : "border-border bg-card text-foreground-secondary hover:bg-muted/50"
          )}
        >
          {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="max-w-[180px] truncate">{displayText}</span>
          {active ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="ml-0.5 -mr-1 rounded-sm p-0.5 shrink-0 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </span>
          ) : (
            <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-64 p-0", contentClassName)} align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}
