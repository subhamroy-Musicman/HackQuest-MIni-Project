/**
 * =============================================================================
 * FILE: lib/transactions.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Builds, signs and broadcasts transactions. This is the *write* path — the
 * only place in the application where blockchain state is changed rather than
 * read.
 *
 * WHY IT EXISTS
 * -------------
 * This is the most important file in the repository, and the one to read
 * slowly.
 *
 * Reading a blockchain is an HTTP GET. Writing to one is a five-stage
 * cryptographic protocol, and every stage can fail in its own way. Beginners
 * think of "send a transaction" as one action; it is really:
 *
 *   1. PREPARE   Read the account's `accountNumber` and `sequence` from the
 *                chain, and the current block height.
 *   2. BUILD     Construct a typed message (`MsgSend`) and wrap it in a
 *                transaction envelope carrying the fee, memo, chain id and
 *                timeout height.
 *   3. SIGN      Hand the transaction to the wallet. The user sees a popup and
 *                approves. A signature comes back. The private key never
 *                leaves the extension.
 *   4. BROADCAST Send the signed bytes to a node, which gossips them to the
 *                validator set.
 *   5. CONFIRM   Wait for a validator to include it in a block and for the
 *                chain to report the result code.
 *
 * The lifecycle is modelled explicitly (`TransactionStage`) and reported to the
 * UI via a callback, so a learner can *watch* each stage happen.
 *
 * WHY EACH STAGE IS SEPARATE — THE SECURITY MODEL IN ONE PARAGRAPH
 * ----------------------------------------------------------------
 * Stage 3 is the only stage that requires the private key, and it is the only
 * stage that does not happen in your code. That separation is deliberate and
 * absolute: your application composes an intent, the user's wallet authorises
 * it, and the network executes it. Your application is never trusted with the
 * key, and therefore cannot be compromised into stealing funds. Every design
 * decision in this file follows from that.
 *
 * WHEN TO USE
 * -----------
 * BROWSER ONLY. Stage 3 needs the wallet extension, which only exists in the
 * browser. Stages 1, 4 and 5 are delegated to our own API routes (see
 * `lib/api.ts`), so the SDK's query clients stay server-side.
 *
 * FLOW
 * ----
 *   Frontend
 *      |
 *      v
 *   SDK  (createTransaction builds the exact bytes to sign)
 *      |
 *      v
 *   Wallet Signature   <- the user approves; key never exposed
 *      |
 *      v
 *   Broadcast
 *      |
 *      v
 *   Blockchain
 *      |
 *      v
 *   Confirmation (block height + result code)
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `@injectivelabs/sdk-ts`, `lib/wallet.ts`, `lib/api.ts`,
 *              `lib/helpers.ts`, `lib/constants.ts`, `lib/errors.ts`,
 *              `utils/validation.ts`
 * Depended on by: `hooks/useSendInj.ts`
 * =============================================================================
 */

import {
  MsgSend,
  createTransaction,
  getTxRawFromTxRawOrDirectSignResponse,
} from '@injectivelabs/sdk-ts'
import type { TxRaw } from '@injectivelabs/sdk-ts'
import { getOfflineSigner } from './wallet'
import { broadcastTransaction, getAccountAuthInfo } from './api'
import { getTransactionFee, toChainAmount } from './helpers'
import { CHAIN_ID, TX_TIMEOUT_BLOCKS } from './constants'
import { AppError, ErrorCode, toAppError, walletNotConnectedError } from './errors'
import { validateAmount, validateInjectiveAddress } from '@/utils/validation'
import type { TransactionResult, TransactionStage, WalletAccount } from '@/types'

/**
 * Everything needed to send tokens from one account to another.
 */
