'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full bg-[var(--color-surface-raised)]" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-content-muted)] hover:text-[#00E5FF] transition-colors hover:bg-[var(--color-surface-hover)] border border-[var(--color-line-subtle)]"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 absolute transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
      <Moon className="h-4 w-4 absolute transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
    </button>
  )
}
