/**
 * Comprehensive Onboarding Performance Logger
 * 
 * This logger tracks:
 * - Step completion times
 * - Auto-save performance
 * - Data loading times
 * - Frontend rendering performance
 * - User interaction patterns
 */

// Type alias for logging data
type LogData = Record<string, unknown> | string | number | boolean | null;

interface LogEvent {
  timestamp: string;
  step: number | string;
  event: string;
  data?: LogData;
  duration?: number;
  userId?: string;
  villaId?: string;
}

interface PerformanceMetrics {
  stepLoadTimes: Record<number, number>;
  autoSaveTimes: Record<string, number>;
  dataFetchTimes: Record<string, number>;
  userInteractions: LogEvent[];
  errors: LogEvent[];
}

interface PerformanceReport {
  summary: {
    totalEvents: number;
    totalErrors: number;
    avgStepLoadTime: number;
    avgAutoSaveTime: number;
    avgDataFetchTime: number;
  };
  stepPerformance: Record<number, number>;
  autoSavePerformance: Record<string, number>;
  dataFetchPerformance: Record<string, number>;
  errors: LogEvent[];
  userInteractions: number;
  recentEvents: LogEvent[];
}

class OnboardingLogger {
  private static instance: OnboardingLogger;
  private events: LogEvent[] = [];
  private performanceMetrics: PerformanceMetrics = {
    stepLoadTimes: {},
    autoSaveTimes: {},
    dataFetchTimes: {},
    userInteractions: [],
    errors: []
  };
  private readonly startTimes: Map<string, number> = new Map();
  
  static getInstance(): OnboardingLogger {
    if (!OnboardingLogger.instance) {
      OnboardingLogger.instance = new OnboardingLogger();
    }
    return OnboardingLogger.instance;
  }

