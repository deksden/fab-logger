/**
 * @file eslint.config.js
 * @description ESLint configuration for the project.
 * @version 1.0.2
 * @date 2025-05-30
 * @updated Добавлена пустая строка в конце файла (eol-last).
 *
 * HISTORY:
 * v1.0.2 (2025-05-30): Исправлено правило eol-last.
 * v1.0.1 (2025-05-30): Исправлены правила eol-last и space-before-function-paren.
 * v1.0.0 (2025-05-29): Initial TypeScript-aware ESLint configuration.
 */

import js from '@eslint/js'
import globals from 'globals'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname
})

export default [
  { // Global ignores
    ignores: ['dist/', 'coverage/', 'node_modules/', '*.md']
  },
  js.configs.recommended, // ESLint recommended
  ...compat.extends('eslint-config-standard'), // StandardJS style (via eslint-config-standard)

  { // TypeScript specific configurations
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json' // Path to your tsconfig.json
      },
      globals: {
        ...globals.node, // Node.js global variables.
        ...globals.es2021 // ES2021 globals.
      }
    },
    rules: {
      // ESLint base rules that might conflict or are handled by TypeScript ESLint
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
      'no-useless-constructor': 'off', // Use @typescript-eslint/no-useless-constructor
      'no-redeclare': 'off', // Use @typescript-eslint/no-redeclare
      'space-before-function-paren': 'off', // Отключаем базовое правило, чтобы использовать standard ниже

      // TypeScript ESLint rules
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn on 'any' type
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }],
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/consistent-type-imports': 'error', // Enforce type-only imports

      // StandardJS / stylistic preferences (some may be covered by eslint-config-standard)
      // Правило 'space-before-function-paren' из eslint-config-standard должно применяться корректно.
      // Если нет, можно его здесь переопределить:
      // 'space-before-function-paren': ['error', {
      //   anonymous: 'always', // standard: 'always'
      //   named: 'never',    // standard: 'never'
      //   asyncArrow: 'always' // standard: 'always'
      // }],
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
      semi: ['error', 'never'], // No semicolons
      quotes: ['error', 'single'],
      'eol-last': ['error', 'always'], // Требуем пустую строку в конце файла

      // Project-specific rules / overrides
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-throw-literal': 'error', // Only throw Error objects
      'handle-callback-err': 'error', // Handle error in callbacks (if any)

      // Rules for tests (can be in a separate config object if preferred)
      'no-unused-expressions': 'off' // Allow chai-style expressions in tests
    }
  }
]

// END OF: eslint.config.js
