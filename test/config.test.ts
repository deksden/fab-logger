/**
 * @file test/config.test.ts
 * @description Тесты модуля конфигурации логгера.
 * @version 1.0.6
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.6 (2025-06-11): Удален некорректный тест, проверявший выброс ошибки при создании директории.
 * v1.0.5 (2025-06-11): Исправлена ошибка типизации (TS2322) путем замены `Mock` на `MockInstance` для `vi.spyOn`.
 * v1.0.4 (2025-06-11): Исправлена ошибка типизации (TS2707) для `Mock` в `vitest`.
 * v1.0.3 (2025-06-11): Заменен устаревший тип `SpyInstance` на `Mock` из `vitest`.
 * v1.0.2 (2025-06-11): Исправлены импорты, типы для Vitest и добавлены расширения .js.
 * v1.0.1 (2025-06-11): Исправлены импорты и типы.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest'
import type { TLogger } from '@fab33/tlogger'
import { createLogger } from '../src/logger.js'
import { createTransport, processFilenameTemplate, setDependencies } from '../src/config.js'

describe('(config.ts) Модуль конфигурации логгера', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeps: any
  let mockLogger: TLogger
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: MockInstance<(message?: any, ...optionalParams: any[]) => void>

  beforeEach(() => {
    mockLogger = createLogger('test:logger:config')
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    vi.spyOn(Date, 'now').mockImplementation(() => new Date().getTime())
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const mockStream = { write: vi.fn(), end: vi.fn() }
    const mockPretty = vi.fn(() => mockStream)

    mockDeps = {
      fs: {
        readFileSync: vi.fn(),
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        accessSync: vi.fn(),
        constants: { W_OK: 2 }
      },
      path: {
        join: vi.fn((...args: string[]) => args.join('/')),
        dirname: vi.fn().mockImplementation((p: string) => p.substring(0, p.lastIndexOf('/')))
      },
      pino: {
        destination: vi.fn(() => mockStream),
        transport: vi.fn().mockReturnValue({})
      },
      pretty: mockPretty,
      env: {
        LOG_LEVEL: 'info',
        LOG_FOLDER: 'test-logs',
        LOG_FILE_OUTPUT: 'true',
        LOG_CONSOLE_OUTPUT: 'true'
      }
    }
    setDependencies(mockDeps)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    consoleErrorSpy.mockRestore()
  })

  describe('processFilenameTemplate()', () => {
    test('должен корректно обрабатывать шаблоны в имени файла', () => {
      mockLogger.trace('Тестирование обработки шаблонов')
      mockDeps.fs.readFileSync.mockReturnValue('{"name": "test-app", "version": "1.2.3"}')

      const templates = {
        '{app_name}.log': 'test-app.log',
        '{app_name}_{date}.log': 'test-app_2024-01-01.log'
      }

      for (const [template, expected] of Object.entries(templates)) {
        const result = processFilenameTemplate(template)
        expect(result).toBe(expected)
      }
    })
  })

  describe('createTransport()', () => {
    test('должен использовать pino.transport для новых настроек транспортов', () => {
      mockLogger.trace('Тестирование создания транспортов через pino.transport')
      mockDeps.env = {
        TRANSPORT1: 'console',
        TRANSPORT1_LEVEL: 'debug',
        TRANSPORT2: 'file',
        TRANSPORT2_LEVEL: 'error',
        TRANSPORT2_FOLDER: '/custom/logs'
      }
      mockDeps.fs.readFileSync.mockReturnValue('{"name": "test-app"}')

      const result = createTransport(mockDeps.env)

      expect(result.level).toBe(20)
      expect(mockDeps.pino.transport).toHaveBeenCalledWith({
        targets: [
          expect.objectContaining({ level: 'debug', target: 'pino-pretty' }),
          expect.objectContaining({ level: 'error', target: 'pino/file' })
        ],
        dedupe: false
      })
    })

    test('должен отключить файловый транспорт при ошибке доступа и не падать', () => {
      mockLogger.trace('Тестирование отказоустойчивости при ошибке доступа')
      mockDeps.env = {
        TRANSPORT1: 'file',
        TRANSPORT1_FOLDER: '/read-only-dir/logs'
      }
      mockDeps.fs.accessSync.mockImplementation(() => { throw new Error('EACCES') })

      const result = createTransport(mockDeps.env)
      expect(result).toBeDefined()
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[FAB_LOGGER FATAL]'))
      expect(mockDeps.pino.transport).toHaveBeenCalledWith(expect.objectContaining({
        targets: [expect.objectContaining({ target: 'pino-pretty' })]
      }))
    })
  })
})
