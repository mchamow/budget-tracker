import { useState } from 'react'
import { cn } from 'cn'
import { EXPENSE_CATEGORIES } from './categories'
import { donutArcs } from './chart'
import { formatMoney, type CurrencyCode } from './money'

const SIZE = 184
const THICKNESS = 22
const RADIUS = (SIZE - THICKNESS) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function percent(value: number, total: number) {
  const pct = Math.round((value / total) * 100)
  return pct === 0 && value > 0 ? '<1%' : `${pct}%`
}

/** Where the month's spending went: a donut in the categories' fixed order, with a legend that doubles as its table. */
export function CategoryDonut({ byCategory, currency }: { byCategory: Record<string, number>; currency: CurrencyCode }) {
  const [active, setActive] = useState<string | null>(null)
  const rows = EXPENSE_CATEGORIES.map((c) => ({ ...c, value: byCategory[c.id] ?? 0 })).filter((c) => c.value > 0)
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  const arcs = donutArcs(rows, CIRCUMFERENCE, 2)
  const focused = rows.find((r) => r.id === active)

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No spending this month yet.</p>
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`Spending by category: ${rows
            .map((r) => `${r.label} ${formatMoney(r.value, currency)} (${percent(r.value, total)})`)
            .join(', ')}`}
          className="-rotate-90"
        >
          {arcs.map((arc) => {
            const category = rows.find((r) => r.id === arc.id)!
            return (
              <circle
                key={arc.id}
                data-category={arc.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={category.color}
                strokeWidth={THICKNESS}
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
                strokeDashoffset={-arc.offset}
                className={cn('transition-opacity', active && active !== arc.id && 'opacity-30')}
                onPointerEnter={() => setActive(arc.id)}
                onPointerLeave={() => setActive(null)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">{focused ? focused.label : 'Spent'}</span>
          <span className="text-lg font-semibold">{formatMoney(focused?.value ?? total, currency)}</span>
          {focused && <span className="text-xs text-muted-foreground">{percent(focused.value, total)}</span>}
        </div>
      </div>
      <ul aria-label="Spending by category" className="grid w-full min-w-0 gap-0.5">
        {rows.map((r) => (
          <li
            key={r.id}
            tabIndex={0}
            onPointerEnter={() => setActive(r.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(r.id)}
            onBlur={() => setActive(null)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active === r.id && 'bg-muted',
            )}
          >
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="font-medium tabular-nums">{formatMoney(r.value, currency)}</span>
            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{percent(r.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
