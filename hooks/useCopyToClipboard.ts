'use client'

/**
 * =============================================================================
 * FILE: hooks/useCopyToClipboard.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Copies text to the clipboard and reports success for a moment afterwards, so
 * a button can show "Copied!".
 *
 * WHY IT EXISTS
 * -------------
 * Copying is not decoration in a dApp — it is a core interaction. Addresses and
 * transaction hashes are 42 and 64 characters of case-sensitive text that
 * nobody can retype correctly, and every one of them is displayed truncated.
 * Without a reliable copy button, the app is unusable.
 *
 * The visual confirmation matters too. Clipboard writes are silent, so with no
 * feedback the user cannot tell whether the click registered, and clicks again
 * — which is harmless here but trains a habit that is not harmless elsewhere.
 *
 * WHEN TO USE
 * -----------
 * Behind any copy affordance. Used by `components/ui/CopyButton.tsx`.
 *
 * EXECUTION FLOW
 * --------------
 *   user clicks
 *        |
 *        v
 *   navigator.clipboard.writeText()
 *        |
 *        +-- success -> hasCopied = true -> auto-reset after `resetAfterMs`
 *        |
 *        +-- failure -> hasCopied stays false (permission denied, insecure origin)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `react`
 * Depended on by: `components/ui/CopyButton.tsx`
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCopyToClipboardResult {
  /** True for `resetAfterMs` after a successful copy. */
  hasCopied: boolean
  /** Copies `text`. Resolves to `true` on success. */
  copy: (text: string) => Promise<boolean>
}

/**
 * Provides a clipboard copy action with transient success state.
 *
 * @param options.resetAfterMs How long "Copied!" stays visible. Default 2000.
 * @returns `{ hasCopied, copy }`.
 *
 * @example
 * ```tsx
 * const { hasCopied, copy } = useCopyToClipboard()
 *
 * <button onClick={() => void copy(address)}>
 *   {hasCopied ? 'Copied!' : 'Copy address'}
 * </button>
 * ```
 *
 * WORKFLOW
 *   copy(text)
 *        |
 *        v
 *   is the Clipboard API available?  -- no --> return false
 *        | yes
 *        v
 *   await navigator.clipboard.writeText(text)
 *        |
 *        v
 *   hasCopied = true; schedule a reset
 *
 * WHY THE AVAILABILITY CHECK
 * `navigator.clipboard` is undefined on insecure origins. `localhost` counts as
 * secure, so it works during development — but the moment the app is served
 * over plain HTTP from another machine (a phone on the same wifi during a
 * workshop, say) it vanishes. Failing quietly and returning `false` is better
 * than throwing.
 */
export function useCopyToClipboard(
  options: { resetAfterMs?: number } = {},
): UseCopyToClipboardResult {
  const { resetAfterMs = 2000 } = options
  const [hasCopied, setHasCopied] = useState(false)

  // Holding the timeout id in a ref lets us cancel a pending reset when the
  // user copies again quickly, so the label does not flicker off early.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending timer on unmount, otherwise it fires against a component
  // that no longer exists.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return false
      }

      try {
        await navigator.clipboard.writeText(text)

        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setHasCopied(true)
        timeoutRef.current = setTimeout(() => setHasCopied(false), resetAfterMs)

        return true
      } catch {
        // The user can deny clipboard permission, and some browsers block the
        // write when the document is not focused. Neither is worth an error UI.
        return false
      }
    },
    [resetAfterMs],
  )

  return { hasCopied, copy }
}
