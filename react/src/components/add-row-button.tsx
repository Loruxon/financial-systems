import type { ReactNode } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddRowButtonProps {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  className?: string
}

// Единый паттерн "добавить ещё один элемент повторяющегося списка внутри
// формы" (счёт, строка, и т.п.) — пунктирная рамка на всю ширину контейнера,
// чтобы не заводить разные визуальные варианты одного и того же действия.
export function AddRowButton({ onClick, children, disabled, className }: AddRowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors",
        "hover:text-foreground hover:border-primary/30 hover:bg-muted/40",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent",
        className
      )}
    >
      <Plus className="size-4" />
      {children}
    </button>
  )
}
