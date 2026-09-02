import { cn } from "@/lib/utils"

const COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
]

export function pickColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return COLORS[hash % COLORS.length]
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

interface OrgBadgeProps {
  name: string
  className?: string
}

export function OrgBadge({ name, className }: OrgBadgeProps) {
  const color = pickColor(name)
  const initials = getInitials(name)

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none",
        color
      )}>
        {initials}
      </span>
      <span className="max-w-[160px] truncate text-sm font-medium">{name}</span>
    </span>
  )
}
