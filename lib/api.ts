/**
 * =============================================================================
 * FILE: lib/api.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * The browser's typed client for this project's *own* backend. Every call the
 * frontend makes to `/api/**` goes through a function in this file.
 *
 * WHY IT EXISTS
 * -------------
 * Without it, `fetch` calls end up scattered through components, each one
 * repeating the same four things: build the URL, check `response.ok`, parse the
 * JSON, and decide what to do with an error. Four chances to get it slightly
 * wrong, in every component.
 *
 * Centralising gives one place where:
 *   * URLs are constructed (so a route rename is a one-line change),
 *   * the `ApiResponse` envelope is unwrapped,
 *   * server errors are turned back into `AppError` instances so the frontend
 *     handles local and remote failures through exactly one code path.
 *
 * That last point is the important one. A component should not care whether a
 * failure happened in the browser or on the server — it wants an `AppError`
 * with a message and a hint either way.
 *
 * WHEN TO USE
 * -----------
 * BROWSER ONLY, and only from hooks. Components should not call these directly;
 * they call a hook, which handles loading and error state.
 *
 * EXECUTION FLOW
 * --------------
 *   hooks/useBalances.ts
 *        |
 *        v
 *   THIS FILE: getBalances(address)
 *        |
 *        v
 *   fetch('/api/account/inj1…/balances')
 *        |
 *        v
 *   app/api/account/[address]/balances/route.ts   (server)
 *        |
 *        v
 *   lib/queries.ts -> Injective node
 *        |
 *        v
 *   { ok: true, data: … }  or  { ok: false, error: … }
 *        |
 *        v
 *   unwrap(): returns `data`, or THROWS an AppError
 *        |
 *        v
 *   hook catches and stores it
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `types/api.ts`, `lib/errors.ts`
 * Depended on by: `hooks/useBalances.ts`, `hooks/useChainStatus.ts`,
 *                 `lib/transactions.ts`
 * =============================================================================
 */

import { AppError, ErrorCode, toAppError } from './errors'
import type {
  ApiResponse,
  Balance,
  BroadcastRequestBody,
  ChainStatus,
  TransactionResult,
} from '@/types'

/**
 * Performs a request against our API and unwraps the response envelope.
 *
 * PURPOSE
 * The single piece of fetch logic in the browser. Every exported function below
 * is a thin, well-named wrapper around this.
 *
 * @typeParam T The `data` type for a successful response.
 * @param path        A path such as `/api/chain/status`.
 * @param init        Standard `fetch` options. Omit for a GET.
 * @param description Short label used in the error message when something
 *                    unexpected happens, e.g. `'loading balances'`.
 * @returns The unwrapped `data`.
 * @throws {AppError} Always an `AppError` — never a raw fetch error, never a
 *                    `TypeError`. That guarantee is what lets every caller have
 *                    exactly one catch block.
 *
 * @example
 * ```ts
 * const status = await request<ChainStatus>('/api/chain/status', undefined, 'loading chain status')
 * ```
 *
 * WORKFLOW
 *   fetch(path)
 *        |
 *        +-- network threw (offline, DNS)  -> toAppError -> RPC_UNAVAILABLE
 *        |
 *        v
 *   parse JSON
 *        |
 *        +-- not JSON (a proxy returned HTML) -> AppError UNKNOWN
 *        |
 *        v
 *   body.ok === false?  -> rebuild the server's AppError and throw it
 *        |
 *        v
 *   return body.data
 *
 * WHY WE RECONSTRUCT AN `AppError` FROM THE RESPONSE
 * --------------------------------------------------
 * The server already did the hard work of interpreting the failure — it knows
 * it was a sequence mismatch, and it wrote a good hint. Sending that across as
 * `{ code, message, hint }` and re-instantiating it here preserves all of it.
 * The alternative, throwing `new Error('Request failed with status 502')`,
 * throws away the only useful information in the exchange.
 */
async function request<T>(
  path: string,
  init: RequestInit | undefined,
  description: string,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (thrown) {
    // `fetch` only rejects for genuine network-layer failures: offline, DNS,
    // aborted. An HTTP 500 does NOT reject — it resolves with `ok: false`.
    // That surprises a lot of people.
    throw toAppError(thrown, description)
  }

  let body: ApiResponse<T>

  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    // We got a response, but it was not JSON. Usually a proxy, a tunnel error
    // page, or a Next.js crash page. Say so precisely rather than pretending
    // the chain failed.
    throw new AppError(
      ErrorCode.UNKNOWN,
      `The server returned an unreadable response while ${description}.`,
      {
        hint: `Expected JSON but got HTTP ${response.status}. Check the terminal running \`npm run dev\` — the real error is almost certainly logged there.`,
      },
    )
  }

  if (!body.ok) {
    // Faithfully re-throw what the server determined. `body.error.code` is one
    // of our own `ErrorCode` values, so components can still branch on it.
    throw new AppError(body.error.code as ErrorCode, body.error.message, {
      hint: body.error.hint,
    })
  }

  return body.data
}

