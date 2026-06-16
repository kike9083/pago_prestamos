import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/shared/store/uiStore';
import * as loanService from '../services/loanService';
import type { Payment } from '@/shared/types';

export function usePayments(loanId: string) {
  return useQuery({
    queryKey: ['payments', loanId],
    queryFn: () => loanService.getPayments(loanId),
    enabled: !!loanId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (data: Omit<Payment, '$id'>) => loanService.createPayment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['loan', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      addToast({ type: 'success', message: 'Pago registrado exitosamente' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al registrar pago' });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: Partial<Payment> }) =>
      loanService.updatePayment(paymentId, data),
    onSuccess: (_, { data }) => {
      if (data.loan_id) {
        queryClient.invalidateQueries({ queryKey: ['payments', data.loan_id] });
        queryClient.invalidateQueries({ queryKey: ['loan', data.loan_id] });
      }
      addToast({ type: 'success', message: 'Pago actualizado' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al actualizar pago' });
    },
  });
}
