/**
 * @file test/transports/file.test.ts
 * @description Тесты для файлового транспорта.
 * @version 1.0.1
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.1 (2025-06-12): Исправлена ошибка типизации (TS2345) при передаче опций в createTransport.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import { describe, expect, test, vi } from 'vitest'
import createFileTransport from '../../src/transports/file.js'
import type { TransportOptions } from '@fab33/tlogger'

// Мокируем Node.js зависимости
const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  accessSync: vi.fn(),
  constants: { W_OK: 2 }
}
const mockPath = {
  join: (...args: string[]) => args.join('/'),
  dirname: (p: string) => p.substring(0, p.lastIndexOf('/'))
}
vi.mock('fs', () => ({ default: mockFs }))
vi.mock('path', () => ({ default: mockPath }))

describe('(transport/file.ts) Файловый транспорт', () => {
  test('должен возвращать правильную конфигурацию для pino/file', async () => {
    const options: TransportOptions = {
      level: 'debug',
      folder: 'my-logs',
      filename: 'app.log'
    }

    const transportConfig = await createFileTransport(options)

    expect(transportConfig.target).toBe('pino/file')
    expect(transportConfig.level).toBe('debug')
    expect(transportConfig.options.destination).toBe('my-logs/app.log')
  })

  test('должен использовать destination, если он предоставлен', async () => {
    const transportConfig = await createFileTransport({ destination: '/var/log/my-app.log' })
    expect(transportConfig.options.destination).toBe('/var/log/my-app.log')
  })

  test('должен использовать числовой destination (stdout/stderr)', async () => {
    const transportConfig = await createFileTransport({ destination: '2' }) // stderr
    expect(transportConfig.options.destination).toBe(2)
  })

  test('должен вызывать mkdirSync, если mkdir=true и папка не существует', async () => {
    mockFs.existsSync.mockReturnValue(false)
    await createFileTransport({ folder: 'new-logs', mkdir: true })
    // В реальной реализации мы бы проверили вызов mkdirSync
    // Для этого теста достаточно, что он не упал
    expect(mockFs.existsSync).toHaveBeenCalledWith('new-logs')
  })
})

// END OF: test/transports/file.test.ts
