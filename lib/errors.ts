/**
 * =============================================================================
 * FILE: lib/errors.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Turns the cryptic failures a blockchain produces into messages a learner can
 * act on, and gives the rest of the app one error type to work with.
 *
 * WHY IT EXISTS
 * -------------
 * This is the file that separates a demo from a teaching tool.
 *
 * When a Cosmos transaction fails, what actually reaches your `catch` block is
 * something like:
 *
 *   "account sequence mismatch, expected 42, got 41: incorrect account sequence"
 *   "Request rejected"
 *   "failed to execute message; message index: 0: 12inj is smaller than
 *    35200000000000000inj: insufficient funds"
 *
 * A beginner reads those and learns nothing. Worse, the most common one —
 * "Request rejected" — is not an error at all: it means the user clicked
 * "Reject" in their wallet, which is a completely normal thing to do and should
 * never be shown as a red crash banner.
 *
 * So this module does three things:
 *
 *   1. Defines `AppError`, a single error type carrying a machine-readable
 *      `code`, a human `message`, and an actionable `hint`.
 *   2. Provides `toAppError()`, which pattern-matches on whatever was thrown
 *      and produces the right `AppError`.
 *   3. Documents, in prose, what each failure actually means — so the file
 *      doubles as a troubleshooting reference.
 *
 * WHEN TO USE
 * -----------
 * Wrap every network or wallet call. The pattern used throughout this project:
 *
 *   try { ... } catch (unknownError) { throw toAppError(unknownError) }
 *
 * EXECUTION FLOW
 * --------------
 *   SDK / wallet / fetch throws something (type: unknown)
 *          |
 *          v
 *   toAppError(unknown)
 *          |
 *          +-- already an AppError? -> return as-is
 *          +-- matches a known signature? -> specific AppError with a hint
 *          +-- otherwise -> generic UNKNOWN AppError, original text preserved
 *          |
 *          v
 *   hook stores it in state
 *          |
 *          v
 *   <Alert> renders message + hint
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `lib/constants.ts` (for the faucet URL and network name)
 * Depended on by: `lib/wallet.ts`, `lib/queries.ts`, `lib/transactions.ts`,
 *                 `lib/api.ts`, every route handler, every hook.
 * =============================================================================
 */

import { FAUCET_URL, IS_MAINNET, NETWORK_NAME, CHAIN_ID } from './constants'

/**
 * Every failure this application knows how to explain.
 *
 * Using a closed union rather than free-form strings means a component can
 * safely branch on the code — for example, only the `INSUFFICIENT_BALANCE`
 * case renders a "Get testnet INJ" button.
 */
export const ErrorCode = {
  /** No Keplr/Leap extension found on `window`. */
  WALLET_NOT_INSTALLED: 'WALLET_NOT_INSTALLED',
  /** An action needed an address but none is connected. */
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  /** The user clicked "Reject" in the wallet popup. Not really an error. */
  USER_REJECTED: 'USER_REJECTED',
  /** The wallet is on a different chain than this app expects. */
  WRONG_NETWORK: 'WRONG_NETWORK',
  /** The node could not be reached, or answered with 5xx / a timeout. */
  RPC_UNAVAILABLE: 'RPC_UNAVAILABLE',
  /** Not enough tokens to cover amount + gas. */
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  /** The signed sequence number no longer matches the chain's. */
  SEQUENCE_MISMATCH: 'SEQUENCE_MISMATCH',
  /** The transaction reached a block but the chain returned a non-zero code. */
  TX_FAILED: 'TX_FAILED',
  /** We stopped waiting for block inclusion. The tx may still land. */
  TX_TIMEOUT: 'TX_TIMEOUT',
  /** A bech32 address failed validation before we ever hit the network. */
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  /** A user-entered amount was empty, zero, negative or unparseable. */
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  /** An API request was malformed — wrong shape, missing fields, bad JSON. */
  INVALID_REQUEST: 'INVALID_REQUEST',
  /** The account has never been funded, so it does not exist on-chain yet. */
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  /** Anything we did not recognise. The original text is preserved. */
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * The one error type this application throws.
 *
 * WHY EXTEND `Error` RATHER THAN RETURN A PLAIN OBJECT
 * ----------------------------------------------------
 * Extending `Error` keeps stack traces, keeps `instanceof` working, and means
 * an `AppError` still behaves sensibly if it escapes to a boundary that only
 * understands ordinary errors (React error boundaries, Next.js logging).
 *
 * The `hint` field is the pedagogical part: `message` says what happened,
 * `hint` says what to do about it. Never ship one without the other.
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly hint?: string
  /** The original thrown value, kept for console debugging. Never shown in UI. */
  readonly cause?: unknown

  constructor(
    code: ErrorCode,
    message: string,
    options?: { hint?: string; cause?: unknown },
  ) {
    super(message)
    // Required when targeting ES5/ES2015 class-extends-builtin semantics, and
    // harmless otherwise. Without it `instanceof AppError` can return false.
    Object.setPrototypeOf(this, AppError.prototype)
    this.name = 'AppError'
    this.code = code
    this.hint = options?.hint
    this.cause = options?.cause
  }

  /**
   * Converts to the plain object shape our API routes return.
   *
   * A class instance cannot cross an HTTP boundary — `JSON.stringify(new
   * AppError(...))` drops `message` because it lives on the prototype. This
   * method makes the conversion explicit and correct.
   *
   * @returns A serialisable `{ code, message, hint }` object.
   *
   * @example
   * ```ts
   * return Response.json({ ok: false, error: appError.toJSON() }, { status: 502 })
   * ```
   */
  toJSON(): { code: ErrorCode; message: string; hint?: string } {
    return { code: this.code, message: this.message, hint: this.hint }
  }
}

