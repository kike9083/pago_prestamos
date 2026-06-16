import { useState, useEffect, type FC } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useUpdatePayment } from '../hooks/usePayments';
import { calculateInterestDue } from '@/shared/utils/amortization';
import { formatCurrency } from '@/shared/utils/currency';
import type { Loan, Payment } from '@/shared/types';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  loan: Loan;
  previousBalance: number;
  previousPaymentDate: string;
  onUpdated: () => void;
}

export const EditPaymentModal: FC<EditPaymentModalProps> = ({
  isOpen, onClose, payment, loan, previousBalance, previousPaymentDate, onUpdated,
}) => {
  const [amount, setAmount] = useState(payment.amount_paid.toString());
  const [date, setDate] = useState(payment.payment_date);
  const [isExtraordinary, setIsExtraordinary] = useState(
    payment.interest_paid === 0 && payment.principal_paid > 0
  );
  const [error, setError] = useState('');
  const updatePayment = useUpdatePayment();

  useEffect(() => {
    if (isOpen) {
      setAmount(payment.amount_paid.toString());
      setDate(payment.payment_date);
      setIsExtraordinary(payment.interest_paid === 0 && payment.principal_paid > 0);
      setError('');
    }
  }, [isOpen, payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Monto inválido.');
      return;
    }

    let interestPaid = 0;
    let principalPaid = parsedAmount;

    if (!isExtraordinary) {
      const { interest } = calculateInterestDue(
        previousBalance, loan.interest_rate,
        previousPaymentDate === loan.start_date ? null : previousPaymentDate,
        loan.start_date, date
      );
      if (parsedAmount < interest) {
        setError(`El monto debe cubrir al menos el interés de ${formatCurrency(interest)}.`);
        return;
      }
      interestPaid = interest;
      principalPaid = parsedAmount - interest;
    }

    const newBalance = Math.max(0, previousBalance - principalPaid);

    await updatePayment.mutateAsync({
      paymentId: payment.$id,
      data: {
        amount_paid: parsedAmount,
        payment_date: date,
        interest_paid: interestPaid,
        principal_paid: principalPaid,
        balance_after_payment: newBalance,
        loan_id: payment.loan_id,
      },
    });

    onUpdated();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Último Pago">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm dark:bg-blue-900/20 dark:text-blue-300">
          <p>
            Estás editando el pago más reciente. El saldo se recalculará en base al saldo anterior de{' '}
            <strong>{formatCurrency(previousBalance)}</strong>.
          </p>
        </div>

        <Input
          id="edit-pay-amount"
          label="Monto Pagado"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Input
          id="edit-pay-date"
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isExtraordinary}
            onChange={(e) => setIsExtraordinary(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Pago Extraordinario (Sin intereses)
          </span>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={updatePayment.isPending}>Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
};
