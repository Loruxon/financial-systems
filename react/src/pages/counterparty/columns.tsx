import type { ColumnDef } from "@tanstack/react-table"
import type { Counterparty } from "@/lib/api"
import { SortHeader } from "@/components/sort-header"
import { TruncatedText } from "@/components/truncated-text"

export const columns: ColumnDef<Counterparty>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => <SortHeader column={column}>ID</SortHeader>,
  },
  {
    accessorKey: "name",
    header: "Контрагент",
    cell: ({ row }) => (
      <TruncatedText className="max-w-[240px] text-sm font-medium">{row.original.name}</TruncatedText>
    ),
  },
  {
    accessorKey: "address",
    header: "Адрес",
    cell: ({ row }) => (
      <TruncatedText className="max-w-[300px] text-sm text-muted-foreground">{row.original.address}</TruncatedText>
    ),
  },
]
