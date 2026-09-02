import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

export function BlockCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card overflow-hidden border border-border/60 shadow-none transition-shadow hover:shadow-sm", className)}>
      {children}
    </div>
  )
}

export function BlockCardHeader({
  icon,
  title,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border/50 px-6 py-3.5", className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground">
            {icon}
          </span>
        )}
        <span className="flex items-baseline gap-2 text-sm font-semibold tracking-wide">{title}</span>
      </div>
      {action}
    </div>
  )
}

export function BlockCardRow({ label, children, action, mono }: { label: string; children: ReactNode; action?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center border-b border-border/40 last:border-0 px-6 py-3 transition-colors hover:bg-muted/30">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={cn("flex-1 text-sm font-medium", mono && "font-mono tabular-nums")}>{children}</span>
      {action}
    </div>
  )
}

export function BlockCardFileRow({
  icon,
  name,
  meta,
  progress,
  tag,
  actions,
}: {
  icon?: ReactNode
  name: string
  meta?: string
  progress?: number
  tag?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="group flex items-center gap-3 border-b last:border-0 px-6 py-3">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {progress !== undefined ? (
          <Progress value={progress} className="mt-1.5" />
        ) : meta ? (
          <p className="text-xs text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      {tag}
      {actions && (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  )
}

export function BlockCardTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full">
      {children}
    </table>
  )
}

export function BlockCardTableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b">
        {columns.map((col) => (
          <th key={col} className="py-2.5 pr-6 first:pl-6 text-left text-sm font-normal text-muted-foreground">{col}</th>
        ))}
      </tr>
    </thead>
  )
}

export function BlockCardContent({ children, className, locked, lockedMessage = "Недоступно для редактирования" }: {
  children: ReactNode
  className?: string
  locked?: boolean
  lockedMessage?: string
}) {
  return (
    <div className="relative">
      <div className={cn("px-6 py-5", className, locked && "pointer-events-none select-none opacity-40 blur-[1.5px]")}>
        {children}
      </div>
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-background/40">
          <Lock className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{lockedMessage}</span>
        </div>
      )}
    </div>
  )
}

export function BlockCardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-t px-6 py-4", className)}>
      {children}
    </div>
  )
}
