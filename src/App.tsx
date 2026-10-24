import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Sheet,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useReducer, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BudgetsCard } from './BudgetsCard'
import {
  csvFileName,
  filterTransactions,
  inMonth,
  monthlySeries,
  NO_FILTERS,
  spendingByCategory,
  toCsv,
  totals,
  type Filters,
  type MonthPoint,
  type Transaction,
} from './budget'
import { CategoryDonut } from './CategoryDonut'
import { addMonths, formatMonth, monthOf, todayIso, type MonthKey } from './dates'
import { EntryDialog } from './EntryDialog'
import { CURRENCIES, formatMoney, isCurrency, type CurrencyCode } from './money'
import { MonthlyChart } from './MonthlyChart'
import { TransactionsCard } from './TransactionsCard'
import { reducer } from './reducer'
import { load, save } from './storage'

const CURRENCY_ITEMS = CURRENCIES.map((c) => ({ value: c.code, label: c.code }))

/** Keys typed into a field, or pressed while a dialog is open, are not shortcuts. */
function isShortcutTarget(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return false
  const el = e.target instanceof HTMLElement ? e.target : null
  if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"]')) return false
  return !document.querySelector('[role="dialog"], [role="alertdialog"]')
}

export default function App() {
  const [today] = useState(() => todayIso())
  const [state, dispatch] = useReducer(reducer, today, load)
  const [month, setMonth] = useState<MonthKey>(() => monthOf(today))
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [entry, setEntry] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [deleted, setDeleted] = useState<Transaction | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [confirmClear, setConfirmClear] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const { currency, transactions, budgets } = state
  const thisMonth = monthOf(today)

  useEffect(() => save(state), [state])

  useEffect(() => {
    if (!deleted) return
    const timer = setTimeout(() => setDeleted(null), 8000)
    return () => clearTimeout(timer)
  }, [deleted])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isShortcutTarget(e)) return
      // Arrow keys inside a toggle group move between its items instead.
      const inGroup = e.target instanceof HTMLElement && e.target.closest('[data-slot="toggle-group"]')
      if (e.key === 'n' || e.key === 'N') setEntry({ open: true, editing: null })
      else if (e.key === 'ArrowLeft' && !inGroup) setMonth((m) => addMonths(m, -1))
      else if (e.key === 'ArrowRight' && !inGroup) setMonth((m) => addMonths(m, 1))
      else if (e.key === 't' || e.key === 'T') setMonth(thisMonth)
      else if (e.key === '/') searchRef.current?.focus()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [thisMonth])

  const sums = totals(transactions, month)
  const previous = totals(transactions, addMonths(month, -1))
  const byCategory = spendingByCategory(transactions, month)
  const series = monthlySeries(transactions, month, 6)
  const shown = filterTransactions(transactions, month, filters)

  const remove = (t: Transaction) => {
    dispatch({ type: 'remove', id: t.id })
    setDeleted(t)
    setEntry({ open: false, editing: null })
  }

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(shown, currency)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: csvFileName(month) })
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <span aria-hidden className="text-2xl">
              💰
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">Budget Tracker</h1>
              <p className="hidden text-xs text-muted-foreground md:block">
                Day 30 of 100 Days of React · saved in this browser
              </p>
            </div>
            <Select
              items={CURRENCY_ITEMS}
              value={currency}
              onValueChange={(value) => isCurrency(value) && dispatch({ type: 'setCurrency', currency: value })}
            >
              <SelectTrigger aria-label="Currency" className="w-22">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} <span className="text-muted-foreground">{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setEntry({ open: true, editing: null })}>
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">New entry</span>
              <span className="sm:hidden">Add</span>
              <kbd className="ml-1 hidden rounded bg-primary-foreground/15 px-1 font-sans text-[10px] sm:inline">N</kbd>
            </Button>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-5 sm:px-6">
          <nav aria-label="Month" className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft />
            </Button>
            <h2 aria-live="polite" className="min-w-0 px-1 text-xl font-semibold tracking-tight sm:text-2xl">
              {formatMonth(month)}
            </h2>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight />
            </Button>
            {month !== thisMonth && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setMonth(thisMonth)}>
                This month
              </Button>
            )}
          </nav>

          <section aria-label="Month summary" className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Income" value={formatMoney(sums.income, currency)}>
              <Delta now={sums.income} before={previous.income} upIsGood month={addMonths(month, -1)} />
            </StatTile>
            <StatTile label="Spending" value={formatMoney(sums.spending, currency)}>
              <Delta now={sums.spending} before={previous.spending} upIsGood={false} month={addMonths(month, -1)} />
            </StatTile>
            <StatTile label="Net" value={formatMoney(sums.net, currency)}>
              <NetNote income={sums.income} net={sums.net} />
            </StatTile>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Where it went</CardTitle>
                <CardDescription>Spending by category in {formatMonth(month, 'short')}</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDonut byCategory={byCategory} currency={currency} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Last 6 months</CardTitle>
                <CardDescription>Spending by category against income · pick a month</CardDescription>
                <CardAction>
                  <ToggleGroup
                    aria-label="View"
                    variant="outline"
                    size="sm"
                    spacing={0}
                    value={[view]}
                    onValueChange={(value: string[]) => {
                      if (value[0] === 'chart' || value[0] === 'table') setView(value[0])
                    }}
                  >
                    <ToggleGroupItem value="chart" aria-label="Chart">
                      <ChartColumn />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Table">
                      <Sheet />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </CardAction>
              </CardHeader>
              <CardContent>
                {view === 'chart' ? (
                  <MonthlyChart points={series} currency={currency} selected={month} onSelect={setMonth} />
                ) : (
                  <MonthTable points={series} currency={currency} selected={month} onSelect={setMonth} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <BudgetsCard
              budgets={budgets}
              spent={byCategory}
              currency={currency}
              onSave={(next) =>
                Object.entries(next).forEach(([category, limit]) => dispatch({ type: 'setBudget', category, limit }))
              }
            />
            <TransactionsCard
              transactions={shown}
              total={inMonth(transactions, month).length}
              filters={filters}
              onFiltersChange={setFilters}
              currency={currency}
              searchRef={searchRef}
              deleted={deleted}
              onEdit={(t) => setEntry({ open: true, editing: t })}
              onDelete={remove}
              onUndo={() => {
                if (deleted) dispatch({ type: 'restore', transaction: deleted })
                setDeleted(null)
              }}
              onDismissUndo={() => setDeleted(null)}
              onExport={exportCsv}
            />
          </div>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-muted-foreground">
            <p className="hidden flex-1 sm:block">
              <Kbd>N</Kbd> new entry · <Kbd>←</Kbd> <Kbd>→</Kbd> months · <Kbd>T</Kbd> this month · <Kbd>/</Kbd> search
            </p>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'loadSample', today })}>
              <RotateCcw data-icon="inline-start" />
              Load sample data
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmClear(true)}>
              <Trash2 data-icon="inline-start" />
              Clear all
            </Button>
          </footer>
        </main>

        <EntryDialog
          open={entry.open}
          onOpenChange={(open) => setEntry((e) => ({ ...e, open }))}
          editing={entry.editing}
          defaultDate={month === thisMonth ? today : `${month}-01`}
          currency={currency}
          onSave={(draft) => {
            if (entry.editing) dispatch({ type: 'update', id: entry.editing.id, draft })
            else dispatch({ type: 'add', id: crypto.randomUUID(), draft })
            setMonth(monthOf(draft.date))
            setEntry({ open: false, editing: null })
          }}
          onDelete={(id) => {
            const t = transactions.find((x) => x.id === id)
            if (t) remove(t)
          }}
        />

        <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all {transactions.length} entries and every budget from this browser. Export a CSV first if
                you want to keep them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  dispatch({ type: 'clear' })
                  setDeleted(null)
                  setConfirmClear(false)
                }}
              >
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1 font-sans text-[10px] text-foreground">{children}</kbd>
}

