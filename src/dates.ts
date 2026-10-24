/** A calendar month as `YYYY-MM`; dates are `YYYY-MM-DD`, the format of `<input type="date">`. */
export type MonthKey = string

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const pad = (n: number) => String(n).padStart(2, '0')

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false
  const date = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v
}

export const isMonthKey = (v: unknown): v is MonthKey => typeof v === 'string' && isIsoDate(`${v}-01`)

/** Today's local date. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const monthOf = (iso: string): MonthKey => iso.slice(0, 7)

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + n
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

/** The `count` months ending with `last`, oldest first. */
export function monthsEnding(last: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => addMonths(last, i - count + 1))
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`)

export function formatMonth(month: MonthKey, style: 'long' | 'short' = 'long'): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'long' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' }
  return new Intl.DateTimeFormat('en-US', options).format(utc(`${month}-01`))
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    utc(iso),
  )
}
