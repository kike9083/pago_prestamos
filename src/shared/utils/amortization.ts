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

export const getQuincenaIndex = (date: Date): number => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let targetYear = year;
  let targetMonth = month;
  let quincenaInMonth = 1;

  if (day <= 5) {
    targetMonth = month - 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear = year - 1;
    }
    quincenaInMonth = 2;
  } else if (day <= 18) {
    quincenaInMonth = 1;
  } else {
    quincenaInMonth = 2;
  }

  return targetYear * 24 + targetMonth * 2 + (quincenaInMonth - 1);
};

export const calculateInterestDue = (
  currentBalance: number,
  biweeklyRate: number,
  lastPaymentDateStr: string | null | undefined,
  startDateStr: string,
  paymentDateStr: string
): { interest: number; fortnights: number } => {
  if (currentBalance <= 0 || biweeklyRate <= 0) return { interest: 0, fortnights: 0 };

  const parseDateAsUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const loanStartDate = parseDateAsUTC(startDateStr);
  const paymentDate = parseDateAsUTC(paymentDateStr);

  const effectiveLastActivityDate = lastPaymentDateStr
    ? parseDateAsUTC(lastPaymentDateStr)
    : loanStartDate;

  if (isNaN(effectiveLastActivityDate.getTime()) || isNaN(paymentDate.getTime())) {
    return { interest: 0, fortnights: 0 };
  }

  if (paymentDate.getTime() < effectiveLastActivityDate.getTime()) {
    return { interest: 0, fortnights: 0 };
  }

  if (paymentDate.getTime() === effectiveLastActivityDate.getTime()) {
    if (!lastPaymentDateStr && paymentDate.getTime() === loanStartDate.getTime()) {
      return { interest: 0, fortnights: 0 };
    }
  }

  const lastIndex = getQuincenaIndex(effectiveLastActivityDate);
  const payIndex = getQuincenaIndex(paymentDate);

  const fortnightsPassed = Math.max(0, payIndex - lastIndex);

  if (fortnightsPassed <= 0) return { interest: 0, fortnights: 0 };

  const rateAsDecimal = biweeklyRate / 100;
  const interestDue = currentBalance * rateAsDecimal * fortnightsPassed;

  return {
    interest: Math.round(interestDue * 100) / 100,
    fortnights: fortnightsPassed
  };
};
