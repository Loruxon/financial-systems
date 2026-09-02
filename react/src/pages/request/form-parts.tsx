import { Badge } from "@/components/ui/badge"
import type { Bank } from "@/lib/api"
import { CURRENCIES } from "@/lib/constants"

export { CURRENCIES }

export function BankItem({ bank }: { bank: Bank }) {
  const isMono = bank.bank_type === "mono"
  const currencies = isMono
    ? bank.accounts.map((a) => a.currencies[0]).filter(Boolean)
    : bank.accounts[0]?.currencies ?? []
  const typeLabel = isMono ? "Моновалютный" : "Мультивалютный"
  const typeHint = isMono ? "отдельный счёт для каждой валюты" : "единый счёт для всех валют"

  return (
    <div className="flex flex-col gap-1 py-0.5">
      <span className="text-sm">{bank.name}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{typeLabel}</Badge>
        {currencies.map((c) => (
          <Badge key={c} variant="outline" className="text-xs px-1.5 py-0 h-4">{c}</Badge>
        ))}
        <span className="text-xs text-muted-foreground">{typeHint}</span>
      </div>
    </div>
  )
}
