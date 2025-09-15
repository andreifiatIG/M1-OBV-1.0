import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
// import electricSQLService from '../electric/client'; // Disabled - ElectricSQL not configured in this iteration
import { logger } from '../../utils/logger';
import { prisma } from '../../server';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  villaId?: string;
  partnerId?: string;
}

interface RoomSubscription {
  userId: string;
  villaId?: string;
  tables: Set<string>;
}

interface WebSocketMessage {
  type: 'data_change' | 'user_joined' | 'user_left' | 'sync_status' | 'error';
  table?: string;
  operation?: 'insert' | 'update' | 'delete';
  data?: any;
  userId?: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * WebSocket Service for real-time updates using Socket.io
 */
class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private roomSubscriptions: Map<string, RoomSubscription> = new Map();
  private isInitialized = false;

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    try {
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.setupEventHandlers();
      this.setupElectricSQLIntegration();

      this.isInitialized = true;
      logger.info('[OK] WebSocket service initialized successfully');
    } catch (error) {
      logger.error('[ERROR] Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: {
        userId: string;
        userRole: string;
        villaId?: string;
        partnerId?: string;
        token?: string;
      }) => {
        try {
          await this.authenticateSocket(socket, data);
        } catch (error) {
          logger.error('Authentication failed:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
          return;
        }
      });

      // Handle room subscription
      socket.on('subscribe_villa', async (villaId: string) => {
        try {
          await this.subscribeToVilla(socket, villaId);
        } catch (error) {
          logger.error('Villa subscription failed:', error);
          socket.emit('subscription_error', { error: 'Failed to subscribe to villa' });
          return;
        }
      });

      // Handle room unsubscription
      socket.on('unsubscribe_villa', async (villaId: string) => {
        try {
          await this.unsubscribeFromVilla(socket, villaId);
        } catch (error) {
          logger.error('Villa unsubscription failed:', error);
          return;
        }
      });

      // Handle table-specific subscriptions
      socket.on('subscribe_table', async (data: { table: string; villaId?: string }) => {
        try {
          await this.subscribeToTable(socket, data.table, data.villaId);
        } catch (error) {
          logger.error('Table subscription failed:', error);
          socket.emit('subscription_error', { error: 'Failed to subscribe to table' });
          return;
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Handle manual sync request
      socket.on('force_sync', async (data: { table: string; villaId?: string }) => {
        try {
          await this.handleForceSyncRequest(socket, data);
        } catch (error) {
          logger.error('Force sync failed:', error);
          socket.emit('sync_error', { error: 'Failed to force sync' });
          return;
        }
      });
    });
  }

  /**
   * Authenticate a socket connection
   */
  private async authenticateSocket(
    socket: AuthenticatedSocket,
    authData: {
      userId: string;
      userRole: string;
      villaId?: string;
      partnerId?: string;
      token?: string;
    }
  ): Promise<void> {
    // TODO: Validate JWT token if provided
    // For now, we'll trust the provided auth data

    socket.userId = authData.userId;
    socket.userRole = authData.userRole;
    socket.villaId = authData.villaId;
    socket.partnerId = authData.partnerId;

    // Store authenticated user
    this.connectedUsers.set(authData.userId, socket);

    // Join user to appropriate rooms
    const rooms = this.getUserRooms(authData);
    for (const room of rooms) {
      socket.join(room);
    }

    // Start ElectricSQL sync for this user - DISABLED
    try {
      // await electricSQLService.startSync(authData.userId, authData.userRole, {
      //   villaId: authData.villaId,
      //   partnerId: authData.partnerId,
      // });
      logger.info('ElectricSQL sync disabled for this session');
    } catch (error) {
      logger.warn('ElectricSQL sync failed to start:', error);
    }

    socket.emit('authenticated', {
      userId: authData.userId,
      rooms: rooms,
      timestamp: new Date(),
    });

    logger.info(`[OK] User authenticated: ${authData.userId} (${authData.userRole})`);
  }

