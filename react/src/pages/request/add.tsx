import { useLocation } from "react-router"
import { RequestForm } from "./request-form"

export default function RequestAddPage() {
  const { state } = useLocation()
  const counterpartyId: number | undefined = state?.counterpartyId
  const bankId: number | undefined = state?.bankId

  return (
    <RequestForm
      title="Новая заявка"
      description="Заполните данные и отправьте заявку или сохраните черновик"
      defaultValues={{ counterpartyId: counterpartyId ?? null, bankId: bankId ?? null }}
      back={counterpartyId
        ? { label: "К контрагенту", href: `/counterparty/${counterpartyId}` }
        : undefined
      }
      requestId={null}
      status="draft"
    />
  )
}
