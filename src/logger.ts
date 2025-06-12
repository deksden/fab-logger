/**
 * @file src/logger.ts
 * @description Ядро логгера. "Чистая" функция для создания инстанса логгера.
 * @version 2.0.5
 * @date 2025-06-12
 *
 * HISTORY:
 * v2.0.5 (2025-06-12): Исправлены ошибки линтера (удалена неиспользуемая функция, исправлены кавычки и подавлены предупреждения any).
 * v2.0.4 (2025-06-12): Исправлена логика установки уровня для одного stream-транспорта.
 * v2.0.3 (2025-06-12): Экспортирован loggerCache для возможности его очистки в тестах.
 * v2.0.2 (2025-06-12): Исправлена логика в isNamespaceEnabled. Теперь логгер включен по умолчанию, если debugString не передан.
 * v2.0.1 (2025-06-12): Исправлены ошибки типизации (TS2339, TS2345, TS2769) при работе с pino и union-типом PinoTransport.
 * v2.0.0 (2025-06-12): BREAKING CHANGE. Полный рефакторинг. createLogger теперь "чистая" и синхронная, принимает готовые транспорты.
 * v1.1.1 (2025-06-12): Исправлен вызов конструктора pino и ошибка типа null.
 */

import pino from 'pino'
import type { LoggerOptions, LogLevel, PinoTransport, TLogger } from '@fab33/tlogger'

// Внутренний отладчик для самого логгера
const debugLog = (message: string, ...args: unknown[]): void => {
  if (process.env.DEBUG_LOGGER === 'true' || process.env.DEBUG_LOGGER === '*') {
    console.log(`[FAB_LOGGER_DEBUG] ${message}`, ...args)
  }
}

// Глобальный кеш для инстансов логгера, чтобы не создавать их повторно с тем же конфигом
// Экспортирован для возможности очистки в тестах
export const loggerCache = new Map<string, pino.Logger>()

function isNamespaceEnabled (namespace: string | undefined, debugString: string | undefined): boolean {
  // Если debugString не предоставлен, все неймспейсы считаются включенными.
  if (debugString === undefined) return true
  if (debugString === '*') return true

  const patterns = debugString.split(',').map(p => p.trim()).filter(Boolean)
  const skips = patterns.filter(p => p.startsWith('-')).map(p => p.substring(1).replace(/\*/g, '.*'))
  const names = patterns.filter(p => !p.startsWith('-')).map(p => p.replace(/\*/g, '.*'))

  if (!namespace) {
    return names.some(p => p === '.*') && !skips.some(s => s === '.*')
  }

  if (skips.some(p => new RegExp(`^${p}$`).test(namespace))) return false
  return names.some(p => new RegExp(`^${p}$`).test(namespace))
}

function _wrapPinoInstance (pinoInstance: pino.Logger, namespace: string | undefined, debugString: string | undefined): TLogger {
  const wrapper: Partial<TLogger> = {}
  const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

  logLevels.forEach(level => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wrapper as any)[level] = (...args: any[]) => {
      if (!isNamespaceEnabled(namespace, debugString)) return
      const pinoMethod = pinoInstance[level]
      // Pino сам разбирает, что ему передали: ошибку, объект или просто строку.
      // Используем apply для сохранения контекста pinoInstance.
      // Кастуем args, чтобы TypeScript не ругался на потенциально пустой массив.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pinoMethod.apply(pinoInstance, args as [any, ...any[]])
    }
  })

  wrapper.child = (bindings) => _wrapPinoInstance(pinoInstance.child(bindings), namespace, debugString)
  wrapper.bindings = () => pinoInstance.bindings()
  wrapper.isLevelEnabled = (levelName) => isNamespaceEnabled(namespace, debugString) && pinoInstance.isLevelEnabled(levelName)
  Object.defineProperty(wrapper, 'level', {
    get: () => pinoInstance.level as LogLevel,
    set: (newLevel: LogLevel) => { pinoInstance.level = newLevel },
    enumerable: true,
    configurable: true
  })

  return wrapper as TLogger
}

/**
 * Создает экземпляр логгера на основе предоставленной конфигурации.
 * Эта функция является "чистой" и не имеет сайд-эффектов (не читает process.env).
 * @param {LoggerOptions} [options={}] - Опции для конфигурации логгера.
 * @param {string} [namespace] - Неймспейс для данного экземпляра логгера.
 * @returns {TLogger} Экземпляр логгера.
 */
export function createLogger (namespace?: string, options: LoggerOptions = {}): TLogger {
  const { transports = [], logLevel = 'info', debugString } = options

  // Создаем ключ для кеширования на основе конфигурации
  const cacheKey = JSON.stringify({ transports, logLevel })
  let baseLogger = loggerCache.get(cacheKey)

  if (!baseLogger) {
    debugLog('Creating new pino instance for config:', {
      logLevel,
      transports: transports.map(t => ('target' in t ? t.target : 'stream'))
    })

    const pinoOptions: pino.LoggerOptions = {
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime
    }

    const pinoTransports: PinoTransport[] = transports.filter(t => t.level === undefined || pino.levels.values[t.level] >= pino.levels.values[logLevel])

    // Используем type guard ('stream' in transport) для сужения типа
    if (pinoTransports.length === 1 && 'stream' in pinoTransports[0]) {
      const transport = pinoTransports[0]
      const transportLevelValue = transport.level ? pino.levels.values[transport.level] : 0
      const globalLevelValue = pino.levels.values[logLevel]

      // Выбираем более строгий (с большим числовым значением) уровень между глобальным и уровнем транспорта
      const finalLevel = transportLevelValue > globalLevelValue ? transport.level : logLevel
      const finalPinoOptions = { ...pinoOptions, level: finalLevel }

      // Оптимизация для одного стрима (например, console-simple или pretty)
      baseLogger = pino.pino(finalPinoOptions, transport.stream)
    } else if (pinoTransports.length > 0) {
      // pino.transport ожидает только транспорты с `target`.
      // Фильтруем массив и используем type guard, чтобы TypeScript был уверен в их типе.
      const targetBasedTransports = pinoTransports.filter(
        (t): t is { target: string; options: Record<string, unknown>; level?: LogLevel } => 'target' in t
      )

      if (targetBasedTransports.length > 0) {
        baseLogger = pino.pino({
          ...pinoOptions,
          transport: {
            targets: targetBasedTransports
          }
        })
      }
    }

    if (!baseLogger) {
      // Fallback, если транспорты не предоставлены или отфильтрованы (например, были только stream-транспорты, но больше одного)
      debugLog('No valid transports provided or suitable configuration found, falling back to silent logger.')
      baseLogger = pino.pino({ ...pinoOptions, level: 'silent' })
    }
    loggerCache.set(cacheKey, baseLogger)
  } else {
    debugLog('Using cached pino instance.')
  }

  const pinoInstance = namespace ? baseLogger.child({ namespace }) : baseLogger
  return _wrapPinoInstance(pinoInstance, namespace, debugString)
}

// END OF: src/logger.ts
