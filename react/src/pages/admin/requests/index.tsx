import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Spinner } from "@/components/ui/spinner"
import { DataTable } from "@/components/data-table"
import { api } from "@/lib/api"
import type { RequestListItem, RequestStatus, AdminUser } from "@/lib/api"
import type { DateRange } from "@/components/ui/date-picker"
import { downloadXlsx } from "@/lib/excel"
import { statusConfig } from "@/components/status-badge"
import { useAuth } from "@/lib/auth-context"
import { adminColumns } from "./columns"
import {
  AdminRequestsFilters,
  UNASSIGNED,
  type AdminFiltersState,
} from "./filters"

export default function AdminRequestsPage() {
  const { userName } = useAuth()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    if (state?.filter === "unassigned") {
      setColumnFilters([{ id: "assigned_admin", value: [UNASSIGNED] }])
      navigate(".", { replace: true, state: null })
    } else if (state?.filter) {
      setColumnFilters([{ id: "status", value: [state.filter] }])
      navigate(".", { replace: true, state: null })
    }
  }, [state, navigate])

  useEffect(() => {
    api.getAdminRequests()
      .then(setRequests)
      .catch(() => toast.error("Не удалось загрузить заявки"))
      .finally(() => setLoading(false))
  }, [])

  const filters: AdminFiltersState = {
    orgs: (columnFilters.find((f) => f.id === "organization_name")?.value as string[]) ?? [],
    statuses: (columnFilters.find((f) => f.id === "status")?.value as RequestStatus[]) ?? [],
    adminNames: (columnFilters.find((f) => f.id === "assigned_admin")?.value as string[]) ?? [],
    counterparties: (columnFilters.find((f) => f.id === "counterparty_name")?.value as string[]) ?? [],
    currencies: (columnFilters.find((f) => f.id === "amount")?.value as string[]) ?? [],
    dateRange: (columnFilters.find((f) => f.id === "created_at")?.value as DateRange) ?? undefined,
  }

  const handleFiltersChange = (next: AdminFiltersState) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => !["organization_name", "status", "assigned_admin", "counterparty_name", "amount", "created_at"].includes(f.id))
      const result = [...base]
      if (next.orgs.length > 0) result.push({ id: "organization_name", value: next.orgs })
      if (next.statuses.length > 0) result.push({ id: "status", value: next.statuses })
      if (next.adminNames.length > 0) result.push({ id: "assigned_admin", value: next.adminNames })
      if (next.counterparties.length > 0) result.push({ id: "counterparty_name", value: next.counterparties })
      if (next.currencies.length > 0) result.push({ id: "amount", value: next.currencies })
      if (next.dateRange?.from || next.dateRange?.to) result.push({ id: "created_at", value: next.dateRange })
      return result
    })
  }

  const handleExport = (rows: RequestListItem[]) => {
    const date = new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")
    downloadXlsx(rows, [
      { header: "ID",               value: r => r.id,                                                                                    width: 8  },
      { header: "Организация",      value: r => r.organization_name,                                                                     width: 28 },
      { header: "Инвойс",           value: r => r.invoice,                                                                               width: 22 },
      { header: "Дата создания",    value: r => new Date(r.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), width: 18 },
      { header: "Статус",           value: r => statusConfig[r.status].label,                                                            width: 20 },
      { header: "Контрагент",       value: r => r.counterparty_name,                                                                     width: 28 },
      { header: "Сумма",            value: r => parseFloat(r.amount),                                                                    width: 14 },
      { header: "Валюта",           value: r => r.currency,                                                                              width: 10 },
      { header: "Сумма, ₽",         value: r => r.prf_amount ? parseFloat(r.prf_amount) : "",                                           width: 18 },
      { header: "Исполнитель",      value: r => r.assigned_admin ? ((r.assigned_admin as AdminUser).name || (r.assigned_admin as AdminUser).email) : "Не назначен", width: 22 },
      { header: "Схема",            value: r => r.work_scheme_name ?? "",                                                                  width: 18 },
      { header: "Затраты",          value: r => r.execution_costs ? parseFloat(r.execution_costs) : "",                                  width: 14 },
      { header: "Остаток",          value: r => r.execution_balance ? parseFloat(r.execution_balance) : "",                              width: 14 },
      { header: "Прибыль",          value: r => r.execution_profit_sebes ? parseFloat(r.execution_profit_sebes) : "",                   width: 14 },
    ], `заявки_${date}.xlsx`)
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Управление заявками"
          description="Просмотр и изменение статусов всех заявок"
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <>
            <div className="mb-3">
              <AdminRequestsFilters
                data={requests}
                filters={filters}
                onChange={handleFiltersChange}
                currentUserName={userName}
              />
            </div>
            <DataTable
              columns={adminColumns}
              data={requests}
              onExport={handleExport}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              getRowUrl={(row) => `/admin/requests/${row.id}`}
              filterColumn="invoice"
              filterPlaceholder="Поиск по инвойсу..."
              defaultColumnVisibility={{ id: false, execution_costs: false, execution_balance: false }}
              columnLabels={{
                id: "ID",
                organization_name: "Организация",
                invoice: "Инвойс",
                created_at: "Дата создания",
                status: "Статус",
                prf_amount: "Сумма, ₽",
                counterparty_name: "Контрагент",
                amount: "Сумма",
                execution_costs: "Затраты",
                execution_balance: "Остаток",
                execution_profit_sebes: "Прибыль",
                assigned_admin: "Исполнитель",
                work_scheme_name: "Схема",
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
