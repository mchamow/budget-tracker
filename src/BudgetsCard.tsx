import { CircleAlert, CircleCheck, Pencil, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { budgetStatus, type Budgets, type BudgetState } from './budget'
import { EXPENSE_CATEGORIES } from './categories'
import { formatMoney, parseAmount, toInput, type CurrencyCode } from './money'

const STATUS: Record<BudgetState, { icon: typeof CircleCheck; text: string; fill: string }> = {
  ok: { icon: CircleCheck, text: 'text-good-text', fill: 'bg-primary' },
  near: { icon: TriangleAlert, text: 'text-warning-text', fill: 'bg-warning' },
  over: { icon: CircleAlert, text: 'text-critical-text', fill: 'bg-critical' },
}

export function BudgetsCard({
  budgets,
  spent,
  currency,
  onSave,
}: {
  budgets: Budgets
  spent: Record<string, number>
  currency: CurrencyCode
  onSave: (budgets: Record<string, number | null>) => void
}) {
  const [editing, setEditing] = useState(false)
  const rows = EXPENSE_CATEGORIES.filter((c) => budgets[c.id] || spent[c.id])
  const budgeted = EXPENSE_CATEGORIES.reduce((sum, c) => sum + (budgets[c.id] ?? 0), 0)
  const spentOnBudgeted = EXPENSE_CATEGORIES.reduce((sum, c) => sum + (budgets[c.id] ? spent[c.id] ?? 0 : 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <CardDescription>
          {budgeted > 0
            ? `${formatMoney(spentOnBudgeted, currency)} of ${formatMoney(budgeted, currency)} budgeted`
            : 'Set monthly limits per category.'}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No budgets or spending this month.</p>
        ) : (
          <ul className="grid gap-4">
            {rows.map((c) => {
              const used = spent[c.id] ?? 0
              const limit = budgets[c.id]
              const status = limit ? budgetStatus(used, limit) : null
              const style = status && STATUS[status.state]
              return (
                <li key={c.id} className="grid gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <c.icon aria-hidden className="size-4 text-muted-foreground" />
                    <span id={`budget-${c.id}`} className="flex-1 font-medium">
                      {c.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      <span className="font-medium text-foreground">{formatMoney(used, currency)}</span>
                      {limit ? ` / ${formatMoney(limit, currency)}` : ''}
                    </span>
                  </div>
                  {status && style ? (
                    <>
                      <div
                        role="progressbar"
                        aria-labelledby={`budget-${c.id}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(Math.round(status.ratio * 100), 100)}
                        aria-valuetext={`${Math.round(status.ratio * 100)}% used`}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={cn('h-full rounded-full transition-[width]', style.fill)}
                          style={{ width: `${Math.min(status.ratio, 1) * 100}%` }}
                        />
                      </div>
                      <p className={cn('flex items-center gap-1 text-xs', style.text)}>
                        <style.icon aria-hidden className="size-3.5" />
                        {status.state === 'over'
                          ? `Over by ${formatMoney(-status.remaining, currency)}`
                          : `${formatMoney(status.remaining, currency)} left${status.state === 'near' ? ' · almost there' : ''}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No budget</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <BudgetDialog
        open={editing}
        onOpenChange={setEditing}
        budgets={budgets}
        currency={currency}
        onSave={(next) => {
          onSave(next)
          setEditing(false)
        }}
      />
    </Card>
  )
}

function BudgetDialog({
  open,
  onOpenChange,
  budgets,
  currency,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgets: Budgets
  currency: CurrencyCode
  onSave: (budgets: Record<string, number | null>) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <BudgetForm budgets={budgets} currency={currency} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function BudgetForm({
  budgets,
  currency,
  onSave,
}: {
  budgets: Budgets
  currency: CurrencyCode
  onSave: (budgets: Record<string, number | null>) => void
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, budgets[c.id] ? toInput(budgets[c.id], currency) : ''])),
  )
  const invalid = EXPENSE_CATEGORIES.filter((c) => values[c.id].trim() && parseAmount(values[c.id], currency) === null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (invalid.length) return
    onSave(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, parseAmount(values[c.id], currency)])))
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Monthly budgets</DialogTitle>
        <DialogDescription>A limit per category, in {currency}. Leave one blank for no budget.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {EXPENSE_CATEGORIES.map((c) => (
          <div key={c.id} className="grid gap-1.5">
            <Label htmlFor={`limit-${c.id}`}>
              <c.icon aria-hidden className="size-3.5 text-muted-foreground" />
              {c.label}
            </Label>
            <Input
              id={`limit-${c.id}`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="No budget"
              value={values[c.id]}
              aria-invalid={invalid.includes(c)}
              onChange={(e) => setValues({ ...values, [c.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
      {invalid.length > 0 && (
        <p className="text-xs text-destructive">Use positive amounts like 250 or 99.50, or leave the field blank.</p>
      )}
      <DialogFooter>
        <Button type="submit">Save budgets</Button>
      </DialogFooter>
    </form>
  )
}
