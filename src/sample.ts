import type { Budgets, Transaction } from './budget'
import type { Kind } from './categories'
import { monthOf, monthsEnding } from './dates'

export const SAMPLE_BUDGETS: Budgets = {
  housing: 150000,
  food: 60000,
  transport: 20000,
  bills: 25000,
  fun: 20000,
  shopping: 25000,
}

// [day, kind, category, dollars, note]; `wobble` nudges the amounts so no two months look the same.
type Row = [number, Kind, string, number, string, wobble?: number]
const MONTH: Row[] = [
  [1, 'income', 'salary', 4200, 'Paycheck'],
  [1, 'expense', 'housing', 1450, 'Rent'],
  [3, 'expense', 'bills', 64.9, 'Electricity', 12],
  [4, 'expense', 'food', 86.4, 'Groceries', 20],
  [6, 'expense', 'transport', 49, 'Transit pass'],
  [8, 'expense', 'fun', 32, 'Cinema', 15],
  [11, 'expense', 'food', 112.75, 'Groceries', 25],
  [12, 'expense', 'bills', 45, 'Internet'],
  [14, 'expense', 'health', 38.5, 'Pharmacy', 30],
  [15, 'income', 'freelance', 650, 'Logo project', 300],
  [17, 'expense', 'shopping', 79.99, 'Running shoes', 60],
  [18, 'expense', 'food', 47.2, 'Dinner with friends', 18],
  [20, 'expense', 'transport', 36.8, 'Taxi', 20],
  [22, 'expense', 'fun', 59, 'Concert tickets', 40],
  [24, 'expense', 'food', 94.3, 'Groceries', 22],
  [26, 'expense', 'bills', 15.99, 'Streaming'],
  [27, 'expense', 'other', 25, 'Charity'],
  [28, 'expense', 'shopping', 42.5, 'Books', 30],
]

/** Six months of believable activity ending today, so a first visit has something to look at. */
export function sampleTransactions(today: string): Transaction[] {
  const months = monthsEnding(monthOf(today), 6)
  return months.flatMap((month, m) =>
    MONTH.flatMap(([day, kind, category, dollars, note, wobble = 0], i): Transaction[] => {
      const date = `${month}-${String(day).padStart(2, '0')}`
      if (date > today) return []
      // Freelance work comes in every other month.
      if (category === 'freelance' && m % 2 === 1) return []
      const shift = wobble * Math.sin(m * 2.1 + i * 1.7)
      return [{ id: `sample-${month}-${i}`, kind, category, date, note, amount: Math.round((dollars + shift) * 100) }]
    }),
  )
}
