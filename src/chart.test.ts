import { describe, expect, it } from 'vitest'
import { donutArcs, niceScale, stack, topRoundedRect } from './chart'

describe('niceScale', () => {
  it.each([
    [4900, 6000, 2000],
    [8000, 8000, 2000],
    [950, 1000, 250],
    [37, 40, 10],
    [0, 4, 1],
  ])('fits %d under %d in steps of %d', (value, max, step) => expect(niceScale(value)).toEqual({ max, step }))
})

describe('donutArcs', () => {
  it('lays segments end to end with a gap, skipping zeros', () => {
    const arcs = donutArcs(
      [
        { id: 'a', value: 3 },
        { id: 'b', value: 0 },
        { id: 'c', value: 1 },
      ],
      100,
      2,
    )
    expect(arcs).toEqual([
      { id: 'a', value: 3, offset: 1, length: 73 },
      { id: 'c', value: 1, offset: 76, length: 23 },
    ])
  })

  it('closes the ring for a single segment and draws nothing for no data', () => {
    expect(donutArcs([{ id: 'a', value: 5 }], 100, 2)).toEqual([{ id: 'a', value: 5, offset: 0, length: 100 }])
    expect(donutArcs([{ id: 'a', value: 0 }], 100, 2)).toEqual([])
  })
})

describe('stack', () => {
  it('stacks bottom-up and skips zeros', () => {
    expect(
      stack([
        { id: 'a', value: 2 },
        { id: 'b', value: 0 },
        { id: 'c', value: 3 },
      ]),
    ).toEqual([
      { id: 'a', value: 2, from: 0, to: 2 },
      { id: 'c', value: 3, from: 2, to: 5 },
    ])
  })
})

describe('topRoundedRect', () => {
  it('rounds only the top corners, clamped for short columns', () => {
    expect(topRoundedRect(0, 10, 24, 50, 4)).toBe('M0,60 V14 A4,4 0 0 1 4,10 H20 A4,4 0 0 1 24,14 V60 Z')
    expect(topRoundedRect(0, 10, 24, 2, 4)).toContain('A2,2')
  })
})
