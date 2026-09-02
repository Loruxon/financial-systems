export const CURRENCIES = ["CNY", "USD", "EUR"] as const
export type Currency = typeof CURRENCIES[number]

// Все счета — внутренние RUB-счета одной компании без валюты/типа как
// различающего признака, поэтому используем единый акцент вместо
// произвольного цвета по позиции в списке (который к тому же "плавал"
// при пересортировке счетов по балансу).
export const RECIPIENT_ACCENT = {
  // Нейтральный акцент — карточки счетов не несут смысловой нагрузки
  // (не статус/не сумма), поэтому используют --foreground при низкой
  // насыщенности, а не --primary как декоративный "фирменный" цвет.
  bar: "bg-foreground/10",
  iconBg: "bg-muted",
  iconColor: "text-foreground",
  amount: "text-primary",
} as const

export const RECIPIENT_SLOTS = 4
