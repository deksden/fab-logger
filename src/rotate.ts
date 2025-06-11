/**
 * @file src/rotate.ts
 * @description Модуль управления ротацией и архивированием лог файлов.
 * @version 1.0.2
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.2 (2025-06-11): Исправлены пути импортов с добавлением расширения .js.
 * v1.0.1 (2025-06-11): Исправлены пути импортов.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import fs from 'fs'
import path from 'path'
import { createLogger } from './logger.js'
import { createCleanupError, createRotateError } from './errors.js'
import type { TLogger } from '@fab33/tlogger'

const logger: TLogger = createLogger('fab-logger:rotate')

export interface RotateConfig {
  logFolder: string
  maxSize: number
  maxFiles: number
  compress: boolean
}

export const dependencies = {
  fs,
  path,
  env: process.env,
  logger
}

export function setDependencies (newDependencies: Partial<typeof dependencies>): void {
  Object.assign(dependencies, newDependencies)
}

export async function checkAndRotate (filePath: string, config: RotateConfig): Promise<boolean> {
  const { fs } = dependencies
  try {
    if (!fs.existsSync(filePath)) {
      return false
    }
    const stats = fs.statSync(filePath)
    if (stats.size < config.maxSize) {
      return false
    }
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')
    const archivePath = `${filePath}.${timestamp}`
    await fs.promises.rename(filePath, archivePath)
    await fs.promises.writeFile(filePath, '')
    await cleanupOldArchives(config.logFolder, config)
    return true
  } catch (error: unknown) {
    const err = error as Error
    throw createRotateError({ path: filePath, reason: err.message }, err)
  }
}

export async function cleanupOldArchives (logFolder: string, config: RotateConfig): Promise<string[]> {
  const { fs, path } = dependencies
  try {
    const files = await fs.promises.readdir(logFolder)
    const archives = files
      .filter(file => /\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*Z$/.test(file))
      .map(file => ({
        name: file,
        path: path.join(logFolder, file),
        timestamp: new Date(file.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*Z/)![0].replace(/-/g, ':'))
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const deleted: string[] = []
    if (archives.length > config.maxFiles) {
      const toDelete = archives.slice(config.maxFiles)
      for (const archive of toDelete) {
        await fs.promises.unlink(archive.path)
        deleted.push(archive.path)
      }
    }
    return deleted
  } catch (error: unknown) {
    const err = error as Error
    throw createCleanupError({ reason: err.message }, err)
  }
}

// END OF: src/rotate.ts
