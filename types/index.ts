/**
 * =============================================================================
 * FILE: types/index.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * A single re-export point ("barrel") for every type in the project, so that
 * application code can write one import instead of three:
 *
 *   import type { Balance, WalletAccount, ApiResponse } from '@/types'
 *
 * WHY IT EXISTS
 * -------------
 * Readability. In a teaching repository the import block at the top of a file
 * is part of the lesson: a reader should be able to see at a glance that a
 * component deals with balances and wallets, without parsing four file paths.
 *
 * A note on the trade-off, because barrels are not free: a barrel that
 * re-exports *runtime values* can defeat tree-shaking and slow down cold
 * builds. This one re-exports **types only**, which are erased at compile time,
 * so it costs nothing at runtime. That is why `lib/` deliberately has no
 * equivalent barrel — you always import `lib/queries` or `lib/wallet` directly.
 *
 * WHEN TO USE
 * -----------
 * Always import types from `@/types`. Import runtime code from its real path.
 *
 * DEPENDENCIES
 * ------------
 * Depends on : `types/injective.ts`, `types/wallet.ts`, `types/api.ts`
 * Depended on by: nearly every file in the project.
 * =============================================================================
 */

export type {
  Coin,
  Balance,
  TokenMetadata,
  ChainStatus,
  TransactionResult,
  TransactionStage,
} from './injective'

export type {
  WalletId,
  WalletMetadata,
  WalletStatus,
  WalletAccount,
  WalletContextValue,
} from './wallet'

export type {
  ApiError,
  ApiResponse,
  ChainStatusResponse,
  BalancesResponse,
  AccountAuthResponse,
  BroadcastRequestBody,
  BroadcastResponse,
} from './api'
