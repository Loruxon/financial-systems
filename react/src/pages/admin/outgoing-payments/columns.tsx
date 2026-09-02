import { Link } from "react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { ChevronDown, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fmtNum } from "@/lib/utils"
import { SortHeader } from "@/components/sort-header"
import { EmptyCell } from "@/components/empty-cell"
import { TruncatedText } from "@/components/truncated-text"
import { GenericStatusBadge, type StatusCfg } from "@/components/status-badge"
import type { OutgoingPayment, OutgoingPaymentStatus } from "@/lib/api"

export const outgoingPaymentStatusConfig: Record<OutgoingPaymentStatus, StatusCfg> = {
  new:         { label: "Новый",         color: "bg-blue-500",    dot: "pulse",  dotColor: "bg-blue-500",                            className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  in_work:     { label: "В работе",      color: "bg-violet-500",  dot: "static", dotColor: "bg-violet-500",                          className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  in_progress: { label: "На исполнении", color: "bg-amber-500",   dot: "static", dotColor: "bg-amber-500",                           className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  executed:    { label: "Исполнен",      color: "bg-emerald-500", dot: "check",  dotColor: "text-emerald-600 dark:text-emerald-400", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function pluralRequests(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "заявка"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки"
  return "заявок"
}

export const columns: ColumnDef<OutgoingPayment>[] = [
  { accessorKey: "id", header: "ID" },
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
        {formatDateTime(row.original.created_at)}
      </span>
    ),
    sortingFn: "basic",
  },
  {
    accessorKey: "invoice",
    header: "Инвойс",
    cell: ({ row }) => (
      row.original.invoice
        ? <span className="text-sm font-medium">{row.original.invoice}</span>
        : <EmptyCell />
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return filterValue.includes(row.original.status)
    },
    cell: ({ row }) => <GenericStatusBadge cfg={outgoingPaymentStatusConfig[row.original.status]} />,
  },
  {
    id: "direction",
    header: "Направление платежа",
    // Своей колонки под счёт списания в таблице больше нет — он показывается
    // тут же, в направлении, поэтому фильтр по счёту висит на этой колонке.
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true
      return !!row.original.account_name && filterValue.includes(row.original.account_name)
    },
    cell: ({ row }) => {
      const { account_name, supplier_name } = row.original
      if (!account_name && !supplier_name) return <EmptyCell />
      return (
        <TruncatedText className="max-w-[320px] text-sm">
          {`${account_name || "—"} → ${supplier_name || "—"}`}
        </TruncatedText>
      )
    },
  },
  {
    id: "request_invoices",
    header: "Заявки",
    // Только отображение: привязка/отвязка заявок — действие детальной
    // страницы платежа, в таблице их не редактируют.
    cell: ({ row }) => {
      const items = row.original.request_invoices
      if (!items.length) return <EmptyCell />

      // Строка целиком кликабельна (переход в детальную) — без stopPropagation
      // клик по триггеру всплывал бы до <tr> и уводил на заявку вместо
      // открытия попапа.
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 className="size-3.5" />
              {items.length} {pluralRequests(items.length)}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {items.map(({ id, invoice }) => (
                <Link
                  key={id}
                  to={`/admin/requests/${id}`}
                  className="rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {invoice}
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    },
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
    cell: ({ row }) => (
      row.original.amount
        ? <span className="tabular-nums text-sm font-medium whitespace-nowrap">{fmtNum(row.original.amount)} <span className="text-xs text-muted-foreground font-medium">₽</span></span>
        : <EmptyCell />
    ),
    sortingFn: (a, b) => parseFloat(a.original.amount ?? "0") - parseFloat(b.original.amount ?? "0"),
  },
]
