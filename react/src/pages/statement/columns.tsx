import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { cn, fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"
import { EmptyCell } from "@/components/empty-cell"

export type Transaction = {
  id: number
  date: string
  type: "credit" | "debit"
  payer_name: string | null
  recipient_name: string | null
  // У поступления может быть несколько заявок (разбито на части), у списания — ровно одна.
  requests: { id: number; invoice: string; counterparty_name: string | null }[]
  amount: number
}


export const columns: ColumnDef<Transaction>[] = [
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
    filterFn: (row, _columnId, filterValue: { from?: Date; to?: Date }) => {
      if (!filterValue?.from && !filterValue?.to) return true
      const date = new Date(row.original.date)
      if (filterValue.from && date < filterValue.from) return false
      if (filterValue.to) {
        const end = new Date(filterValue.to)
        end.setHours(23, 59, 59, 999)
        if (date > end) return false
      }
      return true
    },
  },
  {
    accessorKey: "type",
    header: "Тип",
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return filterValue.includes(row.original.type)
    },
    cell: ({ row }) => {
      const isCredit = row.original.type === "credit"
      return (
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          isCredit
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive"
        )}>
          {isCredit
            ? <ArrowDownLeft className="size-3 shrink-0" />
            : <ArrowUpRight className="size-3 shrink-0" />}
          {isCredit ? "Поступление" : "Списание"}
        </span>
      )
    },
  },
  {
    id: "direction",
    header: "Направление платежа",
    // Плательщик/получатель у списания оба пустые (это закрытие заявки, а не
    // перевод между счетами) — поэтому объединяем в одну колонку с EmptyCell,
    // не пытаясь показывать "— → —".
    cell: ({ row }) => {
      const { payer_name, recipient_name } = row.original
      if (!payer_name && !recipient_name) return <EmptyCell />
      return (
        <TruncatedText className="max-w-[360px] text-sm text-foreground/80">
          {`${payer_name ?? "—"} → ${recipient_name ?? "—"}`}
        </TruncatedText>
      )
    },
    footer: () => <span className="text-muted-foreground text-xs">Итог</span>,
  },
  {
    id: "requests",
    header: "Заявки",
    cell: ({ row }) => {
      const items = row.original.requests
      if (!items.length) return <EmptyCell />
      return (
        <div className="flex flex-col gap-0.5">
          {items.map((r) => (
            <Link
              key={r.id}
              to={`/request/${r.id}`}
              className="text-sm text-sky-600 dark:text-sky-400 underline underline-offset-2 whitespace-nowrap"
            >
              {r.invoice}{r.counterparty_name ? ` · ${r.counterparty_name}` : ""}
            </Link>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
    cell: ({ row }) => {
      const isCredit = row.original.type === "credit"
      return (
        <span className={cn(
          "tabular-nums text-sm font-medium whitespace-nowrap",
          isCredit ? "text-success" : "text-destructive"
        )}>
          {isCredit ? "+" : "−"}{" "}{fmtNum(Math.abs(row.original.amount))} <span className="text-xs text-muted-foreground font-medium">₽</span>
        </span>
      )
    },
    sortingFn: "basic",
    footer: ({ table }) => {
      const rows = table.getFilteredRowModel().rows
      const net = rows.reduce((sum, row) => {
        const t = row.original as Transaction
        return sum + (t.type === "credit" ? t.amount : -t.amount)
      }, 0)
      return (
        <span className={cn(
          "tabular-nums text-base font-semibold whitespace-nowrap",
          net >= 0 ? "text-success" : "text-destructive"
        )}>
          {net >= 0 ? "+" : "−"}{" "}{fmtNum(Math.abs(net))} <span className="text-xs text-muted-foreground font-medium">₽</span>
        </span>
      )
    },
  },
]
