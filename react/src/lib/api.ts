const API_BASE = 'https://api.board.fbridge.pro/api'

export type DocumentSection = 'payment' | 'closing'
export type DocType = 'invoice' | 'request' | 'gtd' | 'transport' | 'other'

export type DocumentItem = {
  id: number
  section: DocumentSection
  url: string
  original_name: string
  size: number
  content_type: string
  doc_type: DocType
  uploaded_by_admin: boolean
  uploaded_at: string
}

export type OutgoingPaymentStatus = 'new' | 'in_work' | 'in_progress' | 'executed'

// Совершенно другая сущность, чем заявки клиента (requests.Request) — заявки
// администратора на списание средств поставщикам, свой бэкенд-app.
export type OutgoingPayment = {
  id: number
  invoice: string
  status: OutgoingPaymentStatus
  amount: string | null
  supplier_name: string
  // Счёт списания (тот же Recipient, что и в остальной админке — ATL/CIC/...).
  account_id: number | null
  account_name: string | null
  // Заявки клиента, которые этот платёж исполняет (m2m, как и у поступлений).
  requests: number[]
  request_invoices: { id: number; invoice: string }[]
  created_at: string
}

export type OutgoingPaymentDocumentItem = {
  id: number
  url: string
  original_name: string
  size: number
  content_type: string
  uploaded_at: string
}

let _getToken: (() => Promise<string | undefined>) | null = null

export const initAuth = (getToken: () => Promise<string | undefined>) => {
  _getToken = getToken
}

export type BankAccount = {
  id?: number
  account: string
  currencies: string[]
}

export type Bank = {
  id: number
  name: string
  address: string
  swift_code: string
  bank_type: 'mono' | 'multi'
  active: boolean
  accounts: BankAccount[]
}

export type Counterparty = {
  id: number
  name: string
  address: string
  banks?: Bank[]
}

export type Recipient = {
  id: number
  name: string
  initial_balance: string
}

export type RecipientBalance = {
  id: number
  name: string
  total: string
}

export type Payer = {
  id: number
  name: string
  inn: string
}

export type AdminPayer = Payer & {
  organization_id: number
  organization_name: string
}

export type RequestStatus =
  | 'draft' | 'new' | 'in_review' | 'sent_to_bank'
  | 'awaiting_closing_docs' | 'closing_docs_review' | 'closed'
  | 'correction' | 'correction_review'

export type AdminUser = {
  id: number
  name: string
  email: string
}

export type SchemeCurrency = {
  currency: string
  percent: string
  swift: string
}

export type WorkScheme = {
  id: number
  name: string
  calculator: string
  currencies: SchemeCurrency[]
}

export type StatementEntry = {
  id: number
  date: string
  type: 'credit' | 'debit'
  payer_name: string | null
  recipient_name: string | null
  // У поступления может быть несколько заявок (разбито на части), у списания — ровно одна.
  requests: { id: number; invoice: string; counterparty_name: string | null }[]
  amount: string
}

export type Balance = {
  received: string
  frozen: string
  spent: string
  available: string
}

export type OrganizationBalance = {
  organization_id: number
  organization_name: string
  balance: string
  received: string
  spent: string
  frozen: string
}

export type BankTransfer = {
  id: number
  from_recipient: number
  from_recipient_name: string
  to_recipient: number
  to_recipient_name: string
  amount: string
  date: string
  note: string
  created_at: string
}

export type BankTransferCreateData = {
  from_recipient: number
  to_recipient: number
  amount: string
  date: string
  note?: string
}

export type ReceiptStatus = 'new' | 'confirmed'

export type Receipt = {
  id: number
  date: string
  amount: string
  net_amount: string | null
  recipient: number | null
  recipient_name: string | null
  payer: number | null
  payer_name: string | null
  payer_inn: string | null
  organization_id: number | null
  organization_name: string | null
  status: ReceiptStatus
  requests: number[]
  request_invoices: { id: number; invoice: string }[]
  confirmed_at: string | null
  created_at: string
}

export type ReceiptCreateData = {
  date: string
  amount: string
  recipient?: number | null
  payer?: number | null
}

