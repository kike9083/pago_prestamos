import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Gestor de Préstamos</h1>
          <p className="text-secondary-text-light dark:text-secondary-text-dark text-sm">
            Controla tus finanzas, un pago a la vez.
          </p>
        </div>

        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl p-6 sm:p-8 w-full transition-colors duration-300">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 relative">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-3 text-center font-semibold focus:outline-none transition-colors duration-200 ${isLogin
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary-text-light dark:text-secondary-text-dark hover:text-text-light dark:hover:text-text-dark font-medium'
                }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-3 text-center font-semibold focus:outline-none transition-colors duration-200 ${!isLogin
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary-text-light dark:text-secondary-text-dark hover:text-text-light dark:hover:text-text-dark font-medium'
                }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons-round text-gray-400 text-lg">email</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border-gray-300 dark:border-gray-600 rounded-lg bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary focus:border-primary sm:text-sm transition-colors duration-200"
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1" htmlFor="password">
                Contraseña
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons-round text-gray-400 text-lg">lock</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border-gray-300 dark:border-gray-600 rounded-lg bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary focus:border-primary sm:text-sm transition-colors duration-200"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {isLogin && (
                <div className="flex justify-end mt-1">
                  <a className="text-xs font-medium text-primary hover:text-opacity-80 transition-colors" href="#">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            {message && <p className="text-sm text-green-500 text-center">{message}</p>}

            <div>
              <button
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card-light dark:bg-card-dark text-secondary-text-light dark:text-secondary-text-dark transition-colors duration-300">
                  O continúa con
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-input-dark text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.027-3.227 2.053-2.053 2.627-5.027 2.627-7.467 0-.747-.08-1.467-.187-2.187h-10.467z"></path>
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">
            © 2025 Gestor de Préstamos. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleDark}
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-800 p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        >
          <span className="material-icons-round text-xl">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
