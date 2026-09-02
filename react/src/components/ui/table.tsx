import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t-2 border-foreground bg-muted font-semibold [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/70 has-aria-expanded:bg-muted/40 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, align = "left", ...props }: React.ComponentProps<"th"> & { align?: "left" | "right" }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-5 py-4 align-middle text-xs font-semibold uppercase tracking-wider text-foreground-secondary whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border/60",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, align = "left", ...props }: React.ComponentProps<"td"> & { align?: "left" | "right" }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-5 py-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border/60",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
