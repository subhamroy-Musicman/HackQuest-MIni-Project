/**
 * =============================================================================
 * FILE: app/api/account/[address]/balances/route.ts
 * =============================================================================
 *
 * ENDPOINT
 * --------
 *   GET /api/account/:address/balances
 *
 * PURPOSE
 * -------
 * Returns every token balance held by an address, enriched with symbols,
 * decimals and human-readable amounts.
 *
 * WHY IT EXISTS
 * -------------
 * This is the read that makes a dApp feel like a dApp: the user connects, and
 * their money appears.
 *
 * It is worth pausing on how unusual this endpoint is compared to a normal web
 * app. There is **no authentication**. Anyone can request anyone's balances,
 * and that is not an oversight — a blockchain is a public ledger, and every
 * balance on it has always been world-readable. The address in the URL is not a
 * secret and does not need protecting.
 *
 * What that changes: a dApp's "log in" is about *identity for signing*, never
 * about *access to data*. Conflating the two is the most common conceptual
 * carry-over from web2, and it leads people to build authentication that
 * protects nothing.
 *
 * WHEN TO USE
 * -----------
 * Called by `hooks/useBalances.ts` when a wallet connects, after a successful
 * transfer, and on a poll.
 *
 * EXECUTION FLOW
 * --------------
 *   Browser
 *      |  GET /api/account/inj1…/balances
 *      v
 *   THIS FILE — validates the address
 *      |
 *      v
 *   lib/queries.ts  fetchBalances()
 *      |
 *      v
 *   lib/clients.ts  ChainGrpcBankApi
 *      |
 *      v
 *   Injective node (gRPC-web)
 *      |
 *      v
 *   Balance[] — INJ first, then non-zero, then alphabetical
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/queries.ts`, `utils/validation.ts`, `app/api/_shared.ts`
 * Depended on by: `lib/api.ts` -> `hooks/useBalances.ts`
 * =============================================================================
 */

import { fetchBalances } from '@/lib/queries'
import { validateInjectiveAddress } from '@/utils/validation'
import { AppError, ErrorCode } from '@/lib/errors'
import { fail, ok } from '../../../_shared'

/** Blockchain state changes constantly; never serve a cached answer. */
export const dynamic = 'force-dynamic'

/**
 * Handles `GET /api/account/:address/balances`.
 *
 * @param _request The incoming request. Unused — the address comes from the
 *                 path, not from a query string or body.
 * @param context  Next.js route context. In the App Router `params` is a
 *                 **Promise** and must be awaited; this changed in Next.js 15
 *                 and is a very common upgrade error.
 * @returns `200 { ok: true, data: { address, balances } }`,
 *          `400` for a malformed address,
 *          `502` if the node could not be reached.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/account/inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm/balances
 * ```
 *
 * WORKFLOW
 *   await params -> address
 *        |
 *        v
 *   validateInjectiveAddress()  -> reject early, no network call
 *        |
 *        v
 *   fetchBalances(address)
 *        |
 *        v
 *   ok({ address, balances })
 *
 * WHY VALIDATE AGAIN, WHEN THE FORM ALREADY DID?
 * ----------------------------------------------
 * Because the form is not the only caller. Anyone can `curl` this endpoint,
 * and a browser-side check protects nobody once the request leaves the browser.
 * Client-side validation is a convenience for the user; server-side validation
 * is the actual rule. Always do both, and never rely on only the first.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    // `params` is a Promise in the Next.js App Router (15+). Forgetting to
    // await it yields `undefined` and a confusing downstream failure.
    const { address } = await context.params

    // The path segment was URL-encoded by the client, so decode it before use.
    const decodedAddress = decodeURIComponent(address)

    const check = validateInjectiveAddress(decodedAddress)
    if (!check.valid) {
      // Rejecting here saves a pointless round trip to a node that would only
      // reject it too, more slowly and with a worse message.
      throw new AppError(ErrorCode.INVALID_ADDRESS, check.error!, {
        hint: 'Check the address in the URL. Injective addresses start with "inj1" and are 42 characters long.',
      })
    }

    const balances = await fetchBalances(decodedAddress)

    // Echoing the address back makes the response self-describing, which
    // matters when several requests are in flight for different accounts and
    // a late response could otherwise be applied to the wrong one.
    return ok({ address: decodedAddress, balances })
  } catch (thrown) {
    return fail(thrown, 'fetching balances')
  }
}
