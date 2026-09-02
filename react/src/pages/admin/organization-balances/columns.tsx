import type { ColumnDef } from "@tanstack/react-table"
import { cn, fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { OrgBadge } from "@/components/org-badge"
import type { OrganizationBalance } from "@/lib/api"

function AmountCell({ value, colorize }: { value: string; colorize?: boolean }) {
  const n = parseFloat(value)
  return (
    <span className={cn(
      "tabular-nums text-sm font-medium whitespace-nowrap",
      colorize && (n < 0 ? "text-destructive" : "text-success")
    )}>
      {fmtNum(n)} <span className="text-xs text-muted-foreground font-medium">₽</span>
    </span>
  )
}

export const columns: ColumnDef<OrganizationBalance>[] = [
  { accessorKey: "organization_id", header: "ID" },
  {
    accessorKey: "organization_name",
    header: ({ column }) => <SortHeader column={column}>Организация</SortHeader>,
    cell: ({ row }) => <OrgBadge name={row.original.organization_name} />,
    sortingFn: "text",
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return filterValue.includes(row.original.organization_name)
    },
  },
  {
    accessorKey: "balance",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Баланс</SortHeader>,
    // Смысл страницы — увидеть, у кого баланс ушёл в минус, поэтому именно
    // здесь цвет — не просто оформление, а часть отчёта.
    cell: ({ row }) => <AmountCell value={row.original.balance} colorize />,
    sortingFn: (a, b) => parseFloat(a.original.balance) - parseFloat(b.original.balance),
  },
  {
    accessorKey: "received",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Зачислено</SortHeader>,
    cell: ({ row }) => <AmountCell value={row.original.received} />,
    sortingFn: (a, b) => parseFloat(a.original.received) - parseFloat(b.original.received),
  },
  {
    accessorKey: "spent",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Списано</SortHeader>,
    cell: ({ row }) => <AmountCell value={row.original.spent} />,
    sortingFn: (a, b) => parseFloat(a.original.spent) - parseFloat(b.original.spent),
  },
  {
    accessorKey: "frozen",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Заморожено</SortHeader>,
    cell: ({ row }) => <AmountCell value={row.original.frozen} />,
    sortingFn: (a, b) => parseFloat(a.original.frozen) - parseFloat(b.original.frozen),
  },
]
