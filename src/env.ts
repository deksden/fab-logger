/**
 * @file src/env.ts
 * @description "Умная" обертка для createLogger, которая читает process.env и динамически загружает транспорты.
 * @version 1.0.2
 * @date 2025-06-12
 *
 * HISTORY:
 * v1.0.2 (2025-06-12): Добавлена обработка 'console' как alias для 'pretty'. Добавлен await для fallback транспорта.
 * v1.0.1 (2025-06-12): Исправлена проблема с динамическими импортами в Vite путем замены на switch-case.
 * v1.0.0 (2025-06-12): Начальная версия.
 */

import { createLogger as createCleanLogger } from './logger.js'
import { loadConfig } from './config.js'
import type { PinoTransport, TLogger } from '@fab33/tlogger'

// Внутренний отладчик
const debugLog = (message: string, ...args: unknown[]): void => {
  if (process.env.DEBUG_LOGGER === 'true' || process.env.DEBUG_LOGGER === '*') {
    console.log(`[FAB_LOGGER_DEBUG:env] ${message}`, ...args)
  }
}

/**
 * Создает и конфигурирует экземпляр логгера на основе переменных окружения.
 * Эта функция является асинхронной, так как динамически загружает модули транспортов.
 * @param {string} [namespace] - Неймспейс для данного экземпляра логгера.
 * @returns {Promise<TLogger>} Промис, который разрешается в экземпляр логгера.
 */
export async function createLogger (namespace?: string): Promise<TLogger> {
  debugLog(`Creating logger for namespace "${namespace}" from environment config.`)
  const config = loadConfig(process.env)
  const pinoTransports: PinoTransport[] = []

  for (const transportConfig of config.transportsConfig || []) {
    try {
      debugLog(`Attempting to load transport module for type: "${transportConfig.type}"`)
      let transportModule

      // Используем switch-case, чтобы Vite мог статически анализировать пути импортов
      switch (transportConfig.type) {
        case 'console': // Легаси-тип, мапим на pretty
        case 'pretty':
          transportModule = await import('./transports/pretty.js')
          break
        case 'file':
          transportModule = await import('./transports/file.js')
          break
        case 'console-simple':
          transportModule = await import('./transports/console-simple.js')
          break
        default:
          throw new Error(`Unknown transport type: "${transportConfig.type}"`)
      }

      const createTransport = transportModule.default

      if (typeof createTransport === 'function') {
        // createTransport может быть async, поэтому await
        const pinoTransport = await createTransport(transportConfig)
        pinoTransports.push(pinoTransport)
        debugLog(`Successfully created transport of type: "${transportConfig.type}"`)
      } else {
        console.error(`[FAB_LOGGER_ERROR] Module for transport type "${transportConfig.type}" does not have a default export function.`)
      }
    } catch (error) {
      console.error(`[FAB_LOGGER_ERROR] Failed to load or create transport of type "${transportConfig.type}". Is the corresponding module installed?`, error)
    }
  }

  if (pinoTransports.length === 0) {
    debugLog('No transports were created. Attempting to create a fallback console-simple transport.')
    try {
      const { default: createConsoleSimpleTransport } = await import('./transports/console-simple.js')
      const transport = await createConsoleSimpleTransport({ level: config.logLevel })
      pinoTransports.push(transport)
    } catch (fallbackError) {
      console.error('[FAB_LOGGER_FATAL] Failed to create even the fallback console-simple transport. Logging will be disabled.', fallbackError)
    }
  }

  return createCleanLogger(namespace, {
    ...config,
    transports: pinoTransports
  })
}

// END OF: src/env.ts
