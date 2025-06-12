/**
 * @file src/index.ts
 * @description Основной файл экспорта (barrel file) для пакета @fab33/fab-logger.
 * @version 2.0.0
 * @date 2025-06-12
 *
 * HISTORY:
 * v2.0.0 (2025-06-12): BREAKING CHANGE. Экспортирует "чистую" версию createLogger. "Грязная" версия вынесена в /env.
 * v1.1.0 (2025-06-11): Добавлено расширение .js для импорта.
 * v1.0.3 (2025-06-11): Исправлена ошибка линтера `eol-last`.
 */

import { createLogger } from './logger.js'

// Основная публичная ("чистая") функция
export { createLogger }

// Пере-экспортируем ключевые типы для удобства потребителей
export type {
  TLogger,
  LogLevel,
  LogBindings,
  LoggerOptions,
  TransportOptions,
  PinoTransport
} from '@fab33/tlogger'

// END OF: src/index.ts
