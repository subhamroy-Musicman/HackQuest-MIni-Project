/**
 * =============================================================================
 * FILE: app/api/tx/broadcast/route.ts
 * =============================================================================
 *
 * ENDPOINT
 * --------
 *   POST /api/tx/broadcast
 *   Body: { "bodyBytes": "…", "authInfoBytes": "…", "signatures": ["…"] }
 *
 * PURPOSE
 * -------
 * Delivers an already-signed transaction to the Injective network and waits for
 * the chain's verdict.
 *
 * WHY IT EXISTS
 * -------------
 * This route is the boundary between "a signed intention sitting in a browser"
 * and "a permanent fact on a public ledger". It is worth being precise about
 * what it does and does not do.
 *
 * WHAT IT DOES NOT DO — and this is the important half:
 *   * It does not sign anything.
 *   * It does not have, request, or need any private key.
 *   * It cannot modify the transaction. The signature covers every byte; change
 *     one and the chain rejects it.
 *
 * All it does is relay bytes. That is why routing a broadcast through your own
 * server is safe: the transaction is already authorised, already public, and
 * already immutable. The worst a malicious relay could do is refuse to send it
 * — which you would notice immediately, because no hash comes back.
 *
 * WHY RELAY AT ALL, RATHER THAN BROADCASTING FROM THE BROWSER?
 * -----------------------------------------------------------
 * Consistency with the read path: one place that knows the endpoints, no CORS
 * surface, and a paid node's URL never reaches a browser. Broadcasting directly
 * from the browser is equally valid and is what the SDK examples show; this
 * project chooses the server for the same reasons it reads server-side.
 *
 * WHEN TO USE
 * -----------
 * Called by `lib/api.ts` at stage 3 of the transaction lifecycle.
 *
 * EXECUTION FLOW
 * --------------
 *   Browser: wallet signed the transaction
 *      |  POST the three base64-encoded parts
 *      v
 *   THIS FILE — base64 -> bytes -> TxRaw
 *      |
 *      v
 *   lib/clients.ts  TxRestApi.broadcast()
 *      |
 *      v
 *   Injective node -> mempool -> validators -> block
 *      |
 *      v
 *   { txHash, height, code, rawLog, gasWanted, gasUsed }
 *      |
 *      v
 *   Browser renders the receipt and an explorer link
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `@injectivelabs/sdk-ts`, `lib/clients.ts`, `lib/helpers.ts`,
 *              `app/api/_shared.ts`
 * Depended on by: `lib/api.ts` -> `lib/transactions.ts`
 * =============================================================================
 */

import type { TxRaw } from '@injectivelabs/sdk-ts'
import { getTxApi } from '@/lib/clients'
import { getExplorerTxUrl } from '@/lib/helpers'
import { AppError, ErrorCode } from '@/lib/errors'
import { fail, ok } from '../../_shared'
import type { BroadcastRequestBody, TransactionResult } from '@/types'

/** A broadcast is inherently a one-off action; caching it is meaningless. */
export const dynamic = 'force-dynamic'

/**
 * Decodes a base64 string into the byte array the SDK expects.
 *
 * @param base64 A base64-encoded field from the request body.
 * @returns The raw bytes.
 *
 * @example
 * ```ts
 * base64ToBytes('Cp0BCpoB') // Uint8Array(6) [ 10, 157, 1, 10, 154, 1 ]
 * ```
 *
 * WHY `new Uint8Array(buffer)` RATHER THAN RETURNING THE BUFFER
 * -------------------------------------------------------------
 * A Node.js `Buffer` *is* a `Uint8Array` subclass, so it would usually work.
 * But `Buffer.from` may return a view onto a shared, pooled `ArrayBuffer` — the
 * `byteOffset` is not necessarily zero. Libraries that read `.buffer` directly
 * then see the whole pool instead of just these bytes. Copying into a plain
 * `Uint8Array` removes an entire class of very hard-to-diagnose bug.
 */
function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

