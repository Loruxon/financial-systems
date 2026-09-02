import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { BlockCard, BlockCardHeader, BlockCardRow } from "@/components/block-card"
import { api, type Bank, type Counterparty } from "@/lib/api"
import { Building2, Copy, EyeOff, FilePlus, Landmark, MoreHorizontal, Pencil, RotateCcw } from "lucide-react"
import { ActionBtn } from "@/components/ui/action-btn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatAccountNumber } from "@/lib/utils"
import { AddBankDialog } from "./add-bank-dialog"
import { EditBankDialog } from "./edit-bank-dialog"
import { EditCounterpartyDialog } from "./edit-counterparty-dialog"

export default function CounterpartyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [counterparty, setCounterparty] = useState<Counterparty | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [editingBank, setEditingBank] = useState<Bank | undefined>(undefined)
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})

  useEffect(() => {
    api.getCounterparty(Number(id))
      .then(setCounterparty)
      .catch(() => navigate("/counterparty", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <div className="flex flex-1 items-center justify-center p-20"><Spinner className="size-6 text-muted-foreground" /></div>
  if (!counterparty) return null

  const banks = counterparty.banks ?? []

  const isActive = (bank: Bank) => overrides[bank.id] ?? bank.active
  const toggleActive = async (bank: Bank) => {
    const newActive = !isActive(bank)
    setOverrides((prev) => ({ ...prev, [bank.id]: newActive }))
    try {
      await api.updateBank(bank.id, { active: newActive })
      setCounterparty((prev) =>
        prev ? { ...prev, banks: (prev.banks ?? []).map((b) => b.id === bank.id ? { ...b, active: newActive } : b) } : prev
      )
      setOverrides((prev) => { const next = { ...prev }; delete next[bank.id]; return next })
    } catch {
      setOverrides((prev) => ({ ...prev, [bank.id]: !newActive }))
    }
  }

  const activeBanks = banks.filter(isActive)
  const hiddenBanks = banks.filter((b) => !isActive(b))

  const copyAccountNumber = (bank: Bank) =>
    navigator.clipboard.writeText(
      bank.accounts.map((a) => formatAccountNumber(a.account)).join("\n")
    ).then(() => toast.success("Номер счёта скопирован")).catch(() => toast.error("Не удалось скопировать"))

  return (
    <div className="p-10">
      <PageHeader
        title={counterparty.name}
        description={`Контрагент № ${counterparty.id}`}
        back={{ label: "К списку контрагентов", href: "/counterparty" }}
      />
      <div className="flex flex-col gap-6">
        <BlockCard>
          <BlockCardHeader
            icon={<Building2 className="size-4" />}
            title="Реквизиты"
            action={
              <EditCounterpartyDialog
                counterparty={counterparty}
                onSave={(updated) => setCounterparty((prev) => prev ? { ...prev, ...updated } : prev)}
              />
            }
          />
          <BlockCardRow label="Название">{counterparty.name}</BlockCardRow>
          <BlockCardRow label="Адрес">{counterparty.address}</BlockCardRow>
        </BlockCard>

        <BlockCard>
          <BlockCardHeader
            icon={<Landmark className="size-4" />}
            title="Банки"
            action={
              <AddBankDialog
                counterpartyId={counterparty.id}
                onAdd={(bank) => setCounterparty((prev) =>
                  prev ? { ...prev, banks: [...(prev.banks ?? []), bank] } : prev
                )}
              />
            }
          />
          <div>
            {activeBanks.map((bank) => (
              <div key={bank.id} className="border-b border-border/40 last:border-0 px-6 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate">{bank.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {bank.bank_type === "mono" ? "Моновалютный" : "Мультивалютный"}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingBank(bank)}>
                        <Pencil /> Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyAccountNumber(bank)}>
                        <Copy /> Скопировать номер счёта
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => toggleActive(bank)}>
                        <EyeOff /> Скрыть
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{bank.swift_code}</span> • {bank.address}
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {bank.accounts.map((a) => (
                    <div key={a.account} className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-sm">{formatAccountNumber(a.account)}</span>
                      <div className="flex gap-1">
                        {a.currencies.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/request/add", {
                      state: { counterpartyId: counterparty.id, bankId: bank.id }
                    })}
                  >
                    <FilePlus data-icon="inline-start" /> Создать заявку
                  </Button>
                </div>
              </div>
            ))}

            {hiddenBanks.map((bank) => (
              <div key={bank.id} className="flex items-center justify-between border-b border-border/40 last:border-0 px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{bank.name}</span>
                  <Badge variant="secondary">Скрыт</Badge>
                </div>
                <ActionBtn
                  onClick={() => toggleActive(bank)}
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                  tooltip="Показать"
                >
                  <RotateCcw className="size-3.5" />
                </ActionBtn>
              </div>
            ))}

            {activeBanks.length === 0 && hiddenBanks.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Банки не добавлены
              </div>
            )}
          </div>
        </BlockCard>
      </div>

      <EditBankDialog
        bank={editingBank}
        open={editingBank !== undefined}
        onOpenChange={(o) => { if (!o) setEditingBank(undefined) }}
        onSave={(updatedBank) => {
          setCounterparty((prev) => prev
            ? { ...prev, banks: (prev.banks ?? []).map((b) => b.id === updatedBank.id ? updatedBank : b) }
            : prev
          )
          setEditingBank(undefined)
        }}
      />
    </div>
  )
}
