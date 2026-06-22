import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/store/authStore';
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

export function getEffectiveBalance(loanInitialAmount: number, payments: Payment[] | undefined): number {
  if (!payments || payments.length === 0) return loanInitialAmount;
  return payments[0].balance_after_payment;
}

export function useAllPaymentsSummary() {
  const userId = useAuthStore((s) => s.user?.$id);
  return useQuery({
    queryKey: ['payments-summary', userId],
    queryFn: () => loanService.getAllPaymentsForUser(userId!),
    enabled: !!userId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: async (data: Omit<Payment, '$id'>) => {
      const payment = await loanService.createPayment(data);
      try {
        await loanService.updateLoan(data.loan_id, {
          current_balance: data.balance_after_payment,
          last_payment_date: data.payment_date,
        });
      } catch {
        // UI siempre usa el balance calculado desde payments
      }
      return payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['loan', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
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
    mutationFn: async ({ paymentId, data }: { paymentId: string; data: Partial<Payment> }) => {
      const updated = await loanService.updatePayment(paymentId, data);
      if (data.loan_id && data.balance_after_payment !== undefined) {
        try {
          await loanService.updateLoan(data.loan_id, {
            current_balance: data.balance_after_payment,
            last_payment_date: data.payment_date,
          });
        } catch {
          // UI siempre usa el balance calculado desde payments
        }
      }
      return updated;
    },
    onSuccess: (_, { data }) => {
      if (data.loan_id) {
        queryClient.invalidateQueries({ queryKey: ['payments', data.loan_id] });
        queryClient.invalidateQueries({ queryKey: ['loan', data.loan_id] });
        queryClient.invalidateQueries({ queryKey: ['loans'] });
        queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      }
      addToast({ type: 'success', message: 'Pago actualizado' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Error al actualizar pago' });
    },
  });
}