/* ---------------------------------------------------------------------------
 * Ready-made errors
 * ---------------------------------------------------------------------------
 * These are the failures we can detect ourselves, before ever calling the
 * chain. Catching them early gives a far better message than letting the node
 * reject the request 400ms later.
 * ------------------------------------------------------------------------- */

/**
 * Built when the user picked a wallet whose extension is not installed.
 *
 * @param walletName Display name, e.g. "Keplr".
 * @param downloadUrl Where the extension can be installed from.
 * @returns An `AppError` with code `WALLET_NOT_INSTALLED`.
 *
 * WHY THIS EXISTS
 * Reading `window.keplr` when Keplr is absent yields `undefined`, and the next
 * line throws `Cannot read properties of undefined (reading 'enable')`. That
 * message tells the user nothing. We check first and say the real thing.
 */
export function walletNotInstalledError(
  walletName: string,
  downloadUrl: string,
): AppError {
  return new AppError(
    ErrorCode.WALLET_NOT_INSTALLED,
    `${walletName} is not installed in this browser.`,
    {
      hint: `Install the ${walletName} extension from ${downloadUrl}, then reload this page. Browser extensions are only detected on a fresh page load.`,
    },
  )
}

/**
 * Built when an action requiring a signature is attempted with no wallet.
 *
 * @returns An `AppError` with code `WALLET_NOT_CONNECTED`.
 */
export function walletNotConnectedError(): AppError {
  return new AppError(
    ErrorCode.WALLET_NOT_CONNECTED,
    'No wallet is connected.',
    {
      hint: 'Click "Connect Wallet" at the top of the page. Reading public chain data works without a wallet, but signing a transaction always requires one.',
    },
  )
}

/**
 * Built when a bech32 address fails validation.
 *
 * @param address The offending input, echoed back so the user can spot a typo.
 * @returns An `AppError` with code `INVALID_ADDRESS`.
 */
export function invalidAddressError(address: string): AppError {
  return new AppError(
    ErrorCode.INVALID_ADDRESS,
    `"${address}" is not a valid Injective address.`,
    {
      hint: 'Injective addresses start with "inj1" and are 42 characters long. If you have a 0x… address, it is the Ethereum representation of the same account — convert it with getInjectiveAddress() from the SDK.',
    },
  )
}

/**
 * Built when a user-entered amount cannot be used.
 *
 * @param reason A short explanation, e.g. "must be greater than zero".
 * @returns An `AppError` with code `INVALID_AMOUNT`.
 */
export function invalidAmountError(reason: string): AppError {
  return new AppError(ErrorCode.INVALID_AMOUNT, `Invalid amount: ${reason}`, {
    hint: 'Enter a positive number, using a dot as the decimal separator (for example 0.5).',
  })
}

