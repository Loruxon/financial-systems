import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Building2, Plus } from "lucide-react"
import { api, type Counterparty } from "@/lib/api"
import { showFieldError } from "@/lib/utils"

const schema = z.object({
  name: z.string().min(1, "Введите название"),
  address: z.string().min(1, "Введите адрес"),
})

type FormValues = z.infer<typeof schema>

interface AddCounterpartyDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAdd?: (counterparty: Counterparty) => void
}

export function AddCounterpartyDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAdd,
}: AddCounterpartyDialogProps) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: "", address: "" },
  })

  useEffect(() => {
    if (open) form.trigger()
  }, [open, form])

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset()
    if (!isControlled) setInternalOpen(next)
    controlledOnOpenChange?.(next)
  }

  const onSubmit = async (data: FormValues) => {
    const counterparty = await api.createCounterparty({ name: data.name, address: data.address })
    onAdd?.(counterparty)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="lg">
            <Plus data-icon="inline-start" /> Добавить контрагента
          </Button>
        </DialogTrigger>
      )}
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            Добавить контрагента
          </DialogTitle>
          <DialogDescription>Заполните данные нового контрагента.</DialogDescription>
        </DialogHeader>

        <form id="add-counterparty-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="cp-new-name" error={invalid ? fieldState.error?.message : undefined}>Название</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="cp-new-name"
                      placeholder="ООО Ромашка"
                      aria-invalid={invalid}
                    />
                  </Field>
                )
              }}
            />

            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="cp-new-address" error={invalid ? fieldState.error?.message : undefined}>Адрес</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="cp-new-address"
                      placeholder="г. Москва, ул. Примерная, д. 1"
                      aria-invalid={invalid}
                    />
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" form="add-counterparty-form" size="lg" disabled={!form.formState.isValid}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
