/**
 * Centralized Onboarding Session Manager
 *
 * Fixes the critical session management issues:
 * - Multiple villa sessions created on refresh
 * - Wrong villa IDs displayed initially
 * - Automatic new session creation when it shouldn't
 * - Race conditions between URL params, localStorage, and component state
 * - Inconsistent storage state across browser sessions
 *
 * Provides single source of truth for villa ID management with proper priority handling.
 */

import { logger as baseLogger } from './logger';

export interface SessionInfo {
  villaId: string;
  source: 'url' | 'session' | 'localStorage' | 'new';
  timestamp: number;
  userId?: string;
  isValid?: boolean;
}

export interface SessionValidationResult {
  valid: boolean;
  villaId: string | null;
  error?: 'not_found' | 'access_denied' | 'deleted' | 'network_error';
  canRecover?: boolean;
  shouldCreateNew?: boolean;
}

type SessionState = 'uninitialized' | 'initializing' | 'valid' | 'invalid' | 'error';

class OnboardingSessionManager {
  private state: SessionState = 'uninitialized';
  private currentSession: SessionInfo | null = null;
  private initializationPromise: Promise<SessionInfo | null> | null = null;
  private validationPromise: Promise<SessionValidationResult> | null = null;

  // Storage keys
  private readonly STORAGE_KEYS = {
    CURRENT_VILLA: 'currentVillaId',
    USER_VILLA_PREFIX: 'onboarding_villa_',
    SESSION_VILLA: 'session_villaId',
    SESSION_STATE: 'session_state',
    RECOVERY_DATA: 'session_recovery_data'
  } as const;

  private logger = {
    info: (message: string, data?: any) => baseLogger?.info?.(message, data) || console.log(message, data),
    warn: (message: string, data?: any) => baseLogger?.warn?.(message, data) || console.warn(message, data),
    error: (message: string, data?: any) => baseLogger?.error?.(message, data) || console.error(message, data),
  };

  /**
   * Initialize session with proper priority handling:
   * 1. URL parameters (highest priority)
   * 2. Current session storage
   * 3. User-specific localStorage
   * 4. Generic localStorage (lowest priority)
   */
  async initialize(options: {
    urlVillaId?: string;
    userId?: string;
    forceNewSession?: boolean;
    validateSession?: (villaId: string) => Promise<SessionValidationResult>;
  }): Promise<SessionInfo | null> {
    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization(options);
    return this.initializationPromise;
  }