  /**
   * Get rooms a user should join based on their role and permissions
   */
  private getUserRooms(authData: {
    userId: string;
    userRole: string;
    villaId?: string;
    partnerId?: string;
  }): string[] {
    const rooms: string[] = [];

    // Global room for all users
    rooms.push('global');

    // Role-based rooms
    rooms.push(`role:${authData.userRole}`);

    // Villa-specific room
    if (authData.villaId) {
      rooms.push(`villa:${authData.villaId}`);
    }

    // Partner-specific room
    if (authData.partnerId) {
      rooms.push(`partner:${authData.partnerId}`);
    }

    // Admin gets access to all villas
    if (authData.userRole === 'admin') {
      rooms.push('admin:all_villas');
    }

    return rooms;
  }

  /**
   * Subscribe to villa-specific updates
   */
  private async subscribeToVilla(socket: AuthenticatedSocket, villaId: string): Promise<void> {
    if (!socket.userId) {
      throw new Error('Socket not authenticated');
    }

    // Check permissions
    if (!this.canAccessVilla(socket, villaId)) {
      throw new Error('Insufficient permissions to access villa');
    }

    const roomName = `villa:${villaId}`;
    socket.join(roomName);

    // Track subscription
    const subscriptionKey = `${socket.userId}:${villaId}`;
    this.roomSubscriptions.set(subscriptionKey, {
      userId: socket.userId,
      villaId,
      tables: new Set(['Villa', 'Document', 'Photo', 'Staff', 'Owner']),
    });

    socket.emit('villa_subscribed', { villaId, timestamp: new Date() });
    logger.debug(`User ${socket.userId} subscribed to villa ${villaId}`);
  }

  /**
   * Unsubscribe from villa-specific updates
   */
  private async unsubscribeFromVilla(socket: AuthenticatedSocket, villaId: string): Promise<void> {
    if (!socket.userId) return;

    const roomName = `villa:${villaId}`;
    socket.leave(roomName);

    // Remove subscription tracking
    const subscriptionKey = `${socket.userId}:${villaId}`;
    this.roomSubscriptions.delete(subscriptionKey);

    socket.emit('villa_unsubscribed', { villaId, timestamp: new Date() });
    logger.debug(`User ${socket.userId} unsubscribed from villa ${villaId}`);
  }

  /**
   * Subscribe to table-specific updates
   */
  private async subscribeToTable(
    socket: AuthenticatedSocket,
    tableName: string,
    villaId?: string
  ): Promise<void> {
    if (!socket.userId) {
      throw new Error('Socket not authenticated');
    }

    // Check permissions based on table and user role
    if (!this.canAccessTable(socket, tableName, villaId)) {
      throw new Error('Insufficient permissions to access table');
    }

    const roomName = villaId ? `table:${tableName}:${villaId}` : `table:${tableName}`;
    socket.join(roomName);

    socket.emit('table_subscribed', { table: tableName, villaId, timestamp: new Date() });
    logger.debug(`User ${socket.userId} subscribed to table ${tableName}${villaId ? ` for villa ${villaId}` : ''}`);
  }

  /**
   * Check if user can access a specific villa
   */
  private canAccessVilla(socket: AuthenticatedSocket, villaId: string): boolean {
    if (socket.userRole === 'admin' || socket.userRole === 'manager') {
      return true;
    }
    
    return socket.villaId === villaId;
  }

