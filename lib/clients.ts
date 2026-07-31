/**
 * =============================================================================
 * FILE: lib/clients.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Creates and caches the Injective SDK client objects used for every server-side
 * chain read and for broadcasting.
 *
 * WHY IT EXISTS
 * -------------
 * The Injective SDK is organised as a family of small "API" classes, each
 * wrapping one Cosmos module or one transport:
 *
 *   ChainGrpcBankApi        — balances, supply, denom metadata  (gRPC-web)
 *   ChainRestAuthApi        — account number & sequence          (REST/LCD)
 *   ChainRestTendermintApi  — latest block, node info            (REST/LCD)
 *   TxRestApi               — broadcast and look up transactions (REST/LCD)
 *
 * Each is constructed with an endpoint URL. Constructing them per request would
 * work, but it re-creates HTTP agents and protobuf machinery on every call for
 * no benefit, so we build each one once and reuse it.
 *
 * WHY REST *AND* gRPC?
 * --------------------
 * A fair question, and the answer is practical rather than ideological:
 *
 *   * gRPC-web is the SDK's primary, strongly-typed interface. `ChainGrpc*Api`
 *     classes return proper objects, not loosely-typed JSON. We use it for
 *     queries such as balances.
 *   * The REST/LCD gateway is what the official Injective transaction
 *     documentation uses for the account/block/broadcast trio, and it is the
 *     best-supported path for broadcasting a `TxRaw`.
 *
 * Both hit the same nodes and return the same data. Mixing them is normal in
 * production Injective apps.
 *
 * WHEN TO USE
 * -----------
 * SERVER-SIDE ONLY. Every function here runs inside a route handler. See the
 * "server-only" note below for why that boundary matters.
 *
 * EXECUTION FLOW
 * --------------
 *   app/api/<route>/route.ts
 *        |
 *        v
 *   lib/queries.ts / lib/broadcast.ts
 *        |
 *        v
 *   THIS FILE: getBankApi(), getAuthApi(), ...
 *        |
 *        v
 *   @injectivelabs/sdk-ts client
 *        |
 *        v
 *   Injective node (ENDPOINTS.rest / ENDPOINTS.grpc)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `@injectivelabs/sdk-ts`, `lib/constants.ts`
 * Depended on by: `lib/queries.ts`, `app/api/tx/broadcast/route.ts`
 * =============================================================================
 */

import {
  ChainGrpcBankApi,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  TxRestApi,
} from '@injectivelabs/sdk-ts'
import { ENDPOINTS } from './constants'

/**
 * ---------------------------------------------------------------------------
 * A NOTE ON MODULE-LEVEL CACHING IN NEXT.JS
 * ---------------------------------------------------------------------------
 * These `let` variables persist for the lifetime of the Node.js process, which
 * means one client is shared across many HTTP requests. That is safe here
 * because the clients are stateless — they hold a URL and an HTTP transport,
 * never per-user data.
 *
 * The rule worth remembering: module-level state on a server is shared between
 * every user of your app. Caching a *client* is fine. Caching a user's balance
 * in a module-level variable would be a serious bug, and a privacy leak.
 *
 * In development, Next.js hot-reloads modules and these will be re-created.
 * That is harmless.
 * ---------------------------------------------------------------------------
 */

let bankApi: ChainGrpcBankApi | undefined
let authApi: ChainRestAuthApi | undefined
let tendermintApi: ChainRestTendermintApi | undefined
let txApi: TxRestApi | undefined

/**
 * Returns the shared bank-module client.
 *
 * PURPOSE
 * The bank module is Cosmos' ledger of who owns how much of which denom. It is
 * the module behind every balance you have ever seen on a Cosmos chain, and
 * behind the `MsgSend` this app broadcasts.
 *
 * @returns A memoised `ChainGrpcBankApi` bound to the configured gRPC endpoint.
 *
 * @example
 * ```ts
 * const { balances } = await getBankApi().fetchBalances('inj1…')
 * ```
 *
 * WORKFLOW
 *   already constructed? -- yes --> return it
 *        | no
 *        v
 *   new ChainGrpcBankApi(ENDPOINTS.grpc)
 *        |
 *        v
 *   store and return
 *
 * NOTE
 * Constructing the client opens no connection and performs no I/O. The first
 * network request happens when you call a method on it.
 */
export function getBankApi(): ChainGrpcBankApi {
  if (!bankApi) {
    bankApi = new ChainGrpcBankApi(ENDPOINTS.grpc)
  }
  return bankApi
}

/**
 * Returns the shared auth-module client.
 *
 * PURPOSE
 * The auth module owns *accounts* — not balances, but identity: each address's
 * permanent `accountNumber` and its ever-incrementing `sequence`. Both values
 * are mandatory inputs to signing, which makes this the first call in every
 * transaction flow.
 *
 * @returns A memoised `ChainRestAuthApi` bound to the configured REST endpoint.
 *
 * @example
 * ```ts
 * const response = await getAuthApi().fetchAccount('inj1…')
 * const account = BaseAccount.fromRestApi(response)
 * console.log(account.sequence, account.accountNumber)
 * ```
 *
 * IMPORTANT
 * This throws for an address that has never received funds. On Cosmos chains
 * an account does not exist until it is first credited — see the
 * `ACCOUNT_NOT_FOUND` case in `lib/errors.ts`.
 */
export function getAuthApi(): ChainRestAuthApi {
  if (!authApi) {
    authApi = new ChainRestAuthApi(ENDPOINTS.rest)
  }
  return authApi
}

/**
 * Returns the shared Tendermint (consensus layer) client.
 *
 * PURPOSE
 * Tendermint — now called CometBFT — is the consensus engine underneath every
 * Cosmos chain. It is what produces blocks and finalises them. This client
 * answers questions about the chain itself rather than about any account:
 * what is the latest block, what height are we at, what time did validators
 * agree it was.
 *
 * @returns A memoised `ChainRestTendermintApi` bound to the REST endpoint.
 *
 * @example
 * ```ts
 * const block = await getTendermintApi().fetchLatestBlock()
 * console.log(block.header.height) // '84213590'
 * ```
 *
 * WHY THIS IS THE BEST FIRST DEMO IN A WORKSHOP
 * It needs no wallet, no account, no signature and no funds. If it returns a
 * height, your connection to the blockchain works. If it does not, nothing else
 * will either — so it is the ideal first thing to get working.
 */
export function getTendermintApi(): ChainRestTendermintApi {
  if (!tendermintApi) {
    tendermintApi = new ChainRestTendermintApi(ENDPOINTS.rest)
  }
  return tendermintApi
}

/**
 * Returns the shared transaction client.
 *
 * PURPOSE
 * Handles the two *write*-adjacent operations: pushing signed bytes to the
 * network, and looking a transaction up afterwards by hash.
 *
 * @returns A memoised `TxRestApi` bound to the REST endpoint.
 *
 * @example
 * ```ts
 * const response = await getTxApi().broadcast(txRaw)
 * console.log(response.txHash, response.code) // code 0 means success
 * ```
 *
 * A CRUCIAL DISTINCTION
 * -----------------------
 * `broadcast()` does NOT sign anything. It takes bytes that are *already*
 * signed and hands them to a node. This client never sees, holds or needs a
 * private key — which is exactly why it is safe for it to live on our server.
 * The signature was produced in the user's browser by their wallet extension.
 */
export function getTxApi(): TxRestApi {
  if (!txApi) {
    txApi = new TxRestApi(ENDPOINTS.rest)
  }
  return txApi
}
