import { cn, EMPTY_CELL } from "@/lib/utils"

// Единый вид прочерка для отсутствующего значения в ячейке таблицы — раньше
// каждая колонка сама решала, какого цвета/размера/прозрачности будет "—"
// (text-muted-foreground, /50, /30, opacity-40 и т.п.), из-за чего прочерки
// визуально отличались друг от друга в разных таблицах.
export function EmptyCell({ className }: { className?: string }) {
  return <span className={cn("text-muted-foreground", className)}>{EMPTY_CELL}</span>
}
