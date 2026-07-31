/**
 * =============================================================================
 * FILE: app/api/account/[address]/auth/route.ts
 * =============================================================================
 *
 * ENDPOINT
 * --------
 *   GET /api/account/:address/auth
 *
 * PURPOSE
 * -------
 * Returns the three numbers a wallet needs before it can sign anything:
 * `accountNumber`, `sequence`, and the chain's current block height.
 *
 * WHY IT EXISTS
 * -------------
 * Despite the name, this endpoint has nothing to do with logging in. "Auth" is
 * the Cosmos module that owns *accounts* — it is the chain's registry of who
 * exists and how many transactions each account has made.
 *
 * The three values it returns are what make a Cosmos signature safe:
 *
 *   accountNumber — permanent id, assigned when the account is first funded.
 *                   Baked into the signature so a signature for account A can
 *                   never be replayed against account B.
 *
 *   sequence      — a counter that increases by exactly one per successful
 *                   transaction. Also baked into the signature. Once sequence
 *                   7 has been used, a transaction signed for sequence 7 is
 *                   permanently dead. This is replay protection: nobody can
 *                   capture your signed transfer and re-submit it tomorrow.
 *
 *   latestBlockHeight — used to compute `timeoutHeight`, an expiry after which
 *                   the transaction can never execute.
 *
 * Together these mean a Cosmos signature authorises exactly one action, from
 * exactly one account, on exactly one chain, at exactly one point in that
 * account's history, valid for roughly the next minute. Very little else in
 * software is that specific.
 *
 * WHEN TO USE
 * -----------
 * Called by `lib/transactions.ts` at the start of EVERY send. Never cached —
 * see below.
 *
 * EXECUTION FLOW
 * --------------
 *   lib/transactions.ts (browser)
 *      |  GET /api/account/inj1…/auth
 *      v
 *   THIS FILE
 *      |
 *      v
 *   lib/queries.ts  fetchAccountAuthInfo()
 *      |
 *      v
 *   ChainRestAuthApi + ChainRestTendermintApi  (in parallel)
 *      |
 *      v
 *   { accountNumber, sequence, latestBlockHeight }
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/queries.ts`, `utils/validation.ts`, `app/api/_shared.ts`
 * Depended on by: `lib/api.ts` -> `lib/transactions.ts`
 * =============================================================================
 */

import { fetchAccountAuthInfo } from '@/lib/queries'
import { validateInjectiveAddress } from '@/utils/validation'
import { AppError, ErrorCode } from '@/lib/errors'
import { fail, ok } from '../../../_shared'

/**
 * Never cache this route.
 *
 * Of every endpoint in this project, this is the one where caching would be
 * most damaging. A cached `sequence` is a *stale* sequence, and a stale
 * sequence produces the "account sequence mismatch" error on the user's very
 * next transaction. If you take one caching lesson from this repo, take this
 * one.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles `GET /api/account/:address/auth`.
 *
 * @param _request Unused; the address comes from the path.
 * @param context  Route context. `params` is a Promise in Next.js 15+.
 * @returns `200 { ok: true, data: { address, accountNumber, sequence, latestBlockHeight } }`,
 *          `400` for a malformed address,
 *          `404` when the account does not exist on-chain yet,
 *          `502` when no node responded.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/account/inj1…/auth
 * # {"ok":true,"data":{"accountNumber":12345,"sequence":7,…}}
 * ```
 *
 * THE 404 CASE IS NOT A BUG — IT IS A LESSON
 * ------------------------------------------
 * On Cosmos chains an address does not exist until it first receives tokens.
 * A freshly generated wallet has a perfectly valid address with no account
 * behind it: no account number, no sequence, nothing to sign with.
 *
 * The consequence surprises everyone: **you cannot send your first transaction
 * until somebody has sent you something.** On testnet, the faucet is that
 * somebody. `lib/errors.ts` turns this 404 into a message that says exactly
 * that, with a faucet link.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params
    const decodedAddress = decodeURIComponent(address)

    const check = validateInjectiveAddress(decodedAddress)
    if (!check.valid) {
      throw new AppError(ErrorCode.INVALID_ADDRESS, check.error!)
    }

    const authInfo = await fetchAccountAuthInfo(decodedAddress)
    return ok(authInfo)
  } catch (thrown) {
    return fail(thrown, 'reading account details')
  }
}
