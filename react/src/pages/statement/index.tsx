import { useEffect, useState, type ReactNode } from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { ArrowDownLeft, ArrowUpRight, Lock, TrendingDown, Undo2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker"
import { ToggleFilterGroup } from "@/components/toggle-filter-group"
import { StatCard } from "@/components/stat-card"
import { fmtNum } from "@/lib/utils"
import { downloadXlsx } from "@/lib/excel"
import { api, type Balance } from "@/lib/api"
import { columns, type Transaction } from "./columns"
import { RefundDialog } from "./refund-dialog"
import { toast } from "sonner"

const TYPE_OPTIONS = [
  { value: "credit", label: "Поступление", icon: ArrowDownLeft },
  { value: "debit",  label: "Списание",    icon: ArrowUpRight  },
] as const


function BalanceCard({ balance, loading }: { balance: Balance | null; loading: boolean }) {
  const [refundOpen, setRefundOpen] = useState(false)
  const available = balance ? parseFloat(balance.available) : 0
  const isNegative = !!balance && available < 0

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-sm">
            <div className="h-1 w-full bg-muted animate-pulse" />
            <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-7 w-36 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const cards: Array<{
    variant: "success" | "destructive" | "warning"
    title: string
    subtitle: string
    headerAction?: ReactNode
    icon: typeof ArrowDownLeft
    amount: string
  }> = [
    {
      variant: "success",
      title: "Зачислено",
      subtitle: "Подтверждённые поступления",
      icon: ArrowDownLeft,
      amount: balance ? `${fmtNum(parseFloat(balance.received))} ₽` : "—",
    },
    {
      variant: "warning",
      title: "Заморожено",
      subtitle: "В активных заявках",
      icon: Lock,
      amount: balance ? `${fmtNum(parseFloat(balance.frozen))} ₽` : "—",
    },
    {
      // Списание — это расход (деньги ушли), поэтому destructive, а не
      // нейтральный серый — тот же язык, что и у сумм списаний в таблице ниже.
      variant: "destructive",
      title: "Списано",
      subtitle: "По закрытым заявкам",
      icon: ArrowUpRight,
      amount: balance ? `${fmtNum(parseFloat(balance.spent))} ₽` : "—",
    },
    {
      // Тот же признак isNegative (balance.available < 0), что и в сайдбаре —
      // цвет всегда следует за фактическим знаком баланса, а не зафиксирован.
      variant: isNegative ? "destructive" : "success",
      title: "Баланс",
      subtitle: isNegative ? "Превышение баланса" : "После заморозки",
      headerAction: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-primary"
              disabled={isNegative}
              onClick={() => setRefundOpen(true)}
            >
              <Undo2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Возврат средств</TooltipContent>
        </Tooltip>
      ),
      icon: isNegative ? TrendingDown : Wallet,
      amount: balance ? (isNegative ? "−" : "") + `${fmtNum(Math.abs(available))} ₽` : "—",
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
      <RefundDialog open={refundOpen} onOpenChange={setRefundOpen} availableBalance={available} />
    </>
  )
}

export default function StatementPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    api.getStatement().then((entries) =>
      setTransactions(entries.map((e) => ({
        id:                e.id,
        date:              e.date,
        type:              e.type,
        payer_name:        e.payer_name,
        recipient_name:    e.recipient_name,
        requests:          e.requests,
        amount:            parseFloat(e.amount),
      })))
    ).catch(() => { toast.error("Не удалось загрузить выписку") })

    api.getBalance()
      .then(setBalance)
      .catch(() => { toast.error("Не удалось загрузить баланс") })
      .finally(() => setBalanceLoading(false))
  }, [])

  const dateRange = (columnFilters.find((f) => f.id === "date")?.value as DateRange) ?? undefined
  const typeFilter = (columnFilters.find((f) => f.id === "type")?.value as string[]) ?? []

  const handleDateRange = (range: DateRange | undefined) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "date")
      return range?.from || range?.to ? [...base, { id: "date", value: range }] : base
    })
  }

  const handleTypeChange = (types: string[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "type")
      return types.length > 0 ? [...base, { id: "type", value: types }] : base
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Выписка"
          description="История зачислений и списаний по счёту"
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6 flex flex-col gap-6">
        <BalanceCard balance={balance} loading={balanceLoading} />
        <DataTable
          columns={columns}
          data={transactions}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          filterColumn="payer_name"
          filterPlaceholder="Поиск по плательщику..."
          defaultColumnVisibility={{ id: false }}
          toolbarLeft={
            <>
              <ToggleFilterGroup options={TYPE_OPTIONS} value={typeFilter} onChange={handleTypeChange} />
              <DateRangeFilter value={dateRange} onChange={handleDateRange} placeholder="Период" />
            </>
          }
          onExport={(rows) => {
            const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")
            downloadXlsx(rows, [
              { header: "Дата",                 value: r => r.date,                                     width: 14 },
              { header: "Тип",                  value: r => r.type === "credit" ? "Поступление" : "Списание", width: 16 },
              { header: "Направление платежа",  value: r => `${r.payer_name ?? ""} → ${r.recipient_name ?? ""}`.trim(), width: 40 },
              { header: "Заявки",               value: r => r.requests.map(x => x.invoice).join(", "), width: 30 },
              { header: "Сумма",                value: r => r.type === "credit" ? r.amount : -r.amount, width: 16 },
            ], `выписка_${date}.xlsx`)
          }}
          columnLabels={{
            id:        "ID",
            date:      "Дата",
            type:      "Тип",
            direction: "Направление платежа",
            requests:  "Заявки",
            amount:    "Сумма",
          }}
        />
      </div>
    </div>
  )
}
