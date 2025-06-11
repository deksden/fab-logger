/**
 * @file test/string-truncation.test.ts
 * @description Тесты функциональности ограничения длины строк в логгере.
 * @version 1.0.4
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.4 (2025-06-11): Исправлена ошибка TS2305 путем замены типа `ProcessEnv` на `typeof process.env`.
 * v1.0.3 (2025-06-11): Исправлена ошибка линтера `no-undef` для типа `NodeJS.ProcessEnv`.
 * v1.0.2 (2025-06-11): Исправлены импорты и типы для Vitest.
 * v1.0.1 (2025-06-11): Исправлены импорты.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createLogger, dependencies as loggerDeps, setDependencies } from '../src/logger.js'

createLogger('test:logger:string-truncation')

describe('(logger.ts) Ограничение длины строк', () => {
  const origDeps = { ...loggerDeps }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPinoLogger: any
  let envBackup: typeof process.env

  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    envBackup = { ...process.env }

    mockPinoLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis()
    }

    setDependencies({
      env: {
        DEBUG: '*',
        LOG_LEVEL: 'trace',
        LOG_MAX_STRING_LENGTH: '100',
        LOG_TRUNCATION_MARKER: '...'
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pino: vi.fn() as any,
      baseLogger: mockPinoLogger,
      Date
    })
  })

  afterEach(() => {
    setDependencies(origDeps)
    process.env = { ...envBackup }
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  test('должен обрезать строки, превышающие установленный лимит', () => {
    const logger = createLogger()
    const longString = 'A'.repeat(150)
    logger.info({ longValue: longString }, 'Test message')
    expect(mockPinoLogger.info).toHaveBeenCalledWith({ longValue: 'A'.repeat(100) + '...' }, 'Test message')
  })

  test('должен корректно обрабатывать вложенные объекты', () => {
    const logger = createLogger()
    const complexObject = {
      level1: {
        normalString: 'Normal',
        longString: 'B'.repeat(120)
      }
    }
    logger.info({ data: complexObject }, 'Complex object')
    expect(mockPinoLogger.info).toHaveBeenCalledWith({
      data: {
        level1: {
          normalString: 'Normal',
          longString: 'B'.repeat(100) + '...'
        }
      }
    }, 'Complex object')
  })

  test('не должен применять ограничение, если LOG_MAX_STRING_LENGTH=0', () => {
    setDependencies({
      ...loggerDeps,
      env: { ...loggerDeps.env, LOG_MAX_STRING_LENGTH: '0' }
    })
    const logger = createLogger()
    const longString = 'Y'.repeat(200)
    logger.info({ value: longString })
    expect(mockPinoLogger.info).toHaveBeenCalledWith({ value: longString })
  })

  test('не должен обрезать сообщения об ошибках', () => {
    const logger = createLogger()
    const longErrorMessage = 'Error: ' + 'E'.repeat(200)
    const testError = new Error(longErrorMessage)
    logger.error({ err: testError }, 'Error occurred')

    expect(mockPinoLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.objectContaining({
          message: longErrorMessage
        })
      }),
      'Error occurred'
    )
  })
})