function StatTile({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-0.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <div className="text-xs">{children}</div>
      </CardContent>
    </Card>
  )
}

/** Change against last month; the colour says whether that direction is good news. */
function Delta({ now, before, upIsGood, month }: { now: number; before: number; upIsGood: boolean; month: MonthKey }) {
  const vs = `vs ${formatMonth(month, 'short')}`
  if (before === 0) return <span className="text-muted-foreground">Nothing in {formatMonth(month, 'short')}</span>
  const change = (now - before) / before
  const pct = Math.round(Math.abs(change) * 100)
  if (pct === 0) return <span className="text-muted-foreground">Same as {formatMonth(month, 'short')}</span>
  const up = change > 0
  const good = up === upIsGood
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1', good ? 'text-good-text' : 'text-critical-text')}>
      <Icon aria-hidden className="size-3.5" />
      {up ? 'Up' : 'Down'} {pct}% <span className="text-muted-foreground">{vs}</span>
    </span>
  )
}

function NetNote({ income, net }: { income: number; net: number }) {
  if (income === 0 && net === 0) return <span className="text-muted-foreground">No entries yet</span>
  if (net >= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-good-text">
        <TrendingUp aria-hidden className="size-3.5" />
        Saved {income > 0 ? `${Math.round((net / income) * 100)}% of income` : 'it all'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-critical-text">
      <TrendingDown aria-hidden className="size-3.5" />
      Spent more than came in
    </span>
  )
}

function MonthTable({
  points,
  currency,
  selected,
  onSelect,
}: {
  points: MonthPoint[]
  currency: CurrencyCode
  selected: MonthKey
  onSelect: (month: MonthKey) => void
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Income and spending by month</caption>
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b">
          <th scope="col" className="py-2 text-left font-medium">
            Month
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Income
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Spending
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Net
          </th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {[...points].reverse().map((p) => (
          <tr key={p.month} className={cn('border-b last:border-0', p.month === selected && 'bg-muted/60 font-medium')}>
            <th scope="row" className="py-2 text-left font-normal">
              <button type="button" className="hover:underline" onClick={() => onSelect(p.month)}>
                {formatMonth(p.month)}
              </button>
            </th>
            <td className="py-2 text-right">{formatMoney(p.income, currency)}</td>
            <td className="py-2 text-right">{formatMoney(p.spending, currency)}</td>
            <td className={cn('py-2 text-right', p.net < 0 && 'text-critical-text')}>{formatMoney(p.net, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