export type RequestListItem = {
  id: number
  invoice: string
  amount: string
  currency: string
  status: RequestStatus
  created_at: string
  counterparty_name: string
  bank_name: string
  execution_costs: string | null
  execution_balance: string | null
  execution_profit_sebes: string | null
  organization_name: string
  organization_id: number
  prf_amount: string | null

  assigned_admin: AdminUser | null
  work_scheme_name: string | null
}

export type PaymentRequest = RequestListItem & {
  organization: number
  organization_percent_client: string
  organization_swift_client: string
  organization_calculator: string
  counterparty: number | null
  bank: number | null
  counterparty_address: string
  bank_address: string
  bank_swift_code: string
  bank_account: string
  bank_account_currencies: string[]
  details: string
  prf_organization: string
  prf_inn: string
  prf_amount: string | null
  prf_date: string | null
  prf_recipient: string

  execution_date: string | null
  execution_rate: string | null
  execution_date_sebes: string | null
  execution_rate_sebes: string | null
  execution_costs_sebes: string | null
  execution_profit_sebes: string | null
  sebes_min_fee_applied: boolean | null
  show_swift_download: boolean
  show_paper_download: boolean
  show_execution_block: boolean
  admin_note: string
  edit_payment: boolean
  edit_prf: boolean
  edit_documents: boolean
  edit_closing_docs: boolean
  money_received: boolean
  money_received_at: string | null
  swift_document: string | null
  paper_document: string | null
  linked_receipt: { id: number; date: string; amount: string; net_amount: string | null } | null
}

export type AdminPaymentRequest = PaymentRequest & {
  assigned_admin: AdminUser | null
  work_scheme: WorkScheme | null
}

export type ExchangeRate = {
  date: string
  usd: string
  eur: string
  cny: string
  source: "db" | "cbr"
}

export type LiveRate = {
  usd: string
  eur: string
  cny: string
  cbr_date: string      // DD.MM.YYYY
  cbr_date_iso: string  // YYYY-MM-DD
  day_of_week: string   // пн/вт/ср/чт/пт/сб/вс
  is_different: boolean
}

