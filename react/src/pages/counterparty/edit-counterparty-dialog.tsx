import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, Pencil } from "lucide-react"
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
import { api, type Counterparty } from "@/lib/api"
import { showFieldError } from "@/lib/utils"

const schema = z.object({
  address: z.string().min(1, "Введите адрес"),
})

type FormValues = z.infer<typeof schema>

interface EditCounterpartyDialogProps {
  counterparty: Counterparty | undefined
  onSave: (counterparty: Counterparty) => void
}

export function EditCounterpartyDialog({ counterparty, onSave }: EditCounterpartyDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { address: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ address: counterparty?.address ?? "" })
      form.trigger()
    }
  }, [open, counterparty, form])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  const onSubmit = async (data: FormValues) => {
    if (!counterparty) return
    const updated = await api.updateCounterparty(counterparty.id, { address: data.address })
    onSave(updated)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" type="button">
          <Pencil data-icon="inline-start" /> Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            Редактировать контрагента
          </DialogTitle>
          <DialogDescription>
            Название изменить нельзя. Вы можете обновить адрес контрагента.
          </DialogDescription>
        </DialogHeader>

        <form id="edit-counterparty-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-disabled>
              <FieldLabel htmlFor="cp-name">Название</FieldLabel>
              <Input size="lg" id="cp-name" value={counterparty?.name ?? ""} disabled />
            </Field>

            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="cp-address" error={invalid ? fieldState.error?.message : undefined}>Адрес</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="cp-address"
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
          <Button type="submit" form="edit-counterparty-form" size="lg" disabled={!form.formState.isValid}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
