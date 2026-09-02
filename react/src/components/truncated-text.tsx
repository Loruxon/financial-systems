import { useEffect, useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, EMPTY_CELL } from "@/lib/utils"

interface TruncatedTextProps {
  children: string | null | undefined
  className?: string
}

// Общий паттерн для текстовых ячеек с произвольными названиями сущностей
// (контрагент, банк, плательщик, получатель и т.п.) — обрезает многоточием
// (max-width задаётся снаружи через className) и показывает tooltip с
// полным значением, но только если текст реально не поместился — иначе
// это было бы лишним взаимодействием на пустом месте.
//
// Пустое значение — это "—" (единое правило для всех таблиц), а не пустое
// место: так каждый вызывающий не должен сам помнить проверить null/"" —
// достаточно передать значение как есть.
export function TruncatedText({ children, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const isEmpty = children === null || children === undefined || children === ""

  useEffect(() => {
    if (isEmpty) return
    const el = ref.current
    if (!el) return
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children, isEmpty])

  if (isEmpty) {
    return <span className={cn("block truncate text-muted-foreground", className)}>{EMPTY_CELL}</span>
  }

  const content = (
    <span ref={ref} className={cn("block truncate", className)}>
      {children}
    </span>
  )

  if (!isTruncated) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