export interface SendTokenParams {
  /** The connected account doing the sending. */
  sender: WalletAccount
  /** The `inj1…` address receiving the tokens. */
  recipientAddress: string
  /** Amount in human units, exactly as typed, e.g. `"1.5"`. */
  humanAmount: string
  /**
   * The token's on-chain denomination (e.g. 'inj' or 'peggy0xdAC1...').
   */
  denom: string
  /**
   * The token's decimal precision (e.g. 18 for INJ, 6 for USDT).
   */
  decimals: number
  /**
   * An optional note attached to the transaction.
   *
   * Memos are stored on-chain in plain text, forever, visible to everyone. They
   * are genuinely useful (exchanges use them to route deposits) and genuinely
   * dangerous (never put anything private in one).
   */
  memo?: string
  /**
   * Called as the transaction moves through the lifecycle.
   *
   * The whole reason this exists is teaching. Without it a user clicks a button
   * and stares at a spinner; with it they watch "Preparing → Signing →
   * Broadcasting → Confirming" and learn what a transaction actually involves.
   */
  onStageChange?: (stage: TransactionStage) => void
  /**
   * Balance of the sender in human units, used for pre-flight validation.
   * Optional — omit it and the balance checks are skipped.
   */
  availableBalance?: string
}

/**
 * Sends tokens from the connected wallet to another address.
 *
 * PURPOSE
 * The complete, end-to-end demonstration this repository is built around. Every
 * concept in the README appears somewhere in this function.
 *
 * @param params See `SendTokenParams`.
 * @returns A `TransactionResult` containing the hash, block height, result code
 *          and a ready-made explorer link.
 * @throws {AppError} With a specific code for every realistic failure:
 *   `WALLET_NOT_CONNECTED`, `INVALID_ADDRESS`, `INVALID_AMOUNT`,
 *   `USER_REJECTED`, `INSUFFICIENT_BALANCE`, `SEQUENCE_MISMATCH`,
 *   `RPC_UNAVAILABLE`, `TX_FAILED`.
 *
 * @example
 * ```ts
 * const result = await sendToken({
 *   sender: connectedAccount,
 *   recipientAddress: 'inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm',
 *   humanAmount: '0.1',
 *   denom: 'inj',
 *   decimals: 18,
 *   memo: 'workshop demo',
 *   onStageChange: (stage) => setStage(stage),
 * })
 *
 * console.log(result.txHash)      // '9C1D…E4'
 * console.log(result.explorerUrl) // paste this into a browser
 * ```
 *
 * WORKFLOW
 *   validate inputs locally               (free, instant, no gas wasted)
 *        |
 *        v
 *   [preparing]  GET account number + sequence + block height
 *        |
 *        v
 *   [preparing]  convert "1.5" -> "1500000000000000000"
 *        |
 *        v
 *   [preparing]  build MsgSend, then createTransaction() -> signDoc
 *        |
 *        v
 *   [signing]    wallet popup; user approves; signature returned
 *        |
 *        v
 *   [broadcasting] encode TxRaw -> base64 -> POST to our API -> node
 *        |
 *        v
 *   [confirming] node reports inclusion; check `code`
 *        |
 *        +-- code !== 0 -> throw TX_FAILED with the chain's own explanation
 *        |
 *        v
 *   [success]    return TransactionResult
 */
