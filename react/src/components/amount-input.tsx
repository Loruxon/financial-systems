import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, fmtNum } from "@/lib/utils"

interface AmountInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  max?: number
  maxLabel?: string
  disabled?: boolean
  "aria-invalid"?: boolean
  className?: string
}

// Обычный Input (та же высота/радиус/рамка, что везде в проекте) + отдельная
// кнопка справа, подставляющая `max` в значение. Переиспользуемый паттерн
// для любого ввода денежной суммы с ограничением сверху.
export function AmountInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "0,00",
  max,
  maxLabel = "Макс.",
  disabled,
  className,
  ...props
}: AmountInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        size="lg"
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={cn("flex-1", className)}
        {...props}
      />
      {max !== undefined && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 shrink-0 px-3"
          disabled={disabled}
          onClick={() => onChange(fmtNum(max))}
        >
          {maxLabel}
        </Button>
      )}
    </div>
  )
}
