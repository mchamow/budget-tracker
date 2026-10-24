import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Transaction } from './budget'
import { load, STORAGE_KEY } from './storage'

const TODAY = new Date(2026, 9, 24, 12)

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const search = () => screen.getByRole('searchbox', { name: 'Search transactions' })
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })
const choose = (combobox: string, option: string, scope: Pick<typeof screen, 'getByRole'> = screen) => {
  fireEvent.click(scope.getByRole('combobox', { name: combobox }))
  // Base UI only takes a mouse click on an item that the press started on.
  const item = screen.getByRole('option', { name: option })
  fireEvent.pointerDown(item, { pointerType: 'mouse' })
  fireEvent.click(item)
}
const tile = (label: string) =>
  within(screen.getByRole('region', { name: 'Month summary' })).getByText(label).nextElementSibling?.textContent
const rows = () =>
  within(screen.queryByRole('list', { name: 'Transactions' }) ?? document.createElement('ul'))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent)
const heading = () => screen.getByRole('heading', { level: 2 }).textContent
const saved = () => load('2026-10-24')

function start(transactions: Transaction[] = [], budgets: Record<string, number> = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, budgets, currency: 'USD' }))
  return render(<App />)
}

function addEntry({ kind = 'Expense', amount, category, date, note }: { kind?: string; amount: string; category?: string; date?: string; note?: string }) {
  fireEvent.click(button(/new entry/i))
  const dialog = within(screen.getByRole('dialog'))
  if (kind === 'Income') fireEvent.click(dialog.getByRole('button', { name: 'Income' }))
  type(dialog.getByRole('textbox', { name: /amount/i }), amount)
  if (category) choose('Category', category, dialog)
  if (date) type(dialog.getByLabelText('Date'), date)
  if (note) type(dialog.getByRole('textbox', { name: 'Note' }), note)
  fireEvent.click(dialog.getByRole('button', { name: 'Add entry' }))
}

