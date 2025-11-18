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

// LoanDetail Component
const LoanDetail: FC<{ loan: Loan; onBack: () => void; onLoanUpdated: () => void }> = ({ loan: initialLoan, onBack, onLoanUpdated }) => {
    const [loan, setLoan] = useState<Loan>(initialLoan);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(toYYYYMMDD(new Date()));
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentBreakdown, setPaymentBreakdown] = useState<{ interest: number; principal: number; newBalance: number } | null>(null);
    const [isExtraordinaryPayment, setIsExtraordinaryPayment] = useState(false); // Nuevo estado

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

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
            let interestToCover = 0;
            let principalApplication = amount;
            let estimatedNewBalance = loan.current_balance - amount;

            if (!isExtraordinaryPayment) {
                interestToCover = calculateInterestDue(
                    loan.current_balance,
                    loan.interest_rate,
                    loan.last_payment_date,
                    loan.start_date,
                    paymentDate
                );
                principalApplication = amount > interestToCover ? amount - interestToCover : 0;
                estimatedNewBalance = loan.current_balance - principalApplication;
            }

            setPaymentBreakdown({
                interest: interestToCover,
                principal: principalApplication,
                newBalance: estimatedNewBalance < 0 ? 0 : estimatedNewBalance,
            });
        } else {
            setPaymentBreakdown(null);
        }
    }, [paymentAmount, paymentDate, loan, isExtraordinaryPayment]);

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
        let principalPaid = amount; // Default for extraordinary payment
        let newBalance = Math.max(0, loan.current_balance - principalPaid);

        if (!isExtraordinaryPayment) {
            // Logic for regular payment: calculate and cover interest first
            const accruedInterest = calculateInterestDue(
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
        } else {
            // Logic for extraordinary payment: all goes to principal
            // No specific minimum amount beyond being positive, as no interest is covered.
        }

        try {
            // 1. Register Payment
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

            // 2. Update Loan Balance and last_payment_date
            const { error: loanError } = await supabase.from('loans').update({
                current_balance: newBalance,
                last_payment_date: paymentDate
            }).eq('id', loan.id);

            if (loanError) throw loanError;
            
            // Reset form fields
            setPaymentAmount('');
            setPaymentDate(toYYYYMMDD(new Date()));
            setIsExtraordinaryPayment(false); // Reset checkbox for next payment
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
    
    const principalPaid = loan.initial_amount - loan.current_balance;
    const progress = loan.initial_amount > 0 ? (principalPaid / loan.initial_amount) * 100 : 0;
    
    const isPaymentButtonDisabled = isPaying || 
        isNaN(parseFloat(paymentAmount)) || 
        parseFloat(paymentAmount) <= 0 || 
        (!isExtraordinaryPayment && paymentBreakdown && parseFloat(paymentAmount) < paymentBreakdown.interest);


    return (
        <>
        <div className="p-4 sm:p-6">
             <div className="flex justify-between items-center mb-4">
                 <button onClick={onBack} className="text-sm text-primary-600 hover:underline flex items-center p-2 -ml-2">
                    &larr; Volver a todos los préstamos
                </button>
                <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                    <Icons.Trash2 className="w-4 h-4 mr-2"/>
                    Eliminar Préstamo
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold">{loan.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        {formatCurrency(loan.initial_amount)} @ {loan.interest_rate}% quincenal
                    </p>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Spinner /> : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                            <div><p className="text-sm text-slate-500">Saldo Restante</p><p className="font-semibold text-lg text-primary-600">{formatCurrency(loan.current_balance)}</p></div>
                            <div><p className="text-sm text-slate-500">Pago Sugerido</p><p className="font-semibold text-lg">{formatCurrency(loan.suggested_payment)}</p></div>
                            <div><p className="text-sm text-slate-500">Capital Pagado</p><p className="font-semibold text-lg">{formatCurrency(principalPaid)}</p></div>
                            <div><p className="text-sm text-slate-500">Interés Pagado</p><p className="font-semibold text-lg">{formatCurrency(payments.reduce((acc, p) => acc + p.interest_paid, 0))}</p></div>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-base font-medium text-primary-700 dark:text-white">Progreso</span>
                                <span className="text-sm font-medium text-primary-700 dark:text-white">{progress.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>

            {loan.current_balance > 0 && (
                <Card className="mt-6">
                    <CardHeader><h3 className="text-lg font-semibold">Realizar un Pago</h3></CardHeader>
                    <CardContent>
                        <form onSubmit={handleMakePayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
                            <Button type="submit" isLoading={isPaying} className="w-full" disabled={isPaymentButtonDisabled}>Pagar ahora</Button>
                            
                            <div className="flex items-center sm:col-span-3 mt-2 sm:mt-0"> {/* Checkbox ocupa todo el ancho en móviles y tablets */}
                                <input
                                    id="extraordinaryPayment"
                                    type="checkbox"
                                    checked={isExtraordinaryPayment}
                                    onChange={e => setIsExtraordinaryPayment(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600"
                                />
                                <label htmlFor="extraordinaryPayment" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Pago Extraordinario (todo a capital)
                                </label>
                            </div>
                        </form>
                        
                        {paymentBreakdown && (
                            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm space-y-2">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Desglose del Pago</h4>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Interés a cubrir:</span>
                                    <span className="font-medium">{formatCurrency(paymentBreakdown.interest)}</span>
                                </div>
                                {!isExtraordinaryPayment && parseFloat(paymentAmount) < paymentBreakdown.interest && paymentAmount && (
                                    <p className="text-red-500 text-xs">El monto es insuficiente para cubrir el interés.</p>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Abono a capital:</span>
                                    <span className="font-medium">{formatCurrency(paymentBreakdown.principal)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                                    <span className="font-semibold">Nuevo saldo estimado:</span>
                                    <span className="font-semibold text-primary-600">{formatCurrency(paymentBreakdown.newBalance)}</span>
                                </div>
                            </div>
                        )}
                        {paymentError && <p className="text-red-500 text-sm mt-2">{paymentError}</p>}
                    </CardContent>
                </Card>
            )}

            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Historial de Pagos</h3>
                {isLoading ? <Spinner /> : payments.length === 0 ? (
                    <p className="text-slate-500 text-sm">Aún no se han realizado pagos.</p>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-4 py-3">Fecha</th>
                                <th scope="col" className="px-4 py-3 text-right">Monto Pagado</th>
                                <th scope="col" className="px-4 py-3 text-right">Interés Pagado</th>
                                <th scope="col" className="px-4 py-3 text-right">Capital Pagado</th>
                                <th scope="col" className="px-4 py-3 text-right">Saldo Restante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <td className="px-4 py-3 font-medium">{formatDate(p.payment_date)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(p.amount_paid)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(p.interest_paid)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(p.principal_paid)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.balance_after_payment)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
            <p className="text-slate-600 dark:text-slate-300">
                ¿Estás seguro de que quieres eliminar el préstamo <strong className="font-semibold text-slate-800 dark:text-slate-100">{loan.name}</strong>? Todo el historial de pagos también será eliminado. Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="text-red-500 text-sm mt-4">{deleteError}</p>}
            <div className="flex justify-end gap-2 pt-4 mt-4">
                <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancelar</Button>
                <Button type="button" variant="danger" onClick={handleDeleteLoan} isLoading={isDeleting}>
                    Sí, eliminar
                </Button>
            </div>
        </Modal>
        </>
    );
};

// DashboardPage Component
const DashboardPage: React.FC<{ session: Session }> = ({ session }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setLoans(data);
    setIsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);
  
  const handleLoanUpdated = () => {
    setSelectedLoan(null);
    fetchLoans();
  };

  if (selectedLoan) {
    return <LoanDetail loan={selectedLoan} onBack={() => setSelectedLoan(null)} onLoanUpdated={handleLoanUpdated} />;
  }

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mis Préstamos</h1>
            <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
                <Icons.LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
            </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Resumen</h2>
            <Button onClick={() => setIsModalOpen(true)}>
              <Icons.PlusCircle className="w-5 h-5 mr-2" />
              Nuevo Préstamo
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center"><Spinner size="lg" /></div>
          ) : loans.length === 0 ? (
            <Card className="text-center">
              <CardContent>
                <h3 className="text-lg font-medium">No tienes préstamos registrados</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">¡Agrega tu primer préstamo para empezar!</p>
                <Button onClick={() => setIsModalOpen(true)} className="mt-4">
                  Agregar Préstamo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loans.map(loan => (
                <Card key={loan.id} className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setSelectedLoan(loan)}>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-primary-600">{loan.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400">Saldo Actual:</p>
                      <p className="text-2xl font-semibold">{formatCurrency(loan.current_balance)}</p>
                    </div>
                    <Icons.ChevronRight className="w-8 h-8 text-slate-400" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <AddLoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLoanAdded={fetchLoans} user_id={session.user.id}/>
      </main>
    </>
  );
};

export default DashboardPage;