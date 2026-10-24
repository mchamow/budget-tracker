import { describe, expect, it } from 'vitest'
import { formatCompact, formatMoney, fractionDigits, parseAmount, toInput } from './money'

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12,50', 1250],
    ['1,234.56', 123456],
    ['1 234.56', 123456],
    ['.99', 99],
    ['0.005', 1],
    ['1.005', 101],
  ])('reads %s as %i cents', (input, minor) => expect(parseAmount(input, 'USD')).toBe(minor))

  it.each(['', '  ', '0', '-5', 'abc', '1.2.3', '12e3', '1e400'])('rejects %j', (input) =>
    expect(parseAmount(input, 'USD')).toBeNull(),
  )

  it('rounds to whole yen', () => {
    expect(parseAmount('1500', 'JPY')).toBe(1500)
    expect(parseAmount('99.6', 'JPY')).toBe(100)
  })
})

describe('formatting', () => {
  it('knows each currency’s precision', () => {
    expect(fractionDigits('USD')).toBe(2)
    expect(fractionDigits('JPY')).toBe(0)
  })

  it('writes money the local way', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
    expect(plain(formatMoney(123456, 'EUR'))).toBe('1.234,56 €')
    expect(formatMoney(1500, 'JPY')).toBe('￥1,500')
  })

  it('compacts axis labels', () => {
    expect(formatCompact(0, 'USD')).toBe('$0')
    expect(formatCompact(200000, 'USD')).toBe('$2K')
    expect(formatCompact(125000, 'USD')).toBe('$1.3K')
  })

  it('turns minor units back into a field value', () => {
    expect(toInput(1250, 'USD')).toBe('12.50')
    expect(toInput(1500, 'JPY')).toBe('1500')
  })
})
