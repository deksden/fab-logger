/**
 * @file src/errors.ts
 * @description Определяет спецификации и фабрики ошибок для пакета @fab33/fab-logger.
 * @version 1.0.0
 * @date 2025-06-11
 */

import { type ErrorSpec, FabError } from '@fab33/fab-errors'

// --- Invalid Log Level ---
export interface InvalidLogLevelContext {
  level: string
}

export const INVALID_LOG_LEVEL_SPEC: ErrorSpec<InvalidLogLevelContext> = {
  code: 'LOG_INVALID_LEVEL',
  messageTemplate: 'Invalid log level provided: {level}'
}

export function createInvalidLogLevelError (context: InvalidLogLevelContext, cause?: Error): FabError<InvalidLogLevelContext> {
  return new FabError(INVALID_LOG_LEVEL_SPEC, context, cause)
}

// --- Log Directory Creation Failed ---
export interface LogDirCreateFailedContext {
  path: string
  reason: string
}

export const LOG_DIR_CREATE_FAILED_SPEC: ErrorSpec<LogDirCreateFailedContext> = {
  code: 'LOG_DIR_CREATE_FAILED',
  messageTemplate: 'Failed to create log directory {path}: {reason}'
}

export function createLogDirError (context: LogDirCreateFailedContext, cause?: Error): FabError<LogDirCreateFailedContext> {
  return new FabError(LOG_DIR_CREATE_FAILED_SPEC, context, cause)
}

// --- Log File Write Failed ---
export interface LogFileWriteFailedContext {
  path: string
  reason: string
}

export const LOG_FILE_WRITE_FAILED_SPEC: ErrorSpec<LogFileWriteFailedContext> = {
  code: 'LOG_FILE_WRITE_FAILED',
  messageTemplate: 'Failed to write to log file {path}: {reason}'
}

export function createLogWriteError (context: LogFileWriteFailedContext, cause?: Error): FabError<LogFileWriteFailedContext> {
  return new FabError(LOG_FILE_WRITE_FAILED_SPEC, context, cause)
}

// --- Log Rotation Failed ---
export interface RotateFailedContext {
  path: string
  reason: string
}

export const ROTATE_FAILED_SPEC: ErrorSpec<RotateFailedContext> = {
  code: 'LOG_ROTATE_FAILED',
  messageTemplate: 'Failed to rotate log file {path}: {reason}'
}

export function createRotateError (context: RotateFailedContext, cause?: Error): FabError<RotateFailedContext> {
  return new FabError(ROTATE_FAILED_SPEC, context, cause)
}

// --- Log Cleanup Failed ---
export interface CleanupFailedContext {
  reason: string
}

export const CLEANUP_FAILED_SPEC: ErrorSpec<CleanupFailedContext> = {
  code: 'LOG_CLEANUP_FAILED',
  messageTemplate: 'Failed to cleanup old log archives: {reason}'
}

export function createCleanupError (context: CleanupFailedContext, cause?: Error): FabError<CleanupFailedContext> {
  return new FabError(CLEANUP_FAILED_SPEC, context, cause)
}

// --- Log Formatting Failed ---
export interface FormatFailedContext {
  reason: string
}

export const FORMAT_FAILED_SPEC: ErrorSpec<FormatFailedContext> = {
  code: 'LOG_FORMAT_FAILED',
  messageTemplate: 'Failed to format log message: {reason}'
}

export function createFormatError (context: FormatFailedContext, cause?: Error): FabError<FormatFailedContext> {
  return new FabError(FORMAT_FAILED_SPEC, context, cause)
}

// --- Transport Initialization Failed ---
export interface TransportInitFailedContext {
  reason: string
}

export const TRANSPORT_INIT_FAILED_SPEC: ErrorSpec<TransportInitFailedContext> = {
  code: 'LOG_TRANSPORT_INIT_FAILED',
  messageTemplate: 'Failed to initialize log transport: {reason}'
}

export function createTransportError (context: TransportInitFailedContext, cause?: Error): FabError<TransportInitFailedContext> {
  return new FabError(TRANSPORT_INIT_FAILED_SPEC, context, cause)
}

// END OF: src/errors.ts
