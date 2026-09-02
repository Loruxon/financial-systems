import { useEffect, useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { CurrencyChips } from "@/components/currency-chips"
import { AccountCard } from "@/components/account-card"
import { AddRowButton } from "@/components/add-row-button"
import { Landmark, Plus } from "lucide-react"
import { api, type Bank } from "@/lib/api"
import { CURRENCIES } from "@/lib/constants"
import { cn, formatAccountNumber, showFieldError } from "@/lib/utils"

const SWIFT_FORMAT = /^[A-Za-z0-9]{8}$|^[A-Za-z0-9]{11}$/

const schema = z.object({
  name: z.string().min(1, "Введите название"),
  swift: z.string().min(1, "Введите SWIFT").regex(SWIFT_FORMAT, "SWIFT должен содержать 8 или 11 символов"),
  address: z.string().min(1, "Введите адрес"),
  mode: z.enum(["mono", "multi"]),
  monoAccounts: z.array(z.object({
    number: z.string(),
    currency: z.string(),
  })),
  multiAccount: z.string(),
  multiCurrencies: z.array(z.string()),
}).superRefine((data, ctx) => {
  if (data.mode === "mono") {
    data.monoAccounts.forEach((a, i) => {
      if (!a.number.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Введите номер счёта", path: ["monoAccounts", i, "number"] })
      }
    })
  } else {
    if (!data.multiAccount.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Введите номер счёта", path: ["multiAccount"] })
    }
    if (data.multiCurrencies.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Выберите хотя бы одну валюту", path: ["multiCurrencies"] })
    }
  }
})

type FormValues = z.infer<typeof schema>

function ModeOption({ value, title, description, techLabel }: { value: string; title: string; description: string; techLabel: string }) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left outline-none transition-colors",
        "hover:border-primary/40",
        "focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
      )}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{techLabel}</span>
    </RadioGroupPrimitive.Item>
  )
}

interface AddBankDialogProps {
  counterpartyId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAdd?: (bank: Bank) => void
}