/**
 * Reads the chain's current status.
 *
 * PURPOSE
 * Powers the "Chain Status" panel. Needs no wallet — the first thing that
 * should work in a fresh clone of this repo.
 *
 * @returns Chain id, latest block height, block time and the endpoint used.
 * @throws {AppError} `RPC_UNAVAILABLE` when no node responded.
 *
 * @example
 * ```ts
 * const { latestBlockHeight } = await getChainStatus()
 * ```
 */
export async function getChainStatus(): Promise<ChainStatus> {
  return request<ChainStatus>(
    '/api/chain/status',
    undefined,
    'loading chain status',
  )
}

/**
 * Reads every token balance for an address.
 *
 * @param address Any `inj1…` address. It does not have to be the connected
 *                wallet — balances are public.
 * @returns The address's balances, INJ first.
 * @throws {AppError} `RPC_UNAVAILABLE`, or `INVALID_ADDRESS` if the server
 *                    rejected the address format.
 *
 * @example
 * ```ts
 * const balances = await getBalances('inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm')
 * ```
 *
 * WORKFLOW
 *   encodeURIComponent(address)   <- never interpolate user input into a URL raw
 *        |
 *        v
 *   GET /api/account/{address}/balances
 *        |
 *        v
 *   unwrap -> Balance[]
 */
export async function getBalances(address: string): Promise<Balance[]> {
  const payload = await request<{ address: string; balances: Balance[] }>(
    `/api/account/${encodeURIComponent(address)}/balances`,
    undefined,
    'loading balances',
  )
  return payload.balances
}

/**
 * Reads the signing metadata an account needs before it can transact.
 *
 * PURPOSE
 * Step one of every transaction. See `lib/transactions.ts` for how the values
 * are used and `lib/queries.ts` for what they mean.
 *
 * @param address The address that will sign.
 * @returns `{ accountNumber, sequence, latestBlockHeight }`.
 * @throws {AppError} `ACCOUNT_NOT_FOUND` if the address has never been funded.
 *
 * @example
 * ```ts
 * const { sequence, accountNumber } = await getAccountAuthInfo(address)
 * ```
 *
 * NEVER CACHE THIS
 * The `sequence` changes with every transaction the account makes — including
 * ones made from a different device. Caching it is the direct cause of the
 * "account sequence mismatch" error.
 */
export async function getAccountAuthInfo(address: string): Promise<{
  address: string
  accountNumber: number
  sequence: number
  latestBlockHeight: string
}> {
  return request<{
    address: string
    accountNumber: number
    sequence: number
    latestBlockHeight: string
  }>(
    `/api/account/${encodeURIComponent(address)}/auth`,
    undefined,
    'reading account details',
  )
}

/**
 * Sends an already-signed transaction to the network.
 *
 * PURPOSE
 * The final step of the write path. By the time this is called, the user has
 * approved and the signature exists; all that remains is delivery.
 *
 * @param signedTx The three base64-encoded parts of the signed `TxRaw`. See
 *                 `BroadcastRequestBody` for what each one contains.
 * @returns The transaction result, including hash, block height and code.
 * @throws {AppError} `TX_FAILED` when the chain rejected the message,
 *                    `RPC_UNAVAILABLE` when it could not be delivered.
 *
 * @example
 * ```ts
 * const result = await broadcastTransaction({
 *   bodyBytes: '…',
 *   authInfoBytes: '…',
 *   signatures: ['…'],
 * })
 * if (result.code === 0) console.log('Confirmed in block', result.height)
 * ```
 *
 * IS IT SAFE TO SEND THIS TO A SERVER?
 * ------------------------------------
 * Completely. A signed transaction is about to be published to a public,
 * permanent ledger — it is the least secret data in the entire system. It
 * contains no private key, and it cannot be modified without invalidating the
 * signature. The worst a malicious relay could do is refuse to broadcast it,
 * which you would notice immediately.
 */
export async function broadcastTransaction(
  signedTx: BroadcastRequestBody,
): Promise<TransactionResult> {
  return request<TransactionResult>(
    '/api/tx/broadcast',
    { method: 'POST', body: JSON.stringify(signedTx) },
    'broadcasting the transaction',
  )
}
