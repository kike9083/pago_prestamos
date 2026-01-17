
import React, { useState, useEffect, useCallback, FC } from 'react';
import { supabase } from '../services/supabase';
import type { Loan, Payment, Session, NewLoan } from '../types';
import { calculateSuggestedPayment, calculateInterestDue, toYYYYMMDD } from '../utils/amortization';
import { Button, Card, CardContent, CardHeader, Input, Modal, Spinner, Icons } from './ui';

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    });
};

// RefinanceLoanModal Component
const RefinanceLoanModal: FC<{ isOpen: boolean; onClose: () => void; loan: Loan; onLoanUpdated: () => void; }> = ({ isOpen, onClose, loan, onLoanUpdated }) => {
    const [additionalAmount, setAdditionalAmount] = useState('');
    const [date, setDate] = useState(toYYYYMMDD(new Date()));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const amount = parseFloat(additionalAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Por favor, introduce un monto válido y mayor que cero.');
            setIsLoading(false);
            return;
        }

        try {
            // Optimistic update: Increase both initial_amount and current_balance
            const newInitial = loan.initial_amount + amount;
            const newBalance = loan.current_balance + amount;

            const { error: loanError } = await supabase
                .from('loans')
                .update({
                    initial_amount: newInitial,
                    current_balance: newBalance,
                    // We could optionally update last_payment_date or add a 'disbursement' record if we had a table for it.
                    // For now, simple balance adjustment.
                })
                .eq('id', loan.id);

            if (loanError) throw loanError;

            onLoanUpdated();
            onClose();
            setAdditionalAmount('');
            setDate(toYYYYMMDD(new Date()));
        } catch (err: any) {
            console.error("Error refinancing loan:", err);
            setError('Error al actualizar el préstamo: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Refinanciar / Agregar Capital">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl border border-primary/10 text-xs text-primary font-medium leading-relaxed">
                    <p className="flex items-start gap-2">
                        <span className="material-icons-round text-sm mt-0.5">info</span>
                        Esta acción sumará el monto ingresado tanto al <strong>Capital Inicial</strong> como al <strong>Saldo Restante</strong>.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="refinanceAmount">Monto a agregar ($)</label>
                        <input
                            id="refinanceAmount"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={additionalAmount}
                            onChange={e => setAdditionalAmount(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {error && <p className="text-xs text-accent-red font-medium bg-accent-red/5 p-3 rounded-lg border border-accent-red/10">{error}</p>}

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" color="white" /> : (
                            <>
                                <span className="material-icons-round">monetization_on</span>
                                Agregar Capital
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="w-full bg-gray-100 dark:bg-gray-800 text-text-light dark:text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// AddLoanModal Component
const AddLoanModal: FC<{ isOpen: boolean; onClose: () => void; onLoanAdded: () => void; user_id: string; }> = ({ isOpen, onClose, onLoanAdded, user_id }) => {
    const [loanName, setLoanName] = useState('');
    const [phone, setPhone] = useState('');
    const [initialAmount, setInitialAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [termMonths, setTermMonths] = useState('');
    const [startDate, setStartDate] = useState(toYYYYMMDD(new Date()));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const parsedAmount = parseFloat(initialAmount);
        const parsedRate = parseFloat(interestRate);
        const parsedTerm = parseInt(termMonths, 10);

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Por favor, introduce un monto total válido y mayor que cero.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedRate) || parsedRate < 0) {
            setError('Por favor, introduce una tasa de interés válida.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedTerm) || parsedTerm <= 0) {
            setError('Por favor, introduce un plazo en meses válido y mayor que cero.');
            setIsLoading(false);
            return;
        }

        const loanData: NewLoan = {
            name: loanName,
            initial_amount: parsedAmount,
            interest_rate: parsedRate,
            term_months: parsedTerm,
            start_date: startDate,
        };

        const suggestedPayment = calculateSuggestedPayment(loanData.initial_amount, loanData.interest_rate, loanData.term_months);

        try {
            const { error: loanError } = await supabase
                .from('loans')
                .insert({
                    ...loanData,
                    suggested_payment: suggestedPayment,
                    user_id,
                    phone,
                    current_balance: loanData.initial_amount, // Balance inicial es el monto total
                })
                .select()
                .single();

            if (loanError) throw loanError;

            onLoanAdded();
            onClose();
            // Reset form
            setLoanName('');
            setInitialAmount('');
            setInterestRate('');
            setTermMonths('');
            setStartDate(toYYYYMMDD(new Date()));
        } catch (err: any) {
            console.error("Error saving loan:", err);
            setError('Error al guardar el préstamo: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Préstamo">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="loanName">Título del préstamo</label>
                        <input
                            id="loanName"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="Ej: Préstamo Personal"
                            value={loanName}
                            onChange={e => setLoanName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="phone">Teléfono (WhatsApp)</label>
                        <input
                            id="phone"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            type="tel"
                            placeholder="Ej: 521..."
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="initialAmount">Monto total ($)</label>
                            <input
                                id="initialAmount"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={initialAmount}
                                onChange={e => setInitialAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="interestRate">Tasa int. (%)</label>
                            <input
                                id="interestRate"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="termMonths">Plazo (meses)</label>
                            <input
                                id="termMonths"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                value={termMonths}
                                onChange={e => setTermMonths(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="startDate">Fecha inicio</label>
                            <input
                                id="startDate"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-xs text-accent-red font-medium bg-accent-red/5 p-3 rounded-lg border border-accent-red/10">{error}</p>}

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" color="white" /> : (
                            <>
                                <span className="material-icons-round">add_circle</span>
                                Crear Préstamo
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="w-full bg-gray-100 dark:bg-gray-800 text-text-light dark:text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// EditLoanModal Component
const EditLoanModal: FC<{ isOpen: boolean; onClose: () => void; loan: Loan; onLoanUpdated: () => void; }> = ({ isOpen, onClose, loan, onLoanUpdated }) => {
    const [name, setName] = useState(loan.name);
    const [phone, setPhone] = useState(loan.phone || '');
    const [interestRate, setInterestRate] = useState(loan.interest_rate.toString());
    const [termMonths, setTermMonths] = useState(loan.term_months.toString());
    const [initialAmount, setInitialAmount] = useState(loan.initial_amount.toString());
    const [currentBalance, setCurrentBalance] = useState(loan.current_balance.toString());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(loan.name);
            setPhone(loan.phone || '');
            setInterestRate(loan.interest_rate.toString());
            setTermMonths(loan.term_months.toString());
            setInitialAmount(loan.initial_amount.toString());
            setCurrentBalance(loan.current_balance.toString());
            setError('');
        }
    }, [isOpen, loan]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const parsedRate = parseFloat(interestRate);
        const parsedTerm = parseInt(termMonths, 10);
        const parsedInitial = parseFloat(initialAmount);
        const parsedBalance = parseFloat(currentBalance);

        if (!name.trim()) {
            setError('El nombre es requerido.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedRate) || parsedRate < 0) {
            setError('Tasa de interés inválida.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedTerm) || parsedTerm <= 0) {
            setError('Plazo inválido.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedInitial) || parsedInitial <= 0) {
            setError('Monto inicial inválido.');
            setIsLoading(false);
            return;
        }
        if (isNaN(parsedBalance) || parsedBalance < 0) {
            setError('Saldo actual inválido.');
            setIsLoading(false);
            return;
        }

        const newSuggestedPayment = calculateSuggestedPayment(parsedInitial, parsedRate, parsedTerm);

        try {
            const { error } = await supabase
                .from('loans')
                .update({
                    name: name.trim(),
                    phone: phone.trim(),
                    interest_rate: parsedRate,
                    term_months: parsedTerm,
                    initial_amount: parsedInitial,
                    current_balance: parsedBalance,
                    suggested_payment: newSuggestedPayment
                })
                .eq('id', loan.id);

            if (error) throw error;

            onLoanUpdated();
            onClose();
        } catch (err: any) {
            setError('Error al actualizar el préstamo: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Datos">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div className="bg-accent-red/5 dark:bg-accent-red/10 p-4 rounded-xl border border-accent-red/10 text-xs text-accent-red font-medium leading-relaxed">
                    <p className="flex items-start gap-2">
                        <span className="material-icons-round text-sm mt-0.5">warning</span>
                        Precaución: Editar el <strong>Monto Inicial</strong> o el <strong>Saldo Actual</strong> afectará los cálculos de intereses y el historial de pagos. Úsalo solo para corregir errores.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-name">Nombre</label>
                        <input
                            id="edit-name"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-phone">WhatsApp</label>
                        <input
                            id="edit-phone"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-initial">Monto Inicial ($)</label>
                            <input
                                id="edit-initial"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                step="0.01"
                                value={initialAmount}
                                onChange={e => setInitialAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-balance">Saldo Actual ($)</label>
                            <input
                                id="edit-balance"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                step="0.01"
                                value={currentBalance}
                                onChange={e => setCurrentBalance(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-rate">Int. (%)</label>
                            <input
                                id="edit-rate"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                step="0.01"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-term">Meses</label>
                            <input
                                id="edit-term"
                                className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                type="number"
                                value={termMonths}
                                onChange={e => setTermMonths(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-xs text-accent-red font-medium bg-accent-red/5 p-3 rounded-lg border border-accent-red/10">{error}</p>}

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" color="white" /> : (
                            <>
                                <span className="material-icons-round">save</span>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="w-full bg-gray-100 dark:bg-gray-800 text-text-light dark:text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// EditPaymentModal Component
const EditPaymentModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    payment: Payment;
    loan: Loan;
    previousBalance: number;
    previousPaymentDate: string; // Date of the payment BEFORE this one (or start date)
    onPaymentUpdated: () => void;
}> = ({ isOpen, onClose, payment, loan, previousBalance, previousPaymentDate, onPaymentUpdated }) => {
    const [amount, setAmount] = useState(payment.amount_paid.toString());
    const [date, setDate] = useState(payment.payment_date);
    const [isExtraordinary, setIsExtraordinary] = useState(payment.interest_paid === 0 && payment.principal_paid > 0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount(payment.amount_paid.toString());
            setDate(payment.payment_date);
            // Heuristic: if interest is 0 and there was principal, assume extraordinary.
            setIsExtraordinary(payment.interest_paid === 0 && payment.principal_paid > 0);
            setError('');
        }
    }, [isOpen, payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Monto inválido.');
            setIsLoading(false);
            return;
        }

        // Recalculate breakdown based on PREVIOUS balance and NEW inputs
        let interestPaid = 0;
        let principalPaid = 0;

        if (isExtraordinary) {
            interestPaid = 0;
            principalPaid = parsedAmount;
        } else {
            const { interest } = calculateInterestDue(
                previousBalance,
                loan.interest_rate,
                previousPaymentDate === loan.start_date ? null : previousPaymentDate, // Logic for first payment check
                loan.start_date,
                date
            );

            if (parsedAmount < interest) {
                setError(`El monto debe cubrir al menos el interés calculado de ${formatCurrency(interest)}.`);
                setIsLoading(false);
                return;
            }

            interestPaid = interest;
            principalPaid = parsedAmount - interestPaid;
        }

        const newBalanceAfter = Math.max(0, previousBalance - principalPaid);

        try {
            // 1. Update Payment
            const { error: payError } = await supabase
                .from('payments')
                .update({
                    amount_paid: parsedAmount,
                    payment_date: date,
                    interest_paid: interestPaid,
                    principal_paid: principalPaid,
                    balance_after_payment: newBalanceAfter
                })
                .eq('id', payment.id);

            if (payError) throw payError;

            // 2. Update Loan (Current Balance & Last Payment Date)
            const { error: loanError } = await supabase
                .from('loans')
                .update({
                    current_balance: newBalanceAfter,
                    last_payment_date: date
                })
                .eq('id', loan.id);

            if (loanError) throw loanError;

            onPaymentUpdated();
            onClose();
        } catch (err: any) {
            setError('Error al actualizar: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Último Pago">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl border border-primary/10 text-xs text-primary font-medium leading-relaxed">
                    <p className="flex items-start gap-2">
                        <span className="material-icons-round text-sm mt-0.5">info</span>
                        Estás editando el pago más reciente. El saldo y los intereses se recalcularán en base al saldo anterior de <strong className="font-bold">{formatCurrency(previousBalance)}</strong>.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-pay-amount">Monto pagado</label>
                        <input
                            id="edit-pay-amount"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5" htmlFor="edit-pay-date">Fecha del pago</label>
                        <input
                            id="edit-pay-date"
                            className="w-full px-4 py-3 rounded-xl bg-input-light dark:bg-input-dark border border-gray-200 dark:border-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="relative flex items-center">
                            <input
                                id="edit-isExtraordinary"
                                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                                type="checkbox"
                                checked={isExtraordinary}
                                onChange={(e) => setIsExtraordinary(e.target.checked)}
                            />
                        </div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark" htmlFor="edit-isExtraordinary">Pago Extraordinario (Sin intereses)</label>
                    </div>
                </div>

                {error && <p className="text-xs text-accent-red font-medium bg-accent-red/5 p-3 rounded-lg border border-accent-red/10">{error}</p>}

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" color="white" /> : (
                            <>
                                <span className="material-icons-round">save</span>
                                Actualizar Pago
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="w-full bg-gray-100 dark:bg-gray-800 text-text-light dark:text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// LoanDetail Component
const LoanDetail: FC<{ loan: Loan; onBack: () => void; onLoanUpdated: () => void }> = ({ loan: initialLoan, onBack, onLoanUpdated }) => {
    const [loan, setLoan] = useState<Loan>(initialLoan);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(toYYYYMMDD(new Date()));
    const [isExtraordinary, setIsExtraordinary] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentBreakdown, setPaymentBreakdown] = useState<{ interest: number; principal: number; newBalance: number; fortnights: number } | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRefinanceModalOpen, setIsRefinanceModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // State for editing payments
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [prevBalanceForEdit, setPrevBalanceForEdit] = useState(0);
    const [prevDateForEdit, setPrevDateForEdit] = useState('');

    const fetchLoanDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const [loanRes, paymentsRes] = await Promise.all([
                supabase.from('loans').select('*').eq('id', loan.id).single(),
                supabase.from('payments').select('*').eq('loan_id', loan.id).order('payment_date', { ascending: false })
            ]);

            if (loanRes.error) throw loanRes.error;
            if (paymentsRes.error) throw paymentsRes.error;

            if (loanRes.data) setLoan(loanRes.data);
            if (paymentsRes.data) setPayments(paymentsRes.data);
        } catch (err: any) {
            console.error('Error fetching loan details:', err);
            setPaymentError('Error al cargar datos: ' + (err.message || 'Error de conexión'));
        } finally {
            setIsLoading(false);
        }
    }, [loan.id]);

    useEffect(() => {
        fetchLoanDetails();
    }, [fetchLoanDetails]);

    useEffect(() => {
        const amount = parseFloat(paymentAmount);
        if (!isNaN(amount) && amount > 0 && paymentDate) {
            if (isExtraordinary) {
                const interestToCover = 0;
                const principalApplication = amount;
                const estimatedNewBalance = loan.current_balance - principalApplication;

                setPaymentBreakdown({
                    interest: 0,
                    principal: principalApplication,
                    newBalance: estimatedNewBalance < 0 ? 0 : estimatedNewBalance,
                    fortnights: 0,
                });
            } else {
                const { interest: interestToCover, fortnights } = calculateInterestDue(
                    loan.current_balance,
                    loan.interest_rate,
                    loan.last_payment_date,
                    loan.start_date,
                    paymentDate
                );
                const principalApplication = amount > interestToCover ? amount - interestToCover : 0;
                const estimatedNewBalance = loan.current_balance - principalApplication;

                setPaymentBreakdown({
                    interest: interestToCover,
                    principal: principalApplication,
                    newBalance: estimatedNewBalance < 0 ? 0 : estimatedNewBalance,
                    fortnights,
                });
            }
        } else {
            setPaymentBreakdown(null);
        }
    }, [paymentAmount, paymentDate, loan, isExtraordinary]);

    const handleMakePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPaying(true);
        setPaymentError('');

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            setPaymentError('Por favor, introduce un monto válido y mayor que cero.');
            setIsPaying(false);
            return;
        }

        let interestPaid = 0;
        let principalPaid = 0;
        let newBalance = 0;

        if (isExtraordinary) {
            interestPaid = 0;
            principalPaid = amount;
            newBalance = Math.max(0, loan.current_balance - principalPaid);
        } else {
            const { interest: accruedInterest } = calculateInterestDue(
                loan.current_balance,
                loan.interest_rate,
                loan.last_payment_date,
                loan.start_date,
                paymentDate
            );

            if (amount < accruedInterest) {
                setPaymentError(`El monto debe ser al menos ${formatCurrency(accruedInterest)} para cubrir el interés acumulado.`);
                setIsPaying(false);
                return;
            }

            interestPaid = accruedInterest;
            principalPaid = amount - interestPaid;
            newBalance = Math.max(0, loan.current_balance - principalPaid);
        }

        try {
            const { error: paymentError } = await supabase.from('payments').insert({
                loan_id: loan.id,
                user_id: loan.user_id,
                payment_date: paymentDate,
                amount_paid: amount,
                interest_paid: interestPaid,
                principal_paid: principalPaid,
                balance_after_payment: newBalance
            });

            if (paymentError) throw paymentError;

            const { error: loanError } = await supabase.from('loans').update({
                current_balance: newBalance,
                last_payment_date: paymentDate
            }).eq('id', loan.id);

            if (loanError) throw loanError;

            setPaymentAmount('');
            setPaymentDate(toYYYYMMDD(new Date()));
            setIsExtraordinary(false);
            setPaymentBreakdown(null);
            await fetchLoanDetails();

        } catch (err: any) {
            console.error(err);
            setPaymentError(err.message || 'Ocurrió un error al procesar el pago.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleDeleteLoan = async () => {
        setIsDeleting(true);
        setDeleteError('');
        try {
            const { error } = await supabase.from('loans').delete().eq('id', loan.id);
            if (error) throw error;
            onLoanUpdated();
        } catch (err: any) {
            setDeleteError('Error al eliminar el préstamo: ' + (err.message || 'Error desconocido.'));
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditPaymentModal = (payment: Payment, index: number) => {
        const prevBalance = payment.balance_after_payment + payment.principal_paid;
        setPrevBalanceForEdit(prevBalance);
        let pDate = loan.start_date;
        if (index < payments.length - 1) {
            pDate = payments[index + 1].payment_date;
        }
        setPrevDateForEdit(pDate);
        setEditingPayment(payment);
    };

    const principalPaid = loan.initial_amount - loan.current_balance;
    const progress = loan.initial_amount > 0 ? (principalPaid / loan.initial_amount) * 100 : 0;

    const isPaymentButtonDisabled = isPaying ||
        isNaN(parseFloat(paymentAmount)) ||
        parseFloat(paymentAmount) <= 0 ||
        (paymentBreakdown && parseFloat(paymentAmount) < paymentBreakdown.interest && !isExtraordinary);


    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark antialiased min-h-screen transition-colors duration-300">
            <div className="max-w-md mx-auto min-h-screen relative pb-20 px-4 pt-6">
                <header className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm py-2">
                    <button onClick={onBack} className="p-2 rounded-lg bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors flex items-center justify-center">
                        <span className="material-icons-round text-xl">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight truncate max-w-[150px]">{loan.name}</h1>
                    <div className="flex items-center gap-2">
                        {loan.phone && (
                            <button
                                onClick={() => {
                                    const lastPayment = payments[0];
                                    const message = `*Estado de Cuenta - ${loan.name}*\n\n` +
                                        `Monto Inicial: ${formatCurrency(loan.initial_amount)}\n` +
                                        `Saldo Actual: ${formatCurrency(loan.current_balance)}\n` +
                                        `Tasa: ${loan.interest_rate}%\n` +
                                        (lastPayment ?
                                            `--------------------------\n` +
                                            `*Último Pago:* ${formatCurrency(lastPayment.amount_paid)}\n` +
                                            `Fecha: ${formatDate(lastPayment.payment_date)}\n` +
                                            `Interés pagado: ${formatCurrency(lastPayment.interest_paid)}\n` +
                                            `Abono a capital: ${formatCurrency(lastPayment.principal_paid)}\n` : '') +
                                        `\n¡Gracias por tu cumplimiento!`;
                                    window.open(`https://wa.me/${loan.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center"
                            >
                                <span className="material-icons-round text-xl">chat</span>
                            </button>
                        )}
                        <button
                            onClick={() => setIsRefinanceModalOpen(true)}
                            className="p-2 rounded-lg bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors flex items-center justify-center"
                            title="Refinanciar / Agregar Capital"
                        >
                            <span className="material-icons-round text-xl">monetization_on</span>
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="p-2 rounded-lg bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors flex items-center justify-center"
                        >
                            <span className="material-icons-round text-xl">edit</span>
                        </button>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="p-2 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors flex items-center justify-center"
                        >
                            <span className="material-icons-round text-xl">delete</span>
                        </button>
                    </div>
                </header>

                <RefinanceLoanModal
                    isOpen={isRefinanceModalOpen}
                    onClose={() => setIsRefinanceModalOpen(false)}
                    loan={loan}
                    onLoanUpdated={() => {
                        onLoanUpdated();
                        fetchLoanDetails();
                    }}
                />

                <section className="mb-8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text-light dark:text-secondary-text-dark mb-4 pl-1">Resumen del Préstamo</h2>
                    <div className="grid gap-4">
                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-xs font-medium text-secondary-text-light dark:text-secondary-text-dark mb-1">Saldo Inicial</p>
                                    <p className="text-lg font-bold">{formatCurrency(loan.initial_amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-secondary-text-light dark:text-secondary-text-dark mb-1">Capital Pagado</p>
                                    <p className="text-lg font-bold text-success">{formatCurrency(principalPaid)}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">Saldo Restante</p>
                                <p className="text-4xl font-bold text-primary tracking-tight">{formatCurrency(loan.current_balance)}</p>
                            </div>
                        </div>

                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-sm font-medium text-secondary-text-light dark:text-secondary-text-dark">Progreso del Préstamo</p>
                                <span className="text-text-light dark:text-white font-bold text-lg">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-1">
                                <div
                                    className="bg-primary h-3 rounded-full relative transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-[2px]"></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark text-right font-medium uppercase tracking-wide">Pagado</p>
                        </div>

                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs font-medium text-secondary-text-light dark:text-secondary-text-dark mb-1 uppercase tracking-wider">Intereses Pagados</p>
                            <p className="text-2xl font-bold text-text-light dark:text-white mb-1">{formatCurrency(payments.reduce((acc, p) => acc + p.interest_paid, 0))}</p>
                            <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">Total acumulado a la fecha</p>
                        </div>
                    </div>
                </section>

                {loan.current_balance > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-bold text-text-light dark:text-white mb-4 pl-1">Realizar un Pago</h2>
                        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                            <form onSubmit={handleMakePayment} className="space-y-5">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1" htmlFor="amount">Monto a pagar</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-icons-round text-gray-400 text-lg">attach_money</span>
                                            </div>
                                            <input
                                                id="amount"
                                                className="block w-full pl-10 pr-3 py-3 border-gray-300 dark:border-gray-600 rounded-lg bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors"
                                                type="number"
                                                step="0.01"
                                                placeholder={loan.suggested_payment.toFixed(2)}
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1" htmlFor="date">Fecha del pago</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-icons-round text-gray-400 text-lg">calendar_today</span>
                                            </div>
                                            <input
                                                id="date"
                                                className="block w-full pl-10 pr-3 py-3 border-gray-300 dark:border-gray-600 rounded-lg bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors"
                                                type="date"
                                                value={paymentDate}
                                                onChange={e => setPaymentDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="relative flex items-center">
                                        <input
                                            id="extraordinary"
                                            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                                            type="checkbox"
                                            checked={isExtraordinary}
                                            onChange={(e) => setIsExtraordinary(e.target.checked)}
                                        />
                                    </div>
                                    <label className="text-sm font-medium text-text-light dark:text-text-dark" htmlFor="extraordinary">Pago Extraordinario (100% a capital)</label>
                                </div>

                                {paymentBreakdown && (
                                    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/10 space-y-3">
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-icons-round text-sm">analytics</span>
                                            Desglose Estimado
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark uppercase font-bold">Interés</p>
                                                <p className={`text-sm font-bold ${isExtraordinary ? 'line-through text-gray-400' : 'text-text-light dark:text-white'}`}>{formatCurrency(paymentBreakdown.interest)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark uppercase font-bold">Abono Capital</p>
                                                <p className="text-sm font-bold text-success">{formatCurrency(paymentBreakdown.principal)}</p>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-primary/10">
                                                <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark uppercase font-bold">Nuevo Saldo</p>
                                                <p className="text-lg font-bold text-primary">{formatCurrency(paymentBreakdown.newBalance)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentError && <p className="text-xs text-accent-red font-medium text-center">{paymentError}</p>}

                                <button
                                    className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                    type="submit"
                                    disabled={isPaymentButtonDisabled}
                                >
                                    {isPaying ? <Spinner size="sm" color="white" /> : (
                                        <>
                                            <span className="material-icons-round">check_circle</span>
                                            Registrar Pago
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="text-lg font-bold text-text-light dark:text-white mb-4 pl-1">Historial de Pagos</h2>
                    {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : payments.length === 0 ? (
                        <div className="text-center py-10 bg-card-light dark:bg-card-dark rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-secondary-text-light dark:text-secondary-text-dark text-sm font-medium">No hay registros de pagos todavía.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((p, index) => (
                                <div key={p.id} className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success">
                                            <span className="material-icons-round">receipt_long</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-light dark:text-white">{formatDate(p.payment_date)}</p>
                                            <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark font-medium uppercase tracking-wide">
                                                Capital: {formatCurrency(p.principal_paid)} • Int: {formatCurrency(p.interest_paid)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-black text-success">{formatCurrency(p.amount_paid)}</p>
                                            <p className="text-[10px] text-secondary-text-light dark:text-secondary-text-dark font-medium">Saldo: {formatCurrency(p.balance_after_payment)}</p>
                                        </div>
                                        {index === 0 && (
                                            <button
                                                onClick={() => openEditPaymentModal(p, index)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-icons-round text-lg">edit</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                <div className="p-1">
                    <p className="text-text-light dark:text-secondary-text-dark mb-6 leading-relaxed">
                        ¿Estás seguro de que quieres eliminar <strong className="font-bold text-text-light dark:text-text-dark">{loan.name}</strong>?
                        <br /><span className="text-xs text-accent-red mt-2 block font-medium">⚠️ Esta acción es irreversible y borrará todo el historial.</span>
                    </p>
                    {deleteError && <p className="text-accent-red text-sm mb-4 bg-accent-red/5 p-3 rounded-lg border border-accent-red/10">{deleteError}</p>}
                    <div className="flex flex-col gap-2">
                        <button
                            className="w-full bg-accent-red text-white py-3 rounded-xl font-bold shadow-lg shadow-accent-red/20 active:scale-[0.98] transition-transform disabled:opacity-50"
                            onClick={handleDeleteLoan}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
                        </button>
                        <button
                            className="w-full bg-gray-100 dark:bg-gray-800 text-text-light dark:text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            <EditLoanModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                loan={loan}
                onLoanUpdated={() => {
                    fetchLoanDetails();
                }}
            />

            {editingPayment && (
                <EditPaymentModal
                    isOpen={!!editingPayment}
                    onClose={() => setEditingPayment(null)}
                    payment={editingPayment}
                    loan={loan}
                    previousBalance={prevBalanceForEdit}
                    previousPaymentDate={prevDateForEdit}
                    onPaymentUpdated={() => {
                        setEditingPayment(null);
                        fetchLoanDetails();
                    }}
                />
            )}
        </div>
    );
};

// DashboardPage Component
const DashboardPage: React.FC<{
    session: Session;
}> = ({ session }) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTipsOpen, setIsTipsOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const fetchLoans = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLoans(data || []);
        } catch (err: any) {
            console.error('Error fetching loans:', err);
        } finally {
            setIsLoading(false);
        }
    }, [session.user.id]);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const handleLoanUpdated = () => {
        setSelectedLoan(null);
        fetchLoans();
    };

    // Derive display name
    const displayName = session.user.user_metadata?.full_name ||
        session.user.email?.split('@')[0] ||
        'Usuario';

    if (selectedLoan) {
        return <LoanDetail
            loan={selectedLoan}
            onBack={() => { setSelectedLoan(null); fetchLoans(); }}
            onLoanUpdated={handleLoanUpdated}
        />;
    }

    // Global Stats Calculation
    const totalDebt = loans.reduce((sum, loan) => sum + loan.current_balance, 0);
    const totalInitial = loans.reduce((sum, loan) => sum + loan.initial_amount, 0);
    const totalPaid = totalInitial - totalDebt;
    const globalProgress = totalInitial > 0 ? (totalPaid / totalInitial) * 100 : 0;

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark antialiased min-h-screen transition-colors duration-300">
            <div className="max-w-md mx-auto min-h-screen relative pb-20 px-4 pt-6">
                <header className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Gestor de Préstamos</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 rounded-lg bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => {
                                document.documentElement.classList.toggle('dark');
                            }}
                        >
                            <span className="material-icons-round text-xl">light_mode</span>
                        </button>
                        <button
                            className="p-2 rounded-lg bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => supabase.auth.signOut()}
                        >
                            <span className="material-icons-round text-xl">logout</span>
                        </button>
                    </div>
                </header>

                <section className="mb-8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary-text-light dark:text-secondary-text-dark mb-4 pl-1">Resumen General</h2>
                    <div className="grid gap-4">
                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 transition-colors">
                            <p className="text-sm font-medium text-secondary-text-light dark:text-secondary-text-dark mb-1">Deuda Total Activa</p>
                            <p className="text-3xl font-bold text-text-light dark:text-white">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 transition-colors">
                            <p className="text-sm font-medium text-secondary-text-light dark:text-secondary-text-dark mb-1">Capital Amortizado</p>
                            <p className="text-3xl font-bold text-success">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-card-light dark:bg-card-dark p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 transition-colors">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-sm font-medium text-secondary-text-light dark:text-secondary-text-dark">Progreso Global</p>
                                <span className="text-primary font-bold text-lg">{globalProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-primary h-3 rounded-full relative transition-all duration-1000"
                                    style={{ width: `${globalProgress}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-[2px]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-text-light dark:text-white">Mis Préstamos</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-lg shadow-primary/30 transition-all active:scale-95"
                        >
                            <span className="material-icons-round text-base">add_circle_outline</span>
                            Nuevo Préstamo
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
                    ) : loans.length === 0 ? (
                        <div className="text-center py-16 bg-card-light dark:bg-card-dark rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <span className="material-icons-round text-3xl text-gray-400">payments</span>
                            </div>
                            <h3 className="text-lg font-medium text-text-light dark:text-white">No hay préstamos activos</h3>
                            <p className="text-secondary-text-light dark:text-secondary-text-dark mt-1">Comienza agregando tu primer préstamo.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loans.map(loan => {
                                const progress = loan.initial_amount > 0
                                    ? ((loan.initial_amount - loan.current_balance) / loan.initial_amount) * 100
                                    : 0;

                                return (
                                    <div
                                        key={loan.id}
                                        className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
                                        onClick={() => setSelectedLoan(loan)}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
                                            <span className="material-icons-round text-9xl text-primary transform translate-x-8 -translate-y-8">credit_card</span>
                                        </div>
                                        <div className="absolute top-5 right-5 bg-primary/10 dark:bg-primary/20 text-primary font-bold px-3 py-1 rounded-full text-xs">
                                            {progress.toFixed(0)}%
                                        </div>
                                        <div className="relative z-10">
                                            <div className="mb-5">
                                                <h3 className="text-xl font-bold text-text-light dark:text-white mb-1 group-hover:text-primary transition-colors">{loan.name}</h3>
                                                <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark uppercase tracking-wide font-medium">
                                                    {formatCurrency(loan.initial_amount)} INICIAL
                                                </p>
                                            </div>
                                            <div className="mb-6">
                                                <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark mb-1">Saldo Pendiente</p>
                                                <p className="text-3xl font-bold text-text-light dark:text-white tracking-tight">{formatCurrency(loan.current_balance)}</p>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-1 text-secondary-text-light dark:text-secondary-text-dark">
                                                    <span className="material-icons-round text-base">percent</span>
                                                    <span className="text-xs font-medium">{loan.interest_rate}% interés</span>
                                                </div>
                                                <span className="text-primary text-xs font-semibold flex items-center gap-1 group-hover:underline">
                                                    Ver detalles
                                                    <span className="material-icons-round text-sm">arrow_forward</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <nav className="fixed bottom-0 left-0 w-full bg-card-light dark:bg-card-dark border-t border-gray-200 dark:border-gray-800 pb-safe pt-2 px-6 pb-4 z-50">
                    <div className="max-w-md mx-auto flex justify-between items-center">
                        <button
                            onClick={() => setSelectedLoan(null)}
                            className={`flex flex-col items-center gap-1 ${!selectedLoan ? 'text-primary' : 'text-secondary-text-light dark:text-secondary-text-dark'}`}
                        >
                            <span className="material-icons-round">dashboard</span>
                            <span className="text-[10px] font-medium">Inicio</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors">
                            <span className="material-icons-round">account_balance_wallet</span>
                            <span className="text-[10px] font-medium">Pagos</span>
                        </button>
                        <button
                            onClick={() => setIsTipsOpen(true)}
                            className="flex flex-col items-center gap-1 text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors"
                        >
                            <span className="material-icons-round">pie_chart</span>
                            <span className="text-[10px] font-medium">Consejos</span>
                        </button>
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="flex flex-col items-center gap-1 text-secondary-text-light dark:text-secondary-text-dark hover:text-primary transition-colors"
                        >
                            <span className="material-icons-round">help</span>
                            <span className="text-[10px] font-medium">Guía</span>
                        </button>
                    </div>
                </nav>
            </div>

            <AddLoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLoanAdded={fetchLoans} user_id={session.user.id} />

            {/* Modals for Tips and Guide */}
            <Modal isOpen={isTipsOpen} onClose={() => setIsTipsOpen(false)} title="Consejos Financieros">
                <div className="space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center">
                            <span className="material-icons-round text-lg mr-2">lightbulb</span>
                            Prioriza por Interés
                        </h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">Paga primero las deudas con la tasa de interés más alta. Esto te ahorrará miles de pesos en el largo plazo.</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                            <span className="material-icons-round text-lg mr-2">bolt</span>
                            Pagos al Capital
                        </h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">Usa bonos o dinero extra para "pagos extraordinarios". Estos van 100% a la deuda y reducen el tiempo del crédito.</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                            <span className="material-icons-round text-lg mr-2">check_circle</span>
                            Método Bola de Nieve
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Paga las deudas pequeñas primero. Sentir que liquidas una cuenta te da la motivación para seguir con las grandes.</p>
                    </div>
                </div>
                <div className="mt-6">
                    <Button className="w-full" onClick={() => setIsTipsOpen(false)}>Entendido</Button>
                </div>
            </Modal>

            <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} title="Guía de Uso Rápida">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center font-bold">1</div>
                        <div>
                            <h4 className="font-bold text-text-light dark:text-text-dark">Crea tu Préstamo</h4>
                            <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark">Toca el botón (+) y anota el monto y tasa. ¡Es el primer paso!</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center font-bold">2</div>
                        <div>
                            <h4 className="font-bold text-text-light dark:text-text-dark">Anota tus Pagos</h4>
                            <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark">Cada que pagues, regístralo aquí para que el saldo baje automáticamente.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <Button className="w-full" onClick={() => setIsGuideOpen(false)}>¡Listo!</Button>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardPage;
