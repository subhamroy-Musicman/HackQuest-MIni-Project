/**
 * =============================================================================
 * FILE: utils/validation.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Validates user input *before* it is allowed anywhere near a transaction.
 *
 * WHY IT EXISTS
 * -------------
 * Blockchain transactions are irreversible. There is no support line, no
 * chargeback and no "undo". A typo in a recipient address means the tokens are
 * gone — either burned into an address nobody controls, or sent to a stranger.
 *
 * That changes what validation is *for*. In an ordinary web form, validation is
 * a convenience that saves a round trip. Here it is the last safety rail before
 * an irreversible action, and it should be strict, early and loud.
 *
 * A second, subtler reason: validating locally means the user gets an answer in
 * zero milliseconds instead of after a failed broadcast that still cost them
 * gas. A transaction that fails on-chain is not free.
 *
 * WHEN TO USE
 * -----------
 * Call these on every keystroke for live feedback, and again immediately before
 * building a transaction. Never trust that the UI already checked.
 *
 * EXECUTION FLOW
 * --------------
 *   user types into <SendInjForm>
 *        |
 *        v
 *   validateInjectiveAddress / validateAmount   (this file)
 *        |
 *        +-- invalid -> inline error, submit button disabled
 *        |
 *        +-- valid   -> lib/transactions.ts may build the message
 *
 * DEPENDENCIES
 * ------------
 * Depends on : nothing
 * Depended on by: `components/transfer/SendInjForm.tsx`,
 *                 `lib/transactions.ts`, `app/api/**` route handlers.
 * =============================================================================
 */

/**
 * The result of a validation check.
 *
 * Returning `{ valid, error }` instead of throwing is deliberate. This runs on
 * every keystroke, and exceptions are both expensive and awkward to use for
 * control flow in a render path. A component can do:
 *
 *   const result = validateAmount(input, balance)
 *   {!result.valid && <p className="text-red-400">{result.error}</p>}
 */
export interface ValidationResult {
  valid: boolean
  /** Present exactly when `valid` is false. Written for a beginner to act on. */
  error?: string
}

/** Reused across the module so the constant is defined exactly once. */
const INJECTIVE_ADDRESS_PREFIX = 'inj1'

/**
 * Bech32's alphabet.
 *
 * Bech32 deliberately excludes `1`, `b`, `i` and `o` from the data section
 * because they are easy to confuse with `l`, `6`, `1` and `0` when read aloud
 * or copied by hand. (The single `1` in `inj1` is the separator between the
 * human-readable prefix and the data, which is exactly why the character is
 * banned from the data itself — otherwise you could not tell where the prefix
 * ends.) This is a real, thoughtful piece of encoding design and worth knowing.
 */
const BECH32_DATA_CHARSET = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/

/**
 * Checks that a string looks like a valid Injective bech32 address.
 *
 * PURPOSE
 * Catches the overwhelming majority of address mistakes — wrong chain prefix,
 * truncated paste, stray whitespace, an Ethereum `0x…` address pasted by
 * mistake — instantly and without a network call.
 *
 * @param address The candidate address, exactly as the user typed it.
 * @returns `{ valid: true }`, or `{ valid: false, error }` with a message
 *          explaining precisely which rule failed.
 *
 * @example
 * ```ts
 * validateInjectiveAddress('inj1dzqd00lfd4v87lqvcuzhr9hgfnfvme4h9tjxjm')
 * // => { valid: true }
 *
 * validateInjectiveAddress('cosmos1abc…')
 * // => { valid: false, error: 'Injective addresses start with "inj1"…' }
 *
 * validateInjectiveAddress('0x1234…')
 * // => { valid: false, error: '…that is an Ethereum-format address…' }
 * ```
 *
 * WORKFLOW
 *   trim whitespace
 *        |
 *        v
 *   empty?                -> error
 *        |
 *        v
 *   starts with 0x?       -> error explaining the two address formats
 *        |
 *        v
 *   starts with 'inj1'?   -> error naming the actual prefix found
 *        |
 *        v
 *   length exactly 42?    -> error
 *        |
 *        v
 *   data section uses only bech32 characters? -> error
 *        |
 *        v
 *   valid
 *
 * HONEST LIMITATION — READ THIS
 * -----------------------------
 * This does NOT verify the bech32 checksum. A real bech32 address carries six
 * trailing checksum characters that detect single-character typos with
 * near-certainty; verifying them requires the full decoder, which the SDK
 * provides but which would obscure the lesson here.
 *
 * That is acceptable in this app because the *chain itself* rejects a malformed
 * address, and because our recipient field is normally filled by paste. For a
 * production app moving real value, use the SDK's decoder as well:
 *
 *   import { getInjectiveAddress } from '@injectivelabs/sdk-ts'
 *
 * The distinction to take away: this check catches typos, it does not
 * *guarantee* correctness.
 */
