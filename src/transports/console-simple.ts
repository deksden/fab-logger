/**
 * @file src/transports/console-simple.ts
 * @description Простой транспорт для вывода в консоль без зависимостей.
 * @version 1.0.2
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.2 (2025-06-12): Уточнен возвращаемый тип для level до LogLevel.
 * v1.0.1 (2025-06-12): Исправлены ошибки линтера (добавлен тип возвращаемого значения, исправлена неиспользуемая переменная).
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import { Writable } from 'stream'
import type { LogLevel, TransportOptions } from '@fab33/tlogger'

const LEVEL_COLORS: Record<LogLevel, string> = {
  fatal: '\x1b[31m', // red
  error: '\x1b[31m',
  warn: '\x1b[33m', // yellow
  info: '\x1b[32m', // green
  debug: '\x1b[34m', // blue
  trace: '\x1b[90m' // grey
}
const RESET_COLOR = '\x1b[0m'

/**
 * Создает простой транспорт, который выводит логи в консоль.
 * Не использует `pino-pretty` и не имеет внешних зависимостей.
 * @param {TransportOptions} [options={}] - Опции для транспорта.
 * @returns {{stream: Writable, level: LogLevel}} - Объект с потоком и уровнем лога.
 */
export default function createTransport (options: TransportOptions = {}): { stream: Writable, level: LogLevel } {
  const { level = 'info' } = options

  const stream = new Writable({
    write (chunk, encoding, callback) {
      try {
        const logObject = JSON.parse(chunk.toString())
        const { time, level: logLvl, msg, namespace, err, ...rest } = logObject
        const levelStr = (pino.levels.labels[logLvl] || 'info').toUpperCase()
        const color = LEVEL_COLORS[levelStr.toLowerCase() as LogLevel] || RESET_COLOR

        let output = `${color}[${new Date(time).toISOString()}] ${levelStr}${RESET_COLOR}`
        if (namespace) {
          output += ` (${namespace})`
        }
        output += `: ${msg}`

        if (err) {
          output += `\n${color}Error: ${err.message}${RESET_COLOR}`
          if (err.stack) {
            output += `\n${err.stack}`
          }
        }

        const restKeys = Object.keys(rest)
        if (restKeys.length > 0) {
          output += `\n${JSON.stringify(rest, null, 2)}`
        }

        console.log(output)
        callback()
      } catch (_e) {
        // Если парсинг не удался, просто выводим как есть
        console.log(chunk.toString())
        callback()
      }
    }
  })

  return { stream, level: level as LogLevel }
}

// Декларация pino для Writable
declare const pino: { levels: { labels: Record<string, string> } }

// END OF: src/transports/console-simple.ts
