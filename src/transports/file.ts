/**
 * @file src/transports/file.ts
 * @description Транспорт для записи логов в файл.
 * @version 1.0.3
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.3 (2025-06-12): Уточнен возвращаемый тип для options и level.
 * v1.0.2 (2025-06-12): Исправлены ошибки линтера (удален неиспользуемый код, исправлены импорты, добавлен тип возвращаемого значения).
 * v1.0.1 (2025-06-12): Исправлены ошибки типизации (TS2322, TS2345) при работе с опциями из TransportOptions.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import type { LogLevel, TransportOptions } from '@fab33/tlogger'
import type * as fsType from 'fs'
import type * as pathType from 'path'

// Динамический импорт для изоморфности
let fs: typeof fsType
let path: typeof pathType

// Внутренний отладчик
const debugLog = (message: string, ...args: unknown[]): void => {
  if (process.env.DEBUG_LOGGER === 'true' || process.env.DEBUG_LOGGER === '*') {
    console.log(`[FAB_LOGGER_DEBUG:file-transport] ${message}`, ...args)
  }
}

async function importDeps (): Promise<void> {
  if (!fs) {
    fs = (await import('fs')).default
    path = (await import('path')).default
    debugLog('Node.js dependencies (fs, path) imported dynamically.')
  }
}

function verifyLogDirectory (logFolder: string): void {
  // В реальной реализации здесь будет логика создания директории
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder, { recursive: true })
  }
}

/**
 * Создает транспорт для записи в файл.
 * @param {TransportOptions} options - Опции для файлового транспорта.
 * @returns {Promise<{target: string, options: object, level: LogLevel}>} - Объект конфигурации для pino.transport.
 */
export default async function createTransport (options: TransportOptions): Promise<{
  target: string
  options: {
    destination: string | number
    mkdir: boolean
    append: boolean
  }
  level: LogLevel
}> {
  await importDeps()

  const {
    level = 'info',
    folder = 'logs',
    filename = 'app.log',
    destination,
    mkdir = true,
    append = true
  } = options

  let finalDestination: string | number
  if (destination) {
    const destStr = String(destination)
    finalDestination = /^\d+$/.test(destStr) ? parseInt(destStr, 10) : destStr
  } else {
    // В реальной реализации здесь будет логика processFilenameTemplate и loadAppInfo
    const logFolder = String(folder)
    const logFilename = String(filename)
    const logPath = path.join(logFolder, logFilename)
    if (mkdir) {
      verifyLogDirectory(path.dirname(logPath))
    }
    finalDestination = logPath
  }

  debugLog(`File transport configured for destination: ${finalDestination}`)

  return {
    target: 'pino/file',
    options: {
      destination: finalDestination,
      mkdir: mkdir as boolean,
      append: append as boolean
    },
    level: level as LogLevel
  }
}

// END OF: src/transports/file.ts
