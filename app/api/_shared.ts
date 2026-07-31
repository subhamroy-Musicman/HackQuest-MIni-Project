/**
 * =============================================================================
 * FILE: app/api/_shared.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Shared helpers for every route handler: consistent success and error
 * responses, and consistent server-side logging.
 *
 * WHY IT EXISTS
 * -------------
 * Four route handlers, each needing to answer in the same envelope and map the
 * same error codes to the same HTTP statuses. Without a shared helper they
 * drift apart within a week, and the frontend ends up with special cases.
 *
 * The leading underscore in the filename is a Next.js convention: files and
 * folders beginning with `_` inside `app/` are ignored by the router, so this
 * never becomes a reachable URL. Without it, `app/api/_shared.ts` would be a
 * broken endpoint at `/api/_shared`.
 *
 * WHEN TO USE
 * -----------
 * In every file under `app/api/`. Never import it into a client component — it
 * pulls in server-only code.
 *
 * EXECUTION FLOW
 * --------------
 *   route handler
 *        |
 *        +-- success -> ok(data)        -> 200 { ok: true, data }
 *        |
 *        +-- failure -> fail(error)     -> 4xx/5xx { ok: false, error }
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/errors.ts`, `types/api.ts`
 * Depended on by: every file under `app/api/`
 * =============================================================================
 */

import { NextResponse } from 'next/server'
import { AppError, ErrorCode, toAppError } from '@/lib/errors'
import type { ApiResponse } from '@/types'

/**
 * Builds a successful JSON response.
 *
 * @typeParam T The payload type.
 * @param data The payload.
 * @returns A `NextResponse` with `{ ok: true, data }` and status 200.
 *
 * @example
 * ```ts
 * return ok({ address, balances })
 * ```
 *
 * NOTE ON CACHING
 * We set `no-store` explicitly. Next.js caches route handler responses
 * aggressively by default, and a cached balance is a *wrong* balance — the
 * user sends a transaction, refreshes, and sees the old number. Blockchain
 * data is live data; opting out of caching is not a micro-optimisation, it is
 * correctness.
 */
export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { ok: true as const, data },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Maps an application error code to the right HTTP status.
 *
 * @param code The `ErrorCode` that occurred.
 * @returns An HTTP status code.
 *
 * WHY BOTHER, WHEN THE BODY ALREADY CARRIES THE CODE?
 * ---------------------------------------------------
 * Because the status is what everything *between* our server and the browser
 * understands: proxies, CDNs, monitoring, browser devtools. Returning HTTP 200
 * with an error body is a well-known anti-pattern that makes outages invisible
 * to your own infrastructure.
 *
 * The distinction that matters here is 4xx versus 5xx: 4xx means "the request
 * was wrong", 5xx means "we could not fulfil a valid request". A bad address is
 * the caller's fault (400). An unreachable node is not (502).
 */
function statusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.INVALID_ADDRESS:
    case ErrorCode.INVALID_AMOUNT:
    case ErrorCode.INVALID_REQUEST:
      return 400
    case ErrorCode.ACCOUNT_NOT_FOUND:
      return 404
    case ErrorCode.INSUFFICIENT_BALANCE:
    case ErrorCode.SEQUENCE_MISMATCH:
    case ErrorCode.TX_FAILED:
      // 422: the request was well-formed, but the chain would not act on it.
      return 422
    case ErrorCode.RPC_UNAVAILABLE:
      // 502: we are a gateway and the upstream node failed us.
      return 502
    case ErrorCode.TX_TIMEOUT:
      return 504
    default:
      return 500
  }
}

/**
 * Builds a failure response from any thrown value.
 *
 * @param thrown  Whatever landed in the `catch` block.
 * @param context Short description of what was being attempted, used to make
 *                the fallback message specific.
 * @returns A `NextResponse` with `{ ok: false, error }` and an appropriate status.
 *
 * @example
 * ```ts
 * try {
 *   return ok(await fetchBalances(address))
 * } catch (thrown) {
 *   return fail(thrown, 'fetching balances')
 * }
 * ```
 *
 * WORKFLOW
 *   toAppError()  -> interpret and attach a hint
 *        |
 *        v
 *   log the full error server-side (never sent to the client)
 *        |
 *        v
 *   statusForCode() -> HTTP status
 *        |
 *        v
 *   respond with the safe, serialisable `{ code, message, hint }`
 *
 * SECURITY NOTE
 * `error.cause` — which may contain endpoint URLs, internal hostnames or stack
 * traces — is logged on the server and deliberately never serialised into the
 * response. `AppError.toJSON()` returns only the three safe fields.
 */
export function fail(
  thrown: unknown,
  context: string,
): NextResponse<ApiResponse<never>> {
  const appError: AppError = toAppError(thrown, context)

  // Server-side log. In a real deployment this goes to your observability
  // stack; during a workshop it goes to the terminal running `npm run dev`,
  // which is exactly where an attendee should be told to look.
  console.error(`[api] ${context} failed:`, {
    code: appError.code,
    message: appError.message,
    cause: appError.cause,
  })

  return NextResponse.json(
    { ok: false as const, error: appError.toJSON() },
    {
      status: statusForCode(appError.code),
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
