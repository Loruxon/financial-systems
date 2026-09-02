import type { ColumnDef } from "@tanstack/react-table"
import type { RequestListItem, RequestStatus, AdminUser } from "@/lib/api"
import { fmtNum } from "@/lib/utils"
import { UNASSIGNED } from "./filters"
import { StatusBadge } from "@/components/status-badge"
import { OrgBadge } from "@/components/org-badge"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"
import { EmptyCell } from "@/components/empty-cell"

function AmountCell({ value, currency = "₽", colorize = false }: { value: string | null; currency?: string; colorize?: boolean }) {
  if (!value) return <EmptyCell />
  const num = parseFloat(value)
  const isNegative = num < 0
  const colorClass = colorize
    ? isNegative ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
    : ""
  return (
    <span className={`tabular-nums text-sm font-medium whitespace-nowrap ${colorClass}`}>
      {fmtNum(value)} <span className="text-xs text-muted-foreground font-medium">{currency}</span>
    </span>
  )
}

export const adminColumns: ColumnDef<RequestListItem>[] = [
  { accessorKey: "id", header: ({ column }) => <SortHeader column={column}>ID</SortHeader> },
  {
    accessorKey: "organization_name",
    header: "Организация",
    filterFn: "arrIncludesSome",
    cell: ({ row }) => <OrgBadge name={row.getValue("organization_name") as string} />,
  },
  {
    accessorKey: "invoice",
    header: "Инвойс",
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.invoice}</span>,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortHeader column={column}>Дата создания</SortHeader>,
    filterFn: (row, _columnId, filterValue: { from?: Date; to?: Date }) => {
      if (!filterValue?.from && !filterValue?.to) return true
      const date = new Date(row.original.created_at)
      if (filterValue.from && date < filterValue.from) return false
      if (filterValue.to) {
        const end = new Date(filterValue.to)
        end.setHours(23, 59, 59, 999)
        if (date > end) return false
      }
      return true
    },
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground whitespace-nowrap">
        {new Date(row.original.created_at).toLocaleString("ru-RU", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    filterFn: "arrIncludesSome",
    cell: ({ row }) => <StatusBadge status={row.getValue("status") as RequestStatus} />,
  },
  {
    accessorKey: "prf_amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма, ₽</SortHeader>,
    cell: ({ row }) => {
      const amount = row.original.prf_amount
      if (!amount) return <EmptyCell />
      return <span className="tabular-nums text-sm font-medium whitespace-nowrap">{fmtNum(amount)} <span className="text-xs text-muted-foreground font-medium">₽</span></span>
    },
  },
  {
    accessorKey: "counterparty_name",
    header: "Контрагент",
    filterFn: "arrIncludesSome",
    cell: ({ row }) => (
      <TruncatedText className="max-w-[200px] text-sm font-medium text-foreground">
        {row.getValue("counterparty_name") as string}
      </TruncatedText>
    ),
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: "Сумма",
    // Своей колонки под валюту в таблице нет — она печатается тут же,
    // рядом с суммой, поэтому фильтр по валюте вешаем прямо на эту колонку.
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return filterValue.includes(row.original.currency)
    },
    cell: ({ row }) => (
      <span className="tabular-nums text-sm font-medium whitespace-nowrap">
        {fmtNum(row.original.amount)}{" "}
        <span className="text-xs text-muted-foreground font-medium">{row.original.currency}</span>
      </span>
    ),
  },
  {
    accessorKey: "execution_costs",
    meta: { align: "right" },
    header: "Затраты",
    cell: ({ row }) => <AmountCell value={row.original.execution_costs} />,
  },
  {
    accessorKey: "execution_balance",
    meta: { align: "right" },
    header: "Остаток",
    cell: ({ row }) => <AmountCell value={row.original.execution_balance} />,
  },
  {
    accessorKey: "execution_profit_sebes",
    meta: { align: "right" },
    header: "Прибыль",
    cell: ({ row }) => <AmountCell value={row.original.execution_profit_sebes} colorize />,
  },
  {
    accessorKey: "assigned_admin",
    header: "Исполнитель",
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue.length) return true
      const admin = row.original.assigned_admin as AdminUser | null
      const name = admin ? (admin.name || admin.email) : UNASSIGNED
      return filterValue.includes(name)
    },
    cell: ({ row }) => {
      const admin = row.original.assigned_admin as AdminUser | null
      if (!admin) return <EmptyCell />
      const name = admin.name || admin.email
      const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
            {initials}
          </span>
          <span className="text-sm truncate max-w-[120px]">{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "work_scheme_name",
    header: "Схема",
    cell: ({ row }) => {
      const name = row.original.work_scheme_name
      if (!name) return <EmptyCell />
      return <span className="text-sm text-foreground">{name}</span>
    },
  },
]