export type RequestCreateData = {
  counterparty_id: number
  bank_id: number
  bank_account_id?: number
  invoice: string
  amount: string
  currency: string
  details: string
  status?: RequestStatus
  prf_organization?: string
  prf_inn?: string
  prf_amount?: string | null
  prf_date?: string | null
  prf_recipient?: string
  receipt_id?: number | null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = _getToken ? await _getToken() : undefined
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// Загрузка файла — без ручного Content-Type, чтобы браузер сам проставил
// multipart-boundary; тело — FormData, а не JSON.
async function uploadFile<T>(path: string, field: string, file: File): Promise<T> {
  const token = _getToken ? await _getToken() : undefined
  const formData = new FormData()
  formData.append(field, file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function uploadDocumentFile<T>(path: string, section: DocumentSection, file: File): Promise<T> {
  const token = _getToken ? await _getToken() : undefined
  const formData = new FormData()
  formData.append('section', section)
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// Загрузка файла без доп.полей (section/doc_type) — для сущностей с плоским
// списком документов без классификации, в отличие от requests.Document.
async function uploadPlainFile<T>(path: string, file: File): Promise<T> {
  const token = _getToken ? await _getToken() : undefined
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

type RequestUpdateData = Partial<RequestCreateData & {
  status: RequestStatus
  execution_date: string
  execution_rate: string
  execution_date_sebes: string
  execution_rate_sebes: string
  show_swift_download: boolean
  show_paper_download: boolean
  show_execution_block: boolean
  admin_note: string
  edit_payment: boolean
  edit_prf: boolean
  edit_documents: boolean
  edit_closing_docs: boolean
  swift_document: null
  paper_document: null

  assigned_admin_id: number
  work_scheme_id: number | null
}>

export const api = {
  getRecipients: () =>
    request<Recipient[]>('/recipients/'),

  getRecipientBalances: () =>
    request<RecipientBalance[]>('/admin/recipient-balances/'),

  getPayers: () =>
    request<Payer[]>('/payers/'),

  // Подтверждённые поступления организации — для выбора в блоке
  // "Плательщик в РФ" при создании заявки.
  getReceipts: () =>
    request<Receipt[]>('/receipts/'),

  getCounterparties: () =>
    request<Counterparty[]>('/counterparties/'),

  getCounterparty: (id: number) =>
    request<Counterparty>(`/counterparties/${id}/`),

  createCounterparty: (data: { name: string; address: string }) =>
    request<Counterparty>('/counterparties/', { method: 'POST', body: JSON.stringify(data) }),

  updateCounterparty: (id: number, data: Partial<{ name: string; address: string }>) =>
    request<Counterparty>(`/counterparties/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteCounterparty: (id: number) =>
    request<void>(`/counterparties/${id}/`, { method: 'DELETE' }),

  createBank: (counterpartyId: number, data: Omit<Bank, 'id'>) =>
    request<Bank>(`/counterparties/${counterpartyId}/banks/`, { method: 'POST', body: JSON.stringify(data) }),

  updateBank: (id: number, data: Partial<Omit<Bank, 'id'>>) =>
    request<Bank>(`/banks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteBank: (id: number) =>
    request<void>(`/banks/${id}/`, { method: 'DELETE' }),

  getRequests: () =>
    request<RequestListItem[]>('/requests/'),

  getRequest: (id: number) =>
    request<PaymentRequest>(`/requests/${id}/`),

  createRequest: (data: RequestCreateData) =>
    request<PaymentRequest>('/requests/', { method: 'POST', body: JSON.stringify(data) }),

  // Пустой POST — бэкенд создаёт черновик без полей, чтобы у заявки сразу
  // появился id и можно было прикреплять документы до заполнения формы.
  createDraft: () =>
    request<PaymentRequest>('/requests/', { method: 'POST', body: JSON.stringify({}) }),

  updateRequest: (id: number, data: RequestUpdateData) =>
    request<PaymentRequest>(`/requests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  getDocuments: (requestId: number, section: DocumentSection) =>
    request<DocumentItem[]>(`/requests/${requestId}/documents/?section=${section}`),

  uploadDocument: (requestId: number, section: DocumentSection, file: File) =>
    uploadDocumentFile<DocumentItem>(`/requests/${requestId}/documents/`, section, file),

  deleteDocument: (requestId: number, docId: number) =>
    request<void>(`/requests/${requestId}/documents/${docId}/`, { method: 'DELETE' }),

  getRateByDate: (date: string) =>
    request<ExchangeRate>(`/rates/${date}/`),

  getRateLive: (dateIso: string, signal?: AbortSignal) =>
    request<LiveRate>(`/rates/live/?date=${dateIso}`, { signal }),

  getLatestRates: () =>
    request<Omit<ExchangeRate, "source">[]>('/rates/latest/'),

  getMe: () =>
    request<{
      auth: { is_admin: boolean }
      organization: { id: number; name: string; percent_client: string } | null
      admin_sections: string[]
    }>('/me/'),

  getAdminPayers: () =>
    request<AdminPayer[]>('/admin/payers/'),

  getAdminUsers: () =>
    request<AdminUser[]>('/admin/users/'),

  getAdminSchemes: () =>
    request<WorkScheme[]>('/admin/schemes/'),

  getAdminOrganizationBalances: () =>
    request<OrganizationBalance[]>('/admin/organization-balances/'),

  getAdminRequests: () =>
    request<RequestListItem[]>('/admin/requests/'),

  getAdminRequest: (id: number) =>
    request<AdminPaymentRequest>(`/admin/requests/${id}/`),

  updateAdminRequest: (id: number, data: RequestUpdateData) =>
    request<AdminPaymentRequest>(`/admin/requests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  uploadAdminRequestFile: (id: number, field: 'swift_document' | 'paper_document', file: File) =>
    uploadFile<AdminPaymentRequest>(`/admin/requests/${id}/`, field, file),

  getAdminDocuments: (requestId: number, section: DocumentSection) =>
    request<DocumentItem[]>(`/admin/requests/${requestId}/documents/?section=${section}`),

  uploadAdminDocument: (requestId: number, section: DocumentSection, file: File) =>
    uploadDocumentFile<DocumentItem>(`/admin/requests/${requestId}/documents/`, section, file),

  deleteAdminDocument: (docId: number) =>
    request<void>(`/admin/documents/${docId}/`, { method: 'DELETE' }),

  updateAdminDocumentType: (docId: number, docType: DocType) =>
    request<DocumentItem>(`/admin/documents/${docId}/`, { method: 'PATCH', body: JSON.stringify({ doc_type: docType }) }),

  getAdminIncomingPayments: () =>
    request<Receipt[]>('/admin/incoming-payments/'),

  createAdminIncomingPayment: (data: ReceiptCreateData) =>
    request<Receipt>('/admin/incoming-payments/', { method: 'POST', body: JSON.stringify(data) }),

  createAdminIncomingPaymentsBulk: (data: ReceiptCreateData[]) =>
    request<Receipt[]>('/admin/incoming-payments/bulk/', { method: 'POST', body: JSON.stringify(data) }),

  updateAdminIncomingPayment: (id: number, data: Partial<ReceiptCreateData>) =>
    request<Receipt>(`/admin/incoming-payments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  confirmAdminIncomingPayment: (id: number) =>
    request<Receipt>(`/admin/incoming-payments/${id}/`, { method: 'PATCH', body: JSON.stringify({ confirm: true }) }),

  unconfirmAdminIncomingPayment: (id: number) =>
    request<Receipt>(`/admin/incoming-payments/${id}/`, { method: 'PATCH', body: JSON.stringify({ confirm: false }) }),

  setAdminIncomingPaymentRequests: (id: number, requestIds: number[]) =>
    request<Receipt>(`/admin/incoming-payments/${id}/`, { method: 'PATCH', body: JSON.stringify({ request_ids: requestIds }) }),

  deleteAdminIncomingPayment: (id: number) =>
    request<void>(`/admin/incoming-payments/${id}/`, { method: 'DELETE' }),

  getStatement: () =>
    request<StatementEntry[]>('/statement/'),

  getBalance: () =>
    request<Balance>('/balance/'),

  getAdminTransfers: () =>
    request<BankTransfer[]>('/admin/transfers/'),

  createAdminTransfer: (data: BankTransferCreateData) =>
    request<BankTransfer>('/admin/transfers/', { method: 'POST', body: JSON.stringify(data) }),

  deleteAdminTransfer: (id: number) =>
    request<void>(`/admin/transfers/${id}/`, { method: 'DELETE' }),

  getOutgoingPayments: () =>
    request<OutgoingPayment[]>('/admin/outgoing-payments/'),

  // Платёж создаётся только когда админ реально сохраняет форму (не при
  // открытии диалога) — в отличие от заявок клиента, черновик тут не нужен.
  createOutgoingPayment: (data: Partial<Pick<OutgoingPayment, 'invoice' | 'amount' | 'supplier_name' | 'account_id'>> = {}) =>
    request<OutgoingPayment>('/admin/outgoing-payments/', { method: 'POST', body: JSON.stringify(data) }),

  getOutgoingPayment: (id: number) =>
    request<OutgoingPayment>(`/admin/outgoing-payments/${id}/`),

  updateOutgoingPayment: (id: number, data: Partial<Pick<OutgoingPayment, 'invoice' | 'status' | 'amount' | 'supplier_name' | 'account_id'>>) =>
    request<OutgoingPayment>(`/admin/outgoing-payments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteOutgoingPayment: (id: number) =>
    request<void>(`/admin/outgoing-payments/${id}/`, { method: 'DELETE' }),

  setOutgoingPaymentRequests: (id: number, requestIds: number[]) =>
    request<OutgoingPayment>(`/admin/outgoing-payments/${id}/`, { method: 'PATCH', body: JSON.stringify({ request_ids: requestIds }) }),

  getOutgoingPaymentDocuments: (id: number) =>
    request<OutgoingPaymentDocumentItem[]>(`/admin/outgoing-payments/${id}/documents/`),

  uploadOutgoingPaymentDocument: (id: number, file: File) =>
    uploadPlainFile<OutgoingPaymentDocumentItem>(`/admin/outgoing-payments/${id}/documents/`, file),

  deleteOutgoingPaymentDocument: (docId: number) =>
    request<void>(`/admin/outgoing-payment-documents/${docId}/`, { method: 'DELETE' }),
}
