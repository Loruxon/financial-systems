import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BlockCard, BlockCardHeader, BlockCardContent, BlockCardFooter } from "./block-card"

export { BlockCard as SideCard }

export function SideCardHeader({ icon, title }: { icon?: ReactNode; title: string }) {
  return <BlockCardHeader icon={icon} title={title} className="px-5" />
}

export function SideCardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <BlockCardContent className={cn("px-5", className)}>{children}</BlockCardContent>
}

export function SideCardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <BlockCardFooter className={cn("px-5", className)}>{children}</BlockCardFooter>
}

export function SideCardRow({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 px-5 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium text-right", mono && "font-mono tabular-nums")}>{children}</span>
    </div>
  )
}