  private async _performInitialization(options: {
    urlVillaId?: string;
    userId?: string;
    forceNewSession?: boolean;
    validateSession?: (villaId: string) => Promise<SessionValidationResult>;
  }): Promise<SessionInfo | null> {
    this.state = 'initializing';
    const { urlVillaId, userId, forceNewSession, validateSession } = options;

    try {
      this.logger.info('[SESSION] Starting initialization', {
        hasUrlVillaId: !!urlVillaId,
        userId: userId?.substring(0, 8),
        forceNewSession
      });

      // Phase 1: Handle URL villa ID (highest priority)
      if (urlVillaId && !forceNewSession) {
        this.logger.info('[SESSION] Using URL villa ID', { urlVillaId });

        // Clear conflicting storage when URL provides villa ID
        this._clearConflictingStorage(urlVillaId, userId);

        // Validate URL villa ID if validator provided
        let isValid = true;
        if (validateSession) {
          const validation = await this._validateWithCache(urlVillaId, validateSession);
          isValid = validation.valid;

          if (!isValid) {
            this.logger.warn('[SESSION] URL villa ID validation failed', {
              urlVillaId,
              error: validation.error,
              canRecover: validation.canRecover
            });

            // Don't auto-create if URL villa ID is invalid - let user decide
            this.state = 'invalid';
            return null;
          }
        }

        const urlSession: SessionInfo = {
          villaId: urlVillaId,
          source: 'url',
          timestamp: Date.now(),
          userId,
          isValid
        };

        this._storeSession(urlSession);
        this.currentSession = urlSession;
        this.state = 'valid';
        return urlSession;
      }

      // Phase 2: Force new session if requested
      if (forceNewSession) {
        this.logger.info('[SESSION] Force new session requested');
        this._clearAllStorage(userId);
        this.state = 'invalid';
        return null; // Caller will need to create new session
      }

      // Phase 3: Try to load existing session (priority order)
      const storedSession = this._loadStoredSession(userId);
      if (storedSession) {
        this.logger.info('[SESSION] Found stored session', {
          villaId: storedSession.villaId,
          source: storedSession.source
        });

        // Validate stored session if validator provided
        if (validateSession) {
          const validation = await this._validateWithCache(storedSession.villaId, validateSession);

          if (validation.valid) {
            storedSession.isValid = true;
            this._storeSession(storedSession);
            this.currentSession = storedSession;
            this.state = 'valid';
            return storedSession;
          } else {
            this.logger.warn('[SESSION] Stored session validation failed', {
              villaId: storedSession.villaId,
              error: validation.error,
              shouldCreateNew: validation.shouldCreateNew
            });

            // Clean up invalid session
            this._clearSessionStorage(storedSession.villaId);

            if (validation.shouldCreateNew) {
              this.state = 'invalid';
              return null; // Caller should create new
            }
          }
        } else {
          // No validation provided, assume session is valid
          this.currentSession = storedSession;
          this.state = 'valid';
          return storedSession;
        }
      }

      // Phase 4: No valid session found
      this.logger.info('[SESSION] No valid session found');
      this.state = 'invalid';
      return null;

    } catch (error) {
      this.logger.error('[SESSION] Initialization failed', error);
      this.state = 'error';
      return null;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Load stored session with priority order
   */
  private _loadStoredSession(userId?: string): SessionInfo | null {
    if (typeof window === 'undefined') return null;

    // Priority 1: Current session storage (most recent)
    const sessionVillaId = sessionStorage.getItem(this.STORAGE_KEYS.SESSION_VILLA);
    if (sessionVillaId) {
      return {
        villaId: sessionVillaId,
        source: 'session',
        timestamp: Date.now(),
        userId
      };
    }

    // Priority 2: User-specific localStorage
    if (userId) {
      const userVillaId = localStorage.getItem(`${this.STORAGE_KEYS.USER_VILLA_PREFIX}${userId}`);
      if (userVillaId) {
        return {
          villaId: userVillaId,
          source: 'localStorage',
          timestamp: Date.now(),
          userId
        };
      }
    }

    // Priority 3: Generic localStorage (fallback)
    const genericVillaId = localStorage.getItem(this.STORAGE_KEYS.CURRENT_VILLA);
    if (genericVillaId) {
      return {
        villaId: genericVillaId,
        source: 'localStorage',
        timestamp: Date.now(),
        userId
      };
    }

    return null;
  }

  /**
   * Store session in all relevant storage locations
   */
  private _storeSession(session: SessionInfo): void {
    if (typeof window === 'undefined') return;

    try {
      // Always store in session storage for current session
      sessionStorage.setItem(this.STORAGE_KEYS.SESSION_VILLA, session.villaId);
      sessionStorage.setItem(this.STORAGE_KEYS.SESSION_STATE, JSON.stringify({
        villaId: session.villaId,
        source: session.source,
        timestamp: session.timestamp
      }));

      // Store in localStorage for persistence
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_VILLA, session.villaId);

      if (session.userId) {
        localStorage.setItem(`${this.STORAGE_KEYS.USER_VILLA_PREFIX}${session.userId}`, session.villaId);
      }

      this.logger.info('[SESSION] Session stored', {
        villaId: session.villaId,
        source: session.source
      });
    } catch (error) {
      this.logger.error('[SESSION] Failed to store session', error);
    }
  }

  /**
   * Clear conflicting storage when URL provides villa ID
   */
  private _clearConflictingStorage(urlVillaId: string, userId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const currentVillaId = localStorage.getItem(this.STORAGE_KEYS.CURRENT_VILLA);
      const userVillaId = userId ? localStorage.getItem(`${this.STORAGE_KEYS.USER_VILLA_PREFIX}${userId}`) : null;

      if (currentVillaId && currentVillaId !== urlVillaId) {
        this.logger.info('[SESSION] Clearing conflicting generic villa ID', {
          current: currentVillaId,
          url: urlVillaId
        });
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_VILLA);
      }

      if (userVillaId && userVillaId !== urlVillaId) {
        this.logger.info('[SESSION] Clearing conflicting user villa ID', {
          current: userVillaId,
          url: urlVillaId,
          userId: userId?.substring(0, 8)
        });
        localStorage.removeItem(`${this.STORAGE_KEYS.USER_VILLA_PREFIX}${userId}`);
      }
    } catch (error) {
      this.logger.error('[SESSION] Failed to clear conflicting storage', error);
    }
  }

  /**
   * Clear all storage for fresh start
   */
  private _clearAllStorage(userId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(this.STORAGE_KEYS.SESSION_VILLA);
      sessionStorage.removeItem(this.STORAGE_KEYS.SESSION_STATE);
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_VILLA);

      if (userId) {
        localStorage.removeItem(`${this.STORAGE_KEYS.USER_VILLA_PREFIX}${userId}`);
      }

      this.logger.info('[SESSION] All storage cleared', { userId: userId?.substring(0, 8) });
    } catch (error) {
      this.logger.error('[SESSION] Failed to clear storage', error);
    }
  }

  /**
   * Clear specific session storage
   */
  private _clearSessionStorage(villaId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const currentSession = sessionStorage.getItem(this.STORAGE_KEYS.SESSION_VILLA);
      const currentGeneric = localStorage.getItem(this.STORAGE_KEYS.CURRENT_VILLA);

      if (currentSession === villaId) {
        sessionStorage.removeItem(this.STORAGE_KEYS.SESSION_VILLA);
        sessionStorage.removeItem(this.STORAGE_KEYS.SESSION_STATE);
      }

      if (currentGeneric === villaId) {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_VILLA);
      }

      this.logger.info('[SESSION] Session storage cleared', { villaId });
    } catch (error) {
      this.logger.error('[SESSION] Failed to clear session storage', error);
    }
  }

  /**
   * Validate session with caching to prevent multiple API calls
   */
  private async _validateWithCache(
    villaId: string,
    validator: (villaId: string) => Promise<SessionValidationResult>
  ): Promise<SessionValidationResult> {
    // Use existing validation promise if in progress
    const cacheKey = `validation_${villaId}`;
    if (this.validationPromise) {
      return this.validationPromise;
    }

    this.validationPromise = validator(villaId);

    try {
      const result = await this.validationPromise;
      this.logger.info('[SESSION] Validation completed', {
        villaId,
        valid: result.valid,
        error: result.error
      });
      return result;
    } finally {
      this.validationPromise = null;
    }
  }

  /**
   * Update current session (e.g., when new villa created)
   */
  setCurrentSession(villaId: string, source: SessionInfo['source'] = 'new', userId?: string): void {
    const session: SessionInfo = {
      villaId,
      source,
      timestamp: Date.now(),
      userId,
      isValid: true
    };

    this._storeSession(session);
    this.currentSession = session;
    this.state = 'valid';

    this.logger.info('[SESSION] Current session updated', {
      villaId,
      source
    });
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Get current villa ID
   */
  getCurrentVillaId(): string | null {
    return this.currentSession?.villaId || null;
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Clear current session
   */
  clearCurrentSession(userId?: string): void {
    this._clearAllStorage(userId);
    this.currentSession = null;
    this.state = 'uninitialized';
    this.logger.info('[SESSION] Current session cleared');
  }

  /**
   * Check if manager is ready for use
   */
  isReady(): boolean {
    return this.state === 'valid' || this.state === 'invalid';
  }

  /**
   * Check if currently initializing
   */
  isInitializing(): boolean {
    return this.state === 'initializing' || !!this.initializationPromise;
  }
}

// Export singleton instance
export const sessionManager = new OnboardingSessionManager();
export default sessionManager;