export async function sendToken(params: SendTokenParams): Promise<TransactionResult> {
  const {
    sender,
    recipientAddress,
    humanAmount,
    denom,
    decimals,
    memo = '',
    onStageChange,
    availableBalance,
  } = params

  // A tiny helper so each stage transition is one readable line below.
  const setStage = (stage: TransactionStage) => onStageChange?.(stage)

  try {
    /* =====================================================================
     * STAGE 0 — LOCAL VALIDATION
     * =====================================================================
     * Everything here is free and instant. Doing it before touching the
     * network means an obvious mistake costs the user zero gas and zero
     * seconds, instead of a failed on-chain transaction that still charged a
     * fee. On a blockchain, "fail fast" has a literal monetary value.
     * ===================================================================== */

    if (!sender?.injectiveAddress) {
      throw walletNotConnectedError()
    }

    const addressCheck = validateInjectiveAddress(recipientAddress)
    if (!addressCheck.valid) {
      throw new AppError(ErrorCode.INVALID_ADDRESS, addressCheck.error!, {
        hint: 'Double-check the address character by character. Transfers on a blockchain cannot be reversed or cancelled.',
      })
    }

    const amountCheck = validateAmount(humanAmount, availableBalance, {
      maxDecimals: decimals,
    })
    if (!amountCheck.valid) {
      throw new AppError(ErrorCode.INVALID_AMOUNT, amountCheck.error!)
    }

    /* =====================================================================
     * STAGE 1 — PREPARE
     * =====================================================================
     * Read the three numbers that must be baked into the signature.
     *
     * This happens on EVERY send and is never cached. The sequence increments
     * with each successful transaction — including ones the user made from
     * another device thirty seconds ago — so a cached value is the direct
     * cause of "account sequence mismatch".
     * ===================================================================== */

    setStage('preparing')

    const { accountNumber, sequence, latestBlockHeight } =
      await getAccountAuthInfo(sender.injectiveAddress)

    /* ---------------------------------------------------------------------
     * Convert the amount to base units.
     *
     * The SDK expects token amounts in the smallest denomination. User-friendly
     * values are converted before constructing the transaction — "1.5" becomes
     * "1500000000000000000", because INJ has 18 decimal places and the chain
     * stores only integers.
     *
     * Getting this wrong by one factor of ten is the classic beginner bug, and
     * it is unrecoverable once broadcast.
     * ------------------------------------------------------------------- */
    const chainAmount = toChainAmount(humanAmount, decimals)

    /* ---------------------------------------------------------------------
     * Build the message.
     *
     * A "message" (Msg) is a single typed instruction to one Cosmos module.
     * `MsgSend` belongs to the bank module and means exactly "move these coins
     * from A to B". Injective has dozens of message types — place a spot
     * order, delegate to a validator, execute a CosmWasm contract — and they
     * all follow this same pattern.
     *
     * A transaction can carry several messages, and they execute atomically:
     * all succeed, or all revert. That is how you build "swap and stake in one
     * click" without any intermediate state.
     * ------------------------------------------------------------------- */
    const message = MsgSend.fromJSON({
      amount: {
        denom: denom,
        amount: chainAmount,
      },
      srcInjectiveAddress: sender.injectiveAddress,
      dstInjectiveAddress: recipientAddress.trim(),
    })

    /* ---------------------------------------------------------------------
     * Set an expiry.
     *
     * `timeoutHeight` is the block number after which this transaction becomes
     * permanently invalid. Without it, a transaction sitting in a congested
     * mempool could execute long after the user assumed it had failed.
     * ------------------------------------------------------------------- */
    const timeoutHeight = Number(latestBlockHeight) + TX_TIMEOUT_BLOCKS

    const { stdFee } = getTransactionFee()

    /* ---------------------------------------------------------------------
     * `createTransaction` assembles the exact bytes that will be signed.
     *
     * Note what goes in: the message, the fee, the chain id, the account
     * number, the sequence, the timeout and the public key. Every one of those
     * is covered by the signature, which is what makes a Cosmos signature so
     * specific — it authorises this message, from this account, on this chain,
     * at this point in that account's history, and nothing else.
     *
     * `pubKey` is passed as base64. The chain needs it to verify the signature
     * against the account, and it is public information by definition.
     * ------------------------------------------------------------------- */
    const { signDoc, txRaw } = createTransaction({
      message,
      memo,
      fee: stdFee,
      pubKey: await getPublicKeyBase64(sender),
      sequence,
      accountNumber,
      chainId: CHAIN_ID,
      timeoutHeight,
    })

    /* =====================================================================
     * STAGE 2 — SIGN
     * =====================================================================
     * The wallet popup appears here and the application pauses, potentially
     * for minutes, waiting on a human.
     *
     * Two things about this call are worth internalising:
     *
     *  1. Our code hands over a document and receives a signature. At no point
     *     do we have access to the private key. We could not steal the user's
     *     funds even if this file were malicious — the worst we could do is ask
     *     them to sign something misleading, which is exactly why wallets show
     *     the transaction contents.
     *
     *  2. We must use the document the WALLET returns, not the one we sent.
     *     Wallets are permitted to adjust the fee before signing. Broadcasting
     *     our original document would produce a signature mismatch.
     *     `getTxRawFromTxRawOrDirectSignResponse` handles that correctly.
     * ===================================================================== */

    setStage('signing')

    const signer = getOfflineSigner(sender.walletId)
    const directSignResponse = await signer.signDirect(
      sender.injectiveAddress,
      signDoc,
    )

    // Merge the wallet's signature into the transaction envelope. After this
    // line `signedTxRaw` is a complete, valid, broadcastable transaction.
    //
    // The cast is needed because our `OfflineDirectSigner` in `types/global.d.ts`
    // describes the wallet API in its own minimal terms, while the SDK expects
    // its `DirectSignResponse`. The two are structurally identical; the cast
    // simply tells TypeScript we know that. Writing our own interface rather
    // than importing the SDK's keeps the wallet contract readable — which
    // matters more here than avoiding one cast.
    const signedTxRaw = getTxRawFromTxRawOrDirectSignResponse(
      directSignResponse as unknown as Parameters<
        typeof getTxRawFromTxRawOrDirectSignResponse
      >[0],
    )

    // Defensive: if the wallet returned something unusable, fail here rather
    // than sending malformed bytes to a node.
    if (!signedTxRaw) {
      throw new AppError(
        ErrorCode.UNKNOWN,
        'The wallet returned a signature the SDK could not use.',
        {
          hint: 'This usually means the wallet is on a different chain than the app. Check the network selected inside your wallet.',
        },
      )
    }

    // `txRaw` from `createTransaction` is the unsigned skeleton. We keep the
    // reference only to make the relationship explicit for readers — the
    // signed version above is what actually gets broadcast.
    void txRaw

    /* =====================================================================
     * STAGE 3 — BROADCAST
     * =====================================================================
     * Serialise the signed transaction to bytes, base64-encode them so they
     * survive a JSON round trip, and hand them to our API route, which forwards
     * them to a node.
     *
     * Nothing secret travels here. A signed transaction is about to be
     * published to a public ledger; it is the least confidential object in the
     * entire system.
     * ===================================================================== */

    setStage('broadcasting')

    const result = await broadcastTransaction(encodeSignedTx(signedTxRaw))

    /* =====================================================================
     * STAGE 4 — CONFIRM
     * =====================================================================
     * The transaction is in a block. That does NOT mean it succeeded.
     *
     * This is the distinction that catches almost everyone: delivery and
     * execution are separate outcomes. A transaction can be perfectly
     * delivered, mined into a block, charge the user gas, and still have
     * failed — because the message itself was rejected by the module that
     * executed it.
     *
     * `code === 0` means success. Anything else is a chain-level error, and
     * `rawLog` explains it in the chain's own words.
     * ===================================================================== */

    setStage('confirming')

    if (result.code !== 0) {
      // Run the chain's own log through our translator, so "insufficient
      // funds" becomes a message with a faucet link rather than a Go error
      // string. If nothing matches, the raw log is preserved verbatim.
      const interpreted = toAppError(new Error(result.rawLog), 'executing the transaction')

      throw new AppError(
        interpreted.code === ErrorCode.UNKNOWN ? ErrorCode.TX_FAILED : interpreted.code,
        interpreted.code === ErrorCode.UNKNOWN
          ? `The chain rejected this transaction (error code ${result.code}).`
          : interpreted.message,
        {
          hint:
            interpreted.hint ??
            `The chain reported: "${result.rawLog}". The transaction was included in block ${result.height}, so the gas fee was still charged.`,
        },
      )
    }

    setStage('success')
    return result
  } catch (thrown) {
    setStage('error')
    throw toAppError(thrown, 'sending the transaction')
  }
}

