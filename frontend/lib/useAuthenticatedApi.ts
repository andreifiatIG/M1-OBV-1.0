import { useAuth } from '@clerk/nextjs';
import { ClientApiClient } from './api-client';
import { useMemo } from 'react';

/**
 * Hook to get an authenticated API client instance
 * This ensures the client has the proper token for making authenticated requests
 */
export function useAuthenticatedApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const apiClient = useMemo(() => {
    const client = new ClientApiClient();

    // Override the request method to always use the fresh token
    const originalRequest = client.request.bind(client);
    client.request = async function(endpoint: string, options: RequestInit = {}) {
      try {
        // Get fresh token for each request
        const token = await getToken();
        if (token) {
          this.setToken(token);
        }
        return await originalRequest(endpoint, options);
      } catch (error) {
        console.error('Error in authenticated API request:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    };

    return client;
  }, [getToken]);

  return {
    apiClient,
    isLoaded,
    isSignedIn,
  };
}