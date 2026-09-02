import type { ReactNode } from "react"
import { CircleCheck, X } from "lucide-react"
import { ActionBtn } from "@/components/ui/action-btn"
import { cn } from "@/lib/utils"

interface RepeatableFormRowProps {
  label: string
  index: number
  complete?: boolean
  onRemove?: () => void
  removeDisabled?: boolean
  children: ReactNode
}

// Повторяющаяся группа полей формы (карточка с индикатором заполненности и
// кнопкой удаления) — общий паттерн для мест, где пользователь добавляет
// несколько однотипных записей за один раз.
export function RepeatableFormRow({ label, index, complete, onRemove, removeDisabled, children }: RepeatableFormRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
          complete ? "text-success" : "text-muted-foreground/50"
        )}>
          {complete && <CircleCheck className="size-3.5" />}
          {label} {index + 1}
        </span>
        {onRemove && (
          <ActionBtn
            tooltip="Удалить"
            onClick={onRemove}
            disabled={removeDisabled}
            className="border-transparent bg-transparent shadow-none text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 disabled:opacity-0"
          >
            <X className="size-3.5" />
          </ActionBtn>
        )}
      </div>
      {children}
    </div>
  )
}
