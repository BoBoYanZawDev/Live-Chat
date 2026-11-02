import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { disconnectSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/auth.store';
import { usePortalStore } from '../../stores/portal.store';
import type { OperatorLoginResponse } from '../../types';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api<OperatorLoginResponse>('/operator/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    onSuccess: ({ operator, token }) => setSession(operator, token),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api<void>('/operator/auth/logout', { method: 'POST' }),
    onSettled: () => {
      disconnectSocket();
      useAuthStore.getState().clear();
      usePortalStore.getState().reset();
      queryClient.clear();
    },
  });
}