  public log(step: number | string, event: string, data?: LogData, duration?: number) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      step,
      event,
      data,
      duration,
      userId: this.getCurrentUserId(),
      villaId: this.getCurrentVillaId()
    };

    this.events.push(logEvent);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.log(`[ONBOARDING] [STEP${step}] ${event}${durationStr}`, data || '');
    }
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    try {
      return (window as { __CLERK_USER_ID__?: string }).__CLERK_USER_ID__;
    } catch {
      return undefined;
    }
  }

  private getCurrentVillaId(): string | undefined {
    try {
      return localStorage.getItem('currentVillaId') || undefined;
    } catch {
      return undefined;
    }
  }

  // Step Navigation Tracking
  startStepLoad(stepNumber: number) {
    const key = `step_${stepNumber}_load`;
    this.startTimes.set(key, performance.now());
    this.log(stepNumber, 'STEP_LOAD_START');
  }

  endStepLoad(stepNumber: number, success: boolean = true) {
    const key = `step_${stepNumber}_load`;
    const startTime = this.startTimes.get(key);
    
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      this.performanceMetrics.stepLoadTimes[stepNumber] = duration;
      this.log(stepNumber, success ? 'STEP_LOAD_SUCCESS' : 'STEP_LOAD_ERROR', { success }, duration);
      this.startTimes.delete(key);
    }
  }

  // Auto-save Performance
  startAutoSave(stepNumber: number) {
    const key = `step_${stepNumber}_autosave`;
    this.startTimes.set(key, performance.now());
    this.log(stepNumber, 'AUTOSAVE_START');
  }

  endAutoSave(stepNumber: number, success: boolean = true, responseSize?: number) {
    const key = `step_${stepNumber}_autosave`;
    const startTime = this.startTimes.get(key);
    
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      this.performanceMetrics.autoSaveTimes[key] = duration;
      this.log(stepNumber, success ? 'AUTOSAVE_SUCCESS' : 'AUTOSAVE_ERROR', { 
        success, 
        responseSize 
      }, duration);
      this.startTimes.delete(key);
    }
  }

  // Data Fetching Performance
  startDataFetch(operation: string) {
    this.startTimes.set(operation, performance.now());
    this.log('API', 'DATA_FETCH_START', { operation });
  }

  endDataFetch(operation: string, success: boolean = true, recordCount?: number) {
    const startTime = this.startTimes.get(operation);
    
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      this.performanceMetrics.dataFetchTimes[operation] = duration;
      this.log('API', success ? 'DATA_FETCH_SUCCESS' : 'DATA_FETCH_ERROR', {
        operation,
        success,
        recordCount
      }, duration);
      this.startTimes.delete(operation);
    }
  }

  // User Interactions
  trackUserInteraction(stepNumber: number, action: string, target?: string) {
    const event = {
      timestamp: new Date().toISOString(),
      step: stepNumber,
      event: 'USER_INTERACTION',
      data: { action, target }
    };
    
    this.performanceMetrics.userInteractions.push(event);
    this.log(stepNumber, 'USER_INTERACTION', { action, target });
  }

  // Error Tracking
  trackError(stepNumber: number | string, error: Error | string, context?: LogData) {
    const errorData = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context
    };

    const event = {
      timestamp: new Date().toISOString(),
      step: stepNumber,
      event: 'ERROR',
      data: errorData
    };

    this.performanceMetrics.errors.push(event);
    this.log(stepNumber, 'ERROR', errorData);
  }

  // Progress Tracking
  trackProgressUpdate(stepNumber: number, progressPercentage: number) {
    this.log(stepNumber, 'PROGRESS_UPDATE', { progressPercentage });
  }

  // Document/Photo Upload Tracking
  startFileUpload(stepNumber: number, fileName: string, fileSize: number) {
    const key = `upload_${fileName}`;
    this.startTimes.set(key, performance.now());
    this.log(stepNumber, 'FILE_UPLOAD_START', { fileName, fileSize });
  }

  endFileUpload(stepNumber: number, fileName: string, success: boolean = true, sharePointId?: string) {
    const key = `upload_${fileName}`;
    const startTime = this.startTimes.get(key);
    
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      this.log(stepNumber, success ? 'FILE_UPLOAD_SUCCESS' : 'FILE_UPLOAD_ERROR', {
        fileName,
        success,
        sharePointId
      }, duration);
      this.startTimes.delete(key);
    }
  }

  // Bedroom Configuration Tracking
  trackBedroomConfiguration(stepNumber: number, bedrooms: Record<string, unknown>[]) {
    this.log(stepNumber, 'BEDROOM_CONFIG_UPDATE', {
      bedroomCount: bedrooms.length,
      bedrooms: bedrooms.map(b => ({ name: b.name, bedType: b.bedType }))
    });
  }

  // Validation Tracking
  trackValidationError(stepNumber: number, field: string, error: string) {
    this.log(stepNumber, 'VALIDATION_ERROR', { field, error });
  }

  trackValidationSuccess(stepNumber: number, fieldsValidated: number) {
    this.log(stepNumber, 'VALIDATION_SUCCESS', { fieldsValidated });
  }

  // Generate Performance Report
  generatePerformanceReport(): PerformanceReport {
    const report = {
      summary: {
        totalEvents: this.events.length,
        totalErrors: this.performanceMetrics.errors.length,
        avgStepLoadTime: this.calculateAverageTime(this.performanceMetrics.stepLoadTimes),
        avgAutoSaveTime: this.calculateAverageTime(this.performanceMetrics.autoSaveTimes),
        avgDataFetchTime: this.calculateAverageTime(this.performanceMetrics.dataFetchTimes)
      },
      stepPerformance: this.performanceMetrics.stepLoadTimes,
      autoSavePerformance: this.performanceMetrics.autoSaveTimes,
      dataFetchPerformance: this.performanceMetrics.dataFetchTimes,
      errors: this.performanceMetrics.errors,
      userInteractions: this.performanceMetrics.userInteractions.length,
      recentEvents: this.events.slice(-20) // Last 20 events
    };

    return report;
  }

  private calculateAverageTime(times: Record<string, number>): number {
    const values = Object.values(times);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      events: this.events,
      performanceMetrics: this.performanceMetrics,
      report: this.generatePerformanceReport()
    }, null, 2);
  }

  // Clear logs (useful for testing)
  clearLogs() {
    this.events = [];
    this.performanceMetrics = {
      stepLoadTimes: {},
      autoSaveTimes: {},
      dataFetchTimes: {},
      userInteractions: [],
      errors: []
    };
    this.startTimes.clear();
  }

  // Console reporting for development
  printPerformanceReport() {
    if (process.env.NODE_ENV !== 'development') return;

    const report = this.generatePerformanceReport();
    
    console.group('🚀 Onboarding Performance Report');
    console.log('📊 Summary:', report.summary);
    console.log('⏱️  Step Load Times:', report.stepPerformance);
    console.log('💾 Auto-save Times:', report.autoSavePerformance);
    console.log('🌐 Data Fetch Times:', report.dataFetchPerformance);
    console.log('❌ Errors:', report.errors.length);
    console.log('👆 User Interactions:', report.userInteractions);
    console.groupEnd();
  }
}

export default OnboardingLogger;