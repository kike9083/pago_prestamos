
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
        <Modal isOpen={isOpen} onClose={onClose} title="Agregar Nuevo Préstamo">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="loanName" label="Nombre del Préstamo" value={loanName} onChange={e => setLoanName(e.target.value)} required />
                <Input id="phone" label="Teléfono WhatsApp (Ej: 521...)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Código de país + número" />
                <Input id="initialAmount" label="Monto Inicial ($)" type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required />
                <Input id="interestRate" label="Tasa de Interés Quincenal (%)" type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} required />
                <Input id="termMonths" label="Plazo Sugerido (meses)" type="number" value={termMonths} onChange={e => setTermMonths(e.target.value)} required />
                <Input id="startDate" label="Fecha de Inicio" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isLoading}>Guardar Préstamo</Button>
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(loan.name);
            setPhone(loan.phone || '');
            setInterestRate(loan.interest_rate.toString());
            setTermMonths(loan.term_months.toString());
            setError('');
        }
    }, [isOpen, loan]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const parsedRate = parseFloat(interestRate);
        const parsedTerm = parseInt(termMonths, 10);

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

        const newSuggestedPayment = calculateSuggestedPayment(loan.initial_amount, parsedRate, parsedTerm);

        try {
            const { error } = await supabase
                .from('loans')
                .update({
                    name: name.trim(),
                    phone: phone.trim(),
                    interest_rate: parsedRate,
                    term_months: parsedTerm,
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
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Préstamo">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="edit-name" label="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                <Input id="edit-phone" label="Teléfono WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 521..." />
                <Input id="edit-rate" label="Tasa de Interés Quincenal (%)" type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} required />
                <Input id="edit-term" label="Plazo (meses)" type="number" value={termMonths} onChange={e => setTermMonths(e.target.value)} required />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isLoading}>Guardar Cambios</Button>
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
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-2">
                    <p>Estás editando el pago más reciente. El saldo y los intereses se recalcularán en base al saldo anterior de <strong>{formatCurrency(previousBalance)}</strong>.</p>
                </div>

                <Input id="edit-pay-amount" label="Monto Pagado" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Input id="edit-pay-date" label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} required />

                <div className="flex items-center mt-2">
                    <input
                        id="edit-isExtraordinary"
                        type="checkbox"
                        checked={isExtraordinary}
                        onChange={(e) => setIsExtraordinary(e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600"
                    />
                    <label htmlFor="edit-isExtraordinary" className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-300">
                        Pago Extraordinario (Sin intereses)
                    </label>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isLoading}>Guardar Cambios</Button>
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // State for editing payments
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [prevBalanceForEdit, setPrevBalanceForEdit] = useState(0);
    const [prevDateForEdit, setPrevDateForEdit] = useState('');

    const fetchLoanDetails = useCallback(async () => {
        setIsLoading(true);
        const [loanRes, paymentsRes] = await Promise.all([
            supabase.from('loans').select('*').eq('id', loan.id).single(),
            supabase.from('payments').select('*').eq('loan_id', loan.id).order('payment_date', { ascending: false })
        ]);

        if (loanRes.data) setLoan(loanRes.data);
        if (paymentsRes.data) setPayments(paymentsRes.data);

        setIsLoading(false);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10 transition-colors">
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 pt-[calc(var(--safe-area-top)+8px)]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-y-3">
                    <button onClick={onBack} className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-2 transition-colors py-2 group">
                        <div className="bg-primary-50 dark:bg-primary-900/40 p-1.5 rounded-lg group-hover:bg-primary-100 transition-colors">
                            <Icons.ChevronRight className="w-4 h-4 rotate-180" />
                        </div>
                        <span className="min-[400px]:inline hidden">Volver atrás</span>
                        <span className="min-[400px]:hidden inline">Volver</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {loan.phone && (
                            <Button variant="secondary" onClick={() => {
                                // ... (keeping existing logic)
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
                            }} className="!bg-[#25D366] hover:!bg-[#20ba59] border-none !text-white shadow-md shadow-emerald-500/20 font-bold px-3 min-[450px]:px-4 !rounded-xl h-10">
                                <Icons.MessageCircle className="w-5 h-5 min-[450px]:mr-2" />
                                <span className="hidden min-[450px]:inline text-sm">WhatsApp</span>
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} className="!rounded-xl px-3 min-[450px]:px-4 h-10" aria-label="Editar">
                            <Icons.Pencil className="w-4 h-4 min-[450px]:mr-2" />
                            <span className="hidden min-[450px]:inline text-sm">Editar</span>
                        </Button>
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="!rounded-xl px-3 min-[450px]:px-4 h-10" aria-label="Eliminar">
                            <Icons.Trash2 className="w-4 h-4 min-[450px]:mr-2" />
                            <span className="hidden min-[450px]:inline text-sm">Eliminar</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 sm:p-6">
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Saldo Inicial</p>
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(loan.initial_amount)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Capital Pagado</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(principalPaid)}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50 dark:border-slate-700/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500 mb-1">Saldo Restante</p>
                            <p className="text-3xl font-black text-primary-600 dark:text-primary-400 tracking-tight">{formatCurrency(loan.current_balance)}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col justify-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Progreso del Préstamo</p>
                        <div className="flex items-end gap-2 mb-2">
                            <p className="text-4xl font-black text-slate-800 dark:text-slate-200">{progress.toFixed(1)}%</p>
                            <p className="text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Pagado</p>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 dark:bg-slate-700 overflow-hidden">
                            <div className="bg-primary-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)]" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Resumen de Intereses</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-1">{formatCurrency(payments.reduce((acc, p) => acc + p.interest_paid, 0))}</p>
                        <p className="text-xs text-slate-400 font-medium">Intereses acumulados pagados</p>
                    </div>
                </div>

                {loan.current_balance > 0 && (
                    <Card className="mb-8 overflow-hidden border-0 shadow-md rounded-2xl">
                        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Realizar un Pago</h3>
                        </div>
                        <CardContent className="p-6">
                            <form onSubmit={handleMakePayment} className="grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                                    <Input
                                        id="paymentAmount"
                                        label="Monto a Pagar"
                                        type="number"
                                        step="0.01"
                                        placeholder={loan.suggested_payment.toFixed(2)}
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        required
                                    />
                                    <Input
                                        id="paymentDate"
                                        label="Fecha del Pago"
                                        type="date"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        required
                                    />
                                    <Button type="submit" isLoading={isPaying} className="h-[42px] w-full shadow-sm" disabled={isPaymentButtonDisabled}>
                                        Registrar Pago
                                    </Button>
                                </div>

                                <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 w-fit">
                                    <input
                                        id="isExtraordinary"
                                        type="checkbox"
                                        checked={isExtraordinary}
                                        onChange={(e) => setIsExtraordinary(e.target.checked)}
                                        className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                    <label htmlFor="isExtraordinary" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Pago Extraordinario (100% a capital)
                                    </label>
                                </div>
                            </form>

                            {paymentBreakdown && (
                                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm space-y-3 border border-indigo-100 dark:border-indigo-800/30">
                                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center">
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                                        Desglose Estimado
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                        <div>
                                            <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">Interés a cubrir</span>
                                            <span className={`text-lg font-medium ${isExtraordinary ? 'text-slate-400 line-through' : 'text-indigo-900 dark:text-indigo-100'}`}>
                                                {formatCurrency(paymentBreakdown.interest)}
                                            </span>
                                            {!isExtraordinary && (
                                                <span className="block text-[10px] text-indigo-500 mt-0.5">
                                                    {paymentBreakdown.fortnights} {paymentBreakdown.fortnights === 1 ? 'quincena' : 'quincenas'}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">Abono a Capital</span>
                                            <span className="text-lg font-medium text-indigo-900 dark:text-indigo-100">{formatCurrency(paymentBreakdown.principal)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-indigo-600/70 dark:text-indigo-400 mb-0.5">Saldo Final</span>
                                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(paymentBreakdown.newBalance)}</span>
                                        </div>
                                    </div>
                                    {parseFloat(paymentAmount) < paymentBreakdown.interest && !isExtraordinary && paymentAmount && (
                                        <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded border border-red-100">⚠️ El monto es insuficiente para cubrir el interés acumulado.</p>
                                    )}
                                </div>
                            )}
                            {paymentError && <p className="text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-lg border border-red-100">{paymentError}</p>}
                        </CardContent>
                    </Card>
                )}

                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Historial de Pagos</h3>
                    {isLoading ? <Spinner /> : payments.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-500 text-sm">No hay registros de pagos aún.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
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
                                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">{formatDate(p.payment_date)}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount_paid)}</td>
                                                <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(p.interest_paid)}</td>
                                                <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(p.principal_paid)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(p.balance_after_payment)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {index === 0 && (
                                                        <button
                                                            onClick={() => openEditPaymentModal(p, index)}
                                                            className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                                            title="Editar último pago"
                                                        >
                                                            <Icons.Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                <div className="p-1">
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        ¿Estás seguro de que quieres eliminar <strong className="font-semibold text-slate-800 dark:text-slate-100">{loan.name}</strong>?
                        <br /><span className="text-xs text-red-500 mt-1 block">Esta acción es irreversible y borrará todo el historial.</span>
                    </p>
                    {deleteError && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{deleteError}</p>}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancelar</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteLoan} isLoading={isDeleting}>
                            Sí, eliminar
                        </Button>
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
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loans:', error);
        } else {
            setLoans(data || []);
        }
        setIsLoading(false);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10 transition-colors">
            <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 pt-[var(--safe-area-top)]">
                <div className="max-w-5xl mx-auto min-h-[4rem] px-4 sm:px-6 lg:px-8 flex justify-between items-center py-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-600/20">
                            <span className="text-white font-bold text-lg">G</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Gestor de Préstamos</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsTipsOpen(true)}
                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                            title="Consejos Financieros"
                            aria-label="Ver consejos financieros"
                        >
                            <Icons.Lightbulb className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                            title="Guía de Uso"
                            aria-label="Ver guía de uso"
                        >
                            <Icons.BookOpen className="w-5 h-5" />
                        </button>
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Hola,</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => supabase.auth.signOut()} className="text-slate-500">
                            <Icons.LogOut className="w-4 h-4 mr-2" />
                            <span className="hidden xs:inline">Salir</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                <div className="mb-8">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">Resumen General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-sm text-slate-500 mb-1">Deuda Total Activa</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-sm text-slate-500 mb-1">Capital Amortizado</p>
                            <p className="text-2xl font-bold text-emerald-600 text-emerald-600">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-sm text-slate-500">Progreso Global</p>
                                <span className="text-lg font-bold text-primary-600">{globalProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-700">
                                <div className="bg-primary-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${globalProgress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Mis Préstamos</h2>
                    <Button onClick={() => setIsModalOpen(true)} className="shadow-md shadow-primary-600/20">
                        <Icons.PlusCircle className="w-5 h-5 mr-2" />
                        Nuevo Préstamo
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                ) : loans.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <Icons.PlusCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No tienes préstamos activos</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Comienza agregando tu primer préstamo para tomar el control.</p>
                        <Button onClick={() => setIsModalOpen(true)}>
                            Agregar Préstamo
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loans.map(loan => {
                            const progress = loan.initial_amount > 0
                                ? ((loan.initial_amount - loan.current_balance) / loan.initial_amount) * 100
                                : 0;

                            return (
                                <div
                                    key={loan.id}
                                    className="group bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-primary-100 dark:hover:border-primary-900 transition-all duration-300 cursor-pointer relative overflow-hidden"
                                    onClick={() => setSelectedLoan(loan)}
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor" className="text-primary-600 transform rotate-12 translate-x-4 -translate-y-4">
                                            <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
                                        </svg>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">{loan.name}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                                    {formatCurrency(loan.initial_amount)} Inicial
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${progress >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'}`}>
                                                {progress.toFixed(0)}%
                                            </span>
                                        </div>

                                        <div className="mb-6">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Saldo Pendiente</p>
                                            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(loan.current_balance)}</p>
                                        </div>

                                        <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-700 overflow-hidden">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary-600'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>

                                        <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                                            <span>{loan.interest_rate}% interés</span>
                                            <span className="group-hover:translate-x-1 transition-transform text-primary-600 font-medium flex items-center">
                                                Ver detalles &rarr;
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <AddLoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLoanAdded={fetchLoans} user_id={session.user.id} />

                {/* Modals for Tips and Guide */}
                <Modal isOpen={isTipsOpen} onClose={() => setIsTipsOpen(false)} title="Consejos Financieros">
                    <div className="space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center">
                                <Icons.Lightbulb className="w-4 h-4 mr-2" />
                                Prioriza por Interés
                            </h4>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">Paga primero las deudas con la tasa de interés más alta. Esto te ahorrará miles de pesos en el largo plazo.</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                                <Icons.Zap className="w-4 h-4 mr-2" />
                                Pagos al Capital
                            </h4>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">Usa bonos o dinero extra para "pagos extraordinarios". Estos van 100% a la deuda y reducen el tiempo del crédito.</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                                <Icons.CheckCircle className="w-4 h-4 mr-2" />
                                Método Bola de Nieve
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Paga las deudas pequeñas primero. Sentir que liquidas una cuenta te da la motivación para seguir con las grandes.</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                            <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center">
                                <Icons.X className="w-4 h-4 mr-2" />
                                Controla Gastos Hormiga
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300">Cafés, snacks y suscripciones innecesarias suman mucho. Ese dinero puede ser la clave para salir de deudas.</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                                <Icons.Shield className="w-4 h-4 mr-2" />
                                No te endeudes más
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">La regla de oro: No saques créditos nuevos hasta que hayas liquidado al menos el 50% de lo que debes hoy.</p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Button className="w-full" onClick={() => setIsTipsOpen(false)}>Entendido</Button>
                    </div>
                </Modal>

                <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} title="Guía de Uso Rápida">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center font-bold">1</div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Crea tu Préstamo</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Toca el botón (+) y anota el monto y tasa. ¡Es el primer paso!</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center font-bold">2</div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Anota tus Pagos</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Cada que pagues, regístralo aquí para que el saldo baje automáticamente.</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Button className="w-full" onClick={() => setIsGuideOpen(false)}>¡Listo!</Button>
                    </div>
                </Modal>
            </main>
        </div>
    );
};

export default DashboardPage;
