import {
  databases,
  DATABASE_ID,
  LOANS_COLLECTION_ID,
  PAYMENTS_COLLECTION_ID,
  ID,
  Query,
  Permission,
  Role,
} from '@/shared/lib/appwrite/client';
import type { Loan, Payment, NewLoan } from '@/shared/types';

export async function getLoans(userId: string): Promise<Loan[]> {
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    LOANS_COLLECTION_ID,
    [Query.equal('user_id', userId), Query.orderDesc('$createdAt')]
  );
  return documents as unknown as Loan[];
}

export async function getLoan(loanId: string): Promise<Loan> {
  return (await databases.getDocument(
    DATABASE_ID,
    LOANS_COLLECTION_ID,
    loanId
  )) as unknown as Loan;
}

export async function createLoan(
  data: NewLoan & { suggested_payment: number; user_id: string; current_balance: number }
): Promise<Loan> {
  return (await databases.createDocument(
    DATABASE_ID,
    LOANS_COLLECTION_ID,
    ID.unique(),
    data,
    [
      Permission.read(Role.user(data.user_id)),
      Permission.update(Role.user(data.user_id)),
      Permission.delete(Role.user(data.user_id)),
    ]
  )) as unknown as Loan;
}

export async function updateLoan(
  loanId: string,
  data: Partial<Loan>
): Promise<Loan> {
  return (await databases.updateDocument(
    DATABASE_ID,
    LOANS_COLLECTION_ID,
    loanId,
    data
  )) as unknown as Loan;
}

export async function deleteLoan(loanId: string) {
  await databases.deleteDocument(DATABASE_ID, LOANS_COLLECTION_ID, loanId);
}

export async function getPayments(loanId: string): Promise<Payment[]> {
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    PAYMENTS_COLLECTION_ID,
    [Query.equal('loan_id', loanId), Query.orderDesc('payment_date')]
  );
  return documents as unknown as Payment[];
}

export async function createPayment(
  data: Omit<Payment, '$id'> & { $id?: string }
): Promise<Payment> {
  return (await databases.createDocument(
    DATABASE_ID,
    PAYMENTS_COLLECTION_ID,
    ID.unique(),
    data,
    [Permission.read(Role.user(data.user_id))]
  )) as unknown as Payment;
}

export async function updatePayment(
  paymentId: string,
  data: Partial<Payment>
): Promise<Payment> {
  return (await databases.updateDocument(
    DATABASE_ID,
    PAYMENTS_COLLECTION_ID,
    paymentId,
    data
  )) as unknown as Payment;
}
