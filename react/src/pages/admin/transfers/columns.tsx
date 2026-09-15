import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRight, Link2, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { ActionBtn } from "@/components/ui/action-btn"
import { EmptyCell } from "@/components/empty-cell"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { GenericStatusBadge, type StatusCfg } from "@/components/status-badge"
import type { BankTransfer, BankTransferStatus } from "@/lib/api"
import { fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"

export type TransferRow = BankTransfer & {
  onDelete?: () => void
  deleting?: boolean
}

export const transferStatusConfig: Record<BankTransferStatus, StatusCfg> = {
  new:      { label: "Новая",     color: "bg-blue-500",    dot: "pulse", dotColor: "bg-blue-500",                            className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  executed: { label: "Исполнено", color: "bg-emerald-500", dot: "check", dotColor: "text-emerald-600 dark:text-emerald-400", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
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
    accessorKey: "status",
    header: "Статус",
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return filterValue.includes(row.original.status)
    },
    cell: ({ row }) => <GenericStatusBadge cfg={transferStatusConfig[row.original.status]} />,
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
    accessorKey: "payer_name",
    header: "Плательщик",
    cell: ({ row }) => (
      row.original.payer_name
        ? <TruncatedText className="max-w-[160px] text-sm">{row.original.payer_name}</TruncatedText>
        : <EmptyCell />
    ),
  },
  {
    id: "receipts",
    header: "Поступления",
    cell: ({ row }) => {
      const receipts = row.original.receipt_summaries
      if (!receipts.length) return <EmptyCell />
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground cursor-default">
              <Link2 className="size-3 text-muted-foreground" />
              {receipts.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-0.5">
              {receipts.map((r) => (
                <span key={r.id} className="tabular-nums">
                  {r.date.split("-").reverse().join(".")} · {fmtNum(parseFloat(r.amount))} ₽
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "note",
    header: "Примечание",
    cell: ({ row }) => (
      row.original.note
        ? <TruncatedText className="max-w-[200px] text-sm text-muted-foreground">{row.original.note}</TruncatedText>
        : <EmptyCell />
    ),
  },
  {
    id: "actions",
    // Строка целиком кликабельна (переход в детальную), поэтому клик по
    // кнопке удаления не должен всплывать и уводить со страницы.
    cell: ({ row }) => {
      const r = row.original
      if (r.deleting) return <div className="flex justify-center"><Spinner className="size-4 text-muted-foreground" /></div>
      if (!r.onDelete) return null
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionBtn
            className="border-transparent bg-transparent text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
            onClick={r.onDelete}
            tooltip="Удалить"
          >
            <Trash2 className="size-3.5" />
          </ActionBtn>
        </div>
      )
    },
  },
]