/**
 * Handles `POST /api/tx/broadcast`.
 *
 * @param request The incoming request; its JSON body must be a
 *                `BroadcastRequestBody`.
 * @returns `200 { ok: true, data: TransactionResult }` once the chain has
 *          reported an outcome (note: an outcome, not necessarily a success —
 *          check `data.code`),
 *          `400` if the body is missing or the base64 is unusable,
 *          `422` if the chain rejected the transaction outright,
 *          `502` if no node could be reached.
 *
 * @example
 * ```ts
 * await fetch('/api/tx/broadcast', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ bodyBytes, authInfoBytes, signatures }),
 * })
 * ```
 *
 * WORKFLOW
 *   parse JSON body
 *        |
 *        v
 *   base64 -> Uint8Array for each of the three parts
 *        |
 *        v
 *   TxRestApi.broadcast(txRaw)
 *        |
 *        v
 *   map the SDK response onto our TransactionResult, adding an explorer link
 *
 * A CRITICAL SUBTLETY: WE RETURN 200 FOR A FAILED TRANSACTION
 * -----------------------------------------------------------
 * If the chain includes the transaction in a block but rejects the message
 * (`code !== 0`), this route still answers 200. That is deliberate.
 *
 * The *broadcast* succeeded — we asked the network to do something and it gave
 * us a definitive answer, complete with a real transaction hash the user can
 * look up on an explorer. The *transaction* failed, which is a different fact,
 * carried in `data.code`.
 *
 * Collapsing the two would lose the hash, and the hash is the most useful thing
 * a user can have when a transaction fails. `lib/transactions.ts` inspects
 * `code` and raises the error on the client side, where the hash is still in
 * hand.
 */
export async function POST(request: Request) {
  try {
    /* --- 1. Read and validate the body ---------------------------------- */

    let body: BroadcastRequestBody

    try {
      body = (await request.json()) as BroadcastRequestBody
    } catch {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'The request body was not valid JSON.',
        {
          hint: 'Send { "bodyBytes", "authInfoBytes", "signatures" } with Content-Type: application/json.',
        },
      )
    }

    const hasAllParts =
      typeof body?.bodyBytes === 'string' &&
      typeof body?.authInfoBytes === 'string' &&
      Array.isArray(body?.signatures)

    if (!hasAllParts) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'The request is missing part of the signed transaction.',
        {
          hint: 'Expected `bodyBytes`, `authInfoBytes` and `signatures` in the request body. See BroadcastRequestBody in types/api.ts.',
        },
      )
    }

    /* --- 2. Rebuild the TxRaw --------------------------------------------
     * Base64 back into raw bytes. `Buffer` is available here because route
     * handlers run on Node.js; the browser half of this round trip
     * (`lib/transactions.ts`) had to use `btoa`, since `Buffer` does not exist
     * there. Same operation, two runtimes — a small but constant reminder that
     * the server/client split is something you have to hold in your head.
     *
     * Note that we are not parsing or validating the contents. We could not
     * meaningfully alter them if we wanted to: any change would invalidate the
     * signature and the chain would reject the transaction. This server is a
     * relay, nothing more.
     * ------------------------------------------------------------------- */

    let txRaw: TxRaw

    try {
      txRaw = {
        bodyBytes: base64ToBytes(body.bodyBytes),
        authInfoBytes: base64ToBytes(body.authInfoBytes),
        signatures: body.signatures.map(base64ToBytes),
      }
    } catch (decodeError) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'The signed transaction could not be decoded.',
        {
          hint: 'One of the base64 fields was malformed. This usually means the encoding step in the browser produced something unexpected.',
          cause: decodeError,
        },
      )
    }

    /* --- 3. Broadcast ----------------------------------------------------
     * `broadcast()` submits the transaction and waits for it to be included in
     * a block, then returns the chain's verdict. Under the hood it uses "sync"
     * mode — the node validates the transaction's basic form immediately and
     * the SDK then polls until the transaction appears.
     * ------------------------------------------------------------------- */

    const txApi = getTxApi()
    const response = await txApi.broadcast(txRaw)

    /* --- 4. Map to our own shape ---------------------------------------- */

    const result: TransactionResult = {
      txHash: response.txHash,
      height: response.height,
      // 0 means the message executed successfully. Anything else is a
      // chain-level rejection, explained by `rawLog`.
      code: response.code,
      rawLog: response.rawLog ?? '',
      gasWanted: response.gasWanted,
      // On Cosmos chains the difference between `gasWanted` and `gasUsed` is
      // NOT refunded — you pay the fee you committed to. This is unlike
      // Ethereum, and it is why over-estimating gas is not entirely free.
      gasUsed: response.gasUsed,
      // Built server-side so the browser never has to know which explorer
      // corresponds to which network.
      explorerUrl: getExplorerTxUrl(response.txHash),
    }

    return ok(result)
  } catch (thrown) {
    return fail(thrown, 'broadcasting the transaction')
  }
}
