import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  badge?: ReactNode
  back?: { label: string; href: string }
}

export function PageHeader({ title, description, action, badge, back }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          to={back.href}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {badge && <div className="mt-2 flex items-center gap-2 flex-wrap">{badge}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
