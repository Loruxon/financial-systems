import { useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { type AdminPayer } from "@/lib/api"
import { AddPayerDialog } from "./add-payer-dialog"

// ─── Payer combobox ──────────────────────────────────────────────────────────
// Общий пикер плательщика — используется в поступлениях и переводах между счетами.

export function PayerSelect({ value, onChange, payers, compact, onPayerAdded }: {
  value: number | null
  onChange: (id: number | null) => void
  payers: AdminPayer[]
  compact?: boolean
  /** Если передан — внизу списка появляется "Добавить плательщика", а новый
   *  плательщик сразу выбирается и поднимается выше, в общий список payers. */
  onPayerAdded?: (payer: AdminPayer) => void
}) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const selected = payers.find((p) => p.id === value) ?? null
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-input bg-transparent transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
              "dark:bg-input/30",
              compact ? "h-7 px-2 text-xs" : "h-10 px-3 text-sm"
            )}
          >
            <span className={cn("truncate", selected ? "" : "text-foreground-secondary")}>
              {compact
                ? (selected?.name ?? "Выбрать…")
                : (selected ? `${selected.name} · ИНН ${selected.inn}` : "Выберите плательщика")}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[360px]" align="start">
          <Command>
            <CommandInput placeholder="Поиск по названию или ИНН..." />
            <CommandList>
              <CommandEmpty>Не найдено</CommandEmpty>
              <CommandGroup>
                {payers.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.inn} ${p.organization_name}`}
                    data-checked={value === p.id}
                    onSelect={() => { onChange(p.id); setOpen(false) }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">ИНН {p.inn} · {p.organization_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {onPayerAdded && (
              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setAddOpen(true) }}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="size-3.5" /> Добавить плательщика
                </button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      {onPayerAdded && (
        <AddPayerDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdd={(payer) => {
            onPayerAdded(payer)
            onChange(payer.id)
          }}
        />
      )}
    </>
  )
}
