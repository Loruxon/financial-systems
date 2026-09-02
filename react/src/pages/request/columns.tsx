import type { ColumnDef } from "@tanstack/react-table"
import type { RequestListItem, RequestStatus } from "@/lib/api"
import { fmtNum } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"
import { EmptyCell } from "@/components/empty-cell"

export const columns: ColumnDef<RequestListItem>[] = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "invoice",
    header: "Инвойс",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.invoice}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortHeader column={column}>Дата создания</SortHeader>,
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
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
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
    accessorKey: "bank_name",
    header: "Банк",
    cell: ({ row }) => (
      <TruncatedText className="max-w-[200px] text-sm font-medium text-foreground">
        {row.getValue("bank_name") as string}
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
      <span className="tabular-nums text-sm whitespace-nowrap">
        {fmtNum(row.original.amount)}{" "}
        <span className="text-xs text-muted-foreground font-medium">{row.original.currency}</span>
      </span>
    ),
  },
  {
    accessorKey: "execution_costs",
    meta: { align: "right" },
    header: "Затраты",
    cell: ({ row }) => {
      const value = row.original.execution_costs
      if (!value) return <EmptyCell />
      return (
        <span className="tabular-nums text-sm whitespace-nowrap">
          {fmtNum(value)} <span className="text-xs text-muted-foreground font-medium">₽</span>
        </span>
      )
    },
  },
  {
    accessorKey: "execution_balance",
    meta: { align: "right" },
    header: "Остаток",
    cell: ({ row }) => {
      const value = row.original.execution_balance
      if (!value) return <EmptyCell />
      return (
        <span className="tabular-nums text-sm whitespace-nowrap">
          {fmtNum(value)} <span className="text-xs text-muted-foreground font-medium">₽</span>
        </span>
      )
    },
  },
]
