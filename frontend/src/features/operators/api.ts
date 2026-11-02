import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryClient, queryKeys } from '../../lib/queryClient';
import type { Operator, OperatorRole } from '../../types';

export { useOperators } from '../conversation/api';

const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.operators });

export function useCreateOperator() {
  return useMutation({
    mutationFn: (data: { email: string; name: string; password: string; role: OperatorRole }) =>
      api<Operator>('/operators', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  });
}

export function useUpdateOperator() {
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; role?: OperatorRole; isActive?: boolean; password?: string }) =>
      api<Operator>(`/operators/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: refresh,
  });
}
