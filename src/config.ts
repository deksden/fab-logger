/**
 * @file src/config.ts
 * @description Модуль для парсинга конфигурации логгера из переменных окружения.
 * @version 2.0.2
 * @date 2025-06-12
 *
 * HISTORY:
 * v2.0.2 (2025-06-12): Исправлена ошибка линтера 'no-undef' для NodeJS.ProcessEnv.
 * v2.0.1 (2025-06-12): Исправлена ошибка типизации (TS2322) при сборке transportsConfig.
 * v2.0.0 (2025-06-12): BREAKING CHANGE. Модуль теперь только парсит env и не создает транспорты.
 * v1.1.0 (2025-06-12): Добавлен специальный 'console-inline' транспорт.
 */

import type { LoggerOptions, LogLevel, TransportOptions } from '@fab33/tlogger'

// Внутренний отладчик
const debugLog = (message: string, ...args: unknown[]): void => {
  if (process.env.DEBUG_LOGGER === 'true' || process.env.DEBUG_LOGGER === '*') {
    console.log(`[FAB_LOGGER_DEBUG:config] ${message}`, ...args)
  }
}

/**
 * Парсит переменные окружения и возвращает объект конфигурации для логгера.
 * @param {typeof process.env} env - Объект с переменными окружения.
 * @returns {LoggerOptions} Сконфигурированные опции для `createLogger`.
 */
export function loadConfig (env: typeof process.env): LoggerOptions {
  debugLog('Loading configuration from environment variables...')

  const transportsConfig: Array<TransportOptions & { type: string }> = []
  let transportIndex = 1
  while (env[`TRANSPORT${transportIndex}`]) {
    const prefix = `TRANSPORT${transportIndex}_`
    const type = (env[`TRANSPORT${transportIndex}`] || '').toLowerCase()
    if (!type) {
      transportIndex++
      continue
    }

    debugLog(`Found transport config for TRANSPORT${transportIndex} of type "${type}"`)

    const config: TransportOptions & { type: string } = {
      type,
      level: (env[`${prefix}LEVEL`] as LogLevel) || 'info',
      enabled: env[`${prefix}ENABLED`] !== 'false'
    }

    // Собираем все остальные опции для данного транспорта
    Object.keys(env)
      .filter(key => key.startsWith(prefix))
      .forEach(key => {
        const optionName = key.substring(prefix.length).toLowerCase()
        if (optionName !== 'level' && optionName !== 'enabled') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let value: any = env[key]
          if (value === 'true') value = true
          else if (value === 'false') value = false
          else if (/^\d+$/.test(value)) value = parseInt(value, 10)
          config[optionName] = value
        }
      })

    if (config.enabled) {
      transportsConfig.push(config)
    } else {
      debugLog(`Transport ${transportIndex} is disabled.`)
    }

    transportIndex++
  }

  // Обработка легаси-переменных, если нет `TRANSPORT`
  if (transportsConfig.length === 0) {
    debugLog('No TRANSPORT variables found, checking for legacy settings.')
    if (env.LOG_CONSOLE_OUTPUT !== 'false') {
      transportsConfig.push({ type: 'console', level: (env.LOG_LEVEL as LogLevel) || 'info' })
    }
    if (env.LOG_FILE_OUTPUT === 'true') {
      transportsConfig.push({
        type: 'file',
        level: (env.LOG_LEVEL as LogLevel) || 'info',
        folder: env.LOG_FOLDER || 'logs'
      })
    }
  }

  const options: LoggerOptions = {
    logLevel: (env.LOG_LEVEL as LogLevel) || 'info',
    debugString: env.DEBUG || '*',
    transportsConfig
  }

  debugLog('Configuration loaded:', options)
  return options
}

// END OF: src/config.ts
