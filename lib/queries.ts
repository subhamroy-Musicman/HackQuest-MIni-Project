/**
 * =============================================================================
 * FILE: lib/queries.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Every *read* this application performs against the Injective blockchain lives
 * here: chain status, account balances, and the account/sequence data needed
 * before signing.
 *
 * WHY IT EXISTS
 * -------------
 * READING IS FUNDAMENTALLY DIFFERENT FROM WRITING. This is the single most
 * important idea in the file, so it goes first:
 *
 *   * A read changes nothing. It needs no wallet, no signature, no gas and no
 *     permission. Anyone can read anyone's balance — blockchains are public
 *     ledgers. That is the point of them.
 *   * A write changes global state. It needs a signature from the key that owns
 *     the account, it costs gas, and it is permanent.
 *
 * Because reads are free and permissionless, they can happen anywhere: in the
 * browser, on a server, in a script, from `curl`. This project runs them **on
 * the server**, and that choice is worth understanding.
 *
 * WHY WE READ ON THE SERVER (AND NOT IN THE BROWSER)
 * --------------------------------------------------
 *   1. Endpoint privacy. Public RPC endpoints are rate limited; production apps
 *      buy dedicated nodes with the key in the URL. A browser-side read would
 *      publish that URL to every visitor. Server-side, `INJECTIVE_GRPC_ENDPOINT`
 *      never leaves the machine.
 *   2. No CORS. A browser can only call an endpoint that explicitly permits
 *      your origin. Servers have no such restriction. This removes an entire
 *      category of "works on my machine" failures during a live workshop.
 *   3. Bundle size. The Injective SDK is large. Keeping reads server-side keeps
 *      it out of the JavaScript your users download.
 *   4. It is a good habit. Treating chain access as backend infrastructure is
 *      how real applications are structured.
 *
 * The trade-off is honest and worth stating: you add one network hop, and you
 * need a server. A purely static dApp on IPFS cannot do this and must read from
 * the browser — which is completely valid, and what the SDK docs show by
 * default.
 *
 * WHEN TO USE
 * -----------
 * SERVER-SIDE ONLY. Called from the route handlers under `app/api/`. If you import this into
 * a `'use client'` component the build will pull the whole SDK into the browser
 * bundle and the `process.env` overrides will be undefined.
 *
 * EXECUTION FLOW
 * --------------
 *   Frontend component
 *        |
 *        v
 *   hooks/useBalances.ts
 *        |
 *        v
 *   lib/api.ts        (fetch)
 *        |
 *        v
 *   app/api/account/[address]/balances/route.ts
 *        |
 *        v
 *   THIS FILE: fetchBalances()
 *        |
 *        v
 *   lib/clients.ts -> ChainGrpcBankApi
 *        |
 *        v
 *   Injective node
 *        |
 *        v
 *   raw protobuf response
 *        |
 *        v
 *   mapped to plain, serialisable `Balance[]`
 *        |
 *        v
 *   back up the chain to the UI
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/clients.ts`, `lib/helpers.ts`, `lib/errors.ts`,
 *              `lib/constants.ts`, `@injectivelabs/sdk-ts`
 * Depended on by: `app/api/chain/status/route.ts`,
 *                 `app/api/account/[address]/balances/route.ts`,
 *                 `app/api/account/[address]/auth/route.ts`
 * =============================================================================
 */

import { BaseAccount } from '@injectivelabs/sdk-ts'
import { getBankApi, getAuthApi, getTendermintApi } from './clients'
import { resolveToken, toHumanAmount } from './helpers'
import { toAppError } from './errors'
import { CHAIN_ID, ENDPOINTS, INJ_DENOM } from './constants'
import type { Balance, ChainStatus } from '@/types'

/**
 * Reads the chain's current head block.
 *
 * PURPOSE
 * The simplest possible interaction with a blockchain, and therefore the first
 * thing this workshop demonstrates. It proves your RPC connection works before
 * a wallet, an account or a token is involved. When something is broken, start
 * here.
 *
 * @returns A `ChainStatus`: chain id, latest height, block time and the
 *          endpoint that answered.
 * @throws {AppError} `RPC_UNAVAILABLE` if no node responded.
 *
 * @example
 * ```ts
 * const status = await fetchChainStatus()
 * console.log(status.latestBlockHeight) // '84213590'
 * ```
 *
 * WORKFLOW
 *   getTendermintApi()
 *        |
 *        v
 *   GET {rest}/cosmos/base/tendermint/v1beta1/blocks/latest
 *        |
 *        v
 *   read block.header.{chain_id, height, time}
 *        |
 *        v
 *   return a plain ChainStatus object
 *
 * WHY WE RETURN THE CHAIN ID FROM THE *CHAIN* RATHER THAN FROM CONFIG
 * -------------------------------------------------------------------
 * We already have `CHAIN_ID` in `lib/constants.ts`. Returning the value the
 * node actually reported lets the UI compare the two, so a misconfigured
 * endpoint (pointing at mainnet while the app thinks it is on testnet) becomes
 * immediately visible instead of causing a baffling failure at signing time.
 */
