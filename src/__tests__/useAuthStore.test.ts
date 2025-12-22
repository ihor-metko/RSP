import { act } from '@testing-library/react';
import { useAuthStore } from '@/stores/useAuthStore';

// Mock fetch
global.fetch = jest.fn();

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    act(() => {
      useAuthStore.setState({
        socketToken: null,
        isLoadingToken: false,
        tokenError: null,
        tokenPromise: null,
      });
    });
  });

  describe('getSocketToken', () => {
    it('should fetch and cache socket token', async () => {
      const mockToken = 'test-socket-token-123';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      let token: string | null = null;
      await act(async () => {
        token = await useAuthStore.getState().getSocketToken();
      });

      expect(token).toBe(mockToken);
      expect(useAuthStore.getState().socketToken).toBe(mockToken);
      expect(useAuthStore.getState().isLoadingToken).toBe(false);
      expect(useAuthStore.getState().tokenError).toBe(null);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/socket/token');
    });

    it('should return cached token without fetching again', async () => {
      const mockToken = 'cached-token-456';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      // First call - should fetch
      await act(async () => {
        await useAuthStore.getState().getSocketToken();
      });

      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should return cached
      let cachedToken: string | null = null;
      await act(async () => {
        cachedToken = await useAuthStore.getState().getSocketToken();
      });

      expect(cachedToken).toBe(mockToken);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should handle inflight requests (deduplication)', async () => {
      const mockToken = 'inflight-token-789';
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(delayedPromise);

      // Start two concurrent requests
      const promise1 = useAuthStore.getState().getSocketToken();
      const promise2 = useAuthStore.getState().getSocketToken();

      // Resolve the fetch
      setTimeout(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ token: mockToken }),
        });
      }, 10);

      const [token1, token2] = await Promise.all([promise1, promise2]);

      expect(token1).toBe(mockToken);
      expect(token2).toBe(mockToken);
      expect(fetch).toHaveBeenCalledTimes(1); // Only one fetch despite two calls
    });

    it('should handle 401 authentication error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      let token: string | null = null;
      await act(async () => {
        token = await useAuthStore.getState().getSocketToken();
      });

      expect(token).toBe(null);
      expect(useAuthStore.getState().socketToken).toBe(null);
      expect(useAuthStore.getState().tokenError).toBe('Unauthorized');
      expect(useAuthStore.getState().isLoadingToken).toBe(false);
    });

    it('should handle 403 forbidden error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      let token: string | null = null;
      await act(async () => {
        token = await useAuthStore.getState().getSocketToken();
      });

      expect(token).toBe(null);
      expect(useAuthStore.getState().tokenError).toBe('Unauthorized');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(mockError);

      let token: string | null = null;
      await act(async () => {
        token = await useAuthStore.getState().getSocketToken();
      });

      expect(token).toBe(null);
      expect(useAuthStore.getState().socketToken).toBe(null);
      expect(useAuthStore.getState().tokenError).toBe('Network error');
      expect(useAuthStore.getState().isLoadingToken).toBe(false);
    });

    it('should handle server errors (500)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      let token: string | null = null;
      await act(async () => {
        token = await useAuthStore.getState().getSocketToken();
      });

      expect(token).toBe(null);
      expect(useAuthStore.getState().tokenError).toContain('Failed to get socket token: 500');
    });
  });

  describe('clearSocketToken', () => {
    it('should clear cached token and reset state', async () => {
      const mockToken = 'token-to-clear';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      // First, set a token
      await act(async () => {
        await useAuthStore.getState().getSocketToken();
      });

      expect(useAuthStore.getState().socketToken).toBe(mockToken);

      // Now clear it
      act(() => {
        useAuthStore.getState().clearSocketToken();
      });

      expect(useAuthStore.getState().socketToken).toBe(null);
      expect(useAuthStore.getState().isLoadingToken).toBe(false);
      expect(useAuthStore.getState().tokenError).toBe(null);
      expect(useAuthStore.getState().tokenPromise).toBe(null);
    });

    it('should allow fetching new token after clearing', async () => {
      const mockToken1 = 'first-token';
      const mockToken2 = 'second-token';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken1 }),
      });

      // Get first token
      await act(async () => {
        await useAuthStore.getState().getSocketToken();
      });

      expect(useAuthStore.getState().socketToken).toBe(mockToken1);

      // Clear token
      act(() => {
        useAuthStore.getState().clearSocketToken();
      });

      // Mock second fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken2 }),
      });

      // Get new token
      await act(async () => {
        await useAuthStore.getState().getSocketToken();
      });

      expect(useAuthStore.getState().socketToken).toBe(mockToken2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
