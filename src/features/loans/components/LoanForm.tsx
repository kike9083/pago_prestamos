import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { loanSchema, type LoanFormData } from '../schemas/loanSchema';
import { useCreateLoan, useUpdateLoan } from '../hooks/useLoans';
import { toYYYYMMDD } from '@/shared/utils/amortization';
import type { Loan } from '@/shared/types';

interface LoanFormProps {
  loan?: Loan;
  onSuccess?: () => void;
}

export const LoanFormComponent: FC<LoanFormProps> = ({ loan, onSuccess }) => {
  const navigate = useNavigate();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const isEditing = !!loan;

  const { register, handleSubmit, formState: { errors } } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: loan ? {
      name: loan.name,
      initial_amount: loan.initial_amount,
      interest_rate: loan.interest_rate,
      term_months: loan.term_months,
      start_date: loan.start_date,
    } : {
      name: '',
      initial_amount: undefined as any,
      interest_rate: undefined as any,
      term_months: undefined as any,
      start_date: toYYYYMMDD(new Date()),
    },
  });

  const onSubmit = async (data: LoanFormData) => {
    if (isEditing && loan) {
      const newSuggestedPayment = ((data.interest_rate * 2) / 100) * data.initial_amount / 
        (1 - Math.pow(1 + ((data.interest_rate * 2) / 100), -data.term_months)) || 
        data.initial_amount / data.term_months;
      
      await updateLoan.mutateAsync({
        loanId: loan.$id,
        data: {
          name: data.name,
          interest_rate: data.interest_rate,
          term_months: data.term_months,
          suggested_payment: isNaN(newSuggestedPayment) ? 0 : newSuggestedPayment,
        },
      });
    } else {
      await createLoan.mutateAsync(data);
    }
    
    if (onSuccess) onSuccess();
    navigate('/loans');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="name"
              label="Nombre del Préstamo"
              placeholder="Ej: Préstamo Personal"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              id="initial_amount"
              label="Monto Inicial ($)"
              type="number"
              step="0.01"
              placeholder="10000.00"
              error={errors.initial_amount?.message}
              {...register('initial_amount', { valueAsNumber: true })}
              disabled={isEditing}
            />
            <Input
              id="interest_rate"
              label="Tasa de Interés Quincenal (%)"
              type="number"
              step="0.01"
              placeholder="10"
              error={errors.interest_rate?.message}
              {...register('interest_rate', { valueAsNumber: true })}
            />
            <Input
              id="term_months"
              label="Plazo (meses)"
              type="number"
              placeholder="12"
              error={errors.term_months?.message}
              {...register('term_months', { valueAsNumber: true })}
            />
            <Input
              id="start_date"
              label="Fecha de Inicio"
              type="date"
              error={errors.start_date?.message}
              {...register('start_date')}
              disabled={isEditing}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/loans')}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={createLoan.isPending || updateLoan.isPending}
              >
                {isEditing ? 'Guardar Cambios' : 'Guardar Préstamo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
