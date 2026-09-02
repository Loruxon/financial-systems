import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { api, type PaymentRequest } from "@/lib/api"
import { fmtNum, formatAccountNumber } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import { FileText, Banknote, Receipt, FileCheck2, Download, Files, Plus, Upload, MessageCircleQuestion, MessageSquareText, CircleCheckBig } from "lucide-react"
import { toast } from "sonner"

import { InlineNotice } from "@/components/inline-notice"
import { Documents, type DocumentsHandle } from "@/components/files/documents"
import { BlockCard, BlockCardHeader, BlockCardRow } from "@/components/block-card"
import { SideCard, SideCardHeader, SideCardContent, SideCardFooter, SideCardRow } from "@/components/side-card"
import { UploadClosingDocsDialog } from "./upload-closing-docs"
import { ContactDialog } from "./contact-dialog"
import { RequestForm } from "./request-form"

export default function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [request, setRequest] = useState<PaymentRequest | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [closingDocsOpen, setClosingDocsOpen] = useState(false)
  const [closingDocsCount, setClosingDocsCount] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submittingClosingDocs, setSubmittingClosingDocs] = useState(false)
  const docsRef = useRef<DocumentsHandle>(null)
  const closingDocsRef = useRef<DocumentsHandle>(null)

  const reload = useCallback(() => api.getRequest(Number(id)).then(setRequest), [id])

  useEffect(() => {
    if (request?.status === "awaiting_closing_docs") setClosingDocsOpen(true)
  }, [request?.status])

  useEffect(() => {
    api.getRequest(Number(id))
      .then(setRequest)
      .catch(() => navigate("/request", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <div className="flex flex-1 items-center justify-center p-20"><Spinner className="size-6 text-muted-foreground" /></div>
  if (!request) return null

  const description = `Заявка № ${request.id} · ${new Date(request.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`

  const formDefaults = {
    invoice: request.invoice,
    amount: request.amount,
    currency: request.currency,
    details: request.details,
    counterpartyId: request.counterparty,
    bankId: request.bank,
    prfOrg: request.prf_organization,
    prfInn: request.prf_inn,
    prfAmount: request.prf_amount ?? undefined,
    prfDate: request.prf_date ? request.prf_date.split("-").reverse().join(".") : undefined,
    prfRecipient: request.prf_recipient,
    receiptId: request.linked_receipt?.id ?? null,
  }

  const handleConfirmReceived = async () => {
    setConfirming(true)
    try {
      await api.updateRequest(request.id, { status: "awaiting_closing_docs" })
      toast.success("Спасибо! Отметили получение денег.")
      await reload()
      window.dispatchEvent(new CustomEvent("request-notifications-changed"))
    } catch {
      toast.error("Не удалось подтвердить получение. Попробуйте ещё раз.")
    } finally {
      setConfirming(false)
    }
  }

  const handleSubmitClosingDocs = async () => {
    setSubmittingClosingDocs(true)
    try {
      await api.updateRequest(request.id, { status: "closing_docs_review" })
      toast.success("Закрывающие документы отправлены на проверку")
      await reload()
      window.dispatchEvent(new CustomEvent("request-notifications-changed"))
    } catch {
      toast.error("Не удалось отправить документы на проверку")
    } finally {
      setSubmittingClosingDocs(false)
    }
  }

  if (request.status === "draft") {
    return (
      <RequestForm
        title={request.invoice}
        description={description}
        badge={<StatusBadge status={request.status} />}
        requestId={request.id}
        defaultValues={formDefaults}
        adminNote={request.admin_note}
        status="draft"
      />
    )
  }

  if (request.status === "correction") {
    return (
      <RequestForm
        title={request.invoice}
        description={description}
        badge={<StatusBadge status={request.status} />}
        requestId={request.id}
        defaultValues={formDefaults}
        submitLabel="Отправить исправления"
        hideDraftButton
        adminNote={request.admin_note}
        status="correction"
        editableBlocks={{
          payment: request.edit_payment,
          prf: request.edit_prf,
          documents: request.edit_documents,
          closingDocs: request.edit_closing_docs,
        }}
      />
    )
  }

  return (
    <>
    <div className="p-10">
      <PageHeader
        title={request.invoice}
        description={description}
        badge={<StatusBadge status={request.status} />}
        back={{ label: "К списку заявок", href: "/request" }}
        action={
          request.status === "sent_to_bank" ? (
            <Button size="lg" onClick={handleConfirmReceived} disabled={confirming}>
              {confirming ? <Spinner data-icon="inline-start" /> : <CircleCheckBig data-icon="inline-start" />}
              Подтвердить получение денег
            </Button>
          ) : request.status === "awaiting_closing_docs" ? (
            closingDocsCount > 0 ? (
              <Button size="lg" onClick={handleSubmitClosingDocs} disabled={submittingClosingDocs}>
                {submittingClosingDocs ? <Spinner data-icon="inline-start" /> : <CircleCheckBig data-icon="inline-start" />}
                Отправить на проверку
              </Button>
            ) : (
              <Button size="lg" onClick={() => setClosingDocsOpen(true)}>
                <Upload data-icon="inline-start" /> Добавить закрывающие документы
              </Button>
            )
          ) : undefined
        }
      />

      {request.money_received && (
        <InlineNotice
          variant="success"
          icon={CircleCheckBig}
          title="Деньги пришли"
          meta={request.money_received_at
            ? `Отмечено ${new Date(request.money_received_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : "Получение подтверждено"}
          className="mb-6"
        />
      )}

      {request.admin_note.trim() && (
        <InlineNotice
          variant="warning"
          icon={MessageSquareText}
          title="Сообщение от администратора"
          density="comfortable"
          className="mb-6"
        >
          {request.admin_note}
        </InlineNotice>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        <div className="flex-1 flex flex-col gap-6">
          <BlockCard>
            <BlockCardHeader icon={<FileText className="size-4" />} title="Платёж" />
            <BlockCardRow label="Инвойс" mono>{request.invoice}</BlockCardRow>
            <BlockCardRow label="Сумма">{fmtNum(request.amount)} <span className="text-xs text-muted-foreground font-medium">{request.currency}</span></BlockCardRow>
            <BlockCardRow label="Детали">{request.details}</BlockCardRow>
            <BlockCardRow label="Контрагент">{request.counterparty_name}</BlockCardRow>
            <BlockCardRow label="Адрес контрагента">{request.counterparty_address}</BlockCardRow>
            <BlockCardRow label="Банк">{request.bank_name}</BlockCardRow>
            <BlockCardRow label="Счёт банка" mono>{formatAccountNumber(request.bank_account)}</BlockCardRow>
            <BlockCardRow label="Адрес банка">{request.bank_address}</BlockCardRow>
            <BlockCardRow label="SWIFT" mono>{request.bank_swift_code}</BlockCardRow>
          </BlockCard>

          {request.prf_organization && (
            <BlockCard>
              <BlockCardHeader icon={<Banknote className="size-4" />} title="Плательщик в РФ" />
              <BlockCardRow label="Организация">{request.prf_organization}</BlockCardRow>
              <BlockCardRow label="ИНН" mono>{request.prf_inn}</BlockCardRow>
              <BlockCardRow label="Сумма, ₽">{request.prf_amount ? fmtNum(request.prf_amount) : "—"}</BlockCardRow>
              <BlockCardRow label="Дата">{request.prf_date?.split("-").reverse().join(".")}</BlockCardRow>
              <BlockCardRow label="Получатель">{request.prf_recipient}</BlockCardRow>
            </BlockCard>
          )}

          <BlockCard>
            <BlockCardHeader
              icon={<Files className="size-4" />}
              title="Документы"
              action={request.status === "new" && (
                <Button size="sm" variant="outline" onClick={() => docsRef.current?.open()}>
                  <Plus data-icon="inline-start" /> Добавить файл
                </Button>
              )}
            />
            <Documents
              ref={docsRef}
              requestId={request.id}
              section="payment"
              readOnly={request.status !== "new"}
            />
          </BlockCard>

          <BlockCard>
            <BlockCardHeader
              icon={<Files className="size-4" />}
              title="Закрывающие документы"
              action={request.status === "awaiting_closing_docs" && (
                <Button size="sm" variant="outline" onClick={() => closingDocsRef.current?.open()}>
                  <Plus data-icon="inline-start" /> Добавить файл
                </Button>
              )}
            />
            <Documents
              ref={closingDocsRef}
              requestId={request.id}
              section="closing"
              readOnly={request.status !== "awaiting_closing_docs"}
              onCountChange={setClosingDocsCount}
            />
          </BlockCard>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">

          <SideCard className="border border-primary/50">
            <SideCardHeader icon={<MessageCircleQuestion className="size-4" />} title="Поддержка" />
            <SideCardContent>
              <p className="text-sm text-muted-foreground">Есть вопрос по этой заявке? Напишите нам — ответим в ближайшее время.</p>
            </SideCardContent>
            <SideCardFooter>
              <Button size="lg" variant="outline" className="w-full" onClick={() => setContactOpen(true)}>
                <MessageCircleQuestion data-icon="inline-start" /> Задать вопрос
              </Button>
            </SideCardFooter>
          </SideCard>

          {request.show_execution_block && (
            <SideCard>
              <SideCardHeader icon={<Receipt className="size-4" />} title="Блок исполнения" />
              <SideCardRow label="Дата исполнения">{request.execution_date?.split("-").reverse().join(".")}</SideCardRow>
              <SideCardRow label="Курс валюты" mono>{request.execution_rate} <span className="text-xs text-muted-foreground font-medium">{request.currency}</span></SideCardRow>
              <SideCardRow label="Затраты">{request.execution_costs ? fmtNum(request.execution_costs) : "—"} <span className="text-xs text-muted-foreground font-medium">₽</span></SideCardRow>
              <SideCardRow label="Остаток">{request.execution_balance ? fmtNum(request.execution_balance) : "—"} <span className="text-xs text-muted-foreground font-medium">₽</span></SideCardRow>
            </SideCard>
          )}

          {request.show_swift_download && (
            <SideCard>
              <SideCardHeader icon={<Download className="size-4" />} title="Скачать SWIFT" />
              <SideCardContent>
                <p className="text-sm text-muted-foreground">SWIFT-подтверждение платежа.</p>
              </SideCardContent>
              <SideCardFooter>
                {request.swift_document ? (
                  <Button size="lg" variant="outline" className="w-full" asChild>
                    <a href={request.swift_document} target="_blank" rel="noreferrer">
                      <Download data-icon="inline-start" /> Скачать SWIFT
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="w-full" disabled>
                    <Download data-icon="inline-start" /> Скачать SWIFT
                  </Button>
                )}
              </SideCardFooter>
            </SideCard>
          )}

          {request.show_paper_download && (
            <SideCard>
              <SideCardHeader icon={<FileCheck2 className="size-4" />} title="Ордер на заявку" />
              <SideCardContent>
                <p className="text-sm text-muted-foreground">Платёжное поручение, направленное в банк.</p>
              </SideCardContent>
              <SideCardFooter>
                {request.paper_document ? (
                  <Button size="lg" variant="outline" className="w-full" asChild>
                    <a href={request.paper_document} target="_blank" rel="noreferrer">
                      <Download data-icon="inline-start" /> Скачать ордер
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="w-full" disabled>
                    <Download data-icon="inline-start" /> Скачать ордер
                  </Button>
                )}
              </SideCardFooter>
            </SideCard>
          )}

        </div>
      </div>
    </div>

    <ContactDialog
      open={contactOpen}
      onOpenChange={setContactOpen}
      invoice={request.invoice}
      requestId={request.id}
    />
    <UploadClosingDocsDialog
      open={closingDocsOpen}
      onOpenChange={setClosingDocsOpen}
      onUpload={async (files) => {
        await closingDocsRef.current?.addFiles(files)
      }}
    />
    </>
  )
}