export async function fetchChainStatus(): Promise<ChainStatus> {
  try {
    const tendermintApi = getTendermintApi()

    // No signature, no account, no gas — just an HTTP GET against a public
    // node. This is what "reading blockchain state" means at its simplest.
    const block = await tendermintApi.fetchLatestBlock()

    // Defensive: a node behind a misconfigured proxy can return 200 with a body
    // that does not contain a header. Failing clearly beats a `TypeError` three
    // frames deeper.
    if (!block?.header) {
      throw new Error('The node returned a block with no header.')
    }

    const { header } = block

    return {
      // Reported by the node itself — see the note above. Note the snake_case:
      // this comes from the REST/LCD gateway, which returns the chain's raw
      // JSON. The gRPC clients camelCase their fields; the REST ones do not.
      // Mixing the two conventions is a genuine papercut of Cosmos development.
      chainId: header.chain_id ?? CHAIN_ID,
      // Height is a string because Cosmos heights are int64, which exceeds
      // JavaScript's safe integer range in principle. In practice it is small,
      // but the SDK is correct to be careful and so are we.
      latestBlockHeight: String(header.height ?? '0'),
      latestBlockTime: new Date(header.time ?? Date.now()).toISOString(),
      endpoint: ENDPOINTS.rest,
    }
  } catch (thrown) {
    // Re-throw as an AppError so the route handler has a code and a hint to
    // pass on, instead of a raw SDK string.
    throw toAppError(thrown, 'reading the latest block')
  }
}

/**
 * Reads every token balance held by an address.
 *
 * PURPOSE
 * Turns the bank module's raw `{denom, amount}` list into something a UI can
 * render: symbols, decimals and human-readable amounts, with unrecognised
 * tokens honestly labelled rather than mislabelled.
 *
 * @param address An `inj1…` bech32 address. Does not need to be the connected
 *                wallet — balances are public, so any address works. Try
 *                pasting a whale's address into the app and watch it load.
 * @returns An array of `Balance`, sorted with INJ first and non-zero balances
 *          before dust. Returns `[]` for an address that holds nothing.
 * @throws {AppError} `RPC_UNAVAILABLE` if the node cannot be reached.
 *
 * @example
 * ```ts
 * const balances = await fetchBalances('inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm')
 * // [
 * //   { denom: 'inj', symbol: 'INJ', amount: '1500000000000000000',
 * //     formattedAmount: '1.5', decimals: 18, isKnownToken: true },
 * // ]
 * ```
 *
 * WORKFLOW
 *   receive address
 *        |
 *        v
 *   ChainGrpcBankApi.fetchBalances(address)   <- one gRPC call
 *        |
 *        v
 *   for each coin:
 *        resolveToken(denom)      -> symbol, name, decimals
 *        toHumanAmount(amount)    -> exact decimal string
 *        |
 *        v
 *   sort: INJ first, then non-zero, then alphabetically
 *        |
 *        v
 *   return Balance[]
 *
 * WHY AN EMPTY ARRAY IS NOT AN ERROR
 * ----------------------------------
 * A brand-new address holds nothing, and the bank module answers with an empty
 * list rather than a 404. That is a completely valid state and the UI has a
 * dedicated empty state for it (see `components/balances/BalancesPanel.tsx`).
 * Conflating "no data" with "failed to load" is one of the most common — and
 * most confusing — mistakes in dApp UIs.
 *
 * NOTE ON PAGINATION
 * An address with hundreds of token-factory denoms will be paginated by the
 * node. We take the first page, which is more than enough for a workshop.
 * `fetchBalances` accepts a `PaginationOption` if you need the rest.
 */
export async function fetchBalances(address: string): Promise<Balance[]> {
  try {
    const bankApi = getBankApi()

    // The bank module's `AllBalances` query. Public data: no permission of any
    // kind is involved, which is why this works for any address on earth.
    const { balances: rawCoins } = await bankApi.fetchBalances(address)

    const balances: Balance[] = rawCoins.map((coin) => {
      // The chain gave us a denom and an integer. Everything a human needs to
      // interpret those two values comes from off-chain metadata.
      const { metadata, isKnown } = resolveToken(coin.denom)

      return {
        denom: coin.denom,
        // Kept as the raw string, deliberately. This is the exact value the
        // chain holds; anything derived from it is a convenience.
        amount: coin.amount,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        // Computed once, here, so no component ever re-derives it and gets a
        // subtly different answer.
        formattedAmount: toHumanAmount(coin.amount, metadata.decimals),
        isKnownToken: isKnown,
      }
    })

    return sortBalances(balances)
  } catch (thrown) {
    throw toAppError(thrown, 'fetching balances')
  }
}

