import { type FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileBarChart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useLoans } from '../hooks/useLoans';
import { formatCurrency } from '@/shared/utils/currency';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { SkeletonCard, SkeletonSummary } from '@/shared/components/Skeleton';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const LoanCard: FC<{ loan: any; onClick: () => void }> = ({ loan, onClick }) => {
  const progress =
    loan.initial_amount > 0
      ? ((loan.initial_amount - loan.current_balance) / loan.initial_amount) * 100
      : 0;
  const isPaid = progress >= 100;

  return (
    <motion.div variants={item}>
      <Card
        className="p-6 cursor-pointer hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 group relative overflow-hidden"
        onClick={onClick}
      >
        <div className="absolute top-0 right-0 p-6 opacity-[0.04] group-hover:opacity-10 transition-opacity">
          <Wallet className="w-24 h-24 text-primary-600 transform rotate-12 translate-x-4 -translate-y-4" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">
                {loan.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                {formatCurrency(loan.initial_amount)} Inicial
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              }`}
            >
              {progress.toFixed(0)}%
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              Saldo Pendiente
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(loan.current_balance)}
            </p>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ${
                isPaid ? 'bg-emerald-500' : 'bg-primary-600'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
            <span>{loan.interest_rate}% interés quincenal</span>
            <span className="group-hover:translate-x-1 transition-transform text-primary-600 font-medium flex items-center">
              Ver detalles &rarr;
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const LoanListPage: FC = () => {
  const { data: loans, isLoading, error } = useLoans();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const totalDebt = loans?.reduce((s, l) => s + l.current_balance, 0) ?? 0;
  const totalInitial = loans?.reduce((s, l) => s + l.initial_amount, 0) ?? 0;
  const totalPaid = totalInitial - totalDebt;
  const globalProgress = totalInitial > 0 ? (totalPaid / totalInitial) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonSummary />
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<FileBarChart className="w-8 h-8" />}
        title="Error al cargar préstamos"
        description={error.message}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-8">
      {/* Summary Section */}
      <motion.div variants={item}>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">
          Resumen General
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Deuda Total Activa</p>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalDebt)}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Capital Amortizado</p>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalPaid)}
            </p>
          </Card>
          <Card className="p-5 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm text-slate-500">Progreso Global</p>
              <span className="text-lg font-bold text-primary-600">
                {globalProgress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Loans Header */}
      <motion.div variants={item} className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Mis Préstamos
          {loans && <span className="text-slate-400 font-normal text-lg ml-2">({loans.length})</span>}
        </h2>
        <Button onClick={() => navigate('/loans/new')} icon={<Plus className="w-5 h-5" />}>
          Nuevo Préstamo
        </Button>
      </motion.div>

      {/* Loans Grid */}
      {loans && loans.length > 0 ? (
        <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loans.map((loan) => (
            <LoanCard
              key={loan.$id}
              loan={loan}
              onClick={() => navigate(`/loans/${loan.$id}`)}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="No tienes préstamos activos"
            description="Comienza agregando tu primer préstamo para tomar el control."
            action={
              <Button onClick={() => navigate('/loans/new')} icon={<Plus className="w-5 h-5" />}>
                Agregar Préstamo
              </Button>
            }
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default LoanListPage;
