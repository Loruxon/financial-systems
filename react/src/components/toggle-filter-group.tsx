import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToggleFilterOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface ToggleFilterGroupProps<T extends string> {
  options: ToggleFilterOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
}

// Фильтр-тумблер — мгновенное переключение без панели (в отличие от
// FilterButton). Без шеврона: тут нечего "открывать", клик по активной
// кнопке снимает именно её, а не отдельный "×" рядом.
export function ToggleFilterGroup<T extends string>({ options, value, onChange }: ToggleFilterGroupProps<T>) {
  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div className="flex items-center gap-1">
      {options.map(({ value: v, label, icon: Icon }) => {
        const selected = value.includes(v)
        return (
          <button
            key={v}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(v)}
            className={cn(
              "h-9 flex items-center gap-1.5 rounded-lg border px-3 text-sm font-normal transition-colors",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
