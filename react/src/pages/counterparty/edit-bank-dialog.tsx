import { useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { CurrencyChips } from "@/components/currency-chips"
import { AccountCard } from "@/components/account-card"
import { AddRowButton } from "@/components/add-row-button"
import { Badge } from "@/components/ui/badge"
import { Landmark } from "lucide-react"
import { api, type Bank } from "@/lib/api"
import { CURRENCIES } from "@/lib/constants"
import { formatAccountNumber, showFieldError } from "@/lib/utils"

const schema = z.object({
  newAccounts: z.array(z.object({
    number: z.string().min(1, "Введите номер счёта"),
    currency: z.string(),
  })),
  newCurrencies: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

interface EditBankDialogProps {
  bank: Bank | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (bank: Bank) => void
}

export function EditBankDialog({ bank, open, onOpenChange, onSave }: EditBankDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { newAccounts: [], newCurrencies: [] },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "newAccounts",
  })

  const newCurrencies = form.watch("newCurrencies")

  useEffect(() => {
    if (open) {
      form.reset({ newAccounts: [], newCurrencies: [] })
      form.trigger()
    }
  }, [open, form])

  const existingCurrencies = bank?.accounts.map((a) => a.currencies[0]) ?? []
  const usedMonoCurrencies = [...existingCurrencies, ...fields.map((f) => f.currency)]
  const canAddAccount = usedMonoCurrencies.length < CURRENCIES.length

  const assignedCurrencies = [...(bank?.accounts[0]?.currencies ?? []), ...newCurrencies]

  const addNewAccount = () => {
    const next = CURRENCIES.find((c) => !usedMonoCurrencies.includes(c)) ?? CURRENCIES[0]
    append({ number: "", currency: next })
  }

  const toggleMultiCurrency = (c: string) => {
    if (bank?.accounts[0]?.currencies.includes(c)) return
    const current = form.getValues("newCurrencies")
    form.setValue(
      "newCurrencies",
      current.includes(c) ? current.filter((x) => x !== c) : [...current, c]
    )
  }

  const onSubmit = async (data: FormValues) => {
    if (!bank) return

    const updatedAccounts = bank.bank_type === "mono"
      ? [
          ...bank.accounts,
          ...data.newAccounts.map((a) => ({ account: a.number.trim(), currencies: [a.currency] })),
        ]
      : [{
          account: bank.accounts[0].account,
          currencies: [...bank.accounts[0].currencies, ...data.newCurrencies],
        }]

    const updated = await api.updateBank(bank.id, { accounts: updatedAccounts })
    onSave(updated)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            Редактировать банк
            <Badge variant="secondary" className="font-normal">
              {bank?.bank_type === "mono" ? "Моновалютный" : "Мультивалютный"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {bank?.bank_type === "mono"
              ? "Вы можете добавить новый счёт."
              : "Вы можете добавить валюту к счёту."}
          </DialogDescription>
        </DialogHeader>

        <form id="edit-bank-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 pb-2">
          <FieldGroup>
            <FieldGroup>
              <Field data-disabled>
                <FieldLabel htmlFor="edit-bank-name">Название</FieldLabel>
                <Input size="lg" id="edit-bank-name" value={bank?.name ?? ""} disabled />
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="edit-bank-swift">SWIFT</FieldLabel>
                <Input size="lg" id="edit-bank-swift" value={bank?.swift_code ?? ""} className="font-mono" disabled />
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="edit-bank-address">Адрес</FieldLabel>
                <Input size="lg" id="edit-bank-address" value={bank?.address ?? ""} disabled />
              </Field>
            </FieldGroup>

            <div className="border-t border-border" />

            {bank?.bank_type === "mono" ? (
              <FieldSet>
                <FieldLegend variant="label">Счета</FieldLegend>
                <FieldGroup>
                  {bank.accounts.map((a) => (
                    <AccountCard key={a.account}>
                      <Field data-disabled>
                        <FieldLabel>Номер счёта</FieldLabel>
                        <Input size="lg"
                          value={formatAccountNumber(a.account)}
                          readOnly
                          tabIndex={-1}
                          className="cursor-default font-mono tabular-nums text-muted-foreground"
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Валюта</FieldLabel>
                        <div className="flex gap-1">
                          <Badge variant="secondary">{a.currencies[0]}</Badge>
                        </div>
                      </Field>
                    </AccountCard>
                  ))}

                  {fields.map((fieldItem, index) => {
                    const usedByOthers = [
                      ...existingCurrencies,
                      ...fields.filter((_, i) => i !== index).map((f) => f.currency),
                    ]
                    return (
                      <AccountCard key={fieldItem.id} onRemove={() => remove(index)}>
                        <Controller
                          name={`newAccounts.${index}.number`}
                          control={form.control}
                          render={({ field, fieldState }) => {
                            const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                            return (
                              <Field data-invalid={invalid}>
                                <FieldLabel htmlFor={`edit-mono-number-${index}`} error={invalid ? fieldState.error?.message : undefined}>Номер счёта</FieldLabel>
                                <Input size="lg"
                                  {...field}
                                  id={`edit-mono-number-${index}`}
                                  onChange={(e) => field.onChange(formatAccountNumber(e.target.value))}
                                  className="font-mono"
                                  placeholder="DE89 3704 0044 0532 0130 00"
                                  aria-invalid={invalid}
                                />
                              </Field>
                            )
                          }}
                        />
                        <Field>
                          <FieldLabel>Валюта</FieldLabel>
                          <CurrencyChips
                            value={[fieldItem.currency]}
                            onToggle={(c) => update(index, { number: form.getValues(`newAccounts.${index}.number`), currency: c })}
                            disabledCurrencies={usedByOthers}
                          />
                        </Field>
                      </AccountCard>
                    )
                  })}

                  {canAddAccount && (
                    <AddRowButton onClick={addNewAccount}>
                      Добавить счёт
                    </AddRowButton>
                  )}
                </FieldGroup>
              </FieldSet>
            ) : (
              <FieldSet>
                <FieldLegend variant="label">Счёт</FieldLegend>
                <AccountCard>
                  <Field data-disabled>
                    <FieldLabel>Номер счёта</FieldLabel>
                    <Input size="lg"
                      value={bank?.accounts[0]?.account ? formatAccountNumber(bank.accounts[0].account) : ""}
                      readOnly
                      tabIndex={-1}
                      className="cursor-default font-mono tabular-nums text-muted-foreground"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Валюты</FieldLabel>
                    <CurrencyChips
                      value={assignedCurrencies}
                      onToggle={toggleMultiCurrency}
                      disabledCurrencies={bank?.accounts[0]?.currencies ?? []}
                    />
                  </Field>
                </AccountCard>
              </FieldSet>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" form="edit-bank-form" size="lg" disabled={!form.formState.isValid}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
