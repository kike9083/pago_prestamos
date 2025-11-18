import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import type { Session } from './types';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import { Spinner } from './components/ui';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {!session ? <AuthPage /> : <DashboardPage key={session.user.id} session={session} />}
    </div>
  );
};

export default App;
