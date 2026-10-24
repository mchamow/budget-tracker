/** Currencies on offer, each written the way its home locale writes it (1,234.56 $ vs 1.234,56 €). */
export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', name: 'British pound', locale: 'en-GB' },
  { code: 'PLN', name: 'Polish złoty', locale: 'pl-PL' },
  { code: 'CHF', name: 'Swiss franc', locale: 'de-CH' },
  { code: 'JPY', name: 'Japanese yen', locale: 'ja-JP' },
  { code: 'CAD', name: 'Canadian dollar', locale: 'en-CA' },
  { code: 'INR', name: 'Indian rupee', locale: 'en-IN' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const isCurrency = (v: unknown): v is CurrencyCode => CURRENCIES.some((c) => c.code === v)

export const localeOf = (code: CurrencyCode): string => CURRENCIES.find((c) => c.code === code)!.locale

/** Digits after the decimal point: 2 for most currencies, 0 for the yen. */
export function fractionDigits(code: CurrencyCode): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2
}

/**
 * Reads what someone typed into an amount field as whole minor units (cents), or null if it isn't a
 * positive amount. Accepts `12`, `12.5`, `12,50` and `1,234.56`; rounds anything finer than the
 * currency allows. Shifting the exponent in the string sidesteps float error (1.005 * 100 is 100.4999…).
 */
export function parseAmount(input: string, code: CurrencyCode): number | null {
  let s = input.replace(/\s/g, '')
  if (!s) return null
  // One separator followed by 1–2 digits at the end is a decimal comma; any other comma groups thousands.
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  else s = s.replace(/,(?=\d{3}(\D|$))/g, '')
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null
  const minor = Math.round(Number(`${s}e${fractionDigits(code)}`))
  return minor > 0 && Number.isSafeInteger(minor) ? minor : null
}

/** Minor units back to the plain number an amount field shows (`1234.5` → `1234.50`). */
export function toInput(minor: number, code: CurrencyCode): string {
  const digits = fractionDigits(code)
  return (minor / 10 ** digits).toFixed(digits)
}

export function formatMoney(minor: number, code: CurrencyCode): string {
  return new Intl.NumberFormat(localeOf(code), { style: 'currency', currency: code }).format(
    minor / 10 ** fractionDigits(code),
  )
}

/** Short form for axis ticks and tight labels: `$1.2K`, `$12K`, `$0`. */
export function formatCompact(minor: number, code: CurrencyCode): string {
  return new Intl.NumberFormat(localeOf(code), {
    style: 'currency',
    currency: code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(minor / 10 ** fractionDigits(code))
}
