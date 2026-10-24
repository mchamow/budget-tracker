import { describe, expect, it } from 'vitest'
import { addMonths, formatDay, formatMonth, isIsoDate, isMonthKey, monthOf, monthsEnding, todayIso } from './dates'

describe('dates', () => {
  it('validates dates and months', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-2-3')).toBe(false)
    expect(isIsoDate(20260101)).toBe(false)
    expect(isMonthKey('2026-12')).toBe(true)
    expect(isMonthKey('2026-13')).toBe(false)
  })

  it('reads today in local time', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('steps across year boundaries', () => {
    expect(monthOf('2026-10-24')).toBe('2026-10')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthsEnding('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('formats months and days', () => {
    expect(formatMonth('2026-10')).toBe('October 2026')
    expect(formatMonth('2026-10', 'short')).toBe('Oct')
    expect(formatDay('2026-10-24')).toBe('Sat, Oct 24')
  })
})
