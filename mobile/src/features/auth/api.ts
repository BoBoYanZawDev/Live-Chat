import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { useAuthStore } from '../../stores/auth.store';
import type { CustomerLoginResponse } from '../../types';

export function useLogin() {
  return useMutation({
    mutationFn: (input: { name: string; phone: string }) =>
      api<CustomerLoginResponse>('/customer/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: ({ token, customer, conversation }) => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.conversation, conversation);
      useAuthStore.getState().setSession(token, customer);
    },
  });
}

/** Best-effort server logout; the local session is always cleared. */
export async function logout() {
  try {
    await api<void>('/customer/auth/logout', { method: 'POST' });
  } catch {
    // ignore: token may already be invalid or the server unreachable
  }
  useAuthStore.getState().clear();
}

export const NAME_MAX = 60;
const PHONE_RE = /^[0-9+\-\s]{6,20}$/;

export function validateLogin(name: string, phone: string) {
  const errors: { name?: string; phone?: string } = {};
  const n = name.trim();
  const p = phone.trim();
  if (!n) errors.name = 'Please enter your name';
  else if (n.length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters`;
  if (!p) errors.phone = 'Please enter your phone number';
  else if (!PHONE_RE.test(p)) errors.phone = 'Use 6–20 digits (spaces, + and - allowed)';
  return errors;
}
