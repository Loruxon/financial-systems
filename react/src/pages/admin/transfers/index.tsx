import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { api, type BankTransfer, type Recipient } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { columns, type TransferRow } from "./columns"
import { AddTransferDialog } from "./add-transfer-dialog"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransfersPage() {
  const { adminSections } = useAuth()
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [byRecipient, setByRecipient] = useState<{ id: number; total: number }[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    api.getAdminTransfers().then(setTransfers).catch(() => toast.error("Не удалось загрузить переводы"))
    api.getRecipients().then(setRecipients).catch(() => toast.error("Не удалось загрузить счета"))
    // Отдельное право доступа — у ограниченного админа с доступом только к
    // "Переводам" его может не быть, тогда просто не показываем баланс в диалоге.
    if (adminSections.includes("recipient_balances")) {
      api.getRecipientBalances()
        .then((rows) => setByRecipient(rows.map((r) => ({ id: r.id, total: parseFloat(r.total) }))))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      await api.deleteAdminTransfer(id)
      setTransfers((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error("Не удалось удалить перевод")
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const rows: TransferRow[] = useMemo(() =>
    transfers.map((t) => ({
      ...t,
      onDelete: () => handleDelete(t.id),
      deleting: deletingIds.has(t.id),
    })),
    [transfers, deletingIds]
  )

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Переводы"
          description="Внутренние переводы между банковскими счетами"
          action={
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Создать перевод
            </Button>
          }
        />
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6 flex flex-col gap-6">
        <DataTable
          columns={columns}
          data={rows}
          defaultColumnVisibility={{ id: false }}
          filterColumn="note"
          filterPlaceholder="Поиск по примечанию..."
          columnLabels={{
            id: "ID",
            date: "Дата",
            route: "Маршрут",
            amount: "Сумма",
            note: "Примечание",
          }}
        />
      </div>

      <AddTransferDialog
        open={addOpen}
        recipients={recipients}
        balances={byRecipient}
        onClose={() => setAddOpen(false)}
        onCreated={(t) => setTransfers((prev) => [t, ...prev])}
      />
    </div>
  )
}
