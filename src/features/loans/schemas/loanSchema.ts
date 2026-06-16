import { z } from 'zod';

export const loanSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es muy largo'),
  initial_amount: z
    .number({ message: 'Monto inválido' })
    .positive('El monto debe ser mayor a 0'),
  interest_rate: z
    .number({ message: 'Tasa inválida' })
    .min(0, 'La tasa no puede ser negativa'),
  term_months: z
    .number({ message: 'Plazo inválido' })
    .int('Debe ser un número entero')
    .positive('El plazo debe ser mayor a 0'),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
});

export const paymentSchema = z.object({
  amount_paid: z
    .number({ message: 'Monto inválido' })
    .positive('El monto debe ser mayor a 0'),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
});

export type LoanFormData = z.infer<typeof loanSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
