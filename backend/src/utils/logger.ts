import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logDir = 'logs';

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: any) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error file transport
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined file transport
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
});

// Create a stream for Morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Performance monitoring
class PerformanceLogger {
  private timers: Map<string, number> = new Map();
  
  startTimer(label: string) {
    this.timers.set(label, Date.now());
  }
  
  endTimer(label: string, metadata?: any): number | null {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.timers.delete(label);
      
      const level = duration > 1000 ? 'warn' : 'debug';
      logger[level](`Performance: ${label} took ${duration}ms`, metadata);
      
      return duration;
    }
    return null;
  }
}

export const performanceLogger = new PerformanceLogger();

// Structured logging helpers
export const logError = (error: Error | unknown, context?: any) => {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    logger.error('Unknown error', { error, ...context });
  }
};

export const logWarning = (message: string, context?: any) => {
  logger.warn(message, context);
};

export const logInfo = (message: string, context?: any) => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: any) => {
  logger.debug(message, context);
};

// Audit logging for critical operations
export const auditLog = (action: string, userId: string, details: any) => {
  logger.info(`AUDIT: ${action}`, {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Security logging
export const securityLog = (event: string, details: any) => {
  logger.warn(`SECURITY: ${event}`, {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Metrics logging
export const metricsLog = (metric: string, value: number, tags?: Record<string, string>) => {
  logger.info(`METRIC: ${metric}`, {
    metric,
    value,
    tags,
    timestamp: new Date().toISOString(),
  });
};