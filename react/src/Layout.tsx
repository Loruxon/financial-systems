import { Outlet, useLocation } from "react-router"
import { AppSidebar } from "@/components/app-sidebar"
import { Rates } from "@/components/header/rates"
import { Notifications } from "@/components/header/notifications"
import { AdminNotifications } from "@/components/header/admin-notifications"
import { RecipientBalancesBar } from "@/components/admin/recipient-balances-bar"
import { useAuth } from "@/lib/auth-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

// Только "/admin/<раздел>" (списки) — не "/admin/<раздел>/<id>" (детальные
// страницы, например заявка внутри "Заявки"), где панель балансов ни к чему.
const isAdminIndexPath = (pathname: string) => /^\/admin\/[^/]+\/?$/.test(pathname)

export default function Layout() {
  const { isAdmin } = useAuth()
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 shadow-xs">
          {!isAdmin && <Notifications />}
          {isAdmin && <AdminNotifications />}
          <div className="flex-1" />
          <Rates />
        </header>
        {/* Общий для всей админки блок балансов счетов — один компонент вместо
            дублирования на каждой странице списка. */}
        {isAdmin && isAdminIndexPath(pathname) && <RecipientBalancesBar />}
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}