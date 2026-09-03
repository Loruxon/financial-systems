import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { LogtoProvider, UserScope, useLogto } from '@logto/react'
import type { LogtoConfig } from '@logto/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Spinner } from '@/components/ui/spinner'
import Layout from './Layout'
import RequestPage from './pages/request'
import RequestAddPage from './pages/request/add'
import CounterpartyPage from './pages/counterparty'
import CounterpartyDetailPage from './pages/counterparty/detail'
import StatementPage from './pages/statement'
import RequestDetailPage from './pages/request/detail'
import AdminRequestsPage from './pages/admin/requests'
import AdminRequestDetailPage from './pages/admin/requests/detail'
import AdminPaymentConfirmationsPage from './pages/admin/payment-confirmations'
import AdminTransfersPage from './pages/admin/transfers'
import AdminIncomingPaymentsPage from './pages/admin/incoming-payments'
import AdminOrganizationBalancesPage from './pages/admin/organization-balances'
import AdminOutgoingPaymentsPage from './pages/admin/outgoing-payments'
import AdminOutgoingPaymentAddPage from './pages/admin/outgoing-payments/add'
import AdminOutgoingPaymentDetailPage from './pages/admin/outgoing-payments/detail'
import CallbackPage from './pages/callback'
import { initAuth, api } from './lib/api'
import { AuthContext, useAuth } from './lib/auth-context'
import { adminNav } from './components/app-sidebar'

const logtoConfig: LogtoConfig = {
  endpoint: 'https://auth.board.fbridge.pro/',
  appId: 'wjo13o1qyuongubiyndor',
  scopes: [UserScope.Organizations, UserScope.OrganizationRoles, UserScope.Profile, UserScope.Email],
  resources: ['https://api.board.fbridge.pro'],
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, signIn, getOrganizationToken, getIdTokenClaims } = useLogto()
  const [tokenReady, setTokenReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [percentClient, setPercentClient] = useState<string | null>(null)
  const [adminSections, setAdminSections] = useState<string[]>([])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      signIn('https://app.board.fbridge.pro/callback')
    }
  }, [isAuthenticated, isLoading, signIn])

  useEffect(() => {
    if (!isAuthenticated) {
      setTokenReady(false)
      return
    }
    getIdTokenClaims().then(async (claims) => {
      const typedClaims = claims as { organizations?: string[]; organization_roles?: string[]; name?: string; email?: string }
      const orgId = typedClaims?.organizations?.[0]
      if (orgId) {
        initAuth(() => getOrganizationToken(orgId))
        try {
          const me = await api.getMe()
          setIsAdmin(me.auth.is_admin)
          setPercentClient(me.organization?.percent_client ?? null)
          setAdminSections(me.admin_sections)
        } catch {
          setIsAdmin(false)
        }
      }
      setUserName(typedClaims?.name || typedClaims?.email || null)
      setUserEmail(typedClaims?.email || null)
      setTokenReady(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  if (!tokenReady) return <div className="flex min-h-screen items-center justify-center"><Spinner className="size-6 text-muted-foreground" /></div>
  return (
    <AuthContext.Provider value={{ isAdmin, userName, userEmail, percentClient, adminSections }}>
      {children}
    </AuthContext.Provider>
  )
}

function firstAvailableAdminUrl(adminSections: string[]) {
  return adminNav.find((item) => adminSections.includes(item.section))?.url ?? "/request"
}

// section — опционален: если указан, доступ есть только у админов, которым
// открыт именно этот раздел (ограниченный админ не должен пройти по прямой
// ссылке в раздел, скрытый у него из меню). Реальная защита данных всё равно
// на бэкенде — это только клиентский UX, чтобы не показывать пустой экран.
function AdminGuard({ children, section }: { children: React.ReactNode; section?: string }) {
  const { isAdmin, adminSections } = useAuth()
  if (!isAdmin) return <Navigate to="/request" replace />
  if (section && !adminSections.includes(section)) {
    return <Navigate to={firstAvailableAdminUrl(adminSections)} replace />
  }
  return <>{children}</>
}

function ClientGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, adminSections } = useAuth()
  if (isAdmin) return <Navigate to={firstAvailableAdminUrl(adminSections)} replace />
  return <>{children}</>
}

function DefaultRedirect() {
  const { isAdmin, adminSections } = useAuth()
  return <Navigate to={isAdmin ? firstAvailableAdminUrl(adminSections) : "/request"} replace />
}

const App = () => (
  <LogtoProvider config={logtoConfig}>
    <TooltipProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="request" element={<ClientGuard><RequestPage /></ClientGuard>} />
            <Route path="request/add" element={<ClientGuard><RequestAddPage /></ClientGuard>} />
            <Route path="request/:id" element={<ClientGuard><RequestDetailPage /></ClientGuard>} />
            <Route path="counterparty" element={<ClientGuard><CounterpartyPage /></ClientGuard>} />
            <Route path="counterparty/:id" element={<ClientGuard><CounterpartyDetailPage /></ClientGuard>} />
            <Route path="statement" element={<ClientGuard><StatementPage /></ClientGuard>} />
            <Route path="admin/requests" element={<AdminGuard section="requests"><AdminRequestsPage /></AdminGuard>} />
            <Route path="admin/requests/:id" element={<AdminGuard section="requests"><AdminRequestDetailPage /></AdminGuard>} />
            <Route path="admin/payment-confirmations" element={<AdminGuard section="payment_confirmations"><AdminPaymentConfirmationsPage /></AdminGuard>} />
            <Route path="admin/transfers" element={<AdminGuard section="transfers"><AdminTransfersPage /></AdminGuard>} />
            <Route path="admin/incoming-payments" element={<AdminGuard section="incoming_payments"><AdminIncomingPaymentsPage /></AdminGuard>} />
            <Route path="admin/organization-balances" element={<AdminGuard section="organization_balances"><AdminOrganizationBalancesPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments" element={<AdminGuard section="outgoing_payments"><AdminOutgoingPaymentsPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments/add" element={<AdminGuard section="outgoing_payments"><AdminOutgoingPaymentAddPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments/:id" element={<AdminGuard section="outgoing_payments"><AdminOutgoingPaymentDetailPage /></AdminGuard>} />
            {/* Редиректы со старых путей — на случай сохранённых закладок */}
            <Route path="admin/statement" element={<Navigate to="/admin/payment-confirmations" replace />} />
            <Route path="admin/receipts" element={<Navigate to="/admin/incoming-payments" replace />} />
            <Route path="*" element={<DefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </LogtoProvider>
)

export default App
