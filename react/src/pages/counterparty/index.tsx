import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Spinner } from "@/components/ui/spinner"
import { columns } from "./columns"
import { DataTable } from "@/components/data-table"
import { AddCounterpartyDialog } from "./add-counterparty-dialog"
import { api, type Counterparty } from "@/lib/api"

export default function CounterpartyPage() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCounterparties()
      .then(setCounterparties)
      .catch(() => toast.error("Не удалось загрузить контрагентов"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <div className="px-10 pt-10 pb-6">
        <PageHeader
          title="Контрагенты"
          description="Компании и банковские реквизиты для платежей"
          action={
            <AddCounterpartyDialog
              onAdd={(c) => setCounterparties((prev) => [...prev, c])}
            />
          }
        />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border/60 mx-4 mb-4 px-6 pb-10 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={counterparties}
            getRowUrl={(row) => `/counterparty/${row.id}`}
            filterColumn="name"
            filterPlaceholder="Поиск по контрагенту..."
            defaultColumnVisibility={{ id: false }}
            columnLabels={{
              id: "ID",
              name: "Контрагент",
              address: "Адрес",
            }}
          />
        )}
      </div>
    </div>
  )
}
