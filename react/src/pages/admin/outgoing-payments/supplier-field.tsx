import { useEffect, useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { api, type Supplier } from "@/lib/api"
import { AddSupplierDialog } from "./add-supplier-dialog"

const triggerClass = (invalid?: boolean) => cn(
  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:bg-input/30",
  invalid && "border-destructive ring-3 ring-destructive/20"
)

interface SupplierFieldProps {
  value: string
  onChange: (name: string) => void
  disabled?: boolean
  invalid?: boolean
}

export function SupplierField({ value, onChange, disabled, invalid }: SupplierFieldProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Наименование поставщика</Label>
        {!disabled && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            Добавить
          </button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" disabled={disabled} className={triggerClass(invalid)}>
            <span className={value ? "" : "text-foreground-secondary"}>
              {value || "Выберите поставщика"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск по поставщику..." />
            <CommandList>
              <CommandEmpty>Не найдено</CommandEmpty>
              <CommandGroup>
                {suppliers.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    data-checked={value === s.name}
                    onSelect={() => {
                      onChange(s.name)
                      setOpen(false)
                    }}
                  >
                    {s.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <AddSupplierDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(s) => {
          setSuppliers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))
          onChange(s.name)
          setOpen(false)
        }}
      />
    </div>
  )
}
