import { useEffect, useState } from "react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { ru } from "react-day-picker/locale"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FilterButton } from "@/components/filter-button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type { DateRange }

// ─── Range filter button (for filter bars) ───────────────────────────────────

interface DateRangeFilterProps {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
  placeholder?: string
}

const today = () => new Date()

const PRESETS = [
  { label: "Сегодня",   getDates: () => ({ from: startOfDay(today()), to: endOfDay(today()) }) },
  { label: "Вчера",     getDates: () => ({ from: startOfDay(subDays(today(), 1)), to: endOfDay(subDays(today(), 1)) }) },
  { label: "3 дня",     getDates: () => ({ from: startOfDay(subDays(today(), 2)), to: endOfDay(today()) }) },
  { label: "7 дней",    getDates: () => ({ from: startOfDay(subDays(today(), 6)), to: endOfDay(today()) }) },
  { label: "30 дней",   getDates: () => ({ from: startOfDay(subDays(today(), 29)), to: endOfDay(today()) }) },
]

export function DateRangeFilter({ value, onChange, placeholder = "Дата создания" }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(value)
  const [hoverDate, setHoverDate] = useState<Date | undefined>()

  useEffect(() => {
    if (open) setDraft(value)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Пока выбрана только первая граница диапазона — подсвечиваем "призрачный"
  // предполагаемый диапазон под курсором, чтобы было видно результат до клика.
  const previewRange = draft?.from && !draft?.to && hoverDate
    ? hoverDate < draft.from
      ? { from: hoverDate, to: draft.from }
      : { from: draft.from, to: hoverDate }
    : undefined

  const selectedLabel = value?.from
    ? value.to && value.from.toDateString() !== value.to.toDateString()
      ? `${format(value.from, "dd.MM.yyyy")} – ${format(value.to, "dd.MM.yyyy")}`
      : format(value.from, "dd.MM.yyyy")
    : undefined

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const range = preset.getDates()
    onChange(range)
    setOpen(false)
  }

  const apply = () => {
    onChange(draft)
    setOpen(false)
  }

  const reset = () => {
    setDraft(undefined)
    onChange(undefined)
    setOpen(false)
  }

  return (
    <FilterButton
      icon={CalendarIcon}
      label={placeholder}
      selectedLabel={selectedLabel}
      onClear={() => onChange(undefined)}
      open={open}
      onOpenChange={setOpen}
      contentClassName="w-auto"
    >
      <div className="flex">
        <div className="flex flex-col gap-1 border-r p-2 w-[130px]">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="ghost"
              size="sm"
              className="justify-start text-sm font-normal"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col">
          <Calendar
            mode="range"
            selected={draft}
            defaultMonth={draft?.from ?? subDays(today(), 30)}
            locale={ru}
            captionLayout="dropdown"
            numberOfMonths={2}
            onSelect={setDraft}
            onDayMouseEnter={setHoverDate}
            onDayMouseLeave={() => setHoverDate(undefined)}
            modifiers={previewRange ? { hoverRange: previewRange } : undefined}
          />
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              Сбросить
            </Button>
            <Button size="sm" disabled={!draft?.from} onClick={apply}>
              Применить
            </Button>
          </div>
        </div>
      </div>
    </FilterButton>
  )
}

// ─── Single date picker (form input) ─────────────────────────────────────────

function parseDMY(s: string): Date | undefined {
  if (!s || !/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return undefined
  const [d, m, y] = s.split(".")
  const date = new Date(+y, +m - 1, +d)
  return isNaN(date.getTime()) ? undefined : date
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Выберите дату", className, disabled = false }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDMY(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-empty={!value}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start rounded-lg border-input bg-white px-3 text-sm font-normal text-foreground hover:bg-white focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 data-[empty=true]:text-foreground-secondary dark:bg-input/20 dark:hover:bg-input/20",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
          {selected ? (
            <>
              {format(selected, "dd.MM.yyyy")}
              <span className="ml-1.5 text-muted-foreground font-normal">
                {["вс","пн","вт","ср","чт","пт","сб"][selected.getDay()]}
              </span>
            </>
          ) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          locale={ru}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date ? format(date, "dd.MM.yyyy") : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
