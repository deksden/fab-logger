# @fab33/fab-logger :: (CHANGELOG.md)

## `2025-06-12`: [v1.0.1] Inline Console Transport for RSC/Vercel/etc

* **FEAT**: Добавлен новый тип транспорта `console-inline`, который запускает `pino-pretty` в основном потоке. Это
  решает проблемы совместимости со средами без поддержки воркеров, такими как Next.js RSC (React Server Components) и
  Vercel Functions.
* **DOCS**: Обновлена документация (`FAB-LOGGER.md`) для описания нового транспорта и сценариев его использования.
* **TEST**: Добавлены тесты для нового `console-inline` транспорта.
* **FIX**: Исправлена ошибка вызова конструктора `pino` (`pino()` -> `pino.pino()`) для совместимости с pino v7+.
* **FIX**: Устранена ошибка типизации `null`, возвращаемого из `initializeBaseLogger`.

## `2025-06-11`: [v1.0.0] Initial TypeScript Release

* **BREAKING**: Полная миграция с JavaScript на TypeScript.
* **FEAT**: Интеграция с `@fab33/tlogger` для типизированного интерфейса логгера.
* **FEAT**: Интеграция с `@fab33/fab-errors` для стандартизированной обработки ошибок.
* **FEAT**: Реализована система множественных транспортов через переменные окружения `TRANSPORT{N}`.
* **REFACTOR**: Переработан механизм конфигурации, "легаси" переменные теперь являются fallback-вариантом.
