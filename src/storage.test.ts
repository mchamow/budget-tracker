import { beforeEach, describe, expect, it } from 'vitest'
import { sampleState } from './reducer'
import { load, save, STORAGE_KEY } from './storage'

const today = '2026-10-24'
const put = (value: unknown) => localStorage.setItem(STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value))

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('opens the sample on a first visit or unreadable data', () => {
    expect(load(today)).toEqual(sampleState(today))
    put('{not json')
    expect(load(today)).toEqual(sampleState(today))
    put('[1,2]')
    expect(load(today).transactions).toEqual(sampleState(today).transactions)
  })

  it('round-trips a saved state, including an empty one', () => {
    const state = { transactions: [], budgets: {}, currency: 'PLN' as const }
    save(state)
    expect(load(today)).toEqual(state)
  })

  it('drops malformed transactions and budgets, keeping the rest', () => {
    const good = { id: 'a', kind: 'expense', amount: 500, category: 'food', date: '2026-10-01', note: 'Snack' }
    put({
      currency: 'XXX',
      budgets: { food: 1000, fun: -5, nope: 10, bills: '20' },
      transactions: [
        good,
        { ...good }, // repeated id
        { ...good, id: 'b', amount: 1.5 },
        { ...good, id: 'c', category: 'salary' }, // an income category on an expense
        { ...good, id: 'd', date: '2026-02-31' },
        { ...good, id: 'e', kind: 'gift' },
        { ...good, id: 'f', note: 42 },
        'junk',
      ],
    })
    const state = load(today)
    expect(state.transactions).toEqual([good, { ...good, id: 'f', note: '' }])
    expect(state.budgets).toEqual({ food: 1000 })
    expect(state.currency).toBe('USD')
  })

  it('keeps working when storage throws', () => {
    const broken = { setItem: () => { throw new Error('full') }, getItem: () => { throw new Error('blocked') } } as unknown as Storage
    expect(() => save(sampleState(today), broken)).not.toThrow()
  })
})
