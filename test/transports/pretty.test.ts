/**
 * @file test/transports/pretty.test.ts
 * @description Тесты для pretty-транспорта.
 * @version 1.0.2
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.2 (2025-06-12): Исправлена ошибка мокирования из-за hoisting с помощью vi.hoisted.
 * v1.0.1 (2025-06-12): Исправлена ошибка типизации (TS2345) при передаче опций в createTransport.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import { describe, expect, test, vi } from 'vitest'
import createPrettyTransport from '../../src/transports/pretty.js'
import type { TransportOptions } from '@fab33/tlogger'

const { mockPretty } = vi.hoisted(() => ({
  mockPretty: vi.fn()
}))

vi.mock('pino-pretty', () => ({
  default: mockPretty
}))

describe('(transport/pretty.ts) Pretty транспорт', () => {
  test('должен вызывать pino-pretty с правильными опциями', () => {
    const options: TransportOptions = {
      level: 'trace',
      colorize: false,
      singleLine: true,
      ignore: 'hostname'
    }

    createPrettyTransport(options)

    expect(mockPretty).toHaveBeenCalledWith(expect.objectContaining({
      colorize: false,
      singleLine: true,
      ignore: 'hostname'
    }))
  })

  test('должен возвращать объект с stream и level', () => {
    const mockStream = { pipe: vi.fn() }
    mockPretty.mockReturnValue(mockStream)

    const transport = createPrettyTransport({ level: 'error' })

    expect(transport.stream).toBe(mockStream)
    expect(transport.level).toBe('error')
  })

  test('должен использовать опции по умолчанию, если они не предоставлены', () => {
    createPrettyTransport()

    expect(mockPretty).toHaveBeenCalledWith({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
      timestampKey: 'time',
      sync: false
    })
  })
})

// END OF: test/transports/pretty.test.ts
