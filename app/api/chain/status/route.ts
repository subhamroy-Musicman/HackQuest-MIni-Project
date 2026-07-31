/**
 * =============================================================================
 * FILE: app/api/chain/status/route.ts
 * =============================================================================
 *
 * ENDPOINT
 * --------
 *   GET /api/chain/status
 *
 * PURPOSE
 * -------
 * Reports the chain's latest block. The simplest read in the whole project,
 * and the one to reach for first when something is not working.
 *
 * WHY IT EXISTS
 * -------------
 * Two reasons, one practical and one pedagogical.
 *
 * Practical: it is a health check. If this endpoint returns a block height,
 * your endpoint configuration is correct and the network is reachable. If it
 * does not, nothing else in the app can possibly work, so there is no point
 * debugging the wallet.
 *
 * Pedagogical: it is proof that reading a blockchain requires nothing. No
 * wallet, no account, no key, no gas, no permission. A public ledger is
 * genuinely public. Starting a workshop here — before any wallet is installed —
 * gets everyone a working connection in ninety seconds.
 *
 * WHEN TO USE
 * -----------
 * Polled every `POLL_INTERVAL_MS` by `hooks/useChainStatus.ts`.
 *
 * EXECUTION FLOW
 * --------------
 *   Browser
 *      |  GET /api/chain/status
 *      v
 *   THIS FILE
 *      |
 *      v
 *   lib/queries.ts  fetchChainStatus()
 *      |
 *      v
 *   lib/clients.ts  ChainRestTendermintApi
 *      |
 *      v
 *   Injective node (REST/LCD)
 *      |
 *      v
 *   { chainId, latestBlockHeight, latestBlockTime, endpoint }
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/queries.ts`, `app/api/_shared.ts`
 * Depended on by: `lib/api.ts` -> `hooks/useChainStatus.ts`
 * =============================================================================
 */

import { fetchChainStatus } from '@/lib/queries'
import { fail, ok } from '../../_shared'

/**
 * Opts this route out of static generation.
 *
 * Next.js will happily evaluate a route handler once at build time and serve
 * the frozen result forever. For blockchain data that is catastrophic — the app
 * would report the same block height for as long as it is deployed.
 * `force-dynamic` guarantees the handler runs per request.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles `GET /api/chain/status`.
 *
 * @returns `200 { ok: true, data: ChainStatus }` on success,
 *          `502 { ok: false, error }` when no node could be reached.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/chain/status
 * # {"ok":true,"data":{"chainId":"injective-888","latestBlockHeight":"84213590",…}}
 * ```
 *
 * WORKFLOW
 *   fetchChainStatus()
 *        |
 *        +-- resolves -> ok(status)
 *        |
 *        +-- throws   -> fail(error, 'reading chain status')
 *
 * WHY THE HANDLER ITSELF IS THIS SHORT
 * ------------------------------------
 * All the blockchain logic lives in `lib/queries.ts`, and all the error
 * translation in `lib/errors.ts`. A route handler should be a thin adapter
 * between HTTP and your domain logic — that is what makes the domain logic
 * testable without spinning up a server, and reusable from a script or a cron
 * job.
 */
export async function GET() {
  try {
    const status = await fetchChainStatus()
    return ok(status)
  } catch (thrown) {
    return fail(thrown, 'reading chain status')
  }
}
