/**
 * @file src/logger.ts
 * @description Основной модуль для создания логгеров с фильтрацией по namespace.
 * @version 1.1.1
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.1.1 (2025-06-12): Исправлен вызов конструктора pino (pino -> pino.pino) и ошибка типа null для baseLogger.
 * v1.1.0 (2025-06-12): Добавлена поддержка `console-inline` транспорта через `stream`.
 * v1.0.5 (2025-06-11): Исправлена ошибка TS2305 путем замены типа `ProcessEnv` на `typeof process.env`.
 * v1.0.4 (2025-06-11): Исправлены ошибки линтера (`no-undef`, `no-explicit-any`).
 * v1.0.3 (2025-06-11): Исправлены ошибки типизации (TS2556, TS2349, TS2322) для совместимости с `pino@9+` и строгим `tsc`.
 * v1.0.2 (2025-06-11): Исправлены ошибки типизации и логики. Удален метод silent(). Добавлены расширения .js в импорты.
 * v1.0.1 (2025-06-11): Исправлены ошибки типизации и логики.
 * v1.0.0 (2025-06-11): Начальная версия на TypeScript.
 */

import pino from 'pino'
import 'pino-pretty'
import type { LogLevel, TLogger } from '@fab33/tlogger'
import { createTransport } from './config.js'
import { createTransportError } from './errors.js'

export const dependencies = {
  env: process.env,
  pino,
  baseLogger: null as pino.Logger | null,
  createTransport,
  Date
}

export function setDependencies (newDependencies: Partial<typeof dependencies>): void {
  if (dependencies.env !== newDependencies.env) {
    dependencies.baseLogger = null
  }
  Object.assign(dependencies, newDependencies)
}

function getLevelName (level: number): LogLevel {
  const levelNames = Object.entries(pino.levels.values).reduce((acc, [key, value]) => {
    acc[value] = key as LogLevel
    return acc
  }, {} as Record<number, LogLevel>)
  return levelNames[level] || 'info'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prepareValueForLogging (value: any, depth = 8, maxStringLength = 0, truncationMarker = '...'): any {
  if (typeof value === 'string' && maxStringLength > 0 && value.length > maxStringLength) {
    return value.substring(0, maxStringLength) + truncationMarker
  }
  if (value instanceof Map) {
    if (depth <= 0) return '[Max Map Depth Reached]'
    const obj: Record<string, unknown> = {}
    for (const [k, v] of value.entries()) {
      obj[String(k)] = prepareValueForLogging(v, depth - 1, maxStringLength, truncationMarker)
    }
    return obj
  }
  if (Array.isArray(value)) {
    return value.map(item => prepareValueForLogging(item, depth, maxStringLength, truncationMarker))
  }
  if (value && typeof value === 'object' && !(value instanceof Error) && Object.getPrototypeOf(value) === Object.prototype) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = prepareValueForLogging(v, depth, maxStringLength, truncationMarker)
    }
    return result
  }
  return value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapLogMethod (pinoInstance: pino.Logger, method: LogLevel): (...args: any[]) => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]): void {
    if (args.length === 0) return

    const maxDepth = parseInt(dependencies.env.LOG_MAX_DEPTH ?? '8', 10)
    const maxStringLength = parseInt(dependencies.env.LOG_MAX_STRING_LENGTH ?? '0', 10)
    const truncationMarker = dependencies.env.LOG_TRUNCATION_MARKER ?? '...'
    const firstArg = args[0]

    if (firstArg instanceof Error) {
      return pinoInstance[method]({ err: firstArg })
    }

    const convertedArgs = args.map((arg) => {
      if (arg instanceof Error) return arg
      if (typeof arg === 'object' && arg !== null) {
        return prepareValueForLogging(arg, maxDepth, maxStringLength, truncationMarker)
      }
      if (typeof arg === 'string' && maxStringLength > 0 && arg.length > maxStringLength) {
        return arg.substring(0, maxStringLength) + truncationMarker
      }
      return arg
    })

    const firstConvertedArg = convertedArgs[0]
    if (typeof firstConvertedArg === 'object' && firstConvertedArg !== null) {
      const { err: potentialError, ...rest } = firstConvertedArg
      if (potentialError instanceof Error) {
        return pinoInstance[method]({
          ...rest,
          err: {
            message: potentialError.message,
            stack: potentialError.stack,
            type: potentialError.constructor.name,
            code: (potentialError as { code?: string }).code
          }
        }, ...convertedArgs.slice(1))
      }
      pinoInstance[method](firstConvertedArg, ...convertedArgs.slice(1))
    } else {
      pinoInstance[method](firstConvertedArg, ...convertedArgs.slice(1))
    }
  }
}