/**
 * Orders balances for display.
 *
 * @param balances The unsorted list from the chain.
 * @returns A new array: INJ first, then non-zero balances, then alphabetical.
 *
 * WHY INJ ALWAYS COMES FIRST
 * INJ is the gas token. If a user has none, nothing else they hold can be
 * moved. Putting it at the top is not cosmetic — it puts the most consequential
 * number where the eye lands first.
 */
function sortBalances(balances: Balance[]): Balance[] {
  // `[...balances]` because `Array.prototype.sort` mutates in place, and
  // mutating an input parameter is a good way to cause a bug three files away.
  return [...balances].sort((left, right) => {
    if (left.denom === INJ_DENOM) return -1
    if (right.denom === INJ_DENOM) return 1

    // `!== '0'` is a string comparison on purpose. Parsing these to numbers to
    // decide "is it zero" would be pointless precision loss.
    const leftHasValue = left.amount !== '0'
    const rightHasValue = right.amount !== '0'
    if (leftHasValue !== rightHasValue) return leftHasValue ? -1 : 1

    return left.symbol.localeCompare(right.symbol)
  })
}

/**
 * Reads the on-chain signing metadata for an account.
 *
 * PURPOSE
 * You cannot sign a Cosmos transaction without these numbers. This is the very
 * first step of the transaction lifecycle, and it happens on every single send
 * — never cached — because the sequence changes constantly.
 *
 * @param address The `inj1…` address that will sign.
 * @returns `{ address, accountNumber, sequence, latestBlockHeight }`.
 * @throws {AppError} `ACCOUNT_NOT_FOUND` if the address has never been funded;
 *                    `RPC_UNAVAILABLE` if no node answered.
 *
 * @example
 * ```ts
 * const auth = await fetchAccountAuthInfo('inj1…')
 * // { accountNumber: 12345, sequence: 7, latestBlockHeight: '84213590' }
 * ```
 *
 * WORKFLOW
 *   fetch account and latest block IN PARALLEL   <- two independent reads
 *        |
 *        v
 *   BaseAccount.fromRestApi(response)   <- parses the REST JSON into a class
 *        |
 *        v
 *   return { accountNumber, sequence, latestBlockHeight }
 *
 * WHAT THESE THREE NUMBERS ARE FOR — THE CORE OF COSMOS TRANSACTION SAFETY
 * -----------------------------------------------------------------------
 * accountNumber
 *   A permanent id assigned when the account is first created (i.e. first
 *   funded). It never changes. It is part of the signed payload so that a
 *   signature for account A cannot be reused for account B.
 *
 * sequence
 *   A counter that increases by exactly one per successful transaction from
 *   this account. Also part of the signed payload. This is Cosmos' replay
 *   protection: once sequence 7 is consumed, a transaction signed for sequence
 *   7 can never execute again. Nobody can capture your signed transfer and
 *   replay it tomorrow.
 *
 * latestBlockHeight
 *   Not part of the account, but fetched here because the caller needs it in
 *   the same breath. `timeoutHeight = latestBlockHeight + TX_TIMEOUT_BLOCKS`
 *   gives the transaction an expiry, so one stuck in a mempool cannot surprise
 *   the user hours later.
 *
 * WHY `Promise.all`
 * The two reads are independent, so running them sequentially would double the
 * latency of every send for no reason. This is a small thing that users feel.
 */
export async function fetchAccountAuthInfo(address: string): Promise<{
  address: string
  accountNumber: number
  sequence: number
  latestBlockHeight: string
}> {
  try {
    const authApi = getAuthApi()
    const tendermintApi = getTendermintApi()

    const [accountResponse, latestBlock] = await Promise.all([
      authApi.fetchAccount(address),
      tendermintApi.fetchLatestBlock(),
    ])

    // `BaseAccount.fromRestApi` unwraps Cosmos' `Any`-typed account envelope.
    // Injective uses `EthAccount` rather than the plain Cosmos `BaseAccount`
    // (because of its Ethereum compatibility), and this helper handles that
    // difference so you do not have to.
    const baseAccount = BaseAccount.fromRestApi(accountResponse)

    return {
      address,
      accountNumber: baseAccount.accountNumber,
      sequence: baseAccount.sequence,
      latestBlockHeight: String(latestBlock?.header?.height ?? '0'),
    }
  } catch (thrown) {
    throw toAppError(thrown, 'reading account details')
  }
}
