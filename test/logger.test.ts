/**
 * @file test/logger.test.ts
 * @description Тесты основного модуля логирования.
 * @version 1.0.3
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.3 (2025-06-11): Исправлен тест `.child()` путем установки `DEBUG='*'` для корректной работы namespace.
 * v1.0.2 (2025-06-11): Исправлены ошибки типов, импорты и моки.
 * v1.0.1 (2025-06-11): Исправлены ошибки типов и импорты.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'
import pino from 'pino'
import { createLogger, dependencies as loggerDeps, setDependencies } from '../src/logger.js'
import { FabError } from '@fab33/fab-errors'
import { TRANSPORT_INIT_FAILED_SPEC } from '../src/errors.js'

const testMetaLogger = createLogger('test:logger')

describe('(logger.ts) Модуль основного логирования', () => {
  let origDeps: Partial<typeof loggerDeps>
  let mockPino: Mock
  let mockTransport: Mock
  let mockBasePinoInstance: pino.Logger

  const createPinoMockInstance = (initialLevel = 'trace', initialBindings = {}): pino.Logger => {
    let currentLevel = initialLevel
    const bindings = { ...initialBindings }
    const instance: Partial<pino.Logger> = {}
    const logLevels: pino.Level[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

    logLevels.forEach(level => {
      instance[level] = vi.fn()
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).child = vi.fn((newBindings: any) => {
      return createPinoMockInstance(currentLevel, { ...bindings, ...newBindings })
    })

    instance.bindings = vi.fn(() => ({ ...bindings }))
    instance.isLevelEnabled = vi.fn(levelName => (pino.levels.values[levelName] >= pino.levels.values[currentLevel]))

    Object.defineProperty(instance, 'level', {
      get: () => currentLevel,
      set: (newLevel) => { currentLevel = newLevel },
      enumerable: true,
      configurable: true
    })
    return instance as pino.Logger
  }

  beforeEach(() => {
    testMetaLogger.trace('Инициализация тестов logger.ts')
    origDeps = { ...loggerDeps }
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))

    mockBasePinoInstance = createPinoMockInstance('trace', {})
    mockPino = vi.fn().mockReturnValue(mockBasePinoInstance)
    Object.assign(mockPino, { levels: pino.levels, transport: vi.fn() })

    mockTransport = vi.fn().mockReturnValue({
      transport: { targets: [] },
      level: 10
    })

    setDependencies({
      env: { LOG_LEVEL: 'trace', LOG_MAX_STRING_LENGTH: '0' },
      pino: mockPino as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      createTransport: mockTransport,
      baseLogger: null,
      Date
    })
  })

  afterEach(() => {
    setDependencies(origDeps)
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('createLogger()', () => {
    test('создание логгера с namespace', () => {
      setDependencies({ ...loggerDeps, env: { ...loggerDeps.env, DEBUG: '*' } })
      const testLogger = createLogger('test:module')
      expect(mockBasePinoInstance.child).toHaveBeenCalledWith({ namespace: 'test:module' })
      testLogger.info('test message')
      const childInstance = (mockBasePinoInstance.child as Mock).mock.results[0].value
      expect(childInstance.info).toHaveBeenCalledWith('test message')
    })

    test('фильтрация по DEBUG работает', () => {
      setDependencies({ ...loggerDeps, env: { ...loggerDeps.env, DEBUG: 'app:*' } })
      const loggerAllowed = createLogger('app:test')
      const loggerBlocked = createLogger('other:test')
      loggerAllowed.info('allowed')
      loggerBlocked.info('blocked')
      const allowedInstance = (mockBasePinoInstance.child as Mock).mock.results[0].value
      const blockedInstance = (mockBasePinoInstance.child as Mock).mock.results[1].value
      expect(allowedInstance.info).toHaveBeenCalledTimes(1)
      expect(blockedInstance.info).not.toHaveBeenCalled()
    })

    test('ошибка при инициализации транспорта', () => {
      const initError = new Error('Transport failed')
      setDependencies({
        ...loggerDeps,
        baseLogger: null,
        createTransport: vi.fn().mockImplementation(() => { throw initError })
      })
      try {
        createLogger()
        expect.fail('Expected to throw')
      } catch (e) {
        const err = e as FabError
        expect(err).toBeInstanceOf(FabError)
        expect(err.code).toBe(TRANSPORT_INIT_FAILED_SPEC.code)
        expect(err.cause).toBe(initError)
      }
    })
  })

  describe('Дополнительные методы логгера', () => {
    test('метод .child() создает дочерний логгер', () => {
      setDependencies({ ...loggerDeps, env: { ...loggerDeps.env, DEBUG: '*' } })
      const parentLogger = createLogger('parent')
      const parentInstance = (mockBasePinoInstance.child as Mock).mock.results[0].value
      const childLogger = parentLogger.child({ extra: 'data' })
      expect(parentInstance.child).toHaveBeenCalledWith({ extra: 'data' })
      childLogger.info('Child message')
      const childInstance = (parentInstance.child as Mock).mock.results[0].value
      expect(childInstance.info).toHaveBeenCalledWith('Child message')
    })
  })
})
