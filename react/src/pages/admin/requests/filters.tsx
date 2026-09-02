import { useMemo } from "react"
import { Building2, Check, CircleDot, Coins, Handshake, UserRound } from "lucide-react"
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker"
import { FilterButton } from "@/components/filter-button"
import { Button } from "@/components/ui/button"
import { CURRENCIES } from "@/lib/constants"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { RequestListItem, RequestStatus, AdminUser } from "@/lib/api"
import { statusConfig } from "@/components/status-badge"

function FilterCheckbox({ checked }: { checked: boolean }) {
  return (
    <div className={cn(
      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
      checked
        ? "border-primary bg-primary text-primary-foreground"
        : "border-muted-foreground/30"
    )}>
      {checked && <Check className="size-3" />}
    </div>
  )
}

// ─── Фильтр по организации ──────────────────────────────────────────────────

interface OrgFilterProps {
  data: RequestListItem[]
  value: string[]
  onChange: (value: string[]) => void
}

function OrgFilter({ data, value, onChange }: OrgFilterProps) {
  const orgs = useMemo(
    () => [...new Set(data.map((r) => r.organization_name))].sort(),
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
              <CommandItem
                key={org}
                value={org}
                onSelect={() => toggle(org)}
                className="gap-2"
              >
                <FilterCheckbox checked={value.includes(org)} />
                <span className="truncate">{org}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

// ─── Фильтр по контрагенту ──────────────────────────────────────────────────

interface CounterpartyFilterProps {
  data: RequestListItem[]
  value: string[]
  onChange: (value: string[]) => void
}

export function CounterpartyFilter({ data, value, onChange }: CounterpartyFilterProps) {
  const counterparties = useMemo(
    () => [...new Set(data.map((r) => r.counterparty_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")),
    [data]
  )

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])

  return (
    <FilterButton
      icon={Handshake}
      label="Контрагент"
      selectedLabel={value.length === 1 ? value[0] : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
    >
      <Command>
        <CommandInput placeholder="Поиск контрагента..." />
        <CommandList>
          <CommandEmpty>Не найдено</CommandEmpty>
          <CommandGroup>
            {counterparties.map((name) => (
              <CommandItem
                key={name}
                value={name}
                onSelect={() => toggle(name)}
                className="gap-2"
              >
                <FilterCheckbox checked={value.includes(name)} />
                <span className="truncate">{name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

// ─── Фильтр по исполнителю ──────────────────────────────────────────────────

export const UNASSIGNED = "__unassigned__"

interface AdminFilterProps {
  data: RequestListItem[]
  value: string[]
  onChange: (value: string[]) => void
  currentUserName?: string | null
}

function AdminFilter({ data, value, onChange, currentUserName }: AdminFilterProps) {
  const adminNames = useMemo(() => {
    const names = new Set<string>()
    for (const r of data) {
      names.add(r.assigned_admin ? (r.assigned_admin as AdminUser).name || (r.assigned_admin as AdminUser).email : UNASSIGNED)
    }
    return [...names].sort((a, b) =>
      a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b, "ru")
    )
  }, [data])

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])

  const displayName = (name: string) => name === UNASSIGNED ? "Не назначен" : name

  const isMyRequests = !!currentUserName && value.length === 1 && value[0] === currentUserName

  const selectedLabel =
    isMyRequests ? "Мои заявки" :
    value.length === 1 ? displayName(value[0]) :
    undefined

  return (
    <FilterButton
      icon={UserRound}
      label="Исполнитель"
      selectedLabel={selectedLabel}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
      contentClassName="w-56"
    >
      <Command>
        <CommandInput placeholder="Поиск исполнителя..." />
        <CommandList>
          <CommandEmpty>Не найдено</CommandEmpty>
          {currentUserName && (
            <>
              <CommandGroup>
                <CommandItem
                  value="мои заявки"
                  onSelect={() => {
                    if (isMyRequests) onChange([])
                    else onChange([currentUserName])
                  }}
                  className="gap-2"
                >
                  <FilterCheckbox checked={isMyRequests} />
                  <span className="font-medium">Мои заявки</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup>
            {adminNames.map((name) => (
              <CommandItem
                key={name}
                value={displayName(name)}
                onSelect={() => toggle(name)}
                className="gap-2"
              >
                <FilterCheckbox checked={value.includes(name)} />
                {name === UNASSIGNED
                  ? <span className="text-muted-foreground">Не назначен</span>
                  : <span>{name}</span>
                }
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

// ─── Фильтр по статусу ──────────────────────────────────────────────────────

const ALL_STATUSES = Object.keys(statusConfig) as RequestStatus[]

interface StatusFilterProps {
  value: RequestStatus[]
  onChange: (value: RequestStatus[]) => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const toggle = (s: RequestStatus) =>
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])

  return (
    <FilterButton
      icon={CircleDot}
      label="Статус"
      selectedLabel={value.length === 1 ? statusConfig[value[0]].label : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
      contentClassName="w-56"
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {ALL_STATUSES.map((s) => {
              const cfg = statusConfig[s]
              return (
                <CommandItem
                  key={s}
                  value={cfg.label}
                  onSelect={() => toggle(s)}
                  className="gap-2"
                >
                  <FilterCheckbox checked={value.includes(s)} />
                  <span className={cn("size-2 rounded-full shrink-0", cfg.color)} />
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

// ─── Фильтр по валюте (рубль не участвует — заявки всегда в валюте) ────────

interface CurrencyFilterProps {
  value: string[]
  onChange: (value: string[]) => void
}

export function CurrencyFilter({ value, onChange }: CurrencyFilterProps) {
  const toggle = (c: string) =>
    onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])

  return (
    <FilterButton
      icon={Coins}
      label="Валюта"
      selectedLabel={value.length === 1 ? value[0] : undefined}
      count={value.length > 1 ? value.length : undefined}
      onClear={() => onChange([])}
      contentClassName="w-40"
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {CURRENCIES.map((c) => (
              <CommandItem
                key={c}
                value={c}
                onSelect={() => toggle(c)}
                className="gap-2"
              >
                <FilterCheckbox checked={value.includes(c)} />
                <span>{c}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterButton>
  )
}

// ─── Экспорты ───────────────────────────────────────────────────────────────

export interface AdminFiltersState {
  orgs: string[]
  statuses: RequestStatus[]
  adminNames: string[]
  counterparties: string[]
  currencies: string[]
  dateRange?: DateRange
}

export const initialAdminFilters: AdminFiltersState = {
  orgs: [],
  statuses: [],
  adminNames: [],
  counterparties: [],
  currencies: [],
  dateRange: undefined,
}

interface AdminRequestsFiltersProps {
  data: RequestListItem[]
  filters: AdminFiltersState
  onChange: (filters: AdminFiltersState) => void
  currentUserName?: string | null
}

export function AdminRequestsFilters({ data, filters, onChange, currentUserName }: AdminRequestsFiltersProps) {
  const hasActive = filters.orgs.length > 0 || filters.statuses.length > 0 || filters.adminNames.length > 0 || filters.counterparties.length > 0 || filters.currencies.length > 0 || !!filters.dateRange?.from

  const dataForCounterparty = useMemo(
    () => filters.orgs.length > 0 ? data.filter((r) => filters.orgs.includes(r.organization_name)) : data,
    [data, filters.orgs]
  )

  const handleOrgsChange = (orgs: string[]) => {
    const filtered = orgs.length > 0 ? data.filter((r) => orgs.includes(r.organization_name)) : data
    const valid = new Set(filtered.map((r) => r.counterparty_name))
    const counterparties = filters.counterparties.filter((c) => valid.has(c))
    onChange({ ...filters, orgs, counterparties })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DateRangeFilter
        value={filters.dateRange}
        onChange={(dateRange) => onChange({ ...filters, dateRange })}
      />
      <OrgFilter
        data={data}
        value={filters.orgs}
        onChange={handleOrgsChange}
      />
      <CounterpartyFilter
        data={dataForCounterparty}
        value={filters.counterparties}
        onChange={(counterparties) => onChange({ ...filters, counterparties })}
      />
      <StatusFilter
        value={filters.statuses}
        onChange={(statuses) => onChange({ ...filters, statuses })}
      />
      <CurrencyFilter
        value={filters.currencies}
        onChange={(currencies) => onChange({ ...filters, currencies })}
      />
      <AdminFilter
        data={data}
        value={filters.adminNames}
        onChange={(adminNames) => onChange({ ...filters, adminNames })}
        currentUserName={currentUserName}
      />
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(initialAdminFilters)}
        >
          Сбросить всё
        </Button>
      )}
    </div>
  )
}
