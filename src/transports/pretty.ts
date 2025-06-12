/**
 * @file src/transports/pretty.ts
 * @description Транспорт для красивого вывода в консоль с помощью pino-pretty.
 * @version 1.0.3
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.3 (2025-06-12): Уточнен возвращаемый тип для level до LogLevel.
 * v1.0.2 (2025-06-12): Исправлены ошибки линтера (добавлен тип возвращаемого значения).
 * v1.0.1 (2025-06-12): Исправлена ошибка типизации (TS2322) при деструктуризации опций из TransportOptions.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import type pino from 'pino'
import pretty from 'pino-pretty'
import type { LogLevel, TransportOptions } from '@fab33/tlogger'

/**
 * Создает транспорт, использующий `pino-pretty` для форматирования.
 * @param {TransportOptions} [options={}] - Опции для pino-pretty.
 * @returns {{stream: pino.DestinationStream, level: LogLevel}} - Объект с потоком и уровнем лога.
 */
export default function createTransport (options: TransportOptions = {}): {
  stream: pino.DestinationStream,
  level: LogLevel
} {
  const {
    level = 'info',
    colorize = true,
    translateTime = 'SYS:standard',
    ignore = 'pid,hostname',
    singleLine = false,
    timestampKey = 'time',
    sync = false
  } = options

  const stream = pretty({
    colorize: colorize as boolean,
    translateTime: translateTime as string | boolean,
    ignore: ignore as string,
    singleLine: singleLine as boolean,
    timestampKey: timestampKey as string,
    sync: sync as boolean
  })

  return { stream, level: level as LogLevel }
}

// END OF: src/transports/pretty.ts
