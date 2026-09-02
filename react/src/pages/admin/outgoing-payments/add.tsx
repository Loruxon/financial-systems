import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { FileText, Files } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"
import { BlockCard, BlockCardHeader, BlockCardContent } from "@/components/block-card"
import { toApiDecimal } from "@/lib/utils"
import { api, type Recipient } from "@/lib/api"
import { OutgoingPaymentDocuments, type OutgoingPaymentDocumentsHandle } from "./documents"

const DEFAULT_ACCOUNT_NAME = "CIC"

export default function AdminOutgoingPaymentAddPage() {
  const navigate = useNavigate()
  const docsRef = useRef<OutgoingPaymentDocumentsHandle>(null)

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [invoice, setInvoice] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getRecipients()
      .then((recs) => {
        setRecipients(recs)
        setAccountId(recs.find((r) => r.name === DEFAULT_ACCOUNT_NAME)?.id ?? null)
      })
      .catch(() => toast.error("Не удалось загрузить счета"))
  }, [])

  const isValid = !!invoice.trim() && !!supplierName.trim() && !!amount.trim() && accountId != null

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const created = await api.createOutgoingPayment({
        invoice,
        supplier_name: supplierName,
        amount: toApiDecimal(amount),
        account_id: accountId,
      })
      await docsRef.current?.flush(created.id)
      navigate(`/admin/outgoing-payments/${created.id}`)
    } catch {
      toast.error("Не удалось создать платёж")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-10">
      <PageHeader
        title="Новый исходящий платёж"
        description="Заполните данные и сохраните"
        back={{ label: "К исходящим платежам", href: "/admin/outgoing-payments" }}
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        <BlockCard>
          <BlockCardHeader icon={<FileText className="size-4" />} title="Данные платежа" />
          <BlockCardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Инвойс</Label>
                <Input size="lg" value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="INV-000000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Наименование поставщика</Label>
                <Input size="lg" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="ООО «Поставщик»" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Сумма, ₽</Label>
                <Input size="lg" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Счёт списания</Label>
                <Select value={accountId != null ? String(accountId) : undefined} onValueChange={(v) => setAccountId(Number(v))}>
                  <SelectTrigger size="lg" className="w-full">
                    <SelectValue placeholder="Не выбран" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </BlockCardContent>
        </BlockCard>

        <BlockCard>
          <BlockCardHeader icon={<Files className="size-4" />} title="Документы" />
          <BlockCardContent>
            <OutgoingPaymentDocuments ref={docsRef} />
          </BlockCardContent>
        </BlockCard>

        <Button size="lg" className="w-full md:w-auto md:self-start" disabled={!isValid || saving} onClick={handleSave}>
          {saving && <Spinner data-icon="inline-start" />}
          Сохранить
        </Button>
      </div>
    </div>
  )
}
