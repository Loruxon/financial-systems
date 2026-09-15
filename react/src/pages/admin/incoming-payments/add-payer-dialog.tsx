import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ChevronsUpDown, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { cn, showFieldError } from "@/lib/utils"
import { api, type AdminPayer, type Organization } from "@/lib/api"

const schema = z.object({
  organizationId: z.number().nullable().refine((v) => v !== null, "Выберите организацию"),
  name: z.string().min(1, "Введите название"),
  inn: z.string().min(1, "Введите ИНН"),
})

// zodResolver инферит organizationId как number | null (refine не сужает тип) —
// явно фиксируем то же самое здесь, как и с counterpartyId в форме заявки.
type FormValues = Omit<z.infer<typeof schema>, "organizationId"> & { organizationId: number | null }

const triggerClass = (invalid?: boolean) => cn(
  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:bg-input/30",
  invalid && "border-destructive ring-3 ring-destructive/20"
)

interface AddPayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (payer: AdminPayer) => void
}

export function AddPayerDialog({ open, onOpenChange, onAdd }: AddPayerDialogProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgOpen, setOrgOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { organizationId: null, name: "", inn: "" },
  })

  useEffect(() => {
    if (open) api.getAdminOrganizations().then(setOrganizations).catch(() => {})
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
      setServerError(null)
    }
    onOpenChange(next)
  }

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      const payer = await api.createAdminPayer({
        name: data.name,
        inn: data.inn,
        organization_id: data.organizationId!,
      })
      onAdd(payer)
      handleOpenChange(false)
    } catch {
      setServerError("Не удалось добавить плательщика")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" />
            Добавить плательщика
          </DialogTitle>
          <DialogDescription>Появится в списке для выбора в поступлениях.</DialogDescription>
        </DialogHeader>

        <form id="add-payer-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="organizationId"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                const selected = organizations.find((o) => o.id === field.value) ?? null
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel error={invalid ? fieldState.error?.message : undefined}>Организация</FieldLabel>
                    <Popover open={orgOpen} onOpenChange={setOrgOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className={triggerClass(invalid)}>
                          <span className={selected ? "" : "text-foreground-secondary"}>
                            {selected?.name ?? "Выберите организацию"}
                          </span>
                          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Поиск по организации..." />
                          <CommandList>
                            <CommandEmpty>Не найдено</CommandEmpty>
                            <CommandGroup>
                              {organizations.map((o) => (
                                <CommandItem
                                  key={o.id}
                                  value={o.name}
                                  data-checked={field.value === o.id}
                                  onSelect={() => {
                                    form.setValue("organizationId", o.id, { shouldValidate: true, shouldTouch: true })
                                    setOrgOpen(false)
                                  }}
                                >
                                  {o.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>
                )
              }}
            />

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="payer-new-name" error={invalid ? fieldState.error?.message : undefined}>Название</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="payer-new-name"
                      placeholder="ООО Ромашка"
                      aria-invalid={invalid}
                    />
                  </Field>
                )
              }}
            />

            <Controller
              name="inn"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="payer-new-inn" error={invalid ? fieldState.error?.message : undefined}>ИНН</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="payer-new-inn"
                      placeholder="7700000000"
                      aria-invalid={invalid}
                    />
                  </Field>
                )
              }}
            />
            {serverError && <p className="text-xs text-destructive">{serverError}</p>}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" form="add-payer-form" size="lg" disabled={!form.formState.isValid}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
