import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('stats page copy', () => {
  it('uses readable chinese strings', () => {
    const stats = fs.readFileSync(
      new URL('../../src/renderer/src/pages/StatsPage.tsx', import.meta.url),
      'utf8'
    )

    expect(stats).toContain('\u6570\u636e\u590d\u76d8')
    expect(stats).toContain('\u4e13\u6ce8\u65f6\u957f')
    expect(stats).toContain('\u4efb\u52a1\u5206\u5e03')
    expect(stats).toContain('\u6570\u636e\u603b\u7ed3')
    expect(stats).not.toContain('\u0394\u03ba')
  })
})

describe('stats layout', () => {
  it('adds a kpi grid section', () => {
    const stats = fs.readFileSync(
      new URL('../../src/renderer/src/pages/StatsPage.tsx', import.meta.url),
      'utf8'
    )
    const css = fs.readFileSync(
      new URL('../../src/renderer/src/pages/StatsPage.css', import.meta.url),
      'utf8'
    )

    expect(stats).toContain('stats-kpis')
    expect(css).toContain('.stats-kpis')
    expect(css).toContain('.kpi-card')
  })
})
