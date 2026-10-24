import { describe, expect, it } from 'vitest'
import { reducer, sampleState, type Draft, type State } from './reducer'

const empty: State = { transactions: [], budgets: {}, currency: 'USD' }
const draft: Draft = { kind: 'expense', amount: 1250, category: 'food', date: '2026-10-05', note: 'Lunch' }

describe('reducer', () => {
  it('adds, updates and removes transactions', () => {
    let s = reducer(empty, { type: 'add', id: 'a', draft })
    expect(s.transactions).toEqual([{ ...draft, id: 'a' }])
    s = reducer(s, { type: 'update', id: 'a', draft: { ...draft, amount: 999 } })
    expect(s.transactions[0]).toMatchObject({ id: 'a', amount: 999 })
    s = reducer(s, { type: 'remove', id: 'a' })
    expect(s.transactions).toEqual([])
  })

  it('restores a deleted transaction once', () => {
    const t = { ...draft, id: 'a' }
    const s = reducer(empty, { type: 'restore', transaction: t })
    expect(reducer(s, { type: 'restore', transaction: t }).transactions).toHaveLength(1)
  })

  it('sets and clears budgets', () => {
    let s = reducer(empty, { type: 'setBudget', category: 'food', limit: 60000 })
    expect(s.budgets).toEqual({ food: 60000 })
    s = reducer(s, { type: 'setBudget', category: 'food', limit: null })
    expect(s.budgets).toEqual({})
  })

  it('rescales amounts when moving between cents and whole yen', () => {
    const s = reducer(
      { ...empty, transactions: [{ ...draft, id: 'a' }], budgets: { food: 60000 } },
      { type: 'setCurrency', currency: 'JPY' },
    )
    expect(s.transactions[0].amount).toBe(13)
    expect(s.budgets.food).toBe(600)
    expect(reducer(s, { type: 'setCurrency', currency: 'EUR' }).budgets.food).toBe(60000)
  })

  it('clears everything but the currency, and reloads the sample', () => {
    const sample = sampleState('2026-10-24')
    const cleared = reducer({ ...sample, currency: 'EUR' }, { type: 'clear' })
    expect(cleared).toEqual({ transactions: [], budgets: {}, currency: 'EUR' })
    const reloaded = reducer(cleared, { type: 'loadSample', today: '2026-10-24' })
    expect(reloaded.transactions).toEqual(sample.transactions)
    expect(reloaded.currency).toBe('EUR')
  })
})

describe('sample data', () => {
  it('covers six months and never runs past today', () => {
    const { transactions } = sampleState('2026-10-10')
    const months = new Set(transactions.map((t) => t.date.slice(0, 7)))
    expect([...months]).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(transactions.every((t) => t.date <= '2026-10-10' && Number.isInteger(t.amount) && t.amount > 0)).toBe(true)
    expect(new Set(transactions.map((t) => t.id)).size).toBe(transactions.length)
  })
})