/**
 * Reads the connected account's public key in base64.
 *
 * PURPOSE
 * `createTransaction` needs the public key so the chain can verify the
 * signature. The wallet is the only party that has it.
 *
 * @param account The connected account.
 * @returns The compressed secp256k1 public key, base64-encoded.
 * @throws {AppError} If no account is exposed by the wallet.
 *
 * @example
 * ```ts
 * const pubKey = await getPublicKeyBase64(account) // 'A1b2C3…'
 * ```
 *
 * WORKFLOW
 *   getOfflineSigner(walletId)
 *        |
 *        v
 *   signer.getAccounts()
 *        |
 *        v
 *   find the account matching our address
 *        |
 *        v
 *   Uint8Array pubkey -> base64 string
 *
 * WHY PUBLISHING A PUBLIC KEY IS SAFE
 * -----------------------------------
 * The public key is derived from the private key by elliptic-curve
 * multiplication, which is computationally irreversible. Everyone who has ever
 * received a transaction from you already knows it — it is recorded on-chain
 * the first time you transact. It is called "public" for a reason.
 */
async function getPublicKeyBase64(account: WalletAccount): Promise<string> {
  const signer = getOfflineSigner(account.walletId)
  const accounts = await signer.getAccounts()

  // A wallet can expose several accounts. Match by address rather than taking
  // `[0]`, or a user with multiple accounts will sign with the wrong key and
  // get a baffling verification failure.
  const match =
    accounts.find((entry) => entry.address === account.injectiveAddress) ??
    accounts[0]

  if (!match) {
    throw walletNotConnectedError()
  }

  return uint8ArrayToBase64(match.pubkey)
}

