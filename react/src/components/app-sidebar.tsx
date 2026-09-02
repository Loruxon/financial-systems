import { useEffect, useState, type ComponentProps } from "react"
import { Link, useLocation } from "react-router"
import { useLogto } from "@logto/react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ClipboardList, Building2, ShieldCheck, LogOut, ScrollText, ArrowLeftRight, Repeat2, TrendingUp, ChevronsUpDown, Landmark, Wallet, Send, Sun, Moon, Monitor } from "lucide-react"
import { SidebarBalance } from "@/components/sidebar/balance"

const THEME_OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Светлая" },
  { value: "dark" as const, icon: Moon, label: "Тёмная" },
  { value: "system" as const, icon: Monitor, label: "Системная" },
]

// Сегмент-контрол темы — тот же визуальный паттерн, что и у переключателя
// валюты/типа счёта (приглушённый контейнер + приподнятый активный сегмент
// с тенью), но на токенах --sidebar-*, а не --muted/--card: меню триггера
// живёт в постоянно тёмном сайдбаре независимо от текущей темы контента,
// поэтому обычные светлые токены здесь выглядели бы чужеродно.
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center justify-between gap-2 px-1.5 py-1">
      <span className="text-sm text-sidebar-foreground/80">Тема</span>
      <div className="flex items-center gap-0.5 rounded-md bg-sidebar-idle p-0.5">
        {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-6 items-center justify-center rounded transition-colors",
              theme === value
                ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  )
}

const nav = [
  { title: "Заявки",      url: "/request",     icon: ClipboardList },
  { title: "Контрагенты", url: "/counterparty", icon: Building2     },
  { title: "Выписка",     url: "/statement",   icon: ScrollText    },
]

// section — ключ раздела с бэкенда (/api/me/ → admin_sections), по которому
// решаем, показывать ли пункт меню ограниченному админу.
export const adminNav = [
  { title: "Заявки",                    url: "/admin/requests",              icon: ShieldCheck,    section: "requests"               },
  { title: "Подтверждение поступлений", url: "/admin/payment-confirmations", icon: ArrowLeftRight, section: "payment_confirmations"  },
  { title: "Переводы",                  url: "/admin/transfers",             icon: Repeat2,        section: "transfers"              },
  { title: "Поступления",               url: "/admin/incoming-payments",     icon: TrendingUp,     section: "incoming_payments"      },
  { title: "Исходящие платежи",         url: "/admin/outgoing-payments",     icon: Send,           section: "outgoing_payments"      },
  { title: "Балансы организаций",       url: "/admin/organization-balances", icon: Wallet,         section: "organization_balances"  },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { signOut, getIdTokenClaims } = useLogto()
  const { isAdmin, adminSections } = useAuth()
  const visibleAdminNav = adminNav.filter((item) => adminSections.includes(item.section))
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string; picture?: string } | null>(null)

  useEffect(() => {
    getIdTokenClaims().then((claims) => {
      if (claims) setUserInfo({
        name: claims.name ?? undefined,
        email: claims.email ?? undefined,
        picture: claims.picture ?? undefined,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initials = userInfo?.name
    ? userInfo.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : userInfo?.email
    ? userInfo.email[0].toUpperCase()
    : "?"

  const isActive = (url: string) => {
    if (pathname === url) return true
    const allItems = [...nav, ...adminNav]
    if (allItems.some((i) => i.url !== url && pathname === i.url)) return false
    return pathname.startsWith(url + "/")
  }

  return (
    <Sidebar collapsible="icon" {...props}>

      {/* Логотип */}
      <SidebarHeader className="border-b-0">
        <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-4" />
          </div>
        </div>

        <div className="px-3 pt-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="size-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-['Inter'] text-[13px] font-semibold tracking-wide text-sidebar-foreground select-none">
                ФИНАНСОВЫЕ
              </span>
              <span className="font-['Inter'] text-[13px] font-semibold tracking-wide text-sidebar-foreground select-none">
                СИСТЕМЫ
              </span>
            </div>
          </div>
          <div className="mt-3.5 mb-1 h-px w-full bg-sidebar-border" />
        </div>
      </SidebarHeader>

      {/* Навигация */}
      <SidebarContent className="overflow-x-hidden pt-2">
        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {nav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="[&_svg]:!size-5 group-data-[collapsible=icon]:[&_svg]:!size-4"
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-sidebar-foreground/60 px-2">
              Администрирование
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {visibleAdminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="[&_svg]:!size-5 group-data-[collapsible=icon]:[&_svg]:!size-4"
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    tooltip="Баланс"
                    className="h-auto items-stretch rounded-lg p-3 text-left"
                  >
                    <SidebarBalance />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Пользователь */}
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={userInfo?.name ?? "Пользователь"} className="rounded-lg">
                  <Avatar className="size-7 rounded-full overflow-hidden">
                    <AvatarImage src={userInfo?.picture} alt={userInfo?.name} className="rounded-full" />
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[13px] font-medium">
                      {userInfo?.name ?? "Пользователь"}
                    </span>
                    <span className="truncate text-[11px] text-sidebar-foreground/60">
                      {userInfo?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-64 border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg"
              >
                {/* Шапка — тот же аватар/имя/email, что и в триггере, для ясности контекста */}
                <div className="flex items-center gap-2.5 px-2 py-2">
                  <Avatar className="size-8 shrink-0 rounded-full overflow-hidden">
                    <AvatarImage src={userInfo?.picture} alt={userInfo?.name} className="rounded-full" />
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-[13px] font-medium">
                      {userInfo?.name ?? "Пользователь"}
                    </span>
                    <span className="truncate text-[11px] text-sidebar-foreground/60">
                      {userInfo?.email}
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator className="bg-sidebar-border" />

                <ThemeToggle />

                {/* Сюда позже добавится группа Настройки/Профиль — со своим
                    разделителем перед "Выйти", когда такие пункты появятся. */}

                <DropdownMenuSeparator className="bg-sidebar-border" />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut("https://app.board.fbridge.pro")}
                >
                  <LogOut />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
