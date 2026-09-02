import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

// Достаёт файлы из буфера обмена — либо скопированные напрямую из
// файлового менеджера (clipboardData.files), либо вставленный скриншот/
// изображение (clipboardData.items, kind === "file"). Общая точка для всех
// мест, где можно вставить файл по Ctrl+V, а не только перетащить/выбрать.
export function filesFromClipboard(e: { clipboardData: DataTransfer | null }): File[] {
  const dt = e.clipboardData
  if (!dt) return []
  if (dt.files.length > 0) return Array.from(dt.files)
  const files: File[] = []
  for (const item of dt.items) {
    if (item.kind === "file") {
      const f = item.getAsFile()
      if (f) files.push(f)
    }
  }
  return files
}

export function fileNameFromUrl(url: string): string {
  const path = url.split('?')[0]
  const segment = path.split('/').pop() ?? ''
  return decodeURIComponent(segment)
}

export const isCompleteDate = (s: string) => /^\d{2}\.\d{2}\.\d{4}$/.test(s.trim())

export const toApiDate = (s: string) => {
  const parts = s.trim().split(".")
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return s.trim()
}

export const toApiDecimal = (s: string) => s.trim().replace(/\s/g, "").replace(",", ".")

// Единое правило для всех форм с react-hook-form: кнопка отправки может
// зависеть от formState.isValid и молча быть disabled с самого открытия
// формы, а вот красная рамка/текст ошибки под ПОЛЕМ должны появляться
// только после того, как пользователь реально взаимодействовал с ним
// (touched) или попытался отправить форму (isSubmitted) — иначе поля
// подсвечиваются ошибкой сразу при открытии, до какого-либо ввода.
export const showFieldError = (invalid: boolean, touched: boolean, submitted: boolean) =>
  invalid && (touched || submitted)

// Разбивает номер счёта/IBAN на группы по 4 символа пробелом, как принято для
// IBAN (DE89 3704 0044 0532 0130 00).
export const formatIban = (s: string) => s.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim()

// IBAN всегда начинается с 2-буквенного кода страны + 2 контрольные цифры
// (ISO 13616), например DE89.../IT10... — это надёжный признак, по которому
// можно отличить IBAN от обычного расчётного счёта без такой структуры.
const IBAN_PREFIX = /^[A-Za-z]{2}\d{2}/

// Единая точка форматирования номера счёта везде, где он показывается или
// вводится: группирует по 4 символа только то, что реально похоже на IBAN,
// остальные форматы счетов выводятся как есть (без выдуманной группировки).
export const formatAccountNumber = (s: string) => {
  const clean = s.replace(/\s/g, "")
  return IBAN_PREFIX.test(clean) ? formatIban(clean) : clean
}

const _numFmt = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtNum = (n: number | string): string => _numFmt.format(typeof n === "string" ? parseFloat(n) : n)

// Единое правило для всех ячеек таблиц: пустое значение — это "—", а не
// visually пустое место (иначе строка выглядит недогруженной/сломанной).
// Единственная точка, которую нужно поправить, если правило когда-нибудь
// изменится (например, другой символ прочерка).
export const EMPTY_CELL = "—"
export const formatCellValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === "" ? EMPTY_CELL : String(value)

export function plur(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100
  const mod10 = mod100 % 10
  if (mod100 >= 11 && mod100 <= 19) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
