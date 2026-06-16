import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { login, register } from '../services/authService';
import { useAuthStore } from '@/shared/store/authStore';
import { LogIn, UserPlus, Wallet } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type AuthFormData = z.infer<typeof authSchema>;

const AuthPage: FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setServerError(null);
    reset();
  };

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setServerError(null);

    try {
      const user = isLogin
        ? await login(data.email, data.password)
        : await register(data.email, data.password);
      setUser(user);
      navigate('/loans', { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-600/20">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Gestor de Préstamos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Controla tus finanzas, un pago a la vez.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6">
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
              <button
                onClick={toggleMode}
                className={`flex-1 pb-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  isLogin
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </button>
              <button
                onClick={toggleMode}
                className={`flex-1 pb-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  !isLogin
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Registrarse
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="email"
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                {...formRegister('email')}
              />
              <Input
                id="password"
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...formRegister('password')}
              />

              <Button type="submit" className="w-full" isLoading={loading}>
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </form>

            <AnimatePresence>
              {serverError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 text-center text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800/30"
                >
                  {serverError}
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;
