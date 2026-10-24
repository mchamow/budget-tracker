import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Transaction } from './budget'
import { categoriesOf, isCategoryOf, type Kind } from './categories'
import { isIsoDate } from './dates'
import { parseAmount, toInput, type CurrencyCode } from './money'
import type { Draft } from './reducer'

export interface EntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction being edited, or null to add a new one. */
  editing: Transaction | null
  defaultDate: string
  currency: CurrencyCode
  onSave: (draft: Draft) => void
  onDelete: (id: string) => void
}

export function EntryDialog(props: EntryDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remounting on open starts each entry from a fresh form. */}
        {props.open && <EntryForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function EntryForm({ editing, defaultDate, currency, onSave, onDelete }: EntryDialogProps) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense')
  const [amount, setAmount] = useState(editing ? toInput(editing.amount, currency) : '')
  const [category, setCategory] = useState(editing?.category ?? 'food')
  const [date, setDate] = useState(editing?.date ?? defaultDate)
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitted, setSubmitted] = useState(false)

  const minor = parseAmount(amount, currency)
  const amountError = minor === null ? (amount.trim() ? 'Enter a positive amount, like 12.50' : 'Enter an amount') : null
  const dateError = isIsoDate(date) ? null : 'Pick a date'
  const items = categoriesOf(kind).map((c) => ({ value: c.id, label: c.label }))

  const switchKind = (next: Kind) => {
    setKind(next)
    if (!isCategoryOf(category, next)) setCategory(categoriesOf(next)[0].id)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (minor === null || dateError) return
    onSave({ kind, amount: minor, category, date, note: note.trim() })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
        <DialogDescription>
          {editing ? 'Change any detail, or delete the entry.' : 'Log money coming in or going out.'}
        </DialogDescription>
      </DialogHeader>

      <ToggleGroup
        aria-label="Type"
        variant="outline"
        spacing={0}
        className="w-full"
        value={[kind]}
        onValueChange={(value: string[]) => {
          if (value[0] === 'expense' || value[0] === 'income') switchKind(value[0])
        }}
      >
        <ToggleGroupItem value="expense" className="flex-1">
          <ArrowUpRight />
          Expense
        </ToggleGroupItem>
        <ToggleGroupItem value="income" className="flex-1">
          <ArrowDownLeft />
          Income
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="entry-amount">Amount ({currency})</Label>
          <Input
            id="entry-amount"
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={submitted && amountError !== null}
            aria-describedby={submitted && amountError ? 'entry-amount-error' : undefined}
          />
          {submitted && amountError && (
            <p id="entry-amount-error" className="text-xs text-destructive">
              {amountError}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="entry-category">Category</Label>
          <Select items={items} value={category} onValueChange={(value) => value !== null && setCategory(value)}>
            <SelectTrigger id="entry-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoriesOf(kind).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <c.icon />
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="entry-date">Date</Label>
          <Input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={submitted && dateError !== null}
          />
          {submitted && dateError && <p className="text-xs text-destructive">{dateError}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="entry-note">Note</Label>
          <Input
            id="entry-note"
            autoComplete="off"
            placeholder={kind === 'expense' ? 'Groceries' : 'Paycheck'}
            maxLength={80}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        {editing ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => onDelete(editing.id)}>
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit">{editing ? 'Save' : 'Add entry'}</Button>
      </DialogFooter>
    </form>
  )
}
