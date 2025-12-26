import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Button, Input, Card, CardContent } from './ui';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Revisa tu correo para verificar tu cuenta.');
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-primary-600">Gestor de Préstamos</h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-6">Controla tus finanzas, un pago a la vez.</p>
        <Card>
          <CardContent>
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 p-3 font-medium text-sm ${isLogin ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 p-3 font-medium text-sm ${!isLogin ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                id="email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
              <Input
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" isLoading={loading}>
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </form>

            {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
            {message && <p className="mt-4 text-center text-sm text-green-500">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </div >
  );
};

export default AuthPage;
