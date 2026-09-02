import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

/** Обёртка для одной строки "номер счёта + чипсы валюты" — визуально
 *  отделяет один счёт от другого в списке, особенно когда их несколько. */
export function AccountCard({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 flex flex-col gap-2">{children}</div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  )
}
