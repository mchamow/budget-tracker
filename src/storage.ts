import type { Budgets, Transaction } from './budget'
import { EXPENSE_CATEGORIES, isCategoryOf } from './categories'
import { isIsoDate } from './dates'
import { isCurrency } from './money'
import { sampleState, type State } from './reducer'

export const STORAGE_KEY = 'budget-tracker'

export function save(state: State, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the tracker still works, it just won't remember this session.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isAmount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0

/** Keeps the well-formed transactions and drops the rest, along with any repeated ids. */
function readTransactions(v: unknown): Transaction[] | null {
  if (!Array.isArray(v)) return null
  const seen = new Set<string>()
  return v.flatMap((t): Transaction[] => {
    if (!isRecord(t) || typeof t.id !== 'string' || !t.id || seen.has(t.id)) return []
    const { id, kind, amount, category, date, note } = t
    if (kind !== 'income' && kind !== 'expense') return []
    if (!isAmount(amount) || !isCategoryOf(category, kind) || !isIsoDate(date)) return []
    seen.add(id)
    return [{ id, kind, amount, category, date, note: typeof note === 'string' ? note : '' }]
  })
}

function readBudgets(v: unknown): Budgets | null {
  if (!isRecord(v)) return null
  return Object.fromEntries(EXPENSE_CATEGORIES.filter((c) => isAmount(v[c.id])).map((c) => [c.id, v[c.id] as number]))
}

/**
 * Restores the saved tracker. A first visit (nothing saved) or unreadable data opens the sample;
 * otherwise each part falls back on its own and malformed transactions are dropped.
 */
export function load(today: string, storage: Storage = localStorage): State {
  const sample = sampleState(today)
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return sample
  }
  if (!isRecord(raw)) return sample
  return {
    transactions: readTransactions(raw.transactions) ?? sample.transactions,
    budgets: readBudgets(raw.budgets) ?? sample.budgets,
    currency: isCurrency(raw.currency) ? raw.currency : sample.currency,
  }
}
