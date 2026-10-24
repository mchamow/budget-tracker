import type { Budgets, Transaction } from './budget'
import { fractionDigits, type CurrencyCode } from './money'
import { SAMPLE_BUDGETS, sampleTransactions } from './sample'

export interface State {
  transactions: Transaction[]
  budgets: Budgets
  currency: CurrencyCode
}

export type Draft = Omit<Transaction, 'id'>

export type Action =
  | { type: 'add'; id: string; draft: Draft }
  | { type: 'update'; id: string; draft: Draft }
  | { type: 'remove'; id: string }
  | { type: 'restore'; transaction: Transaction }
  | { type: 'setBudget'; category: string; limit: number | null }
  | { type: 'setCurrency'; currency: CurrencyCode }
  | { type: 'clear' }
  | { type: 'loadSample'; today: string }

export const sampleState = (today: string): State => ({
  transactions: sampleTransactions(today),
  budgets: SAMPLE_BUDGETS,
  currency: 'USD',
})

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, transactions: [...state.transactions, { ...action.draft, id: action.id }] }
    case 'update':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.id ? { ...action.draft, id: t.id } : t)),
      }
    case 'remove':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) }
    case 'restore':
      if (state.transactions.some((t) => t.id === action.transaction.id)) return state
      return { ...state, transactions: [...state.transactions, action.transaction] }
    case 'setBudget': {
      const { [action.category]: _, ...rest } = state.budgets
      return { ...state, budgets: action.limit && action.limit > 0 ? { ...rest, [action.category]: action.limit } : rest }
    }
    case 'setCurrency': {
      // Amounts are minor units, so moving between cents and whole yen rescales them.
      const scale = 10 ** (fractionDigits(action.currency) - fractionDigits(state.currency))
      const rescale = (minor: number) => Math.max(1, Math.round(minor * scale))
      return {
        currency: action.currency,
        transactions: state.transactions.map((t) => ({ ...t, amount: rescale(t.amount) })),
        budgets: Object.fromEntries(Object.entries(state.budgets).map(([id, limit]) => [id, rescale(limit)])),
      }
    }
    case 'clear':
      return { ...state, transactions: [], budgets: {} }
    case 'loadSample':
      return reducer(sampleState(action.today), { type: 'setCurrency', currency: state.currency })
  }
}
