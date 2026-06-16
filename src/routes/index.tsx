import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthGuard, GuestGuard } from './AuthGuard';
import { AppLayout } from '../features/layout/components/AppLayout';
import { Spinner } from '../shared/components/Spinner';

const AuthPage = lazy(() => import('../features/auth/pages/AuthPage'));
const LoanListPage = lazy(() => import('../features/loans/pages/LoanListPage'));
const LoanDetailPage = lazy(() => import('../features/loans/pages/LoanDetailPage'));
const LoanFormPage = lazy(() => import('../features/loans/pages/LoanFormPage'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/loans" replace />,
  },
  {
    element: <GuestGuard />,
    children: [
      {
        path: '/auth',
        element: <SuspenseWrapper><AuthPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/loans', element: <SuspenseWrapper><LoanListPage /></SuspenseWrapper> },
          { path: '/loans/new', element: <SuspenseWrapper><LoanFormPage /></SuspenseWrapper> },
          { path: '/loans/:id', element: <SuspenseWrapper><LoanDetailPage /></SuspenseWrapper> },
          { path: '/loans/:id/edit', element: <SuspenseWrapper><LoanFormPage /></SuspenseWrapper> },
        ],
      },
    ],
  },
]);
