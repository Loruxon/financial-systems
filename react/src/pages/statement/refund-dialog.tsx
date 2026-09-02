import { useState } from "react"
import { Undo2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { AmountInput } from "@/components/amount-input"
import { fmtNum, toApiDecimal } from "@/lib/utils"

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableBalance: number
}

export function RefundDialog({ open, onOpenChange, availableBalance }: RefundDialogProps) {
  const [amount, setAmount] = useState("")
  const [attempted, setAttempted] = useState(false)

  const parsed = parseFloat(toApiDecimal(amount))
  const isValid = amount.trim() !== "" && !isNaN(parsed) && parsed > 0 && parsed <= availableBalance
  const isInvalid = attempted && !isValid

  const handleClose = () => {
    onOpenChange(false)
    setAmount("")
    setAttempted(false)
  }

  const handleSubmit = () => {
    setAttempted(true)
    if (!isValid) return
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-4 text-muted-foreground" />
            Возврат средств
          </DialogTitle>
          <DialogDescription>
            Укажите сумму, которую нужно вернуть на расчётный счёт.
          </DialogDescription>
        </DialogHeader>

        {/* Контекстная карточка — тот же приём, что в "Привязать заявки":
            сразу показывает лимит, без мелкой подписи под полем */}
        <div className="rounded-xl border overflow-hidden">
          <div className="h-1 w-full bg-primary" />
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="size-3.5" />
              Доступный баланс
            </span>
            <span className="text-base font-bold tabular-nums text-primary">
              {fmtNum(availableBalance)} ₽
            </span>
          </div>
        </div>

        <form
          id="refund-form"
          onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
          noValidate
        >
          <Field data-invalid={isInvalid}>
            <FieldLabel
              htmlFor="refund-amount"
              error={isInvalid ? `Введите сумму от 0,01 до ${fmtNum(availableBalance)} ₽` : undefined}
            >
              Сумма, ₽
            </FieldLabel>
            <AmountInput
              id="refund-amount"
              value={amount}
              onChange={setAmount}
              max={availableBalance}
              aria-invalid={isInvalid}
            />
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" form="refund-form" size="lg" disabled={!isValid}>
            Отправить заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
