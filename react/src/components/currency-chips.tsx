import { cn } from "@/lib/utils"
import { CURRENCIES } from "@/lib/constants"

interface CurrencyChipsProps {
  value: string[]
  onToggle: (currency: string) => void
  disabled?: boolean
  disabledCurrencies?: string[]
}

/** Единый паттерн выбора валюты по всему проекту — компактные toggle-чипсы.
 *  Мультиселект по умолчанию; для одиночного выбора вызывающий код просто
 *  передаёт value длиной 0/1 и в onToggle всегда заменяет значение, а не
 *  переключает — без отдельного визуального компонента для этого случая. */
export function CurrencyChips({ value, onToggle, disabled = false, disabledCurrencies = [] }: CurrencyChipsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CURRENCIES.map((c) => {
        const selected = value.includes(c)
        return (
          <button
            key={c}
            type="button"
            aria-pressed={selected}
            disabled={disabled || disabledCurrencies.includes(c)}
            onClick={() => onToggle(c)}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border border-border text-sm font-medium text-muted-foreground outline-none transition-colors",
              "hover:border-primary/40 hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected && "border-primary bg-primary/5 text-foreground font-semibold"
            )}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
