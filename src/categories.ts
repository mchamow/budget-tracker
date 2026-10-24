import {
  Briefcase,
  Car,
  Ellipsis,
  Gift,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  PiggyBank,
  Popcorn,
  ShoppingBag,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'

export type Kind = 'income' | 'expense'

export interface Category {
  id: string
  label: string
  kind: Kind
  icon: LucideIcon
  /** Chart fill; expense categories only. The slots are validated as an ordered set, so keep the order. */
  color?: string
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', kind: 'expense', icon: House, color: 'var(--cat-1)' },
  { id: 'food', label: 'Food', kind: 'expense', icon: UtensilsCrossed, color: 'var(--cat-2)' },
  { id: 'transport', label: 'Transport', kind: 'expense', icon: Car, color: 'var(--cat-3)' },
  { id: 'bills', label: 'Bills', kind: 'expense', icon: Zap, color: 'var(--cat-4)' },
  { id: 'fun', label: 'Fun', kind: 'expense', icon: Popcorn, color: 'var(--cat-5)' },
  { id: 'health', label: 'Health', kind: 'expense', icon: HeartPulse, color: 'var(--cat-6)' },
  { id: 'shopping', label: 'Shopping', kind: 'expense', icon: ShoppingBag, color: 'var(--cat-7)' },
  { id: 'other', label: 'Other', kind: 'expense', icon: Ellipsis, color: 'var(--cat-other)' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', kind: 'income', icon: Briefcase },
  { id: 'freelance', label: 'Freelance', kind: 'income', icon: Laptop },
  { id: 'gifts', label: 'Gifts', kind: 'income', icon: Gift },
  { id: 'other-income', label: 'Other income', kind: 'income', icon: PiggyBank },
]

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export const categoriesOf = (kind: Kind) => (kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)

export const categoryById = (id: string): Category | undefined => CATEGORIES.find((c) => c.id === id)

export const isCategoryOf = (id: unknown, kind: Kind): id is string =>
  categoriesOf(kind).some((c) => c.id === id)
