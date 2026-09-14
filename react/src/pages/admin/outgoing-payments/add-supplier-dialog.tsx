import { useState } from "react"
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
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Truck } from "lucide-react"
import { api, type Supplier } from "@/lib/api"
import { showFieldError } from "@/lib/utils"

const schema = z.object({
  name: z.string().min(1, "Введите название"),
})

type FormValues = z.infer<typeof schema>

interface AddSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (supplier: Supplier) => void
}

export function AddSupplierDialog({ open, onOpenChange, onAdd }: AddSupplierDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: "" },
  })

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
      const supplier = await api.createSupplier({ name: data.name })
      onAdd(supplier)
      handleOpenChange(false)
    } catch {
      setServerError("Не удалось добавить — возможно, такой поставщик уже есть")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-4 text-muted-foreground" />
            Добавить поставщика
          </DialogTitle>
          <DialogDescription>Появится в списке для выбора в других платежах.</DialogDescription>
        </DialogHeader>

        <form id="add-supplier-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => {
                const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor="supplier-new-name" error={invalid ? fieldState.error?.message : undefined}>Наименование</FieldLabel>
                    <Input size="lg"
                      {...field}
                      id="supplier-new-name"
                      placeholder="ООО «Поставщик»"
                      aria-invalid={invalid}
                      autoFocus
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
          <Button type="submit" form="add-supplier-form" size="lg" disabled={!form.formState.isValid}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
