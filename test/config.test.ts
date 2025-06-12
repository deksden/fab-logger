/**
 * @file test/config.test.ts
 * @description Тесты модуля конфигурации логгера.
 * @version 1.2.1
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.2.1 (2025-06-12): Исправлена ошибка линтера 'no-undef' для NodeJS.ProcessEnv.
 * v1.2.0 (2025-06-12): Тесты полностью переписаны для проверки функции loadConfig после рефакторинга.
 * v1.1.0 (2025-06-12): Добавлен тест для `console-inline` транспорта.
 * v1.0.6 (2025-06-11): Удален некорректный тест, проверявший выброс ошибки при создании директории.
 * v1.0.5 (2025-06-11): Исправлена ошибка типизации (TS2322) путем замены `Mock` на `MockInstance` для `vi.spyOn`.
 * v1.0.4 (2025-06-11): Исправлена ошибка типизации (TS2707) для `Mock` в `vitest`.
 * v1.0.3 (2025-06-11): Заменен устаревший тип `SpyInstance` на `Mock` из `vitest`.
 * v1.0.2 (2025-06-11): Исправлены импорты, типы для Vitest и добавлены расширения .js.
 * v1.0.1 (2025-06-11): Исправлены импорты и типы.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import { describe, expect, test } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('(config.ts) Модуль конфигурации логгера', () => {
  test('должен корректно парсить несколько транспортов из process.env', () => {
    const env: typeof process.env = {
      TRANSPORT1: 'pretty',
      TRANSPORT1_LEVEL: 'debug',
      TRANSPORT1_SINGLE_LINE: 'true',
      TRANSPORT2: 'file',
      TRANSPORT2_FILENAME: 'app.log',
      TRANSPORT2_LEVEL: 'warn'
    }

    const config = loadConfig(env)

    expect(config.transportsConfig).toHaveLength(2)
    expect(config.transportsConfig?.[0]).toEqual({
      type: 'pretty',
      level: 'debug',
      single_line: true, // Имена опций становятся snake_case
      enabled: true
    })
    expect(config.transportsConfig?.[1]).toEqual({
      type: 'file',
      level: 'warn',
      filename: 'app.log',
      enabled: true
    })
  })

  test('должен отключать транспорт, если ENABLED=false', () => {
    const env: typeof process.env = {
      TRANSPORT1: 'console',
      TRANSPORT1_ENABLED: 'false',
      TRANSPORT2: 'file',
      TRANSPORT2_LEVEL: 'error'
    }

    const config = loadConfig(env)
    expect(config.transportsConfig).toHaveLength(1)
    expect(config.transportsConfig?.[0].type).toBe('file')
  })

  test('должен использовать легаси-переменные, если нет TRANSPORT', () => {
    const env: typeof process.env = {
      LOG_CONSOLE_OUTPUT: 'true',
      LOG_FILE_OUTPUT: 'true',
      LOG_LEVEL: 'error',
      LOG_FOLDER: 'legacy-logs'
    }
    const config = loadConfig(env)
    expect(config.transportsConfig).toHaveLength(2)
    expect(config.transportsConfig?.[0]).toEqual({ type: 'console', level: 'error' })
    expect(config.transportsConfig?.[1]).toEqual({ type: 'file', level: 'error', folder: 'legacy-logs' })
  })

  test('не должен использовать легаси-переменные, если есть хотя бы один TRANSPORT', () => {
    const env: typeof process.env = {
      LOG_CONSOLE_OUTPUT: 'true', // Эта переменная будет проигнорирована
      TRANSPORT1: 'file',
      TRANSPORT1_FILENAME: 'only-this.log'
    }

    const config = loadConfig(env)
    expect(config.transportsConfig).toHaveLength(1)
    expect(config.transportsConfig?.[0].type).toBe('file')
    expect(config.transportsConfig?.[0].filename).toBe('only-this.log')
  })

  test('должен передавать debugString и logLevel', () => {
    const env: typeof process.env = {
      DEBUG: 'app:*,-test',
      LOG_LEVEL: 'trace'
    }
    const config = loadConfig(env)
    expect(config.debugString).toBe('app:*,-test')
    expect(config.logLevel).toBe('trace')
  })
})

// END OF: test/config.test.ts
