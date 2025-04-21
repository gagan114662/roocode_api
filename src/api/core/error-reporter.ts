import { AppError } from './errors';

interface ErrorReporterConfig {
  environment: string;
  service: string;
  version: string;
  includeStack: boolean;
}

interface ErrorMetrics {
  incrementError(code: string): void;
  recordErrorTiming(code: string, duration: number): void;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private config: ErrorReporterConfig;
  private metrics?: ErrorMetrics;

  private constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      service: process.env.SERVICE_NAME || 'roocode-api',
      version: process.env.SERVICE_VERSION || '1.0.0',
      includeStack: process.env.NODE_ENV !== 'production'
    };
  }

  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  public setMetrics(metrics: ErrorMetrics): void {
    this.metrics = metrics;
  }

  public report(error: Error | AppError, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const errorCode = 'code' in error ? error.code : 'UNKNOWN_ERROR';

    const errorDetails = {
      timestamp,
      environment: this.config.environment,
      service: this.config.service,
      version: this.config.version,
      error: {
        name: error.name,
        message: error.message,
        code: errorCode,
        status: 'status' in error ? error.status : 500,
        stack: this.config.includeStack ? error.stack : undefined,
        details: 'details' in error ? error.details : undefined
      },
      context
    };

    // Log error
    console.error('Error occurred:', errorDetails);

    // Track metrics if configured
    if (this.metrics) {
      this.metrics.incrementError(errorCode);
      
      if (context?.duration) {
        this.metrics.recordErrorTiming(
          errorCode,
          typeof context.duration === 'number' ? context.duration : 0
        );
      }
    }

    // In development, also log the full error object
    if (this.config.environment === 'development') {
      console.error('Full error:', error);
    }
  }

  public setConfig(config: Partial<ErrorReporterConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  public createContext(
    data: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      service: this.config.service,
      ...data
    };
  }

  public middleware() {
    return (error: Error, req: any, res: any, next: any) => {
      this.report(error, {
        path: req.path,
        method: req.method,
        query: req.query,
        body: process.env.NODE_ENV === 'development' ? req.body : undefined,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        duration: Date.now() - (req.startTime || 0)
      });
      next(error);
    };
  }
}

export const errorReporter = ErrorReporter.getInstance();