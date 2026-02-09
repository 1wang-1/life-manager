import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('theme tokens', () => {
  it('uses the vibrant light theme palette', () => {
    const css = fs.readFileSync(
      new URL('../../src/renderer/src/App.css', import.meta.url),
      'utf8'
    )

    expect(css).toContain('--color-primary: #ffb000')
    expect(css).toContain('--color-bg: #fffdf8')
    expect(css).toContain("--font-sans: 'Quicksand'")
  })
})