export function validateInjectiveAddress(address: string): ValidationResult {
  const trimmed = address.trim()

  if (!trimmed) {
    return { valid: false, error: 'Enter a recipient address.' }
  }

  // Special-cased because it is a genuine point of confusion, not a typo: the
  // user has a real Injective account, just written in its Ethereum form.
  if (trimmed.startsWith('0x')) {
    return {
      valid: false,
      error:
        'That is an Ethereum-format address. Every Injective account has both an inj1… and a 0x… form; the bank module needs the inj1… one. Your wallet can show it to you.',
    }
  }

  if (!trimmed.startsWith(INJECTIVE_ADDRESS_PREFIX)) {
    // Naming the prefix we *did* find is what makes this message useful — it
    // immediately tells a user they pasted a Cosmos Hub or Osmosis address.
    const foundPrefix = trimmed.split('1')[0] || trimmed.slice(0, 6)
    return {
      valid: false,
      error: `Injective addresses start with "inj1". This one starts with "${foundPrefix}", which belongs to a different chain. Sending there is not possible.`,
    }
  }

  // 'inj' (3) + separator (1) + 38 data characters = 42. Every standard
  // Injective account address is exactly this length.
  if (trimmed.length !== 42) {
    return {
      valid: false,
      error: `An Injective address is exactly 42 characters; this one is ${trimmed.length}. It was probably truncated when copied.`,
    }
  }

  const dataSection = trimmed.slice(INJECTIVE_ADDRESS_PREFIX.length)
  if (!BECH32_DATA_CHARSET.test(dataSection)) {
    return {
      valid: false,
      error:
        'This address contains characters that cannot appear in a bech32 address (b, i, o and 1 are excluded on purpose). Check it for a transcription mistake.',
    }
  }

  return { valid: true }
}

/**
 * Validates a human-entered token amount.
 *
 * PURPOSE
 * Rejects everything the chain would reject — and one thing it would not: an
 * amount that leaves nothing for gas. That last check is the difference
 * between a form that works and a form that produces a confusing on-chain
 * failure.
 *
 * @param rawAmount        The raw string from the input, e.g. `"1.5"`.
 * @param availableBalance The user's spendable balance in the same human units.
 *                         Pass `undefined` when the balance is not yet loaded —
 *                         the balance checks are then skipped rather than
 *                         falsely failing.
 * @param options.maxDecimals How many decimal places the token supports.
 *                         Default 18 (INJ).
 * @param options.gasReserve How much to keep aside for fees, in human units.
 *                         Default `0.001` INJ, comfortably above the ~0.000035
 *                         a transfer actually costs.
 * @returns `{ valid: true }` or `{ valid: false, error }`.
 *
 * @example
 * ```ts
 * validateAmount('1.5', '10')          // { valid: true }
 * validateAmount('0', '10')            // greater-than-zero error
 * validateAmount('20', '10')           // insufficient-balance error
 * validateAmount('10', '10')           // gas-reserve error
 * validateAmount('1.2345678', '10', { maxDecimals: 6 }) // too-many-decimals error
 * ```
 *
 * WORKFLOW
 *   trim
 *        |
 *        v
 *   empty / not a number / negative / zero  -> error
 *        |
 *        v
 *   more decimal places than the token supports -> error
 *        |
 *        v
 *   balance known?
 *        |         \
 *       no          yes
 *        |            \
 *      valid      amount > balance            -> error
 *                 amount > balance - gasReserve -> error
 *                       |
 *                     valid
 *
 * WHY THE GAS RESERVE CHECK MATTERS SO MUCH
 * -----------------------------------------
 * On Injective the fee is paid in INJ — the same token most people are trying
 * to send. So "send my whole balance" is arithmetically impossible: after the
 * transfer there would be nothing left to pay the fee with, and the chain
 * rejects the transaction *after* it has already been broadcast.
 *
 * Users hit this constantly. Catching it in the form, with an explanation, is
 * one of the highest-value five lines of code in any dApp.
 */
export function validateAmount(
  rawAmount: string,
  availableBalance?: string,
  options: { maxDecimals?: number; gasReserve?: number } = {},
): ValidationResult {
  const { maxDecimals = 18, gasReserve = 0.001 } = options
  const trimmed = rawAmount.trim()

  if (!trimmed) {
    return { valid: false, error: 'Enter an amount.' }
  }

  const amount = Number.parseFloat(trimmed)

  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'That is not a number. Use a dot for decimals, e.g. 0.5.' }
  }

  if (amount < 0) {
    return {
      valid: false,
      error: 'Amounts cannot be negative. To move tokens the other way, the other party has to send them.',
    }
  }

  if (amount === 0) {
    return { valid: false, error: 'Amount must be greater than zero.' }
  }

  // A token with 6 decimals cannot represent 0.0000001. The chain would either
  // reject the message or silently truncate it — neither is acceptable.
  const decimalPart = trimmed.split('.')[1]
  if (decimalPart && decimalPart.length > maxDecimals) {
    return {
      valid: false,
      error: `This token supports at most ${maxDecimals} decimal places; you entered ${decimalPart.length}. Anything finer than that does not exist on-chain.`,
    }
  }

  // Balance-dependent checks are skipped while the balance is still loading.
  // Blocking the form on data we do not have yet would be worse than allowing a
  // submission the chain will validate anyway.
  if (availableBalance !== undefined) {
    const balance = Number.parseFloat(availableBalance)

    if (Number.isFinite(balance)) {
      if (amount > balance) {
        return {
          valid: false,
          error: `You are trying to send ${amount} but your balance is ${balance}.`,
        }
      }

      if (amount > balance - gasReserve) {
        return {
          valid: false,
          error: `Leave at least ${gasReserve} INJ behind to pay the network fee. The fee comes out of this same balance, so sending the full amount would leave nothing to pay it with. Try ${Math.max(
            0,
            balance - gasReserve,
          ).toFixed(6)} instead.`,
        }
      }
    }
  }

  return { valid: true }
}
