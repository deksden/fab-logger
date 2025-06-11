/**
 * @file src/index.ts
 * @description Основной файл экспорта (barrel file) для пакета @fab33/fab-logger.
 * @version 1.0.3
 * @date 2025-06-11
 *
 * HISTORY:
 * v1.0.3 (2025-06-11): Исправлена ошибка линтера `eol-last`.
 * v1.0.2 (2025-06-11): Добавлено расширение .js для импорта.
 * v1.0.1 (2025-06-11): Удален экспорт метода `silent`, который был удален из TLogger.
 * v1.0.0 (2025-06-11): Начальная версия.
 */

import type { LogBindings, LogLevel, TLogger } from '@fab33/tlogger'
import { createLogger } from './logger.js'

// Основная публичная функция
export { createLogger }

// Пере-экспортируем ключевые типы для удобства потребителей
export type {
  TLogger,
  LogLevel,
  LogBindings
}

// END OF: src/index.ts
