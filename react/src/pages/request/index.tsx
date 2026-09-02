import { useEffect, useRef, useState } from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { Link, useLocation, useNavigate } from "react-router"
import { Spinner } from "@/components/ui/spinner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { toast } from "sonner"
import { columns } from "./columns"
import { DataTable } from "@/components/data-table"
import { api, type RequestListItem, type RequestStatus } from "@/lib/api"
import { CounterpartyFilter, CurrencyFilter, StatusFilter } from "@/pages/admin/requests/filters"

export default function RequestPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const consumedFilterRef = useRef(false)

  useEffect(() => {
    api.getRequests()
      .then(setRequests)
      .catch(() => toast.error("Не удалось загрузить заявки"))
      .finally(() => setLoading(false))
  }, [])

  // Фильтр, пришедший из уведомлений (state.filter), применяем один раз —
  // и сразу же вычищаем его из history.state. Иначе он переживает
  // обновление страницы и возвращается даже после того, как пользователь
  // сам снял фильтр крестиком.
  useEffect(() => {
    if (consumedFilterRef.current) return
    const incomingFilter = (location.state as { filter?: RequestStatus } | null)?.filter
    if (incomingFilter) {
      consumedFilterRef.current = true
      setColumnFilters([{ id: "status", value: [incomingFilter] }])
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  const statusFilter = (columnFilters.find((f) => f.id === "status")?.value as RequestStatus[]) ?? []
  const counterpartyFilter = (columnFilters.find((f) => f.id === "counterparty_name")?.value as string[]) ?? []
  const currencyFilter = (columnFilters.find((f) => f.id === "amount")?.value as string[]) ?? []

  const handleStatusChange = (statuses: RequestStatus[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "status")
      return statuses.length > 0 ? [...base, { id: "status", value: statuses }] : base
    })
  }

  const handleCounterpartyChange = (counterparties: string[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "counterparty_name")
      return counterparties.length > 0 ? [...base, { id: "counterparty_name", value: counterparties }] : base
    })
  }

  const handleCurrencyChange = (currencies: string[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "amount")
      return currencies.length > 0 ? [...base, { id: "amount", value: currencies }] : base
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Список заявок"
          description="История и статусы ваших заявок"
          action={
            <Button asChild size="lg">
              <Link to="/request/add"><Plus data-icon="inline-start" /> Добавить заявку</Link>
            </Button>
          }
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <StatusFilter value={statusFilter} onChange={handleStatusChange} />
              <CounterpartyFilter data={requests} value={counterpartyFilter} onChange={handleCounterpartyChange} />
              <CurrencyFilter value={currencyFilter} onChange={handleCurrencyChange} />
            </div>
            <DataTable
              columns={columns}
              data={requests}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              getRowUrl={(row) => `/request/${row.id}`}
              filterColumn="invoice"
              filterPlaceholder="Поиск по инвойсу..."
              defaultColumnVisibility={{ id: false }}
              columnLabels={{
                id: "ID",
                invoice: "Инвойс",
                created_at: "Дата создания",
                status: "Статус",
                counterparty_name: "Контрагент",
                bank_name: "Банк",
                prf_amount: "Сумма",
                amount: "Сумма",
                execution_costs: "Затраты",
                execution_balance: "Остаток",
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
