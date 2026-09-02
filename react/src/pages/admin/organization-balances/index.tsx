import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Building2, Check } from "lucide-react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { FilterButton } from "@/components/filter-button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { api, type OrganizationBalance } from "@/lib/api"
import { columns } from "./columns"

// ─── Фильтр по организации ──────────────────────────────────────────────────

function OrgFilter({ data, value, onChange }: { data: OrganizationBalance[]; value: string[]; onChange: (value: string[]) => void }) {
  const orgs = useMemo(
    () => [...new Set(data.map((r) => r.organization_name))].sort((a, b) => a.localeCompare(b, "ru")),
    [data]
  )

  const toggle = (org: string) =>
    onChange(value.includes(org) ? value.filter((o) => o !== org) : [...value, org])

  return (
    <FilterButton
      icon={Building2}
      label="Организация"
      selectedLabel={value.length === 1 ? value[0] : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
    >
      <Command>
        <CommandInput placeholder="Поиск организации..." />
        <CommandList>
          <CommandEmpty>Не найдено</CommandEmpty>
          <CommandGroup>
            {orgs.map((org) => (
              <CommandItem key={org} value={org} onSelect={() => toggle(org)} className="gap-2">
                <div className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  value.includes(org) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                )}>
                  {value.includes(org) && <Check className="size-3" />}
                </div>
                <span className="truncate">{org}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizationBalancesPage() {
  const [rows, setRows] = useState<OrganizationBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    api.getAdminOrganizationBalances()
      .then(setRows)
      .catch(() => toast.error("Не удалось загрузить балансы организаций"))
      .finally(() => setLoading(false))
  }, [])

  const orgFilter = (columnFilters.find((f) => f.id === "organization_name")?.value as string[]) ?? []

  const handleOrgFilterChange = (orgs: string[]) => {
    setColumnFilters((prev) => {
      const base = prev.filter((f) => f.id !== "organization_name")
      return orgs.length > 0 ? [...base, { id: "organization_name", value: orgs }] : base
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Балансы организаций"
          description="Остатки по счетам и отрицательные балансы"
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            defaultColumnVisibility={{ organization_id: false }}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            toolbarLeft={<OrgFilter data={rows} value={orgFilter} onChange={handleOrgFilterChange} />}
            columnLabels={{
              organization_id: "ID",
              organization_name: "Организация",
              balance: "Баланс",
              received: "Зачислено",
              spent: "Списано",
              frozen: "Заморожено",
            }}
          />
        )}
      </div>
    </div>
  )
}