  /**
   * Check if user can access a specific table
   */
  private canAccessTable(socket: AuthenticatedSocket, tableName: string, villaId?: string): boolean {
    // Admin can access everything
    if (socket.userRole === 'admin') {
      return true;
    }

    // Manager can access most tables
    if (socket.userRole === 'manager') {
      return !['BankDetails', 'OTACredentials'].includes(tableName);
    }

    // Owner can access their villa's data
    if (socket.userRole === 'owner' && socket.villaId === villaId) {
      return !['Staff'].includes(tableName);
    }

    return false;
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
      
      // Clean up subscriptions
      for (const [key, subscription] of this.roomSubscriptions) {
        if (subscription.userId === socket.userId) {
          this.roomSubscriptions.delete(key);
        }
      }

      // Stop ElectricSQL sync - DISABLED
      // electricSQLService.stopSync(socket.userId).catch(error => {
      //   logger.error('Failed to stop ElectricSQL sync:', error);
      // });

      logger.info(`🔌 Client disconnected: ${socket.id} (${socket.userId}) - ${reason}`);
    }
  }

  /**
   * Handle force sync requests
   */
  private async handleForceSyncRequest(
    socket: AuthenticatedSocket,
    data: { table: string; villaId?: string }
  ): Promise<void> {
    if (!socket.userId) {
      throw new Error('Socket not authenticated');
    }

    if (!this.canAccessTable(socket, data.table, data.villaId)) {
      throw new Error('Insufficient permissions');
    }

    try {
      // await electricSQLService.forceSync(data.table); // ElectricSQL disabled
      socket.emit('sync_completed', { table: data.table, timestamp: new Date() });
    } catch (error) {
      socket.emit('sync_error', { table: data.table, error: (error as Error).message });
    }
  }

  /**
   * Set up ElectricSQL integration for real-time data changes
   */
  private setupElectricSQLIntegration(): void {
    // ElectricSQL subscriptions are now handled per-user authentication
    // instead of global subscriptions during service initialization
    logger.info('ElectricSQL integration setup - subscriptions will be handled per authenticated user');
  }

  /**
   * Broadcast data change to relevant clients
   */
  private broadcastDataChange(tableName: string, change: any): void {
    if (!this.io) return;

    const message: WebSocketMessage = {
      type: 'data_change',
      table: tableName,
      operation: change.operation,
      data: change.data,
      timestamp: change.timestamp || new Date(),
      metadata: change.metadata,
    };

    // Broadcast to relevant rooms based on the data
    const rooms = this.getRelevantRooms(tableName, change.data);
    
    for (const room of rooms) {
      this.io.to(room).emit('data_change', message);
    }

    logger.debug(`Broadcasted ${change.operation} for ${tableName} to ${rooms.length} rooms`);
  }

  /**
   * Get relevant rooms for a data change based on table and data
   */
  private getRelevantRooms(tableName: string, data: any): string[] {
    const rooms: string[] = [];

    // Global table room
    rooms.push(`table:${tableName}`);

    // Villa-specific rooms
    if (data.villaId) {
      rooms.push(`villa:${data.villaId}`);
      rooms.push(`table:${tableName}:${data.villaId}`);
    }

    // Role-based rooms
    if (['BankDetails', 'OTACredentials'].includes(tableName)) {
      rooms.push('role:admin');
      if (data.villaId) {
        rooms.push(`role:owner:${data.villaId}`);
      }
    } else {
      rooms.push('role:admin');
      rooms.push('role:manager');
    }

    return rooms;
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: WebSocketMessage): void {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('message', message);
    }
  }

  /**
   * Broadcast message to villa subscribers
   */
  broadcastToVilla(villaId: string, message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.to(`villa:${villaId}`).emit('message', message);
  }

  /**
   * Broadcast message to role
   */
  broadcastToRole(role: string, message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit('message', message);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.roomSubscriptions.size;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    connectedUsers: number;
    activeSubscriptions: number;
    electricSQLStatus: any;
  } {
    return {
      initialized: this.isInitialized,
      connectedUsers: this.getConnectedUsersCount(),
      activeSubscriptions: this.getActiveSubscriptionsCount(),
      electricSQLStatus: { connected: false, subscriptionsCount: 0, authContext: null }, // electricSQLService.getSyncStatus(),
    };
  }

  /**
   * Send sync status to all connected clients
   */
  broadcastSyncStatus(): void {
    if (!this.io) return;

    const status = { connected: false, subscriptionsCount: 0, authContext: null }; // electricSQLService.getSyncStatus();
    const message: WebSocketMessage = {
      type: 'sync_status',
      data: status,
      timestamp: new Date(),
    };

    this.io.emit('sync_status', message);
  }

  /**
   * Clean up and close WebSocket server
   */
  async cleanup(): Promise<void> {
    try {
      if (this.io) {
        // Disconnect all clients
        this.io.disconnectSockets(true);
        this.io.close();
        this.io = null;
      }

      this.connectedUsers.clear();
      this.roomSubscriptions.clear();
      this.isInitialized = false;

      logger.info('[OK] WebSocket service cleaned up');
    } catch (error) {
      logger.error('[ERROR] Error during WebSocket service cleanup:', error);
    }
  }
}

export default new WebSocketService();
export { WebSocketService, WebSocketMessage, AuthenticatedSocket };