const tx = (id: string, date: string, kind: Transaction['kind'], category: string, amount: number, note: string): Transaction => ({
  id,
  date,
  kind,
  category,
  amount,
  note,
})

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('opens on this month with six months of sample data', () => {
    render(<App />)
    expect(heading()).toBe('October 2026')
    expect(tile('Income')).toBe('$4,200.00')
    expect(within(screen.getByRole('list', { name: 'Spending by category' })).getByText('Housing')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^(May|June|July|August|September|October) 2026: income/ })).toHaveLength(6)
    expect(rows()).toContain('Rent')
  })

  it('adds an expense and an income, updating the totals, and keeps them after a reload', () => {
    start()
    addEntry({ amount: '12,50', category: 'Food', note: 'Lunch' })
    addEntry({ kind: 'Income', amount: '1,000', note: 'Bonus' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rows()).toEqual(['Bonus', 'Lunch'])
    expect(tile('Spending')).toBe('$12.50')
    expect(tile('Income')).toBe('$1,000.00')
    expect(tile('Net')).toBe('$987.50')
    expect(saved().transactions.map((t) => [t.kind, t.category, t.amount, t.date])).toEqual([
      ['expense', 'food', 1250, '2026-10-24'],
      ['income', 'salary', 100000, '2026-10-24'],
    ])

    cleanup()
    render(<App />)
    expect(rows()).toEqual(['Bonus', 'Lunch'])
  })

  it('refuses an entry without a valid amount', () => {
    start()
    fireEvent.click(button(/new entry/i))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'Add entry' }))
    expect(dialog.getByText('Enter an amount')).toBeTruthy()
    type(dialog.getByRole('textbox', { name: /amount/i }), '-4')
    expect(dialog.getByText(/positive amount/)).toBeTruthy()
    expect(saved().transactions).toEqual([])
  })

  it('jumps to the month of an entry dated elsewhere', () => {
    start()
    addEntry({ amount: '30', date: '2026-08-15', note: 'Gift for Ana', category: 'Shopping' })
    expect(heading()).toBe('August 2026')
    expect(rows()).toEqual(['Gift for Ana'])
  })

  it('edits an entry, and deletes it with undo', () => {
    start([tx('a', '2026-10-03', 'expense', 'food', 2000, 'Groceries')])
    fireEvent.click(button('Edit Groceries'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('textbox', { name: /amount/i })).toHaveProperty('value', '20.00')
    type(dialog.getByRole('textbox', { name: 'Note' }), 'Market')
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }))
    expect(rows()).toEqual(['Market'])
    expect(saved().transactions[0]).toMatchObject({ id: 'a', note: 'Market', amount: 2000 })

    fireEvent.click(button('Delete Market'))
    expect(rows()).toEqual([])
    expect(screen.getByRole('status').textContent).toContain('Deleted “Market”')
    fireEvent.click(button('Undo'))
    expect(rows()).toEqual(['Market'])
    expect(saved().transactions).toHaveLength(1)
  })

  it('moves between months with buttons, arrow keys, the chart and T', () => {
    start([tx('a', '2026-09-03', 'expense', 'food', 2000, 'September food')])
    fireEvent.click(button('Previous month'))
    expect(heading()).toBe('September 2026')
    expect(rows()).toEqual(['September food'])
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(heading()).toBe('August 2026')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('October 2026')
    fireEvent.click(button(/^June 2026: income/))
    expect(heading()).toBe('June 2026')
    fireEvent.keyDown(window, { key: 't' })
    expect(heading()).toBe('October 2026')
    fireEvent.click(button('Next month'))
    fireEvent.click(button('This month'))
    expect(heading()).toBe('October 2026')
  })

  it('opens a new entry with N, but not while typing', () => {
    start()
    fireEvent.keyDown(search(), { key: 'n' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('breaks spending down by category', () => {
    start([
      tx('a', '2026-10-01', 'expense', 'housing', 30000, 'Rent'),
      tx('b', '2026-10-02', 'expense', 'food', 10000, 'Food'),
      tx('c', '2026-10-02', 'income', 'salary', 90000, 'Pay'),
    ])
    const legend = within(screen.getByRole('list', { name: 'Spending by category' }))
    expect(legend.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Housing$300.0075%', 'Food$100.0025%'])
    expect(screen.getByRole('img', { name: /Housing \$300\.00 \(75%\), Food \$100\.00 \(25%\)/ })).toBeTruthy()
    expect(button(/^October 2026: income \$900\.00, spending \$400\.00/)).toBeTruthy()
  })

  it('shows the six months as a table too', () => {
    start([tx('a', '2026-09-01', 'income', 'salary', 50000, 'Pay')])
    fireEvent.click(screen.getByRole('button', { name: 'Table' }))
    const table = within(screen.getByRole('table'))
    expect(table.getAllByRole('row')).toHaveLength(7)
    expect(table.getByRole('row', { name: /September 2026/ }).textContent).toContain('$500.00')
  })

  it('sets budgets and warns when one runs over', () => {
    start([tx('a', '2026-10-01', 'expense', 'fun', 9000, 'Concert'), tx('b', '2026-10-02', 'expense', 'food', 8500, 'Food')])
    fireEvent.click(button('Edit'))
    const dialog = within(screen.getByRole('dialog'))
    type(dialog.getByRole('textbox', { name: 'Fun' }), '80')
    type(dialog.getByRole('textbox', { name: 'Food' }), '100')
    fireEvent.click(dialog.getByRole('button', { name: 'Save budgets' }))
    expect(screen.getByText('Over by $10.00')).toBeTruthy()
    expect(screen.getByText('$15.00 left · almost there')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Fun' }).getAttribute('aria-valuenow')).toBe('100')
    expect(saved().budgets).toEqual({ fun: 8000, food: 10000 })

    fireEvent.click(button('Edit'))
    type(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Fun' }), '')
    fireEvent.click(button('Save budgets'))
    expect(saved().budgets).toEqual({ food: 10000 })
  })

  it('filters the list by text, type and category', () => {
    start([
      tx('a', '2026-10-01', 'expense', 'food', 1000, 'Pizza'),
      tx('b', '2026-10-02', 'expense', 'transport', 2000, 'Train'),
      tx('c', '2026-10-03', 'income', 'freelance', 3000, 'Pizza menu design'),
    ])
    type(search(), 'pizza')
    expect(rows()).toEqual(['Pizza menu design', 'Pizza'])
    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }))
    expect(rows()).toEqual(['Pizza'])
    expect(screen.getByText('1 of 3 shown')).toBeTruthy()
    type(search(), '')
    choose('Category', 'Transport')
    expect(rows()).toEqual(['Train'])
    type(search(), 'zzz')
    expect(screen.getByText('Nothing matches these filters.')).toBeTruthy()
    fireEvent.click(button('Clear filters'))
    expect(rows()).toHaveLength(3)
  })

  it('exports what the list shows as CSV', async () => {
    const blobs: Blob[] = []
    vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: () => {} })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('budget-2026-10.csv')
    })
    start([tx('a', '2026-10-01', 'expense', 'food', 1000, 'Pizza'), tx('b', '2026-10-02', 'income', 'salary', 2000, 'Pay')])
    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }))
    fireEvent.click(button('Export CSV'))
    expect(click).toHaveBeenCalledOnce()
    expect(await blobs[0].text()).toBe('Date,Type,Category,Note,Amount (USD)\r\n2026-10-01,Expense,Food,Pizza,10.00\r\n')
  })

  it('switches currency, keeping amounts', () => {
    start([tx('a', '2026-10-01', 'expense', 'food', 123456, 'Pizza')])
    choose('Currency', 'EUR Euro')
    expect(tile('Spending')?.replace(/ /g, ' ')).toBe('1.234,56 €')
    expect(saved().currency).toBe('EUR')
  })

  it('clears everything after confirming, and brings the sample back', () => {
    render(<App />)
    fireEvent.click(button('Clear all'))
    const dialog = within(screen.getByRole('alertdialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'Clear all' }))
    expect(rows()).toEqual([])
    expect(screen.getByText(/No entries this month/)).toBeTruthy()
    expect(saved()).toMatchObject({ transactions: [], budgets: {} })
    fireEvent.click(button('Load sample data'))
    expect(rows()).toContain('Rent')
  })

  it('lets the undo notice expire', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(TODAY)
    start([tx('a', '2026-10-03', 'expense', 'food', 2000, 'Groceries')])
    fireEvent.click(button('Delete Groceries'))
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => vi.advanceTimersByTime(8000))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
