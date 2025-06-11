/**
 * @file src/config.ts
 * @description Модуль конфигурации логгера - загрузка настроек и создание транспортов.
 * @version 1.0.3
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.3 (2025-06-11): Исправлена ошибка линтера `no-unused-vars`.
 * v1.0.2 (2025-06-11): Исправлены ошибки типов, `map().filter()` заменен на `reduce()`. Добавлены расширения .js в импорты.
 * v1.0.1 (2025-06-11): Исправлены ошибки типов.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import type { DestinationStream, TransportTargetOptions } from 'pino'
import pino from 'pino'
import pretty from 'pino-pretty'
import { createTransportError } from './errors.js'
import type { LogLevel } from '@fab33/tlogger'

const DEFAULT_APP_NAME = 'app'

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
}

export const dependencies = {
  pino,
  pretty,
  fs,
  path,
  env: process.env
}

export function setDependencies (newDependencies: Partial<typeof dependencies>): void {
  Object.assign(dependencies, newDependencies)
}

function loadAppInfo (): { name: string, version: string } {
  const { fs, path } = dependencies
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const packagePath = path.join(__dirname, '../package.json')
    const packageContent = fs.readFileSync(packagePath, 'utf-8')
    const { name, version } = JSON.parse(packageContent)
    return { name: name || DEFAULT_APP_NAME, version: version || '1.0.0' }
  } catch (_error: unknown) {
    return { name: DEFAULT_APP_NAME, version: '1.0.0' }
  }
}

export function processFilenameTemplate (template: string): string {
  if (!template) return 'app.log'
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0]
  const datetimeStr = `${dateStr}_${timeStr}`
  const appInfo = loadAppInfo()

  return template
    .replace(/{date}/g, dateStr)
    .replace(/{time}/g, timeStr)
    .replace(/{datetime}/g, datetimeStr)
    .replace(/{app_name}/g, appInfo.name)
    .replace(/{app_version}/g, appInfo.version)
    .replace(/{pid}/g, String(process.pid))
    .replace(/{hostname}/g, os.hostname())
}

function verifyLogDirectory (logFolder: string): boolean {
  const { fs } = dependencies
  try {
    if (!fs.existsSync(logFolder)) {
      fs.mkdirSync(logFolder, { recursive: true })
    }
    fs.accessSync(logFolder, fs.constants.W_OK)
    return true
  } catch (error: unknown) {
    console.error(
      `[FAB_LOGGER FATAL] Failed to access or create log directory: ${logFolder}.\n       Reason: ${(error as Error).message}\n       The file transport for this directory will be disabled.`
    )
    return false
  }
}

function getLevelValue (level: LogLevel): number {
  return LOG_LEVELS[level] || LOG_LEVELS.info
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTransportConfigs (env: Record<string, any>): any[] {
  const transportConfigs = []
  let transportIndex = 1
  while (env[`TRANSPORT${transportIndex}`]) {
    const prefix = `TRANSPORT${transportIndex}_`
    const type = env[`TRANSPORT${transportIndex}`].toLowerCase()
    const config: Record<string, unknown> = {
      type,
      level: env[`${prefix}LEVEL`] || 'info',
      enabled: env[`${prefix}ENABLED`] !== 'false',
      sync: env[`${prefix}SYNC`] === 'true'
    }
    if (type === 'console') {
      Object.assign(config, {
        colors: env[`${prefix}COLORS`] !== 'false',
        translateTime: env[`${prefix}TRANSLATE_TIME`] || 'SYS:standard',
        ignore: env[`${prefix}IGNORE`] || 'pid,hostname',
        singleLine: env[`${prefix}SINGLE_LINE`] === 'true',
        timestampKey: env[`${prefix}TIMESTAMP_KEY`] || 'time'
      })
    } else if (type === 'file') {
      Object.assign(config, {
        folder: env[`${prefix}FOLDER`] || 'logs',
        filename: env[`${prefix}FILENAME`] || '{app_name}.log',
        destination: env[`${prefix}DESTINATION`] || '',
        mkdir: env[`${prefix}MKDIR`] !== 'false',
        append: env[`${prefix}APPEND`] !== 'false',
        prettyPrint: env[`${prefix}PRETTY_PRINT`] === 'true',
        rotate: env[`${prefix}ROTATE`] === 'true',
        rotateMaxSize: parseInt(env[`${prefix}ROTATE_MAX_SIZE`], 10) || 10485760,
        rotateMaxFiles: parseInt(env[`${prefix}ROTATE_MAX_FILES`], 10) || 5,
        rotateCompress: env[`${prefix}ROTATE_COMPRESS`] === 'true'
      })
    }
    transportConfigs.push(config)
    transportIndex++
  }
  return transportConfigs
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPinoTransports (transportConfigs: any[]): { level: number, transport: DestinationStream } {
  const { pino, path } = dependencies
  const enabledTransports = transportConfigs.filter(t => t.enabled)

  const targets = enabledTransports.reduce<TransportTargetOptions[]>((acc, config) => {
    let target: TransportTargetOptions | null = null
    if (config.type === 'console') {
      target = {
        level: config.level,
        target: 'pino-pretty',
        options: {
          colorize: config.colors,
          translateTime: config.translateTime,
          ignore: config.ignore,
          singleLine: config.singleLine,
          timestampKey: config.timestampKey
        }
      }
    } else if (config.type === 'file') {
      let destination
      if (config.destination && /^\d+$/.test(config.destination)) {
        destination = parseInt(config.destination, 10)
      } else if (config.destination) {
        if (!verifyLogDirectory(path.dirname(config.destination))) return acc
        destination = config.destination
      } else {
        if (!verifyLogDirectory(config.folder)) return acc
        destination = path.join(config.folder, processFilenameTemplate(config.filename))
      }

      if (config.prettyPrint) {
        target = {
          level: config.level,
          target: 'pino-pretty',
          options: { destination, colorize: true, sync: config.sync }
        }
      } else {
        target = {
          level: config.level,
          target: 'pino/file',
          options: { destination, mkdir: config.mkdir, append: config.append, sync: config.sync }
        }
      }
    }

    if (target) {
      acc.push(target)
    }
    return acc
  }, [])

  if (targets.length === 0) {
    console.error('[FAB_LOGGER WARNING] All configured transports failed. Falling back to default console logger.')
    return {
      level: LOG_LEVELS.info,
      transport: pino.transport({
        targets: [{ level: 'info', target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }]
      })
    }
  }

  return {
    level: Math.min(...targets.map(t => getLevelValue(t.level as LogLevel))),
    transport: pino.transport({ targets, dedupe: false })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadConfig (env: Record<string, any>): Record<string, any> {
  return {
    logLevel: env.LOG_LEVEL || 'info',
    colorize: env.LOG_COLORIZE !== 'false',
    fileOutput: env.LOG_FILE_OUTPUT !== 'false',
    consoleOutput: env.LOG_CONSOLE_OUTPUT !== 'false',
    logFolder: env.LOG_FOLDER || 'logs',
    sync: env.LOG_SYNC === 'true',
    pretty: env.LOG_PRETTY === 'true',
    transportConfigs: parseTransportConfigs(env)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTransport (env: Record<string, any>): { level: number, transport: DestinationStream } {
  try {
    const { path } = dependencies
    const config = loadConfig(env)
    if (config.transportConfigs?.length > 0) {
      return createPinoTransports(config.transportConfigs)
    }
    const legacyTargets = []
    if (config.consoleOutput) {
      legacyTargets.push({
        level: config.logLevel,
        target: 'pino-pretty',
        options: { colorize: config.colorize, translateTime: 'SYS:standard', ignore: 'pid,hostname', sync: config.sync }
      })
    }
    if (config.fileOutput) {
      if (verifyLogDirectory(config.logFolder)) {
        legacyTargets.push({
          level: config.logLevel,
          target: 'pino/file',
          options: {
            destination: path.join(config.logFolder, `${loadAppInfo().name}.log`),
            mkdir: true,
            append: true,
            sync: config.sync
          }
        })
      }
    }
    return createPinoTransports(legacyTargets)
  } catch (error: unknown) {
    const err = error as Error
    throw createTransportError({ reason: err.message }, err)
  }
}

// END OF: src/config.ts
