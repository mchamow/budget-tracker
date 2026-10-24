import { cn } from 'cn'
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import type { MonthPoint } from './budget'
import { EXPENSE_CATEGORIES } from './categories'
import { niceScale, stack, topRoundedRect } from './chart'
import { formatMonth, type MonthKey } from './dates'
import { formatCompact, formatMoney, type CurrencyCode } from './money'

const HEIGHT = 200
const AXIS = 24
const LEFT = 48
const TOP = 8
const COLUMN = 24

/** Tracks an element's width; falls back to a phone-sized default where ResizeObserver is missing (tests). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

const TOOLTIP = 192

/** Beside the column, on whichever side has room, so the tooltip never hides what it describes. */
function tooltipLeft(cx: number, width: number) {
  const right = cx + COLUMN / 2 + 12
  if (right + TOOLTIP <= width) return right
  return Math.max(cx - COLUMN / 2 - 12 - TOOLTIP, 0)
}

function describe(p: MonthPoint, currency: CurrencyCode) {
  return `${formatMonth(p.month)}: income ${formatMoney(p.income, currency)}, spending ${formatMoney(p.spending, currency)}`
}

/** Spending stacked by category per month, with the month's income drawn as a line across each column. */
export function MonthlyChart({
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
  const [ref, width] = useWidth<HTMLDivElement>(320)
  const [hover, setHover] = useState<number | null>(null)
  const scale = niceScale(Math.max(...points.map((p) => Math.max(p.income, p.spending))))
  const plotWidth = Math.max(width - LEFT - 4, 60)
  const band = plotWidth / points.length
  const y = (v: number) => TOP + HEIGHT - (v / scale.max) * HEIGHT
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step)
  const used = EXPENSE_CATEGORIES.filter((c) => points.some((p) => p.byCategory[c.id] > 0))
  const hovered = hover === null ? null : points[hover]

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* min-w-0 lets the box shrink below the SVG's last width, so the observer can see it narrow. */}
      <div ref={ref} className="relative min-w-0">
        <svg
          width={width}
          height={TOP + HEIGHT + AXIS}
          role="group"
          aria-label="Income and spending by month"
          className="block max-w-full overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={LEFT}
                x2={width}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={LEFT - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {formatCompact(t, currency)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = LEFT + band * (i + 0.5)
            const x = cx - COLUMN / 2
            const segments = stack(EXPENSE_CATEGORIES.map((c) => ({ id: c.id, value: p.byCategory[c.id] ?? 0 })))
            const isSelected = p.month === selected
            const clip = `col-${p.month}`
            return (
              <g
                key={p.month}
                role="button"
                tabIndex={0}
                aria-label={describe(p, currency)}
                aria-pressed={isSelected}
                data-month={p.month}
                className="outline-none [&:focus-visible>rect:first-child]:stroke-ring"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(p.month)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(p.month)
                  }
                }}
              >
                {/* The whole band is the hit target, not just the painted column. */}
                <rect
                  x={LEFT + band * i + 1}
                  y={TOP}
                  width={band - 2}
                  height={HEIGHT + AXIS - 2}
                  rx={6}
                  fill={isSelected || hover === i ? 'var(--muted)' : 'transparent'}
                  fillOpacity={isSelected ? 1 : 0.6}
                  strokeWidth={2}
                />
                <clipPath id={clip}>
                  <path d={topRoundedRect(x, y(p.spending), COLUMN, y(0) - y(p.spending), 4)} />
                </clipPath>
                <g clipPath={`url(#${clip})`}>
                  {segments.map((s, k) => (
                    <rect
                      key={s.id}
                      x={x}
                      y={y(s.to)}
                      width={COLUMN}
                      // A 2px surface gap above every segment but the top one.
                      height={Math.max(y(s.from) - y(s.to) - (k < segments.length - 1 ? 2 : 0), 0.5)}
                      fill={EXPENSE_CATEGORIES.find((c) => c.id === s.id)!.color}
                    />
                  ))}
                </g>
                {p.income > 0 && (
                  <line
                    data-income
                    x1={cx - COLUMN / 2 - 7}
                    x2={cx + COLUMN / 2 + 7}
                    y1={y(p.income)}
                    y2={y(p.income)}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )}
                <text
                  x={cx}
                  y={TOP + HEIGHT + 16}
                  textAnchor="middle"
                  className={cn('text-[11px]', isSelected ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}
                >
                  {formatMonth(p.month, 'short')}
                </text>
              </g>
            )
          })}
        </svg>
        {hovered && hover !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-1 z-10 w-48 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ left: tooltipLeft(LEFT + band * (hover + 0.5), width) }}
          >
            <p className="mb-1.5 font-medium">{formatMonth(hovered.month)}</p>
            <TooltipRow keyStyle={{ background: 'var(--foreground)' }} label="Income" value={formatMoney(hovered.income, currency)} />
            <TooltipRow label="Spending" value={formatMoney(hovered.spending, currency)} />
            <TooltipRow label="Net" value={formatMoney(hovered.net, currency)} />
            {[...EXPENSE_CATEGORIES]
              .reverse()
              .filter((c) => hovered.byCategory[c.id] > 0)
              .map((c) => (
                <TooltipRow
                  key={c.id}
                  muted
                  keyStyle={{ background: c.color }}
                  label={c.label}
                  value={formatMoney(hovered.byCategory[c.id], currency)}
                />
              ))}
          </div>
        )}
      </div>
      <ul aria-label="Chart legend" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full bg-foreground" />
          Income
        </li>
        {used.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: c.color }} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TooltipRow({
  label,
  value,
  keyStyle,
  muted,
}: {
  label: string
  value: string
  keyStyle?: CSSProperties
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-px">
      <span aria-hidden className="h-0.5 w-2.5 shrink-0 rounded-full" style={keyStyle} />
      <span className={cn('flex-1', muted ? 'text-muted-foreground' : 'text-secondary-foreground')}>{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-muted-foreground' : 'font-semibold')}>{value}</span>
    </div>
  )
}
