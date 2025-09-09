// Organized logger system for M1 Villa Management
// Clean, structured logging without unnecessary clutter

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export enum LogCategory {
  API = 'API',
  AUTH = 'AUTH',
  AUTOSAVE = 'AUTOSAVE',
  DATABASE = 'DATABASE',
  ONBOARDING = 'ONBOARDING',
  VALIDATION = 'VALIDATION',
  FILEUPLOAD = 'FILEUPLOAD',
  STATECHANGE = 'STATECHANGE',
  PERFORMANCE = 'PERFORMANCE',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enabledCategories: Set<LogCategory>;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private groupedLogs: Map<string, LogEntry[]> = new Map();
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LogLevel.WARN : LogLevel.INFO;
    
    // Enable specific categories by default
    this.enabledCategories = new Set([
      LogCategory.API,
      LogCategory.AUTOSAVE,
      LogCategory.DATABASE,
      LogCategory.ONBOARDING,
      LogCategory.FILEUPLOAD,
    ]);

    // Disable verbose categories in production
    if (this.isProduction) {
      this.enabledCategories.delete(LogCategory.STATECHANGE);
      this.enabledCategories.delete(LogCategory.PERFORMANCE);
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Configuration methods
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  enableCategory(category: LogCategory) {
    this.enabledCategories.add(category);
  }

  disableCategory(category: LogCategory) {
    this.enabledCategories.delete(category);
  }

  setCategories(categories: LogCategory[]) {
    this.enabledCategories = new Set(categories);
  }

  // Core logging method
  private log(level: LogLevel, category: LogCategory, message: string, data?: any, context?: string) {
    if (level < this.logLevel || !this.enabledCategories.has(category)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      context,
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Format and output
    this.output(entry);
  }

  private output(entry: LogEntry) {
    const { timestamp, level, category, message, data, context } = entry;
    const time = new Date(timestamp).toLocaleTimeString();
    
    // Create formatted prefix
    const prefix = `[${time}] [${category}]`;
    const contextStr = context ? ` [${context}]` : '';
    
    // Choose console method based on level
    let consoleMethod = console.log;
    let color = '';
    
    switch (level) {
      case LogLevel.DEBUG:
        consoleMethod = console.debug;
        color = 'color: gray';
        break;
      case LogLevel.INFO:
        consoleMethod = console.info;
        color = 'color: blue';
        break;
      case LogLevel.WARN:
        consoleMethod = console.warn;
        color = 'color: orange';
        break;
      case LogLevel.ERROR:
        consoleMethod = console.error;
        color = 'color: red';
        break;
    }

    // Output with proper formatting
    if (typeof window !== 'undefined' && !this.isProduction) {
      // Browser with styling
      if (data) {
        consoleMethod(`%c${prefix}${contextStr} ${message}`, color, data);
      } else {
        consoleMethod(`%c${prefix}${contextStr} ${message}`, color);
      }
    } else {
      // Node.js or production - plain output
      if (data) {
        consoleMethod(`${prefix}${contextStr} ${message}`, data);
      } else {
        consoleMethod(`${prefix}${contextStr} ${message}`);
      }
    }
  }

  // Grouped logging for related operations
  startGroup(groupKey: string, message: string) {
    if (!this.isProduction) {
      console.group(`[${groupKey}] ${message}`);
    }
    this.groupedLogs.set(groupKey, []);
  }

  endGroup(groupKey: string) {
    if (!this.isProduction) {
      console.groupEnd();
    }
    
    const logs = this.groupedLogs.get(groupKey);
    if (logs && logs.length > 0) {
      // Optionally summarize grouped logs
      this.info(LogCategory.PERFORMANCE, `Group ${groupKey} completed with ${logs.length} operations`);
    }
    this.groupedLogs.delete(groupKey);
  }

  // Public logging methods
  debug(category: LogCategory, message: string, data?: any, context?: string) {
    this.log(LogLevel.DEBUG, category, message, data, context);
  }

  info(category: LogCategory, message: string, data?: any, context?: string) {
    this.log(LogLevel.INFO, category, message, data, context);
  }

  warn(category: LogCategory, message: string, data?: any, context?: string) {
    this.log(LogLevel.WARN, category, message, data, context);
  }

  error(category: LogCategory, message: string, data?: any, context?: string) {
    this.log(LogLevel.ERROR, category, message, data, context);
  }

  // Specialized logging methods for common operations
  apiRequest(endpoint: string, method: string, data?: any) {
    this.info(LogCategory.API, `${method} ${endpoint}`, data, 'Request');
  }

  apiResponse(endpoint: string, status: number, data?: any) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, LogCategory.API, `Response ${status} from ${endpoint}`, data, 'Response');
  }

  autoSave(operation: string, itemCount: number, success: boolean) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, LogCategory.AUTOSAVE, `${operation}: ${itemCount} items`, { success }, 'AutoSave');
  }

  databaseOperation(operation: string, table: string, data?: any) {
    this.info(LogCategory.DATABASE, `${operation} on ${table}`, data, 'Database');
  }

  onboardingStep(step: string, action: string, data?: any) {
    this.info(LogCategory.ONBOARDING, `Step: ${step}, Action: ${action}`, data, 'Onboarding');
  }

  fileUpload(fileName: string, size: number, success: boolean) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, LogCategory.FILEUPLOAD, `Upload ${fileName} (${this.formatBytes(size)})`, { success }, 'FileUpload');
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Get log buffer for debugging
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearBuffer() {
    this.logBuffer = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  // Performance timing helper
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(LogCategory.PERFORMANCE, `${label} took ${duration.toFixed(2)}ms`);
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export configuration helper
export function configureLogger(options: {
  level?: LogLevel;
  categories?: LogCategory[];
  disableInProduction?: boolean;
}) {
  const instance = Logger.getInstance();
  
  if (options.level !== undefined) {
    instance.setLogLevel(options.level);
  }
  
  if (options.categories) {
    instance.setCategories(options.categories);
  }
  
  if (options.disableInProduction && process.env.NODE_ENV === 'production') {
    instance.setLogLevel(LogLevel.NONE);
  }
  
  return instance;
}