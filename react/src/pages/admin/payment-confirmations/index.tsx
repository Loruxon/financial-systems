import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table"
import { api, type Receipt, type RequestListItem } from "@/lib/api"
import { columns, type ReceiptRow } from "./columns"
import { LinkRequestDialog } from "./link-request-dialog"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPaymentConfirmationsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set())
  const [linkTarget, setLinkTarget] = useState<Receipt | null>(null)
  const [removing, setRemoving] = useState<{ receiptId: number; requestId: number } | null>(null)

  useEffect(() => {
    api.getAdminIncomingPayments().then(setReceipts).catch(() => toast.error("Не удалось загрузить поступления"))
    api.getAdminRequests().then(setRequests).catch(() => toast.error("Не удалось загрузить заявки"))
  }, [])

  const applyUpdate = useCallback((updated: Receipt) => {
    setReceipts((prev) => prev.map((r) => r.id === updated.id ? updated : r))
  }, [])

  const setBusy = useCallback((id: number, busy: boolean) => {
    setBusyIds((prev) => {
      const s = new Set(prev)
      busy ? s.add(id) : s.delete(id)
      return s
    })
  }, [])

  const handleConfirm = useCallback(async (receipt: Receipt) => {
    setBusy(receipt.id, true)
    try {
      applyUpdate(await api.confirmAdminIncomingPayment(receipt.id))
    } finally {
      setBusy(receipt.id, false)
    }
  }, [applyUpdate, setBusy])

  const handleUnconfirm = useCallback(async (receipt: Receipt) => {
    setBusy(receipt.id, true)
    try {
      applyUpdate(await api.unconfirmAdminIncomingPayment(receipt.id))
    } finally {
      setBusy(receipt.id, false)
    }
  }, [applyUpdate, setBusy])

  const handleRemoveRequest = useCallback(async (receipt: Receipt, requestId: number) => {
    setRemoving({ receiptId: receipt.id, requestId })
    try {
      applyUpdate(await api.setAdminIncomingPaymentRequests(receipt.id, receipt.requests.filter((id) => id !== requestId)))
    } catch {
      toast.error("Не удалось отвязать заявку")
    } finally {
      setRemoving(null)
    }
  }, [applyUpdate])

  const rows: ReceiptRow[] = useMemo(() =>
    receipts.map((r) => ({
      ...r,
      onConfirm: r.status === "new" ? () => handleConfirm(r) : undefined,
      onUnconfirm: r.status === "confirmed" ? () => handleUnconfirm(r) : undefined,
      onLinkRequest: () => setLinkTarget(r),
      onRemoveRequest: (requestId: number) => handleRemoveRequest(r, requestId),
      removingRequestId: removing?.receiptId === r.id ? removing.requestId : null,
      busy: busyIds.has(r.id),
    })),
    [receipts, handleConfirm, handleUnconfirm, handleRemoveRequest, busyIds, removing]
  )

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Подтверждение поступлений"
          description="Реестр поступлений и их подтверждение"
        />
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6 flex flex-col gap-6">
        <DataTable
          columns={columns}
          data={rows}
          defaultColumnVisibility={{ id: false }}
          columnLabels={{
            id: "ID",
            date: "Дата",
            direction: "Направление платежа",
            amount: "Сумма",
            net_amount: "Сумма −0.2%",
            status: "Статус",
            organization_name: "Организация",
            request_invoices: "Заявки",
          }}
        />
      </div>

      <LinkRequestDialog
        receipt={linkTarget}
        requests={requests}
        onClose={() => setLinkTarget(null)}
        onLinked={applyUpdate}
      />
    </div>
  )
}
