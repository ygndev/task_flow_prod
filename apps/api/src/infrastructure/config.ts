import { logger } from './logger';

class Config {
  readonly port: number;
  readonly nodeEnv: string;
  readonly firebaseServiceAccountKey?: string;
  ///test

  constructor() {
    this.port = parseInt(process.env.PORT || '4000', 10);
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.firebaseServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  }

  validate(): void {
    const errors: string[] = [];
////
    if (isNaN(this.port) || this.port < 1 || this.port > 65535) {
      errors.push('PORT must be a valid number between 1 and 65535');
    }

    if (!['development', 'production', 'test'].includes(this.nodeEnv)) {
      errors.push('NODE_ENV must be one of: development, production, test');
    }

    if (errors.length > 0) {
      logger.error('Configuration validation failed:', errors);
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}

export const config = new Config();
