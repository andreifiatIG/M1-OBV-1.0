// New ElectricSQL integration for real-time sync
import { logger } from '../utils/logger';

// New ElectricSQL Shape API interfaces
interface ShapeConfig {
  url: string;
  params?: {
    table: string;
    where?: string;
    columns?: string[];
  };
}

interface ShapeData {
  [key: string]: any;
}

interface ElectricShape {
  value: ShapeData[];
  isLoading: boolean;
  error?: Error;
}

// HTTP client for fetching shape data
class ShapeClient {
  constructor(private baseUrl: string = 'http://localhost:5133') {}

  async getShape(config: ShapeConfig): Promise<ElectricShape> {
    try {
      const params = new URLSearchParams();
      if (config.params?.table) {
        // Ensure table names are properly quoted for PostgreSQL
        const tableName = config.params.table.startsWith('"') ? config.params.table : `"${config.params.table}"`;
        params.set('table', tableName);
      }
      if (config.params?.where) params.set('where', config.params.where);
      if (config.params?.columns) params.set('columns', config.params.columns.join(','));
      
      // ElectricSQL requires offset parameter (use -1 for live stream)
      params.set('offset', '-1');

      const url = `${this.baseUrl}/v1/shape?${params.toString()}`;
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch shape: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          value: Array.isArray(data) ? data : [],
          isLoading: false,
          error: undefined
        };
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError;
      }
    } catch (error) {
      logger.error('Failed to fetch shape data:', error);
      return {
        value: [],
        isLoading: false,
        error: error as Error
      };
    }
  }

  // Subscribe to shape changes (polling-based for now)
  subscribeToShape(
    config: ShapeConfig, 
    callback: (data: ElectricShape) => void,
    intervalMs: number = 5000
  ): () => void {
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;
      
      const shape = await this.getShape(config);
      callback(shape);
      
      if (isActive) {
        setTimeout(poll, intervalMs);
      }
    };

    poll(); // Initial fetch

    return () => {
      isActive = false;
    };
  }
}

// New Electric SQL configuration
export interface ElectricConfig {
  url: string;
  authToken?: string;
}

// Shape subscription interface
interface ShapeSubscription {
  unsubscribe: () => void;
  tableName: string;
}

// Sync context for user permissions
interface SyncContext {
  userId: string;
  role: string;
  villaId?: string;
  partnerId?: string;
}

class ElectricSQLService {
  private client: ShapeClient | null = null;
  private isConnected = false;
  private subscriptions: Map<string, ShapeSubscription> = new Map();
  private authContext: SyncContext | null = null;

  /**
   * Initialize ElectricSQL service with new Shape API
   */
  async initialize(config: ElectricConfig): Promise<void> {
    try {
      logger.info('Initializing new ElectricSQL service...', { url: config.url });

      // Initialize the Shape client
      this.client = new ShapeClient(config.url);

      // Test connection
      await this.testConnection();

      this.isConnected = true;
      logger.info('[OK] New ElectricSQL service initialized successfully');
    } catch (error) {
      logger.error('[ERROR] Failed to initialize ElectricSQL service:', error);
      
      // Fall back to development mode without Electric
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Running in development mode without ElectricSQL sync');
        this.isConnected = false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Test Electric connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Test by checking health endpoint first
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${this.client['baseUrl']}/v1/health`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        
        const health = await response.json();
        if (health.status !== 'active') {
          throw new Error(`ElectricSQL not active: ${health.status}`);
        }
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError;
      }
      
      logger.debug('[OK] ElectricSQL connection test successful');
    } catch (error) {
      logger.error('[ERROR] ElectricSQL connection test failed:', error);
      throw error;
    }
  }

  /**
   * Generate where clause based on user permissions
   */
  private generateWhereClause(tableName: string, context: SyncContext): string {
    const { role, villaId } = context;
    
    // Admin has access to everything
    if (role === 'admin') {
      return '';
    }
    
    // Table-specific rules
    switch (tableName) {
      case 'Villa':
        if (role === 'manager') return '';
        if (role === 'owner' && villaId) return `id = '${villaId}'`;
        return 'id IS NULL'; // No access
        
      case 'Owner':
      case 'Staff':
      case 'Photo':
      case 'Document':
      case 'FacilityChecklist':
      case 'OnboardingProgress':
      case 'OnboardingSession':
      case 'OnboardingStepProgress':
      case 'SkippedItem':
      case 'OnboardingBackup':
      case 'StepFieldProgress':
        if (role === 'manager') return '';
        if (villaId) return `\"villaId\" = '${villaId}'`;
        return '\"villaId\" IS NULL';
        
      case 'BankDetails':
      case 'OTACredentials':
      case 'ContractualDetails':
        if (role === 'admin') return '';
        if (role === 'owner' && villaId) return `\"villaId\" = '${villaId}'`;
        return '\"villaId\" IS NULL';
      case 'AdminAction':
        return role === 'admin' ? '' : 'id IS NULL';
      default:
        return 'id IS NULL'; // Deny by default
    }
  }

  /**
   * Start real-time synchronization for a user
   */
  async startSync(userId: string, userRole: string, permissions: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('ElectricSQL client not available, skipping sync');
      return;
    }

