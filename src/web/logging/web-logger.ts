import type { LoggerService } from '@nestjs/common'
import process from 'node:process'
import pino, { type DestinationStream, type Logger } from 'pino'

const LOG_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])

export function createWebLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      base: null,
      level: getLogLevel(process.env.HARMONIA_AQUILA_LOG_LEVEL),
    },
    destination ?? pino.destination({ dest: 2, sync: false }),
  )
}

export class WebLogger implements LoggerService {
  public constructor(private readonly logger: Logger) {}

  public log(message: unknown): void {
    this.logger.info({ event: 'web.nest.log', message: toSafeMessage(message) })
  }

  public error(message: unknown): void {
    this.logger.error({ event: 'web.nest.log', message: toSafeMessage(message) })
  }

  public warn(message: unknown): void {
    this.logger.warn({ event: 'web.nest.log', message: toSafeMessage(message) })
  }

  public debug(message: unknown): void {
    this.logger.debug({ event: 'web.nest.log', message: toSafeMessage(message) })
  }

  public verbose(message: unknown): void {
    this.logger.trace({ event: 'web.nest.log', message: toSafeMessage(message) })
  }

  public fatal(message: unknown): void {
    this.logger.fatal({ event: 'web.nest.log', message: toSafeMessage(message) })
  }
}

function getLogLevel(value: string | undefined): 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' {
  if (value !== undefined && LOG_LEVELS.has(value)) {
    return value as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  }

  return 'info'
}

function toSafeMessage(message: unknown): string {
  return typeof message === 'string' ? message : 'Nest log message'
}
