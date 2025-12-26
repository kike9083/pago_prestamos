import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import type { Session } from './types';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import { Spinner } from './components/ui';

import { LocalNotifications } from '@capacitor/local-notifications';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Auth Session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((error) => {
        console.error('Auth session error:', error);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Notifications setup
    const setupNotifications = async () => {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        // Clear existing to avoid duplicates
        await LocalNotifications.cancel({ notifications: [{ id: 15 }, { id: 30 }] });

        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Recordatorio de Pago",
              body: "Hoy es 15, no olvides revisar tus pagos de préstamos.",
              id: 15,
              schedule: { on: { day: 15, hour: 9, minute: 0 }, repeats: true },
              smallIcon: 'ic_stat_name', // Needs to be configured in Android
            },
            {
              title: "Recordatorio de Pago",
              body: "Hoy es 30, recuerda cumplir con tus obligaciones financieras.",
              id: 30,
              schedule: { on: { day: 30, hour: 9, minute: 0 }, repeats: true },
            }
          ]
        });
      }
    };
    setupNotifications();

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {!session ? (
        <AuthPage />
      ) : (
        <DashboardPage
          key={session.user.id}
          session={session}
        />
      )}
    </div>
  );
};

export default App;