    try {
      // Set auth context
      this.authContext = {
        userId,
        role: userRole,
        villaId: permissions.villaId,
        partnerId: permissions.partnerId,
      };

      // Start syncing relevant tables
      const tablesToSync = this.getRelevantTables(userRole);
      
      for (const table of tablesToSync) {
        await this.subscribeToTable(table);
      }

      logger.info(`[OK] Real-time sync started for user ${userId} with role ${userRole}`);
    } catch (error) {
      logger.error('[ERROR] Failed to start sync:', error);
      throw error;
    }
  }

  /**
   * Stop synchronization for a user
   */
  async stopSync(userId: string): Promise<void> {
    try {
      // Unsubscribe from all active subscriptions
      for (const [key, subscription] of this.subscriptions) {
        subscription.unsubscribe();
        this.subscriptions.delete(key);
      }
      
      this.authContext = null;
      logger.info(`[OK] Sync stopped for user ${userId}`);
    } catch (error) {
      logger.error('[ERROR] Failed to stop sync:', error);
    }
  }

  /**
   * Get relevant tables based on user role (M1 Villa Management only)
   */
  private getRelevantTables(userRole: string): string[] {
    const baseTables = ['Villa', 'Photo'];
    
    switch (userRole) {
      case 'admin':
        return [
          'Villa', 'Owner', 'ContractualDetails', 'BankDetails', 'OTACredentials',
          'Staff', 'Photo', 'Document', 'FacilityChecklist',
          'OnboardingProgress', 'OnboardingSession', 'OnboardingStepProgress',
          'SkippedItem', 'OnboardingBackup', 'StepFieldProgress'
        ];
        
      case 'manager':
        return [
          'Villa', 'Owner', 'ContractualDetails', 'Staff', 'Photo', 'Document',
          'FacilityChecklist', 'OnboardingProgress', 'OnboardingSession',
          'OnboardingStepProgress', 'SkippedItem', 'OnboardingBackup', 'StepFieldProgress'
        ];
        
      case 'owner':
        return [
          'Villa', 'Owner', 'ContractualDetails', 'BankDetails', 'Staff',
          'Photo', 'Document', 'OnboardingSession', 'OnboardingProgress',
          'OnboardingStepProgress', 'StepFieldProgress'
        ];
        
      default:
        return baseTables;
    }
  }

  /**
   * Subscribe to real-time changes for a table using new Shape API
   */
  async subscribeToTable(tableName: string, callback?: (changes: any) => void): Promise<void> {
    if (!this.client || !this.isConnected || !this.authContext) {
      logger.warn(`Cannot subscribe to ${tableName}: client not ready`);
      return;
    }

    try {
      const whereClause = this.generateWhereClause(tableName, this.authContext);
      
      // Subscribe to shape changes
      const unsubscribe = this.client.subscribeToShape({
        url: '/v1/shape',
        params: {
          table: tableName,
          where: whereClause || undefined,
        }
      }, (shape) => {
        if (callback && shape.value) {
          callback({
            table: tableName,
            operation: 'sync',
            data: shape.value,
            timestamp: new Date(),
            error: shape.error
          });
        }
      });

      // Store subscription for cleanup
      const subscription: ShapeSubscription = {
        unsubscribe,
        tableName,
      };
      
      this.subscriptions.set(tableName, subscription);
      logger.debug(`[OK] Subscribed to changes for ${tableName}`);
    } catch (error) {
      logger.error(`[ERROR] Failed to subscribe to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get shape data for a table
   */
  async getTableData(tableName: string): Promise<any[]> {
    if (!this.client || !this.isConnected || !this.authContext) {
      logger.warn(`Cannot get data for ${tableName}: client not ready`);
      return [];
    }

    try {
      const whereClause = this.generateWhereClause(tableName, this.authContext);
      
      const shape = await this.client.getShape({
        url: '/v1/shape',
        params: {
          table: tableName,
          where: whereClause || undefined,
        }
      });

      if (shape.error) {
        throw shape.error;
      }

      logger.debug(`[OK] Retrieved ${shape.value.length} records from ${tableName}`);
      return shape.value;
    } catch (error) {
      logger.error(`[ERROR] Failed to get data for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { 
    connected: boolean; 
    subscriptionsCount: number;
    authContext: SyncContext | null;
  } {
    return {
      connected: this.isConnected,
      subscriptionsCount: this.subscriptions.size,
      authContext: this.authContext,
    };
  }

  /**
   * Force refresh for a table subscription
   */
  async forceSync(tableName: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('ElectricSQL client not available for force sync');
      return;
    }

    try {
      const subscription = this.subscriptions.get(tableName);
      if (subscription) {
        // Unsubscribe and resubscribe to force refresh
        subscription.unsubscribe();
        this.subscriptions.delete(tableName);
        await this.subscribeToTable(tableName);
        logger.info(`[OK] Force sync completed for ${tableName}`);
      } else {
        logger.warn(`No active subscription found for ${tableName}`);
      }
    } catch (error) {
      logger.error(`[ERROR] Failed to force sync ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Close the Electric connection
   */
  async close(): Promise<void> {
    try {
      // Close all subscriptions
      for (const [key, subscription] of this.subscriptions) {
        subscription.unsubscribe();
        this.subscriptions.delete(key);
      }
      
      this.authContext = null;
      this.isConnected = false;
      this.client = null;
      
      logger.info('[OK] ElectricSQL service closed');
    } catch (error) {
      logger.error('[ERROR] Failed to close ElectricSQL service:', error);
    }
  }
}

export default new ElectricSQLService();