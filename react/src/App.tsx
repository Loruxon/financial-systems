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

const logtoConfig: LogtoConfig = {
  endpoint: 'https://auth.board.fbridge.pro/',
  appId: 'umogkzm8lsq0tein7he9v',
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
    <AuthContext.Provider value={{ isAdmin, userName, userEmail, percentClient }}>
      {children}
    </AuthContext.Provider>
  )
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/request" replace />
  return <>{children}</>
}

function ClientGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (isAdmin) return <Navigate to="/admin/requests" replace />
  return <>{children}</>
}

function DefaultRedirect() {
  const { isAdmin } = useAuth()
  return <Navigate to={isAdmin ? "/admin/requests" : "/request"} replace />
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
            <Route path="admin/requests" element={<AdminGuard><AdminRequestsPage /></AdminGuard>} />
            <Route path="admin/requests/:id" element={<AdminGuard><AdminRequestDetailPage /></AdminGuard>} />
            <Route path="admin/payment-confirmations" element={<AdminGuard><AdminPaymentConfirmationsPage /></AdminGuard>} />
            <Route path="admin/transfers" element={<AdminGuard><AdminTransfersPage /></AdminGuard>} />
            <Route path="admin/incoming-payments" element={<AdminGuard><AdminIncomingPaymentsPage /></AdminGuard>} />
            <Route path="admin/organization-balances" element={<AdminGuard><AdminOrganizationBalancesPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments" element={<AdminGuard><AdminOutgoingPaymentsPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments/add" element={<AdminGuard><AdminOutgoingPaymentAddPage /></AdminGuard>} />
            <Route path="admin/outgoing-payments/:id" element={<AdminGuard><AdminOutgoingPaymentDetailPage /></AdminGuard>} />
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
