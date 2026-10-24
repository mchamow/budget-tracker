import { categoryById, EXPENSE_CATEGORIES, type Kind } from './categories'
import { monthOf, monthsEnding, type MonthKey } from './dates'
import { fractionDigits, type CurrencyCode } from './money'

export interface Transaction {
  id: string
  kind: Kind
  /** Whole minor units (cents), always positive; `kind` says which way it went. */
  amount: number
  category: string
  date: string
  note: string
}

/** Monthly limits per expense category, in minor units. A missing category has no budget. */
export type Budgets = Record<string, number>

export interface Totals {
  income: number
  spending: number
  net: number
}

export const inMonth = (transactions: Transaction[], month: MonthKey) =>
  transactions.filter((t) => monthOf(t.date) === month)

export function totals(transactions: Transaction[], month: MonthKey): Totals {
  let income = 0
  let spending = 0
  for (const t of inMonth(transactions, month)) {
    if (t.kind === 'income') income += t.amount
    else spending += t.amount
  }
  return { income, spending, net: income - spending }
}

/** Spending per expense category for the month, in the categories' fixed order (so colors stay put). */
export function spendingByCategory(transactions: Transaction[], month: MonthKey): Record<string, number> {
  const sums: Record<string, number> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, 0]))
  for (const t of inMonth(transactions, month)) {
    if (t.kind === 'expense' && t.category in sums) sums[t.category] += t.amount
  }
  return sums
}

export interface MonthPoint extends Totals {
  month: MonthKey
  byCategory: Record<string, number>
}

/** One point per month for the `count` months ending with `last`, oldest first. */
export function monthlySeries(transactions: Transaction[], last: MonthKey, count: number): MonthPoint[] {
  return monthsEnding(last, count).map((month) => ({
    month,
    ...totals(transactions, month),
    byCategory: spendingByCategory(transactions, month),
  }))
}

export type BudgetState = 'ok' | 'near' | 'over'

/** Past this share of the limit a budget shows a warning. */
export const NEAR_LIMIT = 0.8

export function budgetStatus(spent: number, limit: number): { state: BudgetState; ratio: number; remaining: number } {
  const ratio = limit > 0 ? spent / limit : 0
  const state: BudgetState = spent > limit ? 'over' : ratio >= NEAR_LIMIT ? 'near' : 'ok'
  return { state, ratio, remaining: limit - spent }
}

export interface Filters {
  query: string
  kind: 'all' | Kind
  category: 'all' | string
}

export const NO_FILTERS: Filters = { query: '', kind: 'all', category: 'all' }

/** The month's transactions that match the filters, newest first (later-added first on the same day). */
export function filterTransactions(transactions: Transaction[], month: MonthKey, filters: Filters): Transaction[] {
  const query = filters.query.trim().toLowerCase()
  return inMonth(transactions, month)
    .filter((t) => filters.kind === 'all' || t.kind === filters.kind)
    .filter((t) => filters.category === 'all' || t.category === filters.category)
    .filter(
      (t) =>
        !query ||
        t.note.toLowerCase().includes(query) ||
        (categoryById(t.category)?.label.toLowerCase().includes(query) ?? false),
    )
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Quotes a CSV field when needed, and defuses text a spreadsheet would run as a formula. */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(transactions: Transaction[], currency: CurrencyCode): string {
  const digits = fractionDigits(currency)
  const rows = transactions.map((t) =>
    [
      t.date,
      t.kind === 'income' ? 'Income' : 'Expense',
      categoryById(t.category)?.label ?? t.category,
      t.note,
      (t.amount / 10 ** digits).toFixed(digits),
    ]
      .map(csvField)
      .join(','),
  )
  return [`Date,Type,Category,Note,Amount (${currency})`, ...rows].join('\r\n') + '\r\n'
}

export const csvFileName = (month: MonthKey) => `budget-${month}.csv`