/**
 * Built when the wallet reports a chain id different from `CHAIN_ID`.
 *
 * @param actualChainId What the wallet is actually on.
 * @returns An `AppError` with code `WRONG_NETWORK`.
 */
export function wrongNetworkError(actualChainId: string): AppError {
  return new AppError(
    ErrorCode.WRONG_NETWORK,
    `Your wallet is on "${actualChainId}" but this app is configured for "${CHAIN_ID}" (${NETWORK_NAME}).`,
    {
      hint: `Switch networks inside your wallet, or change NEXT_PUBLIC_INJECTIVE_NETWORK in .env.local and restart the dev server. A transaction signed for one chain id is cryptographically invalid on another, so this must match exactly.`,
    },
  )
}

/* ---------------------------------------------------------------------------
 * The translator
 * ------------------------------------------------------------------------- */

/**
 * Safely extracts a readable string from anything that was thrown.
 *
 * JavaScript lets you `throw` literally any value — a string, a number, `null`.
 * Blockchain SDKs and browser extensions take full advantage of that. This
 * helper is defensive on purpose.
 *
 * @param thrown Whatever landed in the `catch` block.
 * @returns A best-effort message string, never empty.
 */
function extractMessage(thrown: unknown): string {
  if (thrown instanceof Error) return thrown.message
  if (typeof thrown === 'string') return thrown

  // Wallet extensions frequently throw bare objects like `{ message: '...' }`
  // that are not `Error` instances.
  if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    const { message } = thrown as { message: unknown }
    if (typeof message === 'string') return message
  }

  return 'An unexpected error occurred.'
}

/**
 * Translates any thrown value into a well-explained `AppError`.
 *
 * PURPOSE
 * The central error-interpretation routine for the whole app. Every known
 * blockchain failure mode is matched here and paired with an explanation and a
 * fix.
 *
 * @param thrown The value caught in a `catch` block. Type `unknown` because
 *               that is genuinely all we know about it.
 * @param context Optional short label describing what was being attempted,
 *                e.g. `'fetching balances'`. Used to make the generic fallback
 *                message specific instead of useless.
 * @returns An `AppError` — never throws, always returns.
 *
 * @example
 * ```ts
 * try {
 *   await bankApi.fetchBalances(address)
 * } catch (thrown) {
 *   throw toAppError(thrown, 'fetching balances')
 * }
 * ```
 *
 * WORKFLOW
 *   receive unknown value
 *        |
 *        v
 *   already an AppError? -- yes --> return unchanged
 *        | no
 *        v
 *   normalise to a lowercase string
 *        |
 *        v
 *   test against known signatures, most specific first
 *        |
 *        v
 *   return the matching AppError, or a generic one carrying the original text
 *
 * WHY MATCH ON STRINGS AT ALL?
 * It is not elegant, and in a perfect world the SDK would give us typed errors.
 * It does not — Cosmos propagates errors as formatted strings from the chain's
 * Go code. Every production Cosmos frontend does this. What matters is that the
 * matching lives in exactly one file, so when the chain reworders a message you
 * fix it once.
 */
