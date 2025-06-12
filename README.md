# @fab33/fab-logger :: Подсистема логирования (FAB-LOGGER.md, v2.0.0)

*   **HISTORY:**
    *   v2.0.0 (2025-06-12): BREAKING CHANGE. Переход на плагинную архитектуру с "чистым" ядром и опциональными транспортами.
    *   v1.1.1 (2025-06-12): Документирован новый тип транспорта `console-inline`.
    *   v1.1.0 (2025-06-12): Добавлен транспорт `console-inline` для совместимости со средами без поддержки воркеров (Next.js RSC).
    *   v1.0.0 (2025-06-11): Полное переписывание документации после миграции на TypeScript, `fab-errors` и `tlogger`.

## 🎯 1. Введение

`@fab33/fab-logger` v2.0.0 — это полностью переработанная, современная и универсальная подсистема логирования. В основе новой версии лежит плагинная архитектура, которая обеспечивает максимальную гибкость и совместимость с различными средами выполнения, включая Node.js, Next.js (RSC), Edge-функции и другие.

**Ключевые особенности v2.0.0:**

-   ✨ **Чистое ядро**: Основной пакет `@fab33/fab-logger` является полностью изоморфным и не имеет зависимостей от Node.js API.
-   🔌 **Плагины-транспорты**: Функциональность вывода логов (в консоль, файлы) вынесена в опциональные модули, подключаемые через суб-экспорты.
-   🚀 **Умная `env`-обертка**: Для удобства и обратной совместимости предоставляется асинхронная обертка, которая автоматически конфигурирует логгер на основе переменных окружения.
-   🔧 **Отладка**: Встроенный механизм отладки самого логгера через переменную `DEBUG_LOGGER`.
-   🔒 **Типизация и надежность**: Пакет написан на TypeScript и интегрирован с `@fab33/tlogger` и `@fab33/fab-errors`.

## 📥 2. Установка

Сначала установите ядро:
```bash
npm install @fab33/fab-logger
```
Затем установите необходимые вам транспорты:
```bash
# Для красивого вывода в консоль в Node.js
npm install pino-pretty 

# Для записи в файлы (если нужно)
# Зависимости fs, path, os уже встроены в Node.js
```
> Примечание: `pino-pretty` теперь является peer-зависимостью для транспорта `pretty`.

## 🚀 3. Способы использования

### 3.1. Простой способ (Рекомендуется для большинства проектов)

Этот способ использует "умную" обертку, которая делает все за вас на основе переменных окружения.

**1. Измените импорт в вашем коде:**
```typescript
// Было: import { createLogger } from '@fab33/fab-logger';
// Стало:
import { createLogger } from '@fab33/fab-logger/env';

// Функция теперь асинхронная!
async function initialize() {
    const logger = await createLogger('my-app:module');
    logger.info('Logger is ready!');
}
initialize();
```

**2. Настройте `.env` файл:**
```.env
# Укажите, какие транспорты использовать. Обертка сама их найдет.
TRANSPORT1=pretty
TRANSPORT1_LEVEL=debug

TRANSPORT2=file
TRANSPORT2_FILENAME=app.log

# Включите отладку для нужных модулей
DEBUG=my-app:*
```
Обертка автоматически найдет и сконфигурирует транспорты `pretty` и `file`. Если какой-то транспорт сконфигурирован, но не установлен, вы увидите предупреждение в консоли, и приложение не упадет.

### 3.2. Продвинутый способ (Полный контроль)

Этот способ подходит для сложных сценариев или сред, где нет доступа к `process.env`. Вы вручную импортируете транспорты и передаете их в "чистую" `createLogger`.

```typescript
import { createLogger } from '@fab33/fab-logger';
import createPrettyTransport from '@fab33/fab-logger/transport/pretty';
import createFileTransport from '@fab33/fab-logger/transport/file';
import type { PinoTransport } from '@fab33/tlogger';

async function initialize() {
    // 1. Создаем инстансы транспортов вручную
    const prettyTransport = createPrettyTransport({ level: 'info', colorize: true });
    const fileTransport = await createFileTransport({ level: 'error', filename: 'errors.log' });
    
    const transports: PinoTransport[] = [prettyTransport, fileTransport];

    // 2. Передаем их в "чистый" логгер
    const logger = createLogger('my-app:module', {
        transports: transports,
        logLevel: 'info',
        debugString: 'my-app:*'
    });

    logger.info('Logger configured manually.');
}
initialize();
```

## ⚙️ 4. Конфигурация транспортов (через `/env`)

При использовании обертки `@fab33/fab-logger/env`, конфигурация по-прежнему осуществляется через переменные `TRANSPORT{N}`.

#### Поддерживаемые типы транспортов (`type`)

-   `pretty`: Красивый вывод в консоль. Требует установки `pino-pretty`.
-   `file`: Запись в файл. Использует встроенные модули Node.js.
-   `console-simple`: Встроенный, максимально простой и совместимый вывод в `console.log` без внешних зависимостей. **Идеально для serverless-сред или отладки.**

**Пример для Next.js RSC / Vercel Functions:**
Чтобы избежать ошибок, используйте `console-simple`, который гарантированно работает везде.
```.env
TRANSPORT1=console-simple
TRANSPORT1_LEVEL=trace
DEBUG=*
```

## 🔧 5. Отладка самого логгера

Если логгер ведет себя не так, как ожидалось, вы можете включить его внутреннюю отладку:
```bash
DEBUG_LOGGER=true pnpm dev
```
Это выведет в консоль подробную информацию о том, как парсится конфигурация и инициализируются транспорты.
