import { Link } from "react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, ChevronDown, Link2, Plus, Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { OrgBadge } from "@/components/org-badge"
import { EmptyCell } from "@/components/empty-cell"
import { cn, fmtNum } from "@/lib/utils"
import type { Receipt } from "@/lib/api"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"

// Иконка-кнопка компактного действия: 32×32, тот же графитовый border/bg, что
// и везде на странице, но с приглушённым цветным акцентом (не сплошная
// заливка, а 10%-фон + цвет иконки/рамки), чтобы подтверждение/отмена были
// заметны на фоне остальных нейтральных ячеек строки.
const iconActionClass = (tone: "success" | "warning") => cn(
  "size-8",
  tone === "success"
    ? "border-success/30 bg-success/10 text-success hover:border-success/50 hover:bg-success/15"
    : "border-warning/30 bg-warning/10 text-warning hover:border-warning/50 hover:bg-warning/15"
)

function pluralRequests(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "заявка"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки"
  return "заявок"
}

function ReceiptStatusBadge({ status }: { status: Receipt["status"] }) {
  const isConfirmed = status === "confirmed"
  return (
    <span className="inline-flex items-center gap-[7px] text-sm whitespace-nowrap">
      <span className={cn("size-[7px] shrink-0 rounded-full", isConfirmed ? "bg-success" : "bg-muted-foreground")} />
      <span className={isConfirmed ? "text-foreground" : "text-foreground-secondary"}>
        {isConfirmed ? "Подтверждено" : "Новое"}
      </span>
    </span>
  )
}

export type ReceiptRow = Receipt & {
  onConfirm?: () => void
  onUnconfirm?: () => void
  onLinkRequest?: () => void
  onRemoveRequest?: (requestId: number) => void
  removingRequestId?: number | null
  busy?: boolean
}

export const columns: ColumnDef<ReceiptRow>[] = [
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
    accessorKey: "organization_name",
    header: "Организация",
    cell: ({ row }) => (
      row.original.organization_name
        ? <OrgBadge name={row.original.organization_name} />
        : <EmptyCell />
    ),
  },
  {
    id: "direction",
    header: "Направление платежа",
    cell: ({ row }) => {
      const { payer_name, recipient_name } = row.original
      if (!payer_name && !recipient_name) return <EmptyCell />
      return (
        <TruncatedText className="max-w-[320px] text-sm font-medium">
          {`${payer_name || "—"} → ${recipient_name || "—"}`}
        </TruncatedText>
      )
    },
  },
  {
    accessorKey: "amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма</SortHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm font-medium whitespace-nowrap">{fmtNum(parseFloat(row.original.amount))} <span className="text-xs text-muted-foreground font-medium">₽</span></span>
    ),
    sortingFn: (a, b) => parseFloat(a.original.amount) - parseFloat(b.original.amount),
  },
  {
    accessorKey: "net_amount",
    meta: { align: "right" },
    header: ({ column }) => <SortHeader column={column}>Сумма −0.2%</SortHeader>,
    cell: ({ row }) => {
      const v = row.original.net_amount
      if (!v) return <EmptyCell />
      return (
        <span className="inline-flex items-center gap-1 tabular-nums text-sm whitespace-nowrap text-success font-medium">
          {fmtNum(parseFloat(v))} <span className="text-xs font-normal opacity-60">₽</span>
          <span className="text-[10px] font-normal opacity-60 leading-none">−0.2%</span>
        </span>
      )
    },
    sortingFn: (a, b) => parseFloat(a.original.net_amount ?? '0') - parseFloat(b.original.net_amount ?? '0'),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => <ReceiptStatusBadge status={row.original.status} />,
  },
  {
    id: "request_invoices",
    header: "Заявки",
    // Строка в покое остаётся разгруженной вне зависимости от того, сколько
    // заявок привязано: список ссылок прячется под один компактный триггер,
    // а не разворачивается прямо в ячейке.
    cell: ({ row }) => {
      const r = row.original
      const items = r.request_invoices

      if (!items.length) {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 text-muted-foreground hover:text-foreground"
            onClick={r.onLinkRequest}
          >
            <Link2 data-icon="inline-start" />
            Привязать
          </Button>
        )
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link2 className="size-3.5" />
              {items.length} {pluralRequests(items.length)}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            <div className="flex flex-col">
              {items.map(({ id, invoice }) => (
                <div
                  key={id}
                  className="group flex items-center gap-1 rounded-md pl-2 pr-1 transition-colors hover:bg-muted"
                >
                  <Link
                    to={`/admin/requests/${id}`}
                    className="flex-1 min-w-0 truncate py-1.5 text-sm text-foreground"
                  >
                    {invoice}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    disabled={r.removingRequestId === id}
                    onClick={() => r.onRemoveRequest?.(id)}
                    aria-label={`Отвязать ${invoice}`}
                  >
                    {r.removingRequestId === id ? <Spinner className="size-3.5" /> : <X className="size-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-1 border-t pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={r.onLinkRequest}
              >
                <Plus data-icon="inline-start" />
                Привязать ещё
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )
    },
  },
  {
    id: "actions",
    header: "",
    // Единственное оставшееся действие в строке — подтвердить/отменить
    // подтверждение; "Привязать" переехало в колонку "Заявки" и здесь больше
    // не дублируется, поэтому меню "ещё" не нужно.
    cell: ({ row }) => {
      const r = row.original

      if (r.busy) {
        return (
          <div className="flex w-16 items-center justify-center">
            <Spinner className="size-4 text-muted-foreground" />
          </div>
        )
      }

      const isConfirmed = r.status === "confirmed"
      const label = isConfirmed ? "Отменить подтверждение" : "Подтвердить"

      return (
        <div className="flex w-16 items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={label}
                className={iconActionClass(isConfirmed ? "warning" : "success")}
                onClick={isConfirmed ? r.onUnconfirm : r.onConfirm}
              >
                {isConfirmed ? <Undo2 className="size-4" /> : <Check className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        </div>
      )
    },
  },
]