export function toAppError(thrown: unknown, context?: string): AppError {
  // Never re-wrap. An AppError has already been interpreted, and wrapping it
  // again would replace a good message with a worse one.
  if (thrown instanceof AppError) return thrown

  const rawMessage = extractMessage(thrown)
  const normalised = rawMessage.toLowerCase()

  /* --- 1. User rejection -------------------------------------------------
   * Checked FIRST, and deliberately so. This is the most common "error" in any
   * dApp and it is not a malfunction: the user was asked to approve something
   * and said no. Treating it like a crash trains users to distrust your app.
   * Keplr says "Request rejected"; Leap says "user rejected"; some paths
   * surface the Ethereum-style code 4001.
   */
  if (
    normalised.includes('request rejected') ||
    normalised.includes('rejected by the user') ||
    normalised.includes('user rejected') ||
    normalised.includes('user denied') ||
    normalised.includes('declined')
  ) {
    return new AppError(
      ErrorCode.USER_REJECTED,
      'You cancelled the request in your wallet.',
      {
        hint: 'Nothing was sent and no funds moved. Click the button again if you meant to approve it.',
        cause: thrown,
      },
    )
  }

  /* --- 1b. Malformed address ---------------------------------------------
   * The chain rejects addresses whose bech32 checksum does not verify. Our own
   * `validateInjectiveAddress()` deliberately does NOT check the checksum (see
   * the note in `utils/validation.ts`), so a single mistyped character sails
   * past the frontend and is caught here instead.
   *
   * That is the checksum doing exactly its job: bech32 appends six characters
   * specifically so that a one-character typo is detected rather than silently
   * producing a valid-looking address belonging to nobody.
   */
  if (
    normalised.includes('decoding bech32 failed') ||
    normalised.includes('invalid checksum') ||
    normalised.includes('invalid address')
  ) {
    return new AppError(
      ErrorCode.INVALID_ADDRESS,
      'The chain rejected that address as malformed.',
      {
        hint: 'It has the right shape but fails its bech32 checksum, which almost always means a single character was mistyped or lost when copying. Paste the address again rather than correcting it by hand.',
        cause: thrown,
      },
    )
  }

  /* --- 2. Account sequence mismatch --------------------------------------
   * The classic Cosmos head-scratcher. Every account has a `sequence` counter
   * that increments once per successful transaction, and the number you signed
   * for is part of the signature.
   *
   * Two ways to hit this:
   *   a) You sent two transactions quickly. The second was built with a
   *      sequence that was already consumed by the first.
   *   b) You cached the account and reused a stale sequence.
   *
   * The fix is always the same: re-read the account and rebuild. This app does
   * that automatically on every send — see `lib/transactions.ts`.
   */
  if (
    normalised.includes('account sequence mismatch') ||
    normalised.includes('incorrect account sequence')
  ) {
    return new AppError(
      ErrorCode.SEQUENCE_MISMATCH,
      'This transaction used an out-of-date account sequence number.',
      {
        hint: 'Every Injective account has a counter that goes up by one per transaction, and it is part of what you signed. Yours moved on while this transaction was being prepared — usually because a previous one was still being processed. Wait a couple of seconds and try again; the app re-reads the counter each time.',
        cause: thrown,
      },
    )
  }

  /* --- 3. Insufficient funds ---------------------------------------------
   * Note the two distinct sub-cases. "insufficient fee" means the account has
   * tokens but not enough *INJ* for gas — extremely common for users who hold
   * only bridged USDT.
   */
  if (
    normalised.includes('insufficient funds') ||
    normalised.includes('insufficient fee') ||
    normalised.includes('smaller than')
  ) {
    return new AppError(
      ErrorCode.INSUFFICIENT_BALANCE,
      'Your account does not have enough INJ to cover this transaction.',
      {
        hint: IS_MAINNET
          ? 'Remember that the transfer amount and the gas fee come out of the same balance, so you cannot send 100% of your INJ. Leave a small amount behind for gas.'
          : `Get free testnet INJ from the faucet at ${FAUCET_URL}. The transfer amount and the gas fee come out of the same balance, so you cannot send your entire balance.`,
        cause: thrown,
      },
    )
  }

  /* --- 4. Account not found ----------------------------------------------
   * A subtle and genuinely confusing one. On Cosmos chains an address does not
   * exist until it has received funds. A brand-new wallet has a perfectly valid
   * address, but querying its account returns 404 — there is no account number
   * and no sequence to sign with.
   *
   * So: you cannot send your first transaction until somebody sends you
   * something first. On testnet, the faucet is that somebody.
   */
  // The chain interpolates the address into this message — the real text is
  // "account inj1abc… not found" — so a literal `includes('account not found')`
  // silently misses every real occurrence. A regex spanning the address is what
  // actually matches. This is precisely the sort of thing that only shows up
  // when you test against a live node.
  if (
    /account\s+\S+\s+not found/.test(normalised) ||
    normalised.includes('account not found') ||
    normalised.includes('key not found') ||
    normalised.includes('does not exist')
  ) {
    return new AppError(
      ErrorCode.ACCOUNT_NOT_FOUND,
      'This address does not exist on-chain yet.',
      {
        hint: `On Cosmos chains an account is only created once it first receives tokens. The address is valid, it just has no history. ${
          IS_MAINNET
            ? 'Send it a small amount of INJ to activate it.'
            : `Fund it from the faucet at ${FAUCET_URL} to activate it.`
        }`,
        cause: thrown,
      },
    )
  }

  /* --- 4b. Signature verification / ante-handler rejection ----------------
   * Before a transaction is even considered for a block, it passes through the
   * chain's "ante handler": a chain of checks that verify the signature, the
   * account, the sequence and that the fee can be paid.
   *
   * When one of those fails, Injective's REST gateway sometimes cannot
   * serialise the underlying error and answers with the genuinely unhelpful
   * "failed to marshal error message". Left untranslated it tells a learner
   * nothing at all, so we name the realistic causes instead.
   *
   * Verified against a live testnet node by broadcasting a transaction signed
   * by an account that had never been funded.
   */
  if (
    normalised.includes('failed to marshal error message') ||
    normalised.includes('signature verification failed') ||
    normalised.includes('unauthorized')
  ) {
    return new AppError(
      ErrorCode.TX_FAILED,
      'The chain rejected this transaction before executing it.',
      {
        hint: 'This happens when the signature does not match the account, when the account has never been funded (and so has no account number yet), or when there is not enough INJ to pay the fee. Check that your wallet is on the same network as this app, and that the account holds some INJ.',
        cause: thrown,
      },
    )
  }

  /* --- 5. Network / RPC problems -----------------------------------------
   * `fetch` fails with "Failed to fetch" for DNS failures, refused connections
   * AND blocked CORS preflights — the browser deliberately hides which, to
   * avoid leaking information about private networks. That is a big reason this
   * project routes chain reads through its own server.
   */
  if (
    normalised.includes('failed to fetch') ||
    normalised.includes('network error') ||
    normalised.includes('econnrefused') ||
    normalised.includes('enotfound') ||
    normalised.includes('etimedout') ||
    normalised.includes('socket hang up') ||
    normalised.includes('fetch failed') ||
    normalised.includes('timeout') ||
    normalised.includes('503') ||
    normalised.includes('502') ||
    normalised.includes('429')
  ) {
    return new AppError(
      ErrorCode.RPC_UNAVAILABLE,
      'Could not reach an Injective node.',
      {
        hint: `The public ${NETWORK_NAME} endpoints are rate limited and occasionally go down. Check your internet connection and try again. If it keeps happening, set INJECTIVE_REST_ENDPOINT and INJECTIVE_GRPC_ENDPOINT in .env.local to a dedicated node.`,
        cause: thrown,
      },
    )
  }

  /* --- 6. Wrong chain in the wallet -------------------------------------- */
  if (
    normalised.includes('there is no chain info') ||
    normalised.includes('chain id') ||
    normalised.includes('unsupported chain')
  ) {
    return new AppError(
      ErrorCode.WRONG_NETWORK,
      `Your wallet does not have "${CHAIN_ID}" configured.`,
      {
        hint: 'The app will offer to add the network to your wallet automatically. If that fails, add it manually from your wallet settings, or switch NEXT_PUBLIC_INJECTIVE_NETWORK in .env.local.',
        cause: thrown,
      },
    )
  }

  /* --- 7. Fallback --------------------------------------------------------
   * We keep the original text verbatim. Hiding it behind "Something went wrong"
   * would make this project actively harder to learn from — the raw string is
   * often the only clue, and part of learning blockchain development is getting
   * comfortable reading it.
   */
  return new AppError(
    ErrorCode.UNKNOWN,
    context ? `Something went wrong while ${context}.` : 'Something went wrong.',
    {
      hint: `The underlying error was: "${rawMessage}". Open your browser console for the full stack trace.`,
      cause: thrown,
    },
  )
}

/**
 * Decides whether a failure deserves a red banner.
 *
 * @param error The interpreted error.
 * @returns `false` when the user simply declined; `true` otherwise.
 *
 * @example
 * ```tsx
 * {error && isDisplayableError(error) && <Alert variant="error" ... />}
 * ```
 *
 * WHY THIS EXISTS
 * Cancelling a wallet popup is a normal user action, not a fault. Showing a
 * scary error for it is the fastest way to make a dApp feel broken. The UI
 * still acknowledges the cancellation — just in a neutral tone.
 */
export function isDisplayableError(error: AppError): boolean {
  return error.code !== ErrorCode.USER_REJECTED
}
