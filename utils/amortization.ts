
export const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateSuggestedPayment = (principal: number, biweeklyRate: number, termMonths: number): number => {
  if (principal <= 0 || termMonths <= 0) return 0;
  
  const monthlyRate = (biweeklyRate * 2) / 100;
  if (monthlyRate <= 0) return principal / termMonths;
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  
  return principal * (numerator / denominator);
};

export const calculateInterestDue = (
    currentBalance: number,
    biweeklyRate: number, // This is the percentage, e.g., 10 for 10%
    lastPaymentDateStr: string | null | undefined, // The date of the PREVIOUS payment
    startDateStr: string, // Loan start date
    paymentDateStr: string // The date of the CURRENT payment being processed
): { interest: number; fortnights: number } => {
    if (currentBalance <= 0 || biweeklyRate <= 0) return { interest: 0, fortnights: 0 };

    // This function robustly parses a 'YYYY-MM-DD' string into a UTC Date object
    // to prevent timezone-related "off-by-one-day" errors.
    const parseDateAsUTC = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Using Date.UTC ensures the date is treated as UTC, avoiding timezone shifts.
        return new Date(Date.UTC(year, month - 1, day));
    };

    const loanStartDate = parseDateAsUTC(startDateStr);
    const paymentDate = parseDateAsUTC(paymentDateStr);

    let effectiveLastActivityDate: Date;
    if (lastPaymentDateStr) {
        effectiveLastActivityDate = parseDateAsUTC(lastPaymentDateStr);
    } else {
        // If no prior payments, interest accrues from the loan start date.
        effectiveLastActivityDate = loanStartDate;
    }
    
    if (isNaN(effectiveLastActivityDate.getTime()) || isNaN(paymentDate.getTime())) {
        return { interest: 0, fortnights: 0 };
    }

    // A payment cannot incur interest for a period before the loan started or before the last activity.
    if (paymentDate.getTime() < effectiveLastActivityDate.getTime()) {
        return { interest: 0, fortnights: 0 };
    }
    
    let fortnightsPassed = 0;

    const timeDiff = paymentDate.getTime() - effectiveLastActivityDate.getTime();
    
    if (timeDiff === 0) {
        // Si el pago es exactamente el mismo día que la effectiveLastActivityDate.
        // CASO ESPECIAL: Si es el PRIMER pago realizado en la fecha de inicio del préstamo,
        // no cobramos interés por ese día exacto.
        if (!lastPaymentDateStr && paymentDate.getTime() === loanStartDate.getTime()) {
            fortnightsPassed = 0;
        } else {
            // Para cualquier otro pago realizado el mismo día que la última actividad,
            // asumimos que se debe el interés de una quincena.
            fortnightsPassed = 1;
        }
    } else { // timeDiff > 0 (payment date is strictly after effectiveLastActivityDate)
        const daysSinceLastPayment = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Interest is calculated based on discrete 15-day periods ("quincenas").
        // As soon as a new 15-day period begins, the interest for that entire period becomes due.
        // Using Math.ceil ensures that even 1 day into a new fortnight counts as a full fortnight for interest.
        fortnightsPassed = Math.ceil(daysSinceLastPayment / 15.0);
    }
    
    // Safety check, though covered by earlier logic.
    if (fortnightsPassed <= 0) return { interest: 0, fortnights: 0 };

    const rateAsDecimal = biweeklyRate / 100;
    
    // Total interest due is the simple interest for each period that has started.
    const interestDue = currentBalance * rateAsDecimal * fortnightsPassed;
    
    return { 
        interest: Math.round(interestDue * 100) / 100, 
        fortnights: fortnightsPassed 
    };
};
