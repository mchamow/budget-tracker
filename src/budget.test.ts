import { describe, expect, it } from 'vitest'
import {
  budgetStatus,
  csvFileName,
  filterTransactions,
  monthlySeries,
  NO_FILTERS,
  spendingByCategory,
  toCsv,
  totals,
  type Transaction,
} from './budget'

let n = 0
const tx = (date: string, kind: Transaction['kind'], category: string, amount: number, note = ''): Transaction => ({
  id: `t${++n}`,
  kind,
  category,
  amount,
  date,
  note,
})

const list = [
  tx('2026-10-01', 'income', 'salary', 400000, 'Paycheck'),
  tx('2026-10-01', 'expense', 'housing', 145000, 'Rent'),
  tx('2026-10-05', 'expense', 'food', 8000, 'Groceries'),
  tx('2026-10-05', 'expense', 'food', 2500, 'Lunch'),
  tx('2026-09-12', 'expense', 'fun', 3000, 'Cinema'),
  tx('2026-09-30', 'income', 'gifts', 5000, 'Birthday'),
]

describe('totals and breakdowns', () => {
  it('sums a month’s income, spending and net', () => {
    expect(totals(list, '2026-10')).toEqual({ income: 400000, spending: 155500, net: 244500 })
    expect(totals(list, '2026-08')).toEqual({ income: 0, spending: 0, net: 0 })
  })

  it('splits spending by category in fixed order', () => {
    const sums = spendingByCategory(list, '2026-10')
    expect(Object.keys(sums)).toEqual(['housing', 'food', 'transport', 'bills', 'fun', 'health', 'shopping', 'other'])
    expect(sums).toMatchObject({ housing: 145000, food: 10500, fun: 0 })
  })

  it('builds a month-by-month series, oldest first', () => {
    const series = monthlySeries(list, '2026-10', 3)
    expect(series.map((p) => p.month)).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(series[1]).toMatchObject({ income: 5000, spending: 3000, net: 2000 })
    expect(series[1].byCategory.fun).toBe(3000)
  })
})

describe('budgetStatus', () => {
  it('is fine under 80%, near from 80% up to the limit, over past it', () => {
    expect(budgetStatus(5000, 10000)).toEqual({ state: 'ok', ratio: 0.5, remaining: 5000 })
    expect(budgetStatus(8000, 10000).state).toBe('near')
    expect(budgetStatus(10000, 10000).state).toBe('near')
    expect(budgetStatus(12000, 10000)).toEqual({ state: 'over', ratio: 1.2, remaining: -2000 })
  })
})

describe('filterTransactions', () => {
  const notes = (filters = NO_FILTERS) => filterTransactions(list, '2026-10', filters).map((t) => t.note)

  it('lists the month newest first, later entries first on the same day', () => {
    expect(notes()).toEqual(['Lunch', 'Groceries', 'Rent', 'Paycheck'])
  })

  it('filters by type, category and search text (notes or category name)', () => {
    expect(notes({ ...NO_FILTERS, kind: 'income' })).toEqual(['Paycheck'])
    expect(notes({ ...NO_FILTERS, category: 'food' })).toEqual(['Lunch', 'Groceries'])
    expect(notes({ ...NO_FILTERS, query: '  RENT ' })).toEqual(['Rent'])
    expect(notes({ ...NO_FILTERS, query: 'housing' })).toEqual(['Rent'])
    expect(notes({ ...NO_FILTERS, kind: 'income', query: 'rent' })).toEqual([])
  })
})

describe('CSV export', () => {
  it('writes a header and one row per transaction', () => {
    const csv = toCsv([list[1], list[0]], 'USD')
    expect(csv).toBe(
      'Date,Type,Category,Note,Amount (USD)\r\n2026-10-01,Expense,Housing,Rent,1450.00\r\n2026-10-01,Income,Salary,Paycheck,4000.00\r\n',
    )
  })

  it('quotes awkward notes and defuses formulas', () => {
    const csv = toCsv([tx('2026-10-02', 'expense', 'food', 1, 'Pizza, "large"'), tx('2026-10-02', 'expense', 'other', 1, '=SUM(A1)')], 'JPY')
    const [, pizza, formula] = csv.trim().split('\r\n')
    expect(pizza).toBe('2026-10-02,Expense,Food,"Pizza, ""large""",1')
    expect(formula).toBe("2026-10-02,Expense,Other,'=SUM(A1),1")
  })

  it('names the file after the month', () => expect(csvFileName('2026-10')).toBe('budget-2026-10.csv'))
})