export function AddBankDialog({
  counterpartyId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAdd,
}: AddBankDialogProps) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      swift: "",
      address: "",
      mode: "mono",
      monoAccounts: [{ number: "", currency: CURRENCIES[0] }],
      multiAccount: "",
      multiCurrencies: [],
    },
  })

  useEffect(() => {
    if (open) form.trigger()
  }, [open, form])

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "monoAccounts",
  })

  const mode = form.watch("mode")
  const multiCurrencies = form.watch("multiCurrencies")
  const multiCurrenciesInvalid = showFieldError(
    !!form.formState.errors.multiCurrencies,
    !!form.formState.touchedFields.multiCurrencies,
    form.formState.isSubmitted
  )

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset()
    if (!isControlled) setInternalOpen(next)
    controlledOnOpenChange?.(next)
  }

  const handleModeChange = (next: string) => {
    if (next === "mono" || next === "multi") {
      form.setValue("mode", next)
      form.clearErrors(["monoAccounts", "multiAccount", "multiCurrencies"])
    }
  }

  const addMonoAccount = () => {
    const usedCurrencies = fields.map((f) => f.currency)
    const nextCurrency = CURRENCIES.find((c) => !usedCurrencies.includes(c)) ?? CURRENCIES[0]
    append({ number: "", currency: nextCurrency })
  }

  const toggleMultiCurrency = (c: string) => {
    const current = form.getValues("multiCurrencies")
    form.setValue(
      "multiCurrencies",
      current.includes(c) ? current.filter((x) => x !== c) : [...current, c],
      { shouldValidate: true, shouldTouch: true }
    )
  }

  const onSubmit = async (data: FormValues) => {
    const bank = await api.createBank(counterpartyId, {
      name: data.name.trim(),
      swift_code: data.swift.trim(),
      address: data.address.trim(),
      bank_type: data.mode,
      active: true,
      accounts: data.mode === "mono"
        ? data.monoAccounts.map((a) => ({ account: a.number.trim(), currencies: [a.currency] }))
        : [{ account: data.multiAccount.trim(), currencies: data.multiCurrencies }],
    })
    onAdd?.(bank)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" type="button">
            <Plus data-icon="inline-start" /> Добавить банк
          </Button>
        </DialogTrigger>
      )}
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            Добавить банк
          </DialogTitle>
          <DialogDescription>Заполните реквизиты нового банка контрагента.</DialogDescription>
        </DialogHeader>

        <form id="add-bank-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 pb-2">
          <FieldGroup>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => {
                  const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor="bank-name" error={invalid ? fieldState.error?.message : undefined}>Название</FieldLabel>
                      <Input size="lg"
                        {...field}
                        id="bank-name"
                        placeholder="Deutsche Bank AG"
                        aria-invalid={invalid}
                      />
                    </Field>
                  )
                }}
              />

              <Controller
                name="swift"
                control={form.control}
                render={({ field, fieldState }) => {
                  const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor="bank-swift" error={invalid ? fieldState.error?.message : undefined}>SWIFT</FieldLabel>
                      <Input size="lg"
                        {...field}
                        id="bank-swift"
                        placeholder="напр. DEUTDEDBFRA"
                        className="font-mono"
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
                      <FieldLabel htmlFor="bank-address" error={invalid ? fieldState.error?.message : undefined}>Адрес</FieldLabel>
                      <Input size="lg"
                        {...field}
                        id="bank-address"
                        placeholder="Taunusanlage 12, Frankfurt"
                        aria-invalid={invalid}
                      />
                    </Field>
                  )
                }}
              />
            </FieldGroup>

            <div className="border-t border-border" />

            <RadioGroupPrimitive.Root value={mode} onValueChange={handleModeChange} className="grid grid-cols-2 gap-3">
              <ModeOption
                value="mono"
                title="Отдельный счёт на каждую валюту"
                description="Заведите один или несколько счетов, у каждого — своя валюта"
                techLabel="Моновалютный"
              />
              <ModeOption
                value="multi"
                title="Один счёт для нескольких валют"
                description="Один номер счёта принимает платежи в разных валютах"
                techLabel="Мультивалютный"
              />
            </RadioGroupPrimitive.Root>

            {mode === "mono" ? (
              <FieldSet>
                <FieldLegend variant="label">Счета</FieldLegend>
                <FieldGroup>
                  {fields.map((fieldItem, index) => {
                    const usedCurrencies = fields
                      .filter((_, i) => i !== index)
                      .map((f) => f.currency)
                    return (
                      <AccountCard key={fieldItem.id} onRemove={fields.length > 1 ? () => remove(index) : undefined}>
                        <Controller
                          name={`monoAccounts.${index}.number`}
                          control={form.control}
                          render={({ field, fieldState }) => {
                            const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                            return (
                              <Field data-invalid={invalid}>
                                <FieldLabel htmlFor={`mono-number-${index}`} error={invalid ? fieldState.error?.message : undefined}>Номер счёта</FieldLabel>
                                <Input size="lg"
                                  {...field}
                                  id={`mono-number-${index}`}
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
                            onToggle={(c) => update(index, { number: form.getValues(`monoAccounts.${index}.number`), currency: c })}
                            disabledCurrencies={usedCurrencies}
                          />
                        </Field>
                      </AccountCard>
                    )
                  })}
                </FieldGroup>
                {fields.length < CURRENCIES.length && (
                  <AddRowButton className="mt-2" onClick={addMonoAccount}>
                    Добавить счёт
                  </AddRowButton>
                )}
              </FieldSet>
            ) : (
              <FieldSet>
                <FieldLegend variant="label">Счёт</FieldLegend>
                <AccountCard>
                  <Controller
                    name="multiAccount"
                    control={form.control}
                    render={({ field, fieldState }) => {
                      const invalid = showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)
                      return (
                        <Field data-invalid={invalid}>
                          <FieldLabel htmlFor="bank-account-multi" error={invalid ? fieldState.error?.message : undefined}>Номер счёта</FieldLabel>
                          <Input size="lg"
                            {...field}
                            id="bank-account-multi"
                            onChange={(e) => field.onChange(formatAccountNumber(e.target.value))}
                            className="font-mono"
                            placeholder="DE89 3704 0044 0532 0130 00"
                            aria-invalid={invalid}
                          />
                        </Field>
                      )
                    }}
                  />
                  <Field data-invalid={multiCurrenciesInvalid}>
                    <FieldLabel error={multiCurrenciesInvalid ? form.formState.errors.multiCurrencies?.message : undefined}>Валюты</FieldLabel>
                    <CurrencyChips value={multiCurrencies} onToggle={toggleMultiCurrency} />
                  </Field>
                </AccountCard>
              </FieldSet>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" form="add-bank-form" size="lg" disabled={!form.formState.isValid}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
