import * as React from "react"
import { useNavigate } from "react-router"
import type { ColumnDef, ColumnFiltersState, OnChangeFn, PaginationState, RowData, SortingState, VisibilityState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    // Числовые колонки (суммы) выравниваются по правому краю — задаётся
    // один раз в columnDef.meta, применяется централизованно в TableHead/TableCell.
    align?: "left" | "right"
  }
}

const PAGE_SIZES = [10, 20, 50, 100]

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  getRowUrl?: (row: TData) => string
  columnLabels?: Record<string, string>
  defaultColumnVisibility?: VisibilityState
  filterColumn?: string
  filterPlaceholder?: string
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  onExport?: (rows: TData[]) => void
  defaultPageSize?: number
  toolbarLeft?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowUrl,
  columnLabels,
  defaultColumnVisibility = {},
  filterColumn,
  filterPlaceholder = "Поиск...",
  columnFilters: columnFiltersProp,
  onColumnFiltersChange,
  onExport,
  defaultPageSize = 20,
  toolbarLeft,
}: DataTableProps<TData, TValue>) {
  const navigate = useNavigate()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([])
  const columnFilters = columnFiltersProp ?? internalColumnFilters
  const setColumnFilters: OnChangeFn<ColumnFiltersState> = onColumnFiltersChange ?? setInternalColumnFilters
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(defaultColumnVisibility)
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize })

  // Reset to first page when filters change
  React.useEffect(() => { setPagination((p) => ({ ...p, pageIndex: 0 })) }, [columnFilters])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-3">
        {toolbarLeft}
        {filterColumn && (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn(filterColumn)?.setFilterValue(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-[#217346]/40 bg-[#217346]/5 text-[#217346] hover:bg-[#217346]/10 hover:border-[#217346]/60 hover:text-[#217346]"
            onClick={() => onExport(table.getFilteredRowModel().rows.map(r => r.original))}
          >
            <FileSpreadsheet data-icon="inline-start" /> Excel
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9 rounded-lg text-muted-foreground hover:text-foreground">
              <SlidersHorizontal data-icon="inline-start" /> Колонки <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabels?.[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40 border-b-2 border-border">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} align={header.column.columnDef.meta?.align}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={getRowUrl ? "cursor-pointer" : ""}
                  onClick={getRowUrl ? () => navigate(getRowUrl(row.original)) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} align={cell.column.columnDef.meta?.align}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <Empty className="py-12">
                    <EmptyHeader>
                      <EmptyTitle>Записей не найдено</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {table.getFooterGroups().some((fg) => fg.headers.some((h) => h.column.columnDef.footer)) && (
            <TableFooter>
              {table.getFooterGroups().map((footerGroup) => (
                <TableRow key={footerGroup.id} className="bg-muted hover:bg-muted font-semibold">
                  {footerGroup.headers.map((header) => (
                    <TableCell key={header.id} align={header.column.columnDef.meta?.align}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.footer, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Строк на странице</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: parseInt(v) })}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, table.getFilteredRowModel().rows.length)} из {table.getFilteredRowModel().rows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums px-1">
                {pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
