import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('navigation routes', () => {
  it('does not include the music page', () => {
    const app = fs.readFileSync(
      new URL('../../src/renderer/src/App.tsx', import.meta.url),
      'utf8'
    )
    const sidebar = fs.readFileSync(
      new URL('../../src/renderer/src/components/common/Sidebar.tsx', import.meta.url),
      'utf8'
    )

    expect(app).toContain('path="/tasks"')
    expect(app).toContain('path="/stats"')
    expect(app).toContain('path="/settings"')
    expect(app).not.toContain('path="/music"')
    expect(sidebar).not.toContain("path: '/music'")
  })
})
