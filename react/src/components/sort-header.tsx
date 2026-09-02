import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

// Рендерит ту же типографику, что TableHead задаёт для обычных (не
// сортируемых) заголовков колонок (text-xs font-semibold uppercase
// tracking-wider text-foreground-secondary) — явно, а не полагаясь на
// наследование от родительского <th>, потому что нативный <button>/Button
// не наследует эти свойства так же надёжно, как обычный текстовый узел.
export function SortHeader({ column, children }: { column: any; children: React.ReactNode }) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="inline-flex items-center gap-1.5 -ml-1 rounded-sm text-xs font-semibold uppercase tracking-wider text-foreground-secondary outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/20"
    >
      {children}
      {sorted === "asc"
        ? <ArrowUp className="size-3 opacity-70" />
        : sorted === "desc"
        ? <ArrowDown className="size-3 opacity-70" />
        : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  )
}
