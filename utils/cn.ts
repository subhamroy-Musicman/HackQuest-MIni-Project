/**
 * =============================================================================
 * FILE: utils/cn.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Joins CSS class names together, skipping anything falsy.
 *
 * WHY IT EXISTS
 * -------------
 * Conditional classes in JSX get ugly fast:
 *
 *   className={'btn ' + (isPrimary ? 'btn-primary ' : '') + (disabled ? 'opacity-50' : '')}
 *
 * That has a trailing-space bug waiting to happen and is hard to scan. With
 * this helper it becomes:
 *
 *   className={cn('btn', isPrimary && 'btn-primary', disabled && 'opacity-50')}
 *
 * Most production codebases use the `clsx` + `tailwind-merge` packages for
 * this. We implement it in eight lines instead, deliberately: this repository
 * is here to be read, and a dependency you cannot open and understand in ten
 * seconds is a dependency that hides a concept.
 *
 * WHAT WE GIVE UP
 * ---------------
 * `tailwind-merge` resolves *conflicts* — given `"p-2 p-4"` it returns `"p-4"`.
 * This helper does not, so avoid passing conflicting utilities for the same
 * CSS property. In practice the components here are structured so that never
 * happens.
 *
 * WHEN TO USE
 * -----------
 * In any component with conditional styling.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing
 * Depended on by: every component in `components/`
 * =============================================================================
 */

/**
 * A value that may legally be passed to `cn()`.
 *
 * Allowing `false`, `undefined` and `null` is the whole point — it is what
 * makes `condition && 'class'` work, since `&&` yields `false` when the
 * condition fails.
 */
type ClassValue = string | number | false | null | undefined

/**
 * Concatenates class names, dropping falsy entries.
 *
 * @param values Any mix of strings and short-circuited conditionals.
 * @returns A single space-separated class string, with no leading, trailing or
 *          doubled spaces.
 *
 * @example
 * ```ts
 * cn('rounded-lg', 'px-4')                    // 'rounded-lg px-4'
 * cn('btn', isActive && 'btn-active')         // isActive=false -> 'btn'
 * cn('btn', undefined, null, false, 'w-full') // 'btn w-full'
 * ```
 *
 * WORKFLOW
 *   receive arguments
 *        |
 *        v
 *   drop every falsy value
 *        |
 *        v
 *   join the rest with a single space
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
