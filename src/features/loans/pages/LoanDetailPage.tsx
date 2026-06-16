import { useState, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useLoan, useDeleteLoan } from '../hooks/useLoans';
import { usePayments } from '../hooks/usePayments';
import { PaymentForm } from '../components/PaymentForm';
import { PaymentHistory } from '../components/PaymentHistory';
import { EditPaymentModal } from '../components/EditPaymentModal';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { SkeletonSummary } from '@/shared/components/Skeleton';
import { formatCurrency } from '@/shared/utils/currency';
import type { Payment } from '@/shared/types';

const LoanDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: loan, isLoading: loanLoading } = useLoan(id!);
  const { data: payments, isLoading: paymentsLoading, refetch } = usePayments(id!);
  const deleteLoan = useDeleteLoan();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [prevBalance, setPrevBalance] = useState(0);
  const [prevDate, setPrevDate] = useState('');

  const handleEditPayment = (payment: Payment, index: number) => {
    const pBalance = payment.balance_after_payment + payment.principal_paid;
    setPrevBalance(pBalance);
    const pDate = index < (payments?.length ?? 0) - 1
      ? (payments ?? [])[index + 1].payment_date
      : loan?.start_date ?? '';
    setPrevDate(pDate);
    setEditingPayment(payment);
  };

  if (loanLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <SkeletonSummary />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-4 sm:p-6">
        <button onClick={() => navigate('/loans')} className="text-sm text-primary-600 hover:underline flex items-center mb-4">
          &larr; Volver
        </button>
        <p className="text-slate-500">Préstamo no encontrado.</p>
      </div>
    );
  }

  const principalPaid = loan.initial_amount - loan.current_balance;
  const progress = loan.initial_amount > 0 ? (principalPaid / loan.initial_amount) * 100 : 0;
  const totalInterest = payments?.reduce((s, p) => s + p.interest_paid, 0) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate('/loans')} className="text-sm text-primary-600 hover:underline flex items-center p-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a todos los préstamos
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/loans/${loan.$id}/edit`)} icon={<Pencil className="w-4 h-4" />}>
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)} icon={<Trash2 className="w-4 h-4" />}>
            Eliminar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-1">Saldo Restante</p>
          <p className="text-3xl font-bold text-primary-600">{formatCurrency(loan.current_balance)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-1">Progreso de Pago</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{progress.toFixed(1)}%</p>
            <p className="text-sm text-slate-400 mb-1.5">completado</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 dark:bg-slate-700">
            <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-1">Intereses Pagados</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totalInterest)}</p>
        </Card>
      </div>

      {/* Payment Form */}
      {loan.current_balance > 0 && (
        <PaymentForm loan={loan} onPaymentSuccess={() => refetch()} />
      )}

      {/* Payment History */}
      <PaymentHistory
        payments={payments}
        isLoading={paymentsLoading}
        onEditPayment={handleEditPayment}
      />

      {/* Edit Payment Modal */}
      {editingPayment && loan && (
        <EditPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          loan={loan}
          previousBalance={prevBalance}
          previousPaymentDate={prevDate}
          onUpdated={() => {
            setEditingPayment(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmar Eliminación">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Esta acción es irreversible y borrará todo el historial de pagos asociado.
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            ¿Estás seguro de que quieres eliminar <strong>{loan.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="danger"
              isLoading={deleteLoan.isPending}
              onClick={async () => {
                await deleteLoan.mutateAsync(loan.$id);
                navigate('/loans');
              }}
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default LoanDetailPage;
