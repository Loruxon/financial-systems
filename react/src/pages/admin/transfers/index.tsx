import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { api, type BankTransfer } from "@/lib/api"
import { columns, type TransferRow } from "./columns"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransfersPage() {
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.getAdminTransfers().then(setTransfers).catch(() => toast.error("Не удалось загрузить переводы"))
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
            <Button size="lg" onClick={() => navigate("/admin/transfers/add")}>
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
          getRowUrl={(row) => `/admin/transfers/${row.id}`}
          columnLabels={{
            id: "ID",
            date: "Дата",
            status: "Статус",
            route: "Маршрут",
            amount: "Сумма",
            payer_name: "Плательщик",
            receipts: "Поступления",
            note: "Примечание",
          }}
        />
      </div>
    </div>
  )
}
