import { useState, useEffect, type FC } from 'react';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useCreatePayment } from '../hooks/usePayments';
import { calculateInterestDue, toYYYYMMDD } from '@/shared/utils/amortization';
import { formatCurrency } from '@/shared/utils/currency';
import { Banknote } from 'lucide-react';
import type { Loan } from '@/shared/types';

interface PaymentFormProps {
  loan: Loan;
  onPaymentSuccess: () => void;
}

export const PaymentForm: FC<PaymentFormProps> = ({ loan, onPaymentSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(toYYYYMMDD(new Date()));
  const [isExtraordinary, setIsExtraordinary] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    interest: number; principal: number; newBalance: number; fortnights: number;
  } | null>(null);

  const createPayment = useCreatePayment();

  useEffect(() => {
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount) && parsedAmount > 0 && paymentDate) {
      if (isExtraordinary) {
        const newBal = Math.max(0, loan.current_balance - parsedAmount);
        setBreakdown({ interest: 0, principal: parsedAmount, newBalance: newBal, fortnights: 0 });
      } else {
        const { interest, fortnights } = calculateInterestDue(
          loan.current_balance, loan.interest_rate,
          loan.last_payment_date, loan.start_date, paymentDate
        );
        const principal = Math.max(0, parsedAmount - interest);
        const newBal = Math.max(0, loan.current_balance - principal);
        setBreakdown({ interest, principal, newBalance: newBal, fortnights });
      }
    } else {
      setBreakdown(null);
    }
  }, [amount, paymentDate, loan, isExtraordinary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isExtraordinary) {
      await createPayment.mutateAsync({
        loan_id: loan.$id,
        user_id: loan.user_id,
        payment_date: paymentDate,
        amount_paid: parsedAmount,
        interest_paid: 0,
        principal_paid: parsedAmount,
        balance_after_payment: Math.max(0, loan.current_balance - parsedAmount),
      });
    } else {
      const { interest } = calculateInterestDue(
        loan.current_balance, loan.interest_rate,
        loan.last_payment_date, loan.start_date, paymentDate
      );
      const principal = parsedAmount - interest;
      const newBalance = Math.max(0, loan.current_balance - principal);

      await createPayment.mutateAsync({
        loan_id: loan.$id,
        user_id: loan.user_id,
        payment_date: paymentDate,
        amount_paid: parsedAmount,
        interest_paid: interest,
        principal_paid: principal,
        balance_after_payment: newBalance,
      });
    }

    setAmount('');
    setPaymentDate(toYYYYMMDD(new Date()));
    setIsExtraordinary(false);
    setBreakdown(null);
    onPaymentSuccess();
  };

  const parsedAmount = parseFloat(amount);
  const isAmountInvalid = isNaN(parsedAmount) || parsedAmount <= 0;
  const isBelowInterest = breakdown && parsedAmount < breakdown.interest && !isExtraordinary;

  return (
    <Card className="mb-8 overflow-hidden border-0 shadow-md rounded-2xl">
      <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Realizar un Pago
        </h3>
      </div>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <Input
              id="paymentAmount"
              label="Monto a Pagar"
              type="number"
              step="0.01"
              placeholder={loan.suggested_payment.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              id="paymentDate"
              label="Fecha del Pago"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <Button
              type="submit"
              isLoading={createPayment.isPending}
              disabled={isAmountInvalid || !!isBelowInterest}
              className="h-[42px] w-full shadow-sm"
            >
              Registrar Pago
            </Button>
          </div>

          <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={isExtraordinary}
              onChange={(e) => setIsExtraordinary(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pago Extraordinario (100% a capital)
            </span>
          </label>
        </form>

        {breakdown && (
          <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              Desglose Estimado
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">
                  Interés a cubrir
                </span>
                <span className={`text-lg font-medium ${isExtraordinary ? 'text-slate-400 line-through' : 'text-indigo-900 dark:text-indigo-100'}`}>
                  {formatCurrency(breakdown.interest)}
                </span>
                {!isExtraordinary && (
                  <span className="block text-[10px] text-indigo-500 mt-0.5">
                    {breakdown.fortnights} {breakdown.fortnights === 1 ? 'quincena' : 'quincenas'}
                  </span>
                )}
              </div>
              <div>
                <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">Abono a Capital</span>
                <span className="text-lg font-medium text-indigo-900 dark:text-indigo-100">{formatCurrency(breakdown.principal)}</span>
              </div>
              <div>
                <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">Saldo Final</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(breakdown.newBalance)}</span>
              </div>
            </div>
            {isBelowInterest && amount && (
              <p className="mt-2 text-red-500 text-xs font-medium bg-red-50 p-2 rounded border border-red-100">
                El monto es insuficiente para cubrir el interés acumulado.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
