/**
 * @file test/rotate.test.ts
 * @version 1.0.3
 * @description Тесты модуля ротации и архивирования лог файлов.
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.3 (2025-06-11): Исправлена ошибка типизации (TS2339) для `err.cause` в тесте очистки.
 * v1.0.2 (2025-06-11): Исправлены импорты и типы для Vitest.
 * v1.0.1 (2025-06-11): Исправлены импорты.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import path from 'path'
import { FabError } from '@fab33/fab-errors'
import { CLEANUP_FAILED_SPEC, ROTATE_FAILED_SPEC } from '../src/errors.js'
import { createLogger } from '../src/logger.js'
import {
  checkAndRotate,
  cleanupOldArchives,
  dependencies as rotateDeps,
  type RotateConfig,
  setDependencies
} from '../src/rotate.js'

const testLogger = createLogger('test:logger:rotate')

describe('(rotate.ts) Модуль ротации и архивирования', () => {
  const origDeps = { ...rotateDeps }
  const testLogPath = '/logs/test.log'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFs: any

  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))

    mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
      statSync: vi.fn().mockReturnValue({ size: 1000 }),
      promises: {
        readdir: vi.fn().mockResolvedValue([]),
        rename: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        unlink: vi.fn().mockResolvedValue(undefined)
      }
    }

    setDependencies({
      fs: mockFs,
      path,
      env: {},
      logger: testLogger
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    setDependencies(origDeps)
    vi.clearAllMocks()
  })

  describe('checkAndRotate()', () => {
    const config: RotateConfig = { logFolder: '/logs', maxSize: 1024, maxFiles: 5, compress: false }

    test('пропускает файлы меньше лимита', async () => {
      mockFs.existsSync.mockReturnValue(true)
      const result = await checkAndRotate(testLogPath, config)
      expect(result).toBe(false)
      expect(mockFs.promises.rename).not.toHaveBeenCalled()
    })

    test('выполняет ротацию при превышении размера', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.statSync.mockReturnValue({ size: 2048 })
      const result = await checkAndRotate(testLogPath, config)
      expect(result).toBe(true)
      const archivePath = `${testLogPath}.2024-01-01T12-00-00-000Z`
      expect(mockFs.promises.rename).toHaveBeenCalledWith(testLogPath, archivePath)
    })

    test('ошибка при ротации', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.statSync.mockReturnValue({ size: 2048 })
      const renameError = new Error('Rename failed')
      mockFs.promises.rename.mockRejectedValue(renameError)

      await expect(checkAndRotate(testLogPath, config)).rejects.toThrowError()
      try {
        await checkAndRotate(testLogPath, config)
      } catch (e) {
        const err = e as FabError
        expect(err).toBeInstanceOf(FabError)
        expect(err.code).toBe(ROTATE_FAILED_SPEC.code)
        expect(err.cause).toBe(renameError)
      }
    })
  })

  describe('cleanupOldArchives()', () => {
    const config: RotateConfig = { logFolder: '/logs', maxFiles: 2, maxSize: 1024, compress: false }

    test('удаляет архивы сверх лимита', async () => {
      const archiveFiles = [
        'test.log.2024-01-01T12-00-00-000Z',
        'test.log.2024-01-01T11-00-00-000Z',
        'test.log.2024-01-01T10-00-00-000Z'
      ]
      mockFs.promises.readdir.mockResolvedValue(archiveFiles)
      const deleted = await cleanupOldArchives('/logs', config)
      expect(deleted).toHaveLength(1)
      expect(mockFs.promises.unlink).toHaveBeenCalledTimes(1)
      expect(deleted[0]).toContain('T10-00-00')
    })

    test('ошибка при очистке', async () => {
      mockFs.promises.readdir.mockRejectedValue(new Error('Readdir failed'))
      try {
        await cleanupOldArchives('/logs', config)
      } catch (e) {
        const err = e as FabError
        expect(err).toBeInstanceOf(FabError)
        expect(err.code).toBe(CLEANUP_FAILED_SPEC.code)
        expect((err.cause as Error).message).toBe('Readdir failed')
      }
    })
  })
})