function patternToRegExp (pattern: string): RegExp {
  if (pattern === '*') return /^.*$/
  const escaped = pattern.replace(/[\\^$.*+?()[\]{}|:]/g, '\\$&')
  const regexString = '^' + (escaped.endsWith('\\*') ? escaped.slice(0, -2) + '.*' : escaped) + '$'
  return new RegExp(regexString.replace(/\\\*/g, '.*'))
}

function isNamespaceEnabled (namespace?: string): boolean {
  const debug = dependencies.env.DEBUG
  if (debug === undefined || debug === null) return !namespace
  const trimmedDebug = debug.trim()
  if (trimmedDebug === '') return !namespace

  const patterns = trimmedDebug.split(',').map(p => p.trim()).filter(Boolean)
  const skips = patterns.filter(p => p.startsWith('-')).map(p => p.substring(1))
  const names = patterns.filter(p => !p.startsWith('-'))

  if (!namespace) return names.includes('*') && !skips.includes('*')

  if (skips.some(p => patternToRegExp(p).test(namespace))) return false
  return names.some(p => patternToRegExp(p).test(namespace))
}

function _wrapPinoInstance (pinoInstance: pino.Logger, namespace?: string): TLogger {
  const wrapper: Partial<TLogger> = {}
  const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

  logLevels.forEach(level => {
    if (pinoInstance[level]) {
      const wrappedLogFn = wrapLogMethod(pinoInstance, level)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wrapper[level] = ((...args: any[]) => {
        if (!isNamespaceEnabled(namespace)) return
        return wrappedLogFn(...args)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    }
  })

  wrapper.child = (bindings) => _wrapPinoInstance(pinoInstance.child(bindings), namespace)
  wrapper.bindings = () => pinoInstance.bindings()
  wrapper.isLevelEnabled = (levelName) => isNamespaceEnabled(namespace) && pinoInstance.isLevelEnabled(levelName)
  Object.defineProperty(wrapper, 'level', {
    get: () => pinoInstance.level as LogLevel,
    set: (newLevel: LogLevel) => { pinoInstance.level = newLevel },
    enumerable: true,
    configurable: true
  })

  return wrapper as TLogger
}

function initializeBaseLogger (env: typeof process.env): pino.Logger {
  if (dependencies.baseLogger) return dependencies.baseLogger
  try {
    const { pino, createTransport } = dependencies
    const transportOrStreamConfig = createTransport(env)
    const options: pino.LoggerOptions = {
      timestamp: true,
      level: getLevelName(transportOrStreamConfig.level)
    }

    if (transportOrStreamConfig.stream) {
      dependencies.baseLogger = pino.pino(options, transportOrStreamConfig.stream)
      return dependencies.baseLogger
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pinoInstance = (pino as any)(options, transportOrStreamConfig.transport)
    if (!pinoInstance) throw new Error('pino() returned null or undefined')
    dependencies.baseLogger = pinoInstance
    return dependencies.baseLogger!
  } catch (error: unknown) {
    const err = error as Error
    throw createTransportError({ reason: `Failed to initialize base logger: ${err.message}` }, err)
  }
}

export function createLogger (namespace?: string): TLogger {
  try {
    const basePinoLogger = initializeBaseLogger(dependencies.env)
    const pinoInstance = namespace ? basePinoLogger.child({ namespace }) : basePinoLogger
    return _wrapPinoInstance(pinoInstance, namespace)
  } catch (error) {
    console.error(`[FAB_LOGGER FATAL ERROR] Logger creation failed for namespace "${namespace}":`, error)
    throw error
  }
}

// END OF: src/logger.ts
