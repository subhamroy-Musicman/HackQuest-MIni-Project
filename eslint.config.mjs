/**
 * ESLint flat configuration.
 *
 * We extend Next.js' recommended rules (which include React Hooks rules — very
 * important in this project, because a hook called conditionally is a classic
 * source of "wallet state randomly resets" bugs).
 */
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
