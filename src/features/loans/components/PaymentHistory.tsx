import { type FC } from 'react';
import { Card } from '@/shared/components/Card';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { formatCurrency } from '@/shared/utils/currency';
import { formatDate } from '@/shared/utils/date';
import { Pencil } from 'lucide-react';
import type { Payment } from '@/shared/types';

interface PaymentHistoryProps {
  payments: Payment[] | undefined;
  isLoading: boolean;
  onEditPayment: (payment: Payment, index: number) => void;
}

export const PaymentHistory: FC<PaymentHistoryProps> = ({ payments, isLoading, onEditPayment }) => {
  if (isLoading) {
    return <div className="mt-8"><SkeletonTable /></div>;
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="mt-8 text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 text-sm">No hay registros de pagos aún.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
        Historial de Pagos
      </h3>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Fecha</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Monto</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Interés</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Capital</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Saldo</th>
                <th scope="col" className="px-6 py-4 font-medium text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payments.map((p, index) => (
                <tr key={p.$id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">{formatDate(p.payment_date)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.amount_paid)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(p.interest_paid)}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(p.principal_paid)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(p.balance_after_payment)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {index === 0 && (
                      <button
                        onClick={() => onEditPayment(p, index)}
                        className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        title="Editar último pago"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
