import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useNavigate } from "react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Documents, type DocumentsHandle } from "@/components/files/documents"
import { CurrencyChips } from "@/components/currency-chips"
import { PageHeader } from "@/components/page-header"
import { InlineNotice } from "@/components/inline-notice"
import { BlockCard, BlockCardHeader, BlockCardContent } from "@/components/block-card"
import { DatePicker } from "@/components/ui/date-picker"
import { SideCard, SideCardHeader, SideCardContent, SideCardFooter } from "@/components/side-card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { api, type Counterparty, type Bank, type Recipient, type Payer, type Receipt } from "@/lib/api"
import { cn, toApiDate, toApiDecimal, fmtNum, formatAccountNumber, showFieldError } from "@/lib/utils"
import { FileText, Banknote, ChevronsUpDown, Plus, Paperclip, Files, Send, TriangleAlert, MessageSquareText, PencilLine, X } from "lucide-react"
import { BankItem } from "./form-parts"
import { AddBankDialog } from "../counterparty/add-bank-dialog"
import { EditBankDialog } from "../counterparty/edit-bank-dialog"
import { AddCounterpartyDialog } from "../counterparty/add-counterparty-dialog"

const requestSchema = z.object({
  invoice: z.string().min(1, "Введите инвойс"),
  amount: z.string().min(1, "Введите сумму"),
  currency: z.string().min(1, "Выберите валюту"),
  details: z.string().min(1, "Введите детали платежа"),
  counterpartyId: z.number().nullable().refine((v) => v !== null, "Выберите контрагента"),
  bankId: z.number().nullable().refine((v) => v !== null, "Выберите банк"),
  prfOrg: z.string().min(1, "Введите организацию"),
  prfInn: z.string().min(1, "Введите ИНН"),
  prfAmount: z.string().min(1, "Введите сумму в ₽"),
  prfDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, "Введите дату в формате ДД.ММ.ГГГГ"),
  prfRecipient: z.string().min(1, "Введите получателя"),
  fileCount: z.number().min(1, "Добавьте хотя бы один документ"),
})

// zodResolver инферит counterpartyId/bankId как number | null (refine не
// сужает тип) — явно фиксируем то же самое здесь, иначе рассинхрон с типом
// резолвера. Ненулевые они гарантированы только после прохождения валидации
// (см. `!` в buildPayload).
type RequestFormValues = Omit<z.infer<typeof requestSchema>, "counterpartyId" | "bankId"> & {
  counterpartyId: number | null
  bankId: number | null
}

interface FormValues {
  invoice?: string
  amount?: string
  currency?: string
  details?: string
  counterpartyId?: number | null
  bankId?: number | null
  prfOrg?: string
  prfInn?: string
  prfAmount?: string
  prfDate?: string
  prfRecipient?: string
  receiptId?: number | null
}

interface EditableBlocks {
  payment: boolean
  prf: boolean
  documents: boolean
  closingDocs: boolean
}

interface RequestFormProps {
  title: string
  description: string
  badge?: ReactNode
  back?: { label: string; href: string }
  defaultValues?: FormValues
  submitLabel?: string
  hideDraftButton?: boolean
  /** null — заявка ещё не сохранена на бэкенде (черновик создаётся лениво,
   *  по первому клику "Сохранить черновик" или "Отправить на проверку"). */
  requestId: number | null
  adminNote?: string
  /** Черновик или исправление — определяет, какие блоки вообще имеет смысл показывать
   *  (например, "Закрывающие документы" нет смысла показывать на черновике). */
  status: "draft" | "correction"
  /** Если задано — форма находится в режиме исправления, и редактировать
   *  можно только блоки, разрешённые администратором; остальные блокируются. */
  editableBlocks?: EditableBlocks
}

const triggerClass = (invalid: boolean) => cn(
  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:bg-input/30",
  invalid && "border-destructive ring-3 ring-destructive/20"
)


