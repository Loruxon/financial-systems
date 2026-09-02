import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Plus, Check, CircleDot, Landmark } from "lucide-react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FilterButton } from "@/components/filter-button"
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { StatusDot } from "@/components/status-badge"
import { api, type OutgoingPayment, type OutgoingPaymentStatus } from "@/lib/api"
import { columns, outgoingPaymentStatusConfig } from "./columns"

const ALL_STATUSES = Object.keys(outgoingPaymentStatusConfig) as OutgoingPaymentStatus[]

function StatusFilter({ value, onChange }: { value: OutgoingPaymentStatus[]; onChange: (value: OutgoingPaymentStatus[]) => void }) {
  const toggle = (s: OutgoingPaymentStatus) =>
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])

  return (
    <FilterButton
      icon={CircleDot}
      label="Статус"
      selectedLabel={value.length === 1 ? outgoingPaymentStatusConfig[value[0]].label : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
      contentClassName="w-56"
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {ALL_STATUSES.map((s) => {
              const cfg = outgoingPaymentStatusConfig[s]
              return (
                <CommandItem key={s} value={cfg.label} onSelect={() => toggle(s)} className="gap-2">
                  <div className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    value.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  )}>
                    {value.includes(s) && <Check className="size-3" />}
                  </div>
                  <StatusDot dot={cfg.dot} dotColor={cfg.dotColor} />
                  <span className="truncate">{cfg.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

function AccountFilter({ data, value, onChange }: {
  data: OutgoingPayment[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const accounts = useMemo(
    () => [...new Set(data.map((p) => p.account_name).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "ru")),
    [data]
  )

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((x) => x !== name) : [...value, name])

  return (
    <FilterButton
      icon={Landmark}
      label="Счёт списания"
      selectedLabel={value.length === 1 ? value[0] : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
      contentClassName="w-56"
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {accounts.map((name) => (
              <CommandItem key={name} value={name} onSelect={() => toggle(name)} className="gap-2">
                <div className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  value.includes(name) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                )}>
                  {value.includes(name) && <Check className="size-3" />}
                </div>
                <span className="truncate">{name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

export default function AdminOutgoingPaymentsPage() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<OutgoingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    api.getOutgoingPayments()
      .then(setPayments)
      .catch(() => toast.error("Не удалось загрузить исходящие платежи"))
      .finally(() => setLoading(false))
  }, [])

  const statusFilter = (columnFilters.find((f) => f.id === "status")?.value as OutgoingPaymentStatus[]) ?? []
  const accountFilter = (columnFilters.find((f) => f.id === "direction")?.value as string[]) ?? []
  const dateRange = (columnFilters.find((f) => f.id === "created_at")?.value as DateRange) ?? undefined

  const handleStatusFilterChange = (statuses: OutgoingPaymentStatus[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "status")
      return statuses.length > 0 ? [...base, { id: "status", value: statuses }] : base
    })
  }

  const handleAccountFilterChange = (accounts: string[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "direction")
      return accounts.length > 0 ? [...base, { id: "direction", value: accounts }] : base
    })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "created_at")
      return range?.from || range?.to ? [...base, { id: "created_at", value: range }] : base
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Исходящие платежи"
          description="Заявки на списание средств"
          action={
            <Button size="lg" onClick={() => navigate("/admin/outgoing-payments/add")}>
              <Plus data-icon="inline-start" />
              Добавить
            </Button>
          }
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            defaultColumnVisibility={{ id: false }}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            getRowUrl={(row) => `/admin/outgoing-payments/${row.id}`}
            toolbarLeft={
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} placeholder="Дата создания" />
                <AccountFilter data={payments} value={accountFilter} onChange={handleAccountFilterChange} />
                <StatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
              </div>
            }
            columnLabels={{
              id: "ID",
              created_at: "Дата создания",
              invoice: "Инвойс",
              status: "Статус",
              direction: "Направление платежа",
              request_invoices: "Заявки",
              amount: "Сумма",
            }}
          />
        )}
      </div>
    </div>
  )
}
