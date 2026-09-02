import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRight, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { ActionBtn } from "@/components/ui/action-btn"
import { EmptyCell } from "@/components/empty-cell"
import type { BankTransfer } from "@/lib/api"
import { fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"

export type TransferRow = BankTransfer & {
  onDelete?: () => void
  deleting?: boolean
}

export const columns: ColumnDef<TransferRow>[] = [
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
    id: "route",
    header: "Маршрут",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        <TruncatedText className="max-w-[140px] inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {row.original.from_recipient_name}
        </TruncatedText>
        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
        <TruncatedText className="max-w-[140px] inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {row.original.to_recipient_name}
        </TruncatedText>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm font-medium whitespace-nowrap">
        {fmtNum(parseFloat(row.original.amount))} <span className="text-xs text-muted-foreground font-medium">₽</span>
      </span>
    ),
    sortingFn: (a, b) => parseFloat(a.original.amount) - parseFloat(b.original.amount),
  },
  {
    accessorKey: "note",
    header: "Примечание",
    cell: ({ row }) => (
      row.original.note
        ? <span className="text-sm text-muted-foreground">{row.original.note}</span>
        : <EmptyCell />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const r = row.original
      if (r.deleting) return <div className="flex justify-center"><Spinner className="size-4 text-muted-foreground" /></div>
      if (!r.onDelete) return null
      return (
        <ActionBtn
          className="border-transparent bg-transparent text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          onClick={r.onDelete}
          tooltip="Удалить"
        >
          <Trash2 className="size-3.5" />
        </ActionBtn>
      )
    },
  },
]
