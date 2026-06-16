import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';
import * as loanService from '../services/loanService';
import { calculateSuggestedPayment } from '@/shared/utils/amortization';
import type { NewLoan } from '@/shared/types';

export function useLoans() {
  const userId = useAuthStore((s) => s.user?.$id);

  return useQuery({
    queryKey: ['loans', userId],
    queryFn: () => loanService.getLoans(userId!),
    enabled: !!userId,
  });
}

export function useLoan(loanId: string) {
  return useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => loanService.getLoan(loanId),
    enabled: !!loanId,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.$id);
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (data: NewLoan) => {
      const suggestedPayment = calculateSuggestedPayment(
        data.initial_amount,
        data.interest_rate,
        data.term_months
      );
      return loanService.createLoan({
        ...data,
        suggested_payment: suggestedPayment,
        user_id: userId!,
        current_balance: data.initial_amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', userId] });
      addToast({ type: 'success', message: 'Préstamo creado exitosamente' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al crear préstamo' });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: string; data: Partial<any> }) =>
      loanService.updateLoan(loanId, data),
    onSuccess: (_, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      addToast({ type: 'success', message: 'Préstamo actualizado' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al actualizar' });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.$id);
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (loanId: string) => loanService.deleteLoan(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', userId] });
      addToast({ type: 'success', message: 'Préstamo eliminado' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al eliminar' });
    },
  });
}
