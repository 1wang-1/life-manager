import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('sidebar brand markup', () => {
  it('uses a valid span closing tag', () => {
    const sidebar = fs.readFileSync(
      new URL('../../src/renderer/src/components/common/Sidebar.tsx', import.meta.url),
      'utf8'
    )

    expect(sidebar).toContain('<span className="brand-text">')
    expect(sidebar).toContain('</span>')
    expect(sidebar).not.toContain('?/span>')
  })
})
