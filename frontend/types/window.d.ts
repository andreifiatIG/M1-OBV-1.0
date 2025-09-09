declare global {
  interface Window {
    __lastBackendErrorTime?: number;
    __backendErrorLogged?: boolean;
  }
}

export {};