export function RequestForm({
  title,
  description,
  badge,
  back = { label: "К списку заявок", href: "/request" },
  defaultValues = {},
  submitLabel = "Отправить на проверку",
  hideDraftButton = false,
  requestId,
  adminNote,
  status,
  editableBlocks,
}: RequestFormProps) {
  const navigate = useNavigate()
  const docsRef = useRef<DocumentsHandle>(null)
  const closingDocsRef = useRef<DocumentsHandle>(null)

  const paymentLocked = !!editableBlocks && !editableBlocks.payment
  const prfLocked = !!editableBlocks && !editableBlocks.prf
  const documentsLocked = !!editableBlocks && !editableBlocks.documents
  // Закрывающие документы редактируются только в статусе "Исправление" (и то
  // только если админ явно разрешил) — на черновике их всегда можно лишь смотреть.
  const closingDocsLocked = !editableBlocks || !editableBlocks.closingDocs

  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [counterpartyDetail, setCounterpartyDetail] = useState<Counterparty | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [addCpOpen, setAddCpOpen] = useState(false)
  const [addBankOpen, setAddBankOpen] = useState(false)
  const [editBankOpen, setEditBankOpen] = useState(false)
  const [cpOpen, setCpOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [recipientOpen, setRecipientOpen] = useState(false)
  const [payerOpen, setPayerOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(requestId)
  const [savingDraft, setSavingDraft] = useState(false)

  // Поступление, выбранное в блоке "Плательщик в РФ" — если выбрано, снимок
  // плательщика/получателя/даты берётся из него на бэкенде (см. receipt_id).
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(defaultValues.receiptId ?? null)
  // Клиент пока не знает точную сумму заявки (поступление разделится на
  // несколько заявок) — разблокирует ручной ввод суммы поверх суммы поступления.
  const [allowCustomAmount, setAllowCustomAmount] = useState(defaultValues.receiptId != null)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    mode: "onTouched",
    defaultValues: {
      invoice: defaultValues.invoice ?? "",
      amount: defaultValues.amount ?? "",
      currency: defaultValues.currency ?? "",
      details: defaultValues.details ?? "",
      counterpartyId: defaultValues.counterpartyId ?? null,
      bankId: defaultValues.bankId ?? null,
      prfOrg: defaultValues.prfOrg ?? "",
      prfInn: defaultValues.prfInn ?? "",
      prfAmount: defaultValues.prfAmount ?? "",
      prfDate: defaultValues.prfDate ?? "",
      prfRecipient: defaultValues.prfRecipient ?? "",
      fileCount: 0,
    },
  })

  const counterpartyId = form.watch("counterpartyId")
  const bankId = form.watch("bankId")
  const currency = form.watch("currency")
  const invoice = form.watch("invoice")

  useEffect(() => {
    api.getCounterparties().then(setCounterparties)
    api.getRecipients().then(setRecipients)
    api.getPayers().then(setPayers)
    api.getReceipts().then(setReceipts)
  }, [])

  useEffect(() => {
    form.trigger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!counterpartyId) { setCounterpartyDetail(null); return }
    api.getCounterparty(counterpartyId).then(setCounterpartyDetail)
  }, [counterpartyId])

  const availableBanks = counterpartyDetail?.banks?.filter((b) => b.active) ?? []
  const selectedBank: Bank | undefined = availableBanks.find((b) => b.id === bankId)
  const selectedAccount = selectedBank && currency
    ? selectedBank.accounts.find((a) => a.currencies.includes(currency))
    : undefined

  const selectedReceipt = receipts.find((r) => r.id === selectedReceiptId) ?? null
  const prfFromReceiptLocked = prfLocked || !!selectedReceipt
  const prfAmountLocked = prfLocked || (!!selectedReceipt && !allowCustomAmount)

  // Полностью выбранные другими заявками поступления скрываем — выбирать
  // больше нечего. Кроме уже выбранного в этой заявке — иначе пропадёт из
  // списка сразу после выбора (у него самого remaining часто = 0).
  const selectableReceipts = receipts.filter((r) => parseFloat(r.remaining_amount) > 0 || r.id === selectedReceiptId)

  const handleSelectReceipt = (r: Receipt) => {
    setSelectedReceiptId(r.id)
    setAllowCustomAmount(false)
    form.setValue("prfOrg", r.payer_name ?? "", { shouldValidate: true, shouldTouch: true })
    form.setValue("prfInn", r.payer_inn ?? "", { shouldValidate: true, shouldTouch: true })
    form.setValue("prfDate", r.date.split("-").reverse().join("."), { shouldValidate: true, shouldTouch: true })
    form.setValue("prfRecipient", r.recipient_name ?? "", { shouldValidate: true, shouldTouch: true })
    // Не полная сумма поступления, а остаток — если часть уже разобрана
    // другими заявками, дефолт не должен требовать больше, чем осталось.
    form.setValue("prfAmount", r.remaining_amount, { shouldValidate: true, shouldTouch: true })
    setReceiptOpen(false)
  }

  const handleClearReceipt = () => {
    setSelectedReceiptId(null)
    setAllowCustomAmount(false)
  }

  const receiptAmountExceeded = !!selectedReceipt && allowCustomAmount &&
    (() => {
      const max = parseFloat(selectedReceipt.remaining_amount)
      const entered = parseFloat(toApiDecimal(form.watch("prfAmount") || "0"))
      return !Number.isNaN(entered) && entered > max
    })()

  const invalidOf = (fieldState: { invalid: boolean; isTouched: boolean }) =>
    showFieldError(fieldState.invalid, fieldState.isTouched, form.formState.isSubmitted)

  const payerInvalid = showFieldError(
    !!form.formState.errors.prfOrg || !!form.formState.errors.prfInn,
    !!form.formState.touchedFields.prfOrg || !!form.formState.touchedFields.prfInn,
    form.formState.isSubmitted
  )
  const payerErrorMessage = form.formState.errors.prfOrg?.message ?? form.formState.errors.prfInn?.message

  const fileCountInvalid = showFieldError(!!form.formState.errors.fileCount, false, form.formState.isSubmitted)

  const buildPayload = (data: RequestFormValues, status: "new" | "draft" | "correction_review") => ({
    counterparty_id: data.counterpartyId!,
    bank_id: data.bankId!,
    ...(selectedAccount ? { bank_account_id: selectedAccount.id! } : {}),
    invoice: data.invoice.trim(),
    amount: toApiDecimal(data.amount),
    currency: data.currency,
    details: data.details.trim(),
    status,
    prf_organization: data.prfOrg.trim() || undefined,
    prf_inn: data.prfInn.trim() || undefined,
    prf_amount: data.prfAmount.trim() ? toApiDecimal(data.prfAmount) : undefined,
    prf_date: data.prfDate.trim() ? toApiDate(data.prfDate) : undefined,
    prf_recipient: data.prfRecipient.trim() || undefined,
    receipt_id: selectedReceiptId,
  })

  // Черновик может быть сохранён с частично заполненной формой — в отличие
  // от buildPayload, здесь ничего не требуется кроме инвойса.
  const buildDraftPayload = (data: RequestFormValues) => ({
    ...(data.counterpartyId ? { counterparty_id: data.counterpartyId } : {}),
    ...(data.bankId ? { bank_id: data.bankId } : {}),
    ...(selectedAccount ? { bank_account_id: selectedAccount.id! } : {}),
    invoice: data.invoice.trim(),
    ...(data.amount.trim() ? { amount: toApiDecimal(data.amount) } : {}),
    ...(data.currency ? { currency: data.currency } : {}),
    ...(data.details.trim() ? { details: data.details.trim() } : {}),
    status: "draft" as const,
    ...(data.prfOrg.trim() ? { prf_organization: data.prfOrg.trim() } : {}),
    ...(data.prfInn.trim() ? { prf_inn: data.prfInn.trim() } : {}),
    ...(data.prfAmount.trim() ? { prf_amount: toApiDecimal(data.prfAmount) } : {}),
    ...(data.prfDate.trim() ? { prf_date: toApiDate(data.prfDate) } : {}),
    ...(data.prfRecipient.trim() ? { prf_recipient: data.prfRecipient.trim() } : {}),
    receipt_id: selectedReceiptId,
  })

  const onSubmit = async (data: RequestFormValues) => {
    if (!selectedAccount) {
      form.setError("bankId", { message: `Банк не поддерживает валюту ${data.currency}` })
      return
    }
    const submitStatus = editableBlocks ? "correction_review" : "new"
    const payload = buildPayload(data, submitStatus)
    if (savedId === null) {
      const created = await api.createRequest(payload)
      setSavedId(created.id)
      await docsRef.current?.flush(created.id)
    } else {
      await api.updateRequest(savedId, payload)
    }
    if (editableBlocks) window.dispatchEvent(new CustomEvent("request-notifications-changed"))
    navigate("/request")
  }

  const handleSaveDraft = async () => {
    if (savingDraft) return
    setSavingDraft(true)
    try {
      const data = form.getValues()
      const payload = buildDraftPayload(data)
      let id = savedId
      if (id === null) {
        const created = await api.createDraft()
        id = created.id
        setSavedId(id)
        await docsRef.current?.flush(id)
      }
      await api.updateRequest(id, payload)
      navigate("/request")
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <div className="p-10">
      <PageHeader title={title} description={description} badge={badge} back={back} />

      {adminNote?.trim() && (
        <InlineNotice
          variant="warning"
          icon={MessageSquareText}
          title="Сообщение от администратора"
          density="comfortable"
          className="mb-6"
        >
          {adminNote}
        </InlineNotice>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        <div className="flex-1 flex flex-col gap-4">

          <form id="request-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-4">

              <BlockCard>
                <BlockCardHeader icon={<FileText className="size-4" />} title="Платёж" />
                <BlockCardContent locked={paymentLocked}>
                  <FieldGroup>

                    <Controller
                      name="invoice"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel htmlFor="req-invoice" error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Инвойс</FieldLabel>
                          <Input size="lg"
                            {...field}
                            id="req-invoice"
                            placeholder="VN-242523"
                            aria-invalid={invalidOf(fieldState)}
                            disabled={paymentLocked}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="amount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel htmlFor="req-amount" error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Сумма</FieldLabel>
                          <Input size="lg"
                            {...field}
                            id="req-amount"
                            placeholder="0,00"
                            aria-invalid={invalidOf(fieldState)}
                            disabled={paymentLocked}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="currency"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Валюта</FieldLabel>
                          <CurrencyChips
                            value={field.value ? [field.value] : []}
                            onToggle={(c) => form.setValue("currency", c, { shouldValidate: true, shouldTouch: true })}
                            disabled={paymentLocked}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="details"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel htmlFor="req-details" error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Детали платежа</FieldLabel>
                          <Input size="lg"
                            {...field}
                            id="req-details"
                            placeholder="Payment for PI 015757 DD: 13.04.2026"
                            aria-invalid={invalidOf(fieldState)}
                            disabled={paymentLocked}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="counterpartyId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <div className="flex items-center justify-between">
                            <FieldLabel>Контрагент</FieldLabel>
                            {invalidOf(fieldState)
                              ? <span className="text-xs text-destructive">{fieldState.error?.message}</span>
                              : !paymentLocked && <button
                                  type="button"
                                  onClick={() => setAddCpOpen(true)}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                  Добавить
                                </button>
                            }
                          </div>
                          <Popover open={cpOpen} onOpenChange={setCpOpen}>
                            <PopoverTrigger asChild>
                              <button type="button" disabled={paymentLocked} className={triggerClass(invalidOf(fieldState))}>
                                <span className={counterpartyDetail ? "" : "text-foreground-secondary"}>
                                  {counterpartyDetail?.name ?? "Выберите контрагента"}
                                </span>
                                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Поиск по контрагенту..." />
                                <CommandList>
                                  <CommandEmpty>Не найдено</CommandEmpty>
                                  <CommandGroup>
                                    {counterparties.map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={c.name}
                                        data-checked={field.value === c.id}
                                        onSelect={() => {
                                          form.setValue("counterpartyId", c.id, { shouldValidate: true, shouldTouch: true })
                                          form.setValue("bankId", null, { shouldValidate: true })
                                          setCpOpen(false)
                                        }}
                                      >
                                        {c.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </Field>
                      )}
                    />

                    <Controller
                      name="bankId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <div className="flex items-center justify-between">
                            <FieldLabel>Банк</FieldLabel>
                            {invalidOf(fieldState)
                              ? <span className="text-xs text-destructive">{fieldState.error?.message}</span>
                              : counterpartyId && !paymentLocked && (
                                  <div className="flex items-center gap-3">
                                    {bankId && (
                                      <button
                                        type="button"
                                        onClick={() => setEditBankOpen(true)}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        Редактировать
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setAddBankOpen(true)}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Добавить
                                    </button>
                                  </div>
                                )
                            }
                          </div>
                          <Popover open={bankOpen} onOpenChange={setBankOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={paymentLocked || !counterpartyId}
                                className={triggerClass(invalidOf(fieldState))}
                              >
                                <span className={selectedBank ? "" : "text-foreground-secondary"}>
                                  {selectedBank?.name ?? "Выберите банк"}
                                </span>
                                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Поиск по банку..." />
                                <CommandList>
                                  <CommandEmpty>Не найдено</CommandEmpty>
                                  <CommandGroup>
                                    {availableBanks.map((b) => (
                                      <CommandItem
                                        key={b.id}
                                        value={b.name}
                                        data-checked={field.value === b.id}
                                        onSelect={() => {
                                          form.setValue("bankId", b.id, { shouldValidate: true, shouldTouch: true })
                                          setBankOpen(false)
                                        }}
                                      >
                                        <BankItem bank={b} />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedBank && currency && (
                            selectedAccount ? (
                              <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                                <span className="text-xs text-muted-foreground shrink-0">Счёт</span>
                                <span className="flex-1 font-mono tabular-nums text-sm truncate">{formatAccountNumber(selectedAccount.account)}</span>
                                <Badge variant="secondary" className="shrink-0">{currency}</Badge>
                              </div>
                            ) : (
                              <Alert variant="destructive">
                                <TriangleAlert />
                                <AlertTitle>Нет счёта для валюты {currency}</AlertTitle>
                                <AlertDescription>
                                  Нажмите «Редактировать» чтобы добавить счёт в этом банке
                                </AlertDescription>
                              </Alert>
                            )
                          )}
                        </Field>
                      )}
                    />

                  </FieldGroup>
                </BlockCardContent>
              </BlockCard>

              <BlockCard>
                <BlockCardHeader icon={<Banknote className="size-4" />} title="Плательщик в РФ" />
                <BlockCardContent locked={prfLocked}>
                  <FieldGroup>

                    {receipts.length > 0 && (
                      <Field>
                        <div className="flex items-center justify-between">
                          <FieldLabel>Поступление</FieldLabel>
                          {selectedReceipt && !prfLocked && (
                            <button
                              type="button"
                              onClick={handleClearReceipt}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <PencilLine className="h-3 w-3" />
                              Ввести вручную
                            </button>
                          )}
                        </div>
                        <Popover open={receiptOpen} onOpenChange={setReceiptOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" disabled={prfLocked} className={triggerClass(false)}>
                              <span className="flex min-w-0 items-baseline gap-2">
                                <span className={cn("truncate", !selectedReceipt && "text-foreground-secondary")}>
                                  {selectedReceipt
                                    ? `${selectedReceipt.date.split("-").reverse().join(".")} · ${fmtNum(parseFloat(selectedReceipt.amount))} ₽`
                                    : "Заполнить вручную (без поступления)"}
                                </span>
                                {selectedReceipt && parseFloat(selectedReceipt.remaining_amount) < parseFloat(selectedReceipt.amount) && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                                    остаток {fmtNum(parseFloat(selectedReceipt.remaining_amount))} ₽
                                  </span>
                                )}
                              </span>
                              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[max(22rem,var(--radix-popover-trigger-width))] p-0"
                            align="start"
                            side="bottom"
                          >
                            <Command>
                              <CommandInput placeholder="Поиск по плательщику, получателю..." />
                              <CommandList>
                                <CommandEmpty>Не найдено</CommandEmpty>
                                <CommandGroup>
                                  {selectableReceipts.map((r) => {
                                    const remaining = parseFloat(r.remaining_amount)
                                    const partiallyUsed = remaining < parseFloat(r.amount)
                                    return (
                                      <CommandItem
                                        key={r.id}
                                        value={`${r.payer_name ?? ""} ${r.recipient_name ?? ""} ${r.date}`}
                                        data-checked={selectedReceiptId === r.id}
                                        onSelect={() => handleSelectReceipt(r)}
                                      >
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
                                          <span className="truncate">{r.payer_name ?? "—"} → {r.recipient_name ?? "—"}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {r.date.split("-").reverse().join(".")} · {fmtNum(parseFloat(r.amount))} ₽
                                            {partiallyUsed && (
                                              <span className="text-amber-600 dark:text-amber-400"> · остаток {fmtNum(remaining)} ₽</span>
                                            )}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FieldDescription>
                          Выберите поступление — плательщик, получатель и дата заполнятся автоматически
                        </FieldDescription>
                      </Field>
                    )}

                    <Field data-invalid={payerInvalid}>
                      <FieldLabel error={payerInvalid ? payerErrorMessage : undefined}>Плательщик</FieldLabel>
                      <Popover open={payerOpen} onOpenChange={setPayerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={prfFromReceiptLocked}
                            className={triggerClass(payerInvalid)}
                          >
                            <span className={form.watch("prfOrg") ? "" : "text-foreground-secondary"}>
                              {form.watch("prfOrg")
                                ? `${form.watch("prfOrg")} · ИНН ${form.watch("prfInn")}`
                                : "Выберите плательщика"}
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Поиск по названию или ИНН..." />
                            <CommandList>
                              <CommandEmpty>Не найдено</CommandEmpty>
                              <CommandGroup>
                                {payers.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.name} ${p.inn}`}
                                    data-checked={form.watch("prfOrg") === p.name}
                                    onSelect={() => {
                                      form.setValue("prfOrg", p.name, { shouldValidate: true, shouldTouch: true })
                                      form.setValue("prfInn", p.inn, { shouldValidate: true, shouldTouch: true })
                                      setPayerOpen(false)
                                    }}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span>{p.name}</span>
                                      <span className="text-xs text-muted-foreground">ИНН {p.inn}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </Field>

                    <Controller
                      name="prfAmount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="prf-amount" error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Сумма, ₽</FieldLabel>
                            {selectedReceipt && !prfLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !allowCustomAmount
                                  setAllowCustomAmount(next)
                                  if (!next) form.setValue("prfAmount", selectedReceipt.remaining_amount, { shouldValidate: true, shouldTouch: true })
                                }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {allowCustomAmount ? <X className="h-3 w-3" /> : <PencilLine className="h-3 w-3" />}
                                {allowCustomAmount ? "Сумма поступления" : "Другая сумма"}
                              </button>
                            )}
                          </div>
                          <Input size="lg"
                            {...field}
                            id="prf-amount"
                            placeholder="0,00"
                            aria-invalid={invalidOf(fieldState)}
                            disabled={prfAmountLocked}
                          />
                          {receiptAmountExceeded && (
                            <p className="text-xs text-destructive">
                              Сумма больше остатка поступления ({fmtNum(parseFloat(selectedReceipt!.remaining_amount))} ₽)
                            </p>
                          )}
                          {allowCustomAmount && selectedReceipt && !receiptAmountExceeded && (
                            <FieldDescription>
                              Поступление разделится на несколько заявок
                            </FieldDescription>
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="prfDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Дата</FieldLabel>
                          <DatePicker
                            value={field.value}
                            onChange={(v) => form.setValue("prfDate", v, { shouldValidate: true, shouldTouch: true })}
                            disabled={prfFromReceiptLocked}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="prfRecipient"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={invalidOf(fieldState)}>
                          <FieldLabel error={invalidOf(fieldState) ? fieldState.error?.message : undefined}>Получатель</FieldLabel>
                          <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
                            <PopoverTrigger asChild>
                              <button type="button" disabled={prfFromReceiptLocked} className={triggerClass(invalidOf(fieldState))}>
                                <span className={field.value ? "" : "text-foreground-secondary"}>
                                  {field.value || "Выберите получателя"}
                                </span>
                                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Поиск по получателю..." />
                                <CommandList>
                                  <CommandEmpty>Не найдено</CommandEmpty>
                                  <CommandGroup>
                                    {recipients.map((r) => (
                                      <CommandItem
                                        key={r.id}
                                        value={r.name}
                                        data-checked={field.value === r.name}
                                        onSelect={() => {
                                          form.setValue("prfRecipient", r.name, { shouldValidate: true, shouldTouch: true })
                                          setRecipientOpen(false)
                                        }}
                                      >
                                        {r.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </Field>
                      )}
                    />

                  </FieldGroup>
                </BlockCardContent>
              </BlockCard>

              <BlockCard>
                <BlockCardHeader
                  icon={<Paperclip className="size-4" />}
                  title={
                    <>
                      Документы
                      {fileCountInvalid && (
                        <span className="text-xs font-normal text-destructive">{form.formState.errors.fileCount?.message}</span>
                      )}
                    </>
                  }
                  action={
                    !documentsLocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => docsRef.current?.open()}
                        disabled={!invoice?.trim()}
                      >
                        <Plus data-icon="inline-start" /> Добавить файл
                      </Button>
                    )
                  }
                />
                <BlockCardContent className="p-0">
                  <Documents
                    ref={docsRef}
                    requestId={savedId ?? undefined}
                    section="payment"
                    error={fileCountInvalid}
                    readOnly={documentsLocked}
                    canAttach={!!invoice?.trim()}
                    blockedHint="Заполните поле «Инвойс», чтобы прикрепить документы"
                    onCountChange={(n) =>
                      form.setValue("fileCount", n, { shouldValidate: true })
                    }
                  />
                </BlockCardContent>
              </BlockCard>

              {status === "correction" && (
                <BlockCard>
                  <BlockCardHeader
                    icon={<Files className="size-4" />}
                    title="Закрывающие документы"
                    action={
                      !closingDocsLocked && (
                        <Button size="sm" variant="outline" type="button" onClick={() => closingDocsRef.current?.open()}>
                          <Plus data-icon="inline-start" /> Добавить файл
                        </Button>
                      )
                    }
                  />
                  <BlockCardContent className="p-0">
                    <Documents
                      ref={closingDocsRef}
                      requestId={savedId ?? undefined}
                      section="closing"
                      readOnly={closingDocsLocked}
                    />
                  </BlockCardContent>
                </BlockCard>
              )}

            </div>
          </form>

        </div>

        <div className="w-full lg:w-72 shrink-0">
          <SideCard>
            <SideCardHeader icon={<Send className="size-4" />} title="Отправка" />
            <SideCardContent>
              <p className="text-sm text-muted-foreground">
                {editableBlocks
                  ? "Внесите исправления в доступные для редактирования блоки и отправьте заявку на повторную проверку."
                  : "Сохраните черновик или отправьте заявку на проверку, заполнив все обязательные поля."}
              </p>
            </SideCardContent>
            <SideCardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                form="request-form"
                size="lg"
                className="w-full"
                disabled={!form.formState.isValid || form.formState.isSubmitting || savingDraft}
              >
                {submitLabel}
              </Button>
              {!hideDraftButton && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveDraft}
                  disabled={!invoice?.trim() || savingDraft || form.formState.isSubmitting}
                >
                  Сохранить черновик
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/request")}
              >
                Отмена
              </Button>
            </SideCardFooter>
          </SideCard>
        </div>

      </div>

      <EditBankDialog
        bank={selectedBank}
        open={editBankOpen}
        onOpenChange={setEditBankOpen}
        onSave={(updatedBank) =>
          setCounterpartyDetail((prev) =>
            prev ? { ...prev, banks: (prev.banks ?? []).map((b) => b.id === updatedBank.id ? updatedBank : b) } : prev
          )
        }
      />

      {counterpartyId && (
        <AddBankDialog
          counterpartyId={counterpartyId}
          open={addBankOpen}
          onOpenChange={setAddBankOpen}
          onAdd={(bank) => {
            setCounterpartyDetail((prev) =>
              prev ? { ...prev, banks: [...(prev.banks ?? []), bank] } : prev
            )
            form.setValue("bankId", bank.id, { shouldValidate: true, shouldTouch: true })
          }}
        />
      )}

      <AddCounterpartyDialog
        open={addCpOpen}
        onOpenChange={setAddCpOpen}
        onAdd={(cp) => {
          setCounterparties((prev) => [...prev, cp])
          form.setValue("counterpartyId", cp.id, { shouldValidate: true, shouldTouch: true })
          form.setValue("bankId", null)
        }}
      />
    </div>
  )
}
