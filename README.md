# @fab33/fab-logger :: (README.md)

[![npm version](https://badge.fury.io/js/%40fab33%2Ffab-logger.svg)](https://badge.fury.io/js/%40fab33%2Ffab-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Современная, типизированная и отказоустойчивая подсистема логирования для экосистемы `@fab33`.

Этот пакет является конкретной реализацией интерфейса `@fab33/tlogger` с использованием `pino` под капотом.

## 🎯 Ключевые Особенности

-   ✨ **Реализация `TLogger`**: Полностью соответствует абстрактному интерфейсу `@fab33/tlogger`.
-   🔌 **Гибкие транспорты**: Настройка вывода в консоль, файлы, `stdout`/`stderr` через переменные окружения.
-   🎨 **`pino-pretty`**: Встроенная поддержка для красивого и читаемого вывода в консоль.
-   🔍 **Фильтрация по `namespace`**: Использует переменную `DEBUG` для тонкой настройки вывода логов от разных модулей.
-   🔄 **Ротация логов**: Автоматическая ротация файлов по размеру.
-   ⚠️ **Современная обработка ошибок**: Интегрирован с `@fab33/fab-errors`.
-   🔒 **TypeScript First**: Полностью написан на TypeScript.

## 📚 Документация

Полная документация находится в файле [FAB-LOGGER.md](./FAB-LOGGER.md).

## 📥 Установка

```bash
npm install @fab33/fab-logger
```

## 🚀 Быстрый Старт

```typescript
import { createLogger } from '@fab33/fab-logger';
import type { TLogger } from '@fab33/tlogger';

// Создаем логгер с namespace
const logger: TLogger = createLogger('my-app:module');

// Логируем сообщения разных уровней
logger.info('Application started');
logger.debug({ userId: 123 }, 'Processing user request');

try {
  throw new Error('Something failed');
} catch (err) {
  // `err` должен быть объектом Error для корректной обработки
  const cause = err instanceof Error ? err : new Error(String(err));
  logger.error(cause, 'Operation failed');
}

// Создание дочернего логгера
const childLogger = logger.child({ requestId: 'abc-123' });
childLogger.info('Handling request');
```
## 📜 Лицензия

MIT © [fab33 (deksden)](https://github.com/deksden)
