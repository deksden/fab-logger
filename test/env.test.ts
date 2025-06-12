/**
 * @file test/env.test.ts
 * @description Тесты для "умной" обертки, читающей process.env.
 * @version 1.0.2
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.2 (2025-06-12): Исправлен тест на обработку ошибки загрузки транспорта.
 * v1.0.1 (2025-06-12): Исправлена ошибка мокирования из-за hoisting с помощью vi.hoisted.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
// Импортируем тестируемый модуль ПОСЛЕ всех моков
import { createLogger as createLoggerFromEnv } from '../src/env.js'

// Используем vi.hoisted для гарантии, что переменные будут инициализированы до их использования в vi.mock
const { mockCreatePrettyTransport, mockCreateFileTransport, mockCreateSimpleTransport } = vi.hoisted(() => {
  return {
    mockCreatePrettyTransport: vi.fn(),
    mockCreateFileTransport: vi.fn(),
    mockCreateSimpleTransport: vi.fn()
  }
})

vi.mock('../src/transports/pretty.js', () => ({
  default: mockCreatePrettyTransport
}))
vi.mock('../src/transports/file.js', () => ({
  default: mockCreateFileTransport
}))
vi.mock('../src/transports/console-simple.js', () => ({
  default: mockCreateSimpleTransport
}))

// Мокируем "чистое" ядро
const { mockCleanCreateLogger } = vi.hoisted(() => {
  return { mockCleanCreateLogger: vi.fn() }
})
vi.mock('../src/logger.js', () => ({
  createLogger: mockCleanCreateLogger
}))

describe('(env.ts) Обертка createLoggerFromEnv', () => {
  beforeEach(() => {
    // Сбрасываем все моки перед каждым тестом
    vi.clearAllMocks()
    vi.stubGlobal('process', { env: {} }) // Очищаем process.env
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('должен парсить и динамически импортировать несколько транспортов из env', async () => {
    process.env.TRANSPORT1 = 'pretty'
    process.env.TRANSPORT1_LEVEL = 'debug'
    process.env.TRANSPORT2 = 'file'
    process.env.TRANSPORT2_FILENAME = 'test.log'

    mockCreatePrettyTransport.mockResolvedValue({ stream: 'pretty_stream', level: 'debug' })
    mockCreateFileTransport.mockResolvedValue({
      target: 'pino/file',
      options: { destination: 'test.log' },
      level: 'info'
    })

    await createLoggerFromEnv('test-app')

    // Проверяем, что были вызваны createTransport из правильных модулей
    expect(mockCreatePrettyTransport).toHaveBeenCalledWith(expect.objectContaining({ type: 'pretty', level: 'debug' }))
    expect(mockCreateFileTransport).toHaveBeenCalledWith(expect.objectContaining({
      type: 'file',
      filename: 'test.log'
    }))

    // Проверяем, что "чистый" логгер был вызван с результатом
    expect(mockCleanCreateLogger).toHaveBeenCalledWith('test-app', expect.objectContaining({
      transports: [
        { stream: 'pretty_stream', level: 'debug' },
        { target: 'pino/file', options: { destination: 'test.log' }, level: 'info' }
      ]
    }))
  })

  test('должен использовать fallback (console-simple), если другие транспорты не настроены или не загрузились', async () => {
    process.env.TRANSPORT1 = 'non-existent-transport' // Указываем транспорт, который не сможет загрузиться

    mockCreateSimpleTransport.mockResolvedValue({ stream: 'simple_stream', level: 'info' })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await createLoggerFromEnv('fallback-test')

    // Проверяем, что была попытка загрузить несуществующий транспорт и была ошибка
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load or create transport of type "non-existent-transport"'),
      expect.any(Error) // Ошибка теперь содержит причину
    )

    // Проверяем, что был вызван fallback
    expect(mockCreateSimpleTransport).toHaveBeenCalled()

    // Проверяем, что ядро было вызвано с fallback транспортом
    expect(mockCleanCreateLogger).toHaveBeenCalledWith('fallback-test', expect.objectContaining({
      transports: [{ stream: 'simple_stream', level: 'info' }]
    }))

    consoleErrorSpy.mockRestore()
  })

  test('должен корректно парсить легаси-переменные, если нет TRANSPORT', async () => {
    process.env.LOG_CONSOLE_OUTPUT = 'true'
    process.env.LOG_LEVEL = 'warn'

    // Поскольку 'console' теперь резолвится в 'pretty'
    mockCreatePrettyTransport.mockResolvedValue({ stream: 'pretty_stream', level: 'warn' })

    await createLoggerFromEnv('legacy-test')

    expect(mockCreatePrettyTransport).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }))
    expect(mockCleanCreateLogger).toHaveBeenCalledWith('legacy-test', expect.objectContaining({
      transports: [{ stream: 'pretty_stream', level: 'warn' }]
    }))
  })

  test('должен передавать debugString в "чистый" логгер', async () => {
    process.env.DEBUG = 'app:*'
    process.env.TRANSPORT1 = 'console-simple'
    mockCreateSimpleTransport.mockResolvedValue({ stream: 'simple_stream' })

    await createLoggerFromEnv()

    expect(mockCleanCreateLogger).toHaveBeenCalledWith(undefined, expect.objectContaining({
      debugString: 'app:*'
    }))
  })
})

// END OF: test/env.test.ts
