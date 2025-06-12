/**
 * @file test/logger.test.ts
 * @description Тесты для "чистого" ядра логгера.
 * @version 2.0.3
 * @date 2025-06-12
 *
 * HISTORY:
 * v2.0.3 (2025-06-12): Исправлен тест isLevelEnabled путем добавления транспорта в конфигурацию логгера.
 * v2.0.2 (2025-06-12): Добавлена очистка loggerCache перед каждым тестом для обеспечения изоляции.
 * v2.0.1 (2025-06-12): Исправлены ошибки типизации (TS2322) для PinoTransport и мока Writable stream.
 * v2.0.0 (2025-06-12): Тесты переписаны для проверки "чистой" createLogger и ее опций.
 * v1.1.0 (2025-06-11): Исправлен тест `.child()` и другие моки.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import pino from 'pino'
import { Writable } from 'stream'
import { createLogger, loggerCache } from '../src/logger.js'
import type { PinoTransport } from '@fab33/tlogger'

describe('(logger.ts) "Чистое" ядро логгера', () => {
  let mockStream: Writable & { written: string[] }

  beforeEach(() => {
    loggerCache.clear() // Очищаем кеш перед каждым тестом для изоляции

    // Кастуем тип, чтобы добавить кастомное свойство `written`
    mockStream = new Writable({
      write (chunk, encoding, callback) {
        // Обращаемся к mockStream напрямую, а не через `this`
        mockStream.written.push(chunk.toString())
        callback()
      }
    }) as Writable & { written: string[] }
    mockStream.written = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('должен создавать pino инстанс с переданным stream', () => {
    const logger = createLogger('test', { transports: [{ stream: mockStream, level: 'info' }] })
    logger.info('hello')
    expect(mockStream.written.length).toBe(1)
    const logObject = JSON.parse(mockStream.written[0])
    expect(logObject.msg).toBe('hello')
    expect(logObject.namespace).toBe('test')
  })

  test('должен корректно фильтровать сообщения по уровню', () => {
    const logger = createLogger('test', { transports: [{ stream: mockStream, level: 'warn' }] })
    logger.info('should be ignored')
    logger.warn('should be logged')
    expect(mockStream.written.length).toBe(1)
    expect(JSON.parse(mockStream.written[0]).msg).toBe('should be logged')
  })

  test('должен корректно фильтровать по namespace из debugString', () => {
    const loggerWithApi = createLogger('api', { transports: [{ stream: mockStream }], debugString: 'api' })
    const loggerWithDb = createLogger('db', { transports: [{ stream: mockStream }], debugString: 'api' })

    loggerWithApi.info('api log')
    loggerWithDb.info('db log')

    expect(mockStream.written.length).toBe(1)
    expect(JSON.parse(mockStream.written[0]).namespace).toBe('api')
  })

  test('должен обрабатывать отрицательные паттерны в debugString', () => {
    const logger = createLogger('api:private', {
      transports: [{ stream: mockStream }],
      debugString: 'api:*,-api:private'
    })
    logger.info('this should not be logged')
    expect(mockStream.written.length).toBe(0)
  })

  test('child() должен создавать дочерний логгер с дополнительными bindings', () => {
    const logger = createLogger('parent', { transports: [{ stream: mockStream }] })
    const child = logger.child({ requestId: '123' })

    child.info('child message')

    expect(mockStream.written.length).toBe(1)
    const logObject = JSON.parse(mockStream.written[0])
    expect(logObject.namespace).toBe('parent')
    expect(logObject.requestId).toBe('123')
    expect(logObject.msg).toBe('child message')
  })

  test('isLevelEnabled должен учитывать и уровень, и namespace', () => {
    const loggerEnabled = createLogger('app', {
      transports: [{ stream: mockStream }],
      logLevel: 'info',
      debugString: 'app'
    })
    const loggerDisabled = createLogger('app', {
      transports: [{ stream: mockStream }],
      logLevel: 'info',
      debugString: 'db'
    })

    expect(loggerEnabled.isLevelEnabled('info')).toBe(true)
    expect(loggerEnabled.isLevelEnabled('debug')).toBe(false)
    expect(loggerDisabled.isLevelEnabled('info')).toBe(false)
  })

  test('должен использовать кешированный инстанс pino для идентичных конфигураций', () => {
    const pinoSpy = vi.spyOn(pino, 'pino')
    const transport: PinoTransport = { stream: mockStream, level: 'info' }

    createLogger('first', { transports: [transport] })
    expect(pinoSpy).toHaveBeenCalledTimes(1)

    createLogger('second', { transports: [transport] })
    expect(pinoSpy).toHaveBeenCalledTimes(1) // Не был вызван снова

    pinoSpy.mockRestore()
  })
})

// END OF: test/logger.test.ts
