// Global type declarations for M1 Backend PostgreSQL

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        villaId?: string;
      };
    }
  }
}

// New ElectricSQL Shape API type definitions
declare module '@electric-sql/react' {
  export interface ShapeConfig {
    url: string;
    params?: {
      table: string;
      where?: string;
      columns?: string[];
    };
  }

  export interface ShapeData {
    [key: string]: any;
  }

  export interface ElectricShape {
    data: ShapeData[];
    isLoading: boolean;
    error?: Error;
  }

  export function useShape(config: ShapeConfig): ElectricShape;
}

// Mock winston types
declare module 'winston' {
  export interface Logger {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  }
  
  export function createLogger(options: any): Logger;
  export const format: any;
  export const transports: any;
}

export {};