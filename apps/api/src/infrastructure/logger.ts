type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage('info', message);
    if (args.length > 0) {
      console.log(formatted, ...args);
    } else {
      console.log(formatted);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage('warn', message);
    if (args.length > 0) {
      console.warn(formatted, ...args);
    } else {
      console.warn(formatted);
    }
  }

  error(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage('error', message);
    if (args.length > 0) {
      console.error(formatted, ...args);
    } else {
      console.error(formatted);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message);
      if (args.length > 0) {
        console.debug(formatted, ...args);
      } else {
        console.debug(formatted);
      }
    }
  }
}

export const logger = new Logger();
