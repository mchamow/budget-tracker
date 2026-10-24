import { Download, Pencil, Search, Trash2, Undo2, X } from 'lucide-react'
import { cn } from 'cn'
import { Fragment, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NO_FILTERS, type Filters, type Transaction } from './budget'
import { CATEGORIES, categoryById, categoriesOf } from './categories'
import { formatDay } from './dates'
import { formatMoney, type CurrencyCode } from './money'

const CATEGORY_ITEMS = [{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]

export function TransactionsCard({
  transactions,
  total,
  filters,
  onFiltersChange,
  currency,
  searchRef,
  deleted,
  onEdit,
  onDelete,
  onUndo,
  onDismissUndo,
  onExport,
}: {
  /** Already filtered, newest first. */
  transactions: Transaction[]
  /** How many the month has before filtering. */
  total: number
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  currency: CurrencyCode
  searchRef: RefObject<HTMLInputElement | null>
  deleted: Transaction | null
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
  onUndo: () => void
  onDismissUndo: () => void
  onExport: () => void
}) {
  const filtered = filters.query.trim() !== '' || filters.kind !== 'all' || filters.category !== 'all'
  const kinds = filters.kind === 'all' ? ['expense', 'income'] : [filters.kind]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {filtered ? `${transactions.length} of ${total} shown` : `${total} this month`}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onExport} disabled={transactions.length === 0}>
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="search"
              aria-label="Search transactions"
              placeholder="Search notes…  /"
              className="pl-8"
              value={filters.query}
              onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && filters.query) {
                  e.stopPropagation()
                  onFiltersChange({ ...filters, query: '' })
                }
              }}
            />
          </div>
          <ToggleGroup
            aria-label="Show"
            variant="outline"
            spacing={0}
            value={[filters.kind]}
            onValueChange={(value: string[]) => {
              const kind = value[0]
              if (kind !== 'all' && kind !== 'income' && kind !== 'expense') return
              const category = kind === 'all' || categoriesOf(kind).some((c) => c.id === filters.category) ? filters.category : 'all'
              onFiltersChange({ ...filters, kind, category })
            }}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="expense">Expenses</ToggleGroupItem>
            <ToggleGroupItem value="income">Income</ToggleGroupItem>
          </ToggleGroup>
          <Select
            items={CATEGORY_ITEMS}
            value={filters.category}
            onValueChange={(value) => value !== null && onFiltersChange({ ...filters, category: value })}
          >
            <SelectTrigger aria-label="Category" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {kinds.map((kind) => (
                <Fragment key={kind}>
                  <SelectSeparator />
                  {categoriesOf(kind as Transaction['kind']).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <c.icon />
                      {c.label}
                    </SelectItem>
                  ))}
                </Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {deleted && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate">Deleted “{label(deleted)}”</span>
            <Button variant="ghost" size="sm" onClick={onUndo}>
              <Undo2 data-icon="inline-start" />
              Undo
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismissUndo}>
              <X />
            </Button>
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="grid justify-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            {filtered ? 'Nothing matches these filters.' : 'No entries this month. Press N to add one.'}
            {filtered && (
              <Button variant="outline" size="sm" onClick={() => onFiltersChange(NO_FILTERS)}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <ul aria-label="Transactions" className="-mx-2 grid grid-cols-1">
            {transactions.map((t) => (
              <Row key={t.id} t={t} currency={currency} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

const label = (t: Transaction) => t.note || categoryById(t.category)?.label || t.category

function Row({
  t,
  currency,
  onEdit,
  onDelete,
}: {
  t: Transaction
  currency: CurrencyCode
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  const category = categoryById(t.category)
  const Icon = category?.icon
  const income = t.kind === 'income'
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        {Icon && <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label(t)}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {category?.color && <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: category.color }} />}
          {category?.label} · {formatDay(t.date)}
        </p>
      </div>
      <span className={cn('text-sm font-semibold tabular-nums', income && 'text-good-text')}>
        {income ? '+' : '−'}
        {formatMoney(t.amount, currency)}
      </span>
      <div className="flex">
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label(t)}`} onClick={() => onEdit(t)}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label(t)}`} onClick={() => onDelete(t)}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
