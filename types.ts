import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

export type Session = SupabaseSession;
export type User = SupabaseUser;

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  initial_amount: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  suggested_payment: number;
  last_payment_date?: string | null;
  phone?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  loan_id: string;
  user_id: string;
  payment_date: string;
  amount_paid: number;
  interest_paid: number;
  principal_paid: number;
  balance_after_payment: number;
}

export type NewLoan = {
  name: string;
  initial_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  phone?: string;
};