/**
 * Prepares a signed transaction to travel over JSON.
 *
 * PURPOSE
 * A `TxRaw` holds three `Uint8Array` fields, and JSON has no binary type. This
 * base64-encodes each one so the transaction can be POSTed to our API route.
 *
 * @param txRaw The signed transaction.
 * @returns The three parts, each base64-encoded.
 *
 * @example
 * ```ts
 * const encoded = encodeSignedTx(signedTxRaw)
 * // { bodyBytes: 'Cp0BC…', authInfoBytes: 'ClAK…', signatures: ['x7Yq…'] }
 * ```
 *
 * WORKFLOW
 *   TxRaw { bodyBytes, authInfoBytes, signatures }
 *        |
 *        v
 *   base64 each field
 *        |
 *        v
 *   a plain JSON-safe object
 *
 * WHY WE SEND THE THREE PARTS RATHER THAN ONE ENCODED BLOB
 * --------------------------------------------------------
 * A `TxRaw` can also be serialised as a single protobuf blob, which is what
 * ends up stored in a block. Sending the three fields separately avoids
 * shipping a protobuf encoder into the browser bundle for one call — and it has
 * a pedagogical benefit: open the network tab during a transfer and the
 * anatomy of a signed Cosmos transaction is right there in the request body.
 */
function encodeSignedTx(txRaw: TxRaw): {
  bodyBytes: string
  authInfoBytes: string
  signatures: string[]
} {
  return {
    // The messages, memo and timeout height.
    bodyBytes: uint8ArrayToBase64(txRaw.bodyBytes),
    // The public key, the fee and the sequence number.
    authInfoBytes: uint8ArrayToBase64(txRaw.authInfoBytes),
    // One signature per signer. A simple transfer has exactly one.
    signatures: txRaw.signatures.map(uint8ArrayToBase64),
  }
}

/**
 * Base64-encodes raw bytes, in the browser.
 *
 * @param bytes The bytes to encode.
 * @returns A base64 string.
 *
 * WHY NOT `Buffer.from(bytes).toString('base64')`
 * ------------------------------------------------
 * `Buffer` is a Node.js API. It does not exist in the browser unless a bundler
 * polyfills it, and relying on that polyfill is a common source of "works in
 * dev, breaks in production". `btoa` is the browser-native equivalent.
 *
 * The `String.fromCharCode` loop is chunked because
 * `String.fromCharCode(...hugeArray)` overflows the call stack on inputs of a
 * few hundred kilobytes. Transactions are small, but the habit is worth having.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
