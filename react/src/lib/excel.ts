import * as XLSX from 'xlsx'

export interface ExcelColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
  width?: number
}

export function downloadXlsx<T>(rows: T[], columns: ExcelColumn<T>[], filename: string) {
  const data = rows.map(row =>
    Object.fromEntries(columns.map(col => [col.header, col.value(row) ?? '']))
  )

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = columns.map(col => ({ wch: col.width ?? 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Заявки')
  XLSX.writeFile(wb, filename)
}
