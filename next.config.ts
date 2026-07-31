/**
 * =============================================================================
 * File: next.config.ts
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Configures the Next.js build. For a normal web app this file is usually
 * empty — but blockchain SDKs are not normal dependencies, so this project
 * needs two small adjustments that are worth understanding.
 *
 * WHY IT EXISTS
 * -------------
 * The Injective TypeScript SDK is a large package that was originally written
 * to run in Node.js. It contains cryptography helpers, protobuf codecs and gRPC
 * transports. Some of that code references Node.js built-in modules (`fs`,
 * `net`, `tls`) that simply do not exist in a browser.
 *
 * Two settings below deal with that:
 *
 *   1. `serverExternalPackages` — tells Next.js "do not bundle the Injective
 *      SDK into the server build, just `require()` it at runtime". This keeps
 *      server builds fast and avoids the bundler mangling the SDK's native
 *      crypto dependencies.
 *
 *   2. `webpack.resolve.fallback` — tells the *browser* build "if some module
 *      deep inside the SDK asks for `fs`, hand it an empty object instead of
 *      failing the build". We can do this safely because the code paths that
 *      need `fs` are never executed in the browser.
 *
 * WHEN TO TOUCH THIS FILE
 * -----------------------
 * If you add a new blockchain library and the build fails with
 * "Module not found: Can't resolve 'fs'", add that module to the fallback list.
 *
 * EXECUTION FLOW
 * --------------
 *   next build
 *        |
 *        v
 *   reads next.config.ts
 *        |
 *        v
 *   applies webpack fallbacks to the browser bundle
 *        |
 *        v
 *   leaves @injectivelabs/* external on the server bundle
 *
 * DEPENDS ON / DEPENDED ON BY
 * ---------------------------
 * Depended on by: the entire build. No application file imports it directly.
 * =============================================================================
 */

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React Strict Mode double-invokes effects in development. That is a feature:
  // it surfaces bugs where a wallet listener is registered but never cleaned up.
  reactStrictMode: true,

  // Keep the Injective packages out of the server bundle. They are loaded with
  // a plain `require()` at runtime instead, which is both faster to build and
  // safer for packages that ship platform-specific code.
  serverExternalPackages: [
    '@injectivelabs/sdk-ts',
    '@injectivelabs/networks',
    '@injectivelabs/utils',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // The browser has no filesystem and no raw TCP sockets. Any SDK code path
      // that would use them is server-only and never runs here, so returning
      // `false` (an empty stub) is safe and keeps the bundle small.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

export default nextConfig
