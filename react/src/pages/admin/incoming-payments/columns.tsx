import type { ColumnDef } from "@tanstack/react-table"
import { fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { OrgBadge } from "@/components/org-badge"
import { EmptyCell } from "@/components/empty-cell"
import { TruncatedText } from "@/components/truncated-text"

export interface ReceiptEntry {
  id: number
  date: string
  amount: number
  recipient: string
  payer: string
  organization: string
}

export const columns: ColumnDef<ReceiptEntry>[] = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "date",
    header: ({ column }) => <SortHeader column={column}>Дата</SortHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground whitespace-nowrap">
        {row.original.date.split("-").reverse().join(".")}
      </span>
    ),
    sortingFn: "basic",
  },
  {
    accessorKey: "organization",
    header: "Организация",
    cell: ({ row }) => (
      row.original.organization
        ? <OrgBadge name={row.original.organization} />
        : <EmptyCell />
    ),
  },
  {
    id: "direction",
    header: "Направление платежа",
    cell: ({ row }) => {
      const { payer, recipient } = row.original
      if (!payer && !recipient) return <EmptyCell />
      return (
        <TruncatedText className="max-w-[320px] text-sm">
          {`${payer || "—"} → ${recipient || "—"}`}
        </TruncatedText>
      )
    },
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm font-medium whitespace-nowrap">{fmtNum(row.original.amount)} <span className="text-xs text-muted-foreground font-medium">₽</span></span>
    ),
    sortingFn: "basic",
  },
]
