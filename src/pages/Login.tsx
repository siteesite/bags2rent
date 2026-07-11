import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : signInError.message);
      setLoading(false);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const appRole = (userData?.user as any)?.app_metadata?.role;
      navigate(appRole === 'admin' ? '/admin' : '/minha-conta');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-surface px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div>
          <h2 className="text-center text-5xl font-headline italic tracking-tight text-on-surface">
            Login
          </h2>
          <p className="mt-2 text-center text-sm text-on-surface-variant font-light tracking-wide uppercase">
            Acesse sua conta premium
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-600 p-4 flex items-center gap-3 text-sm border border-red-100"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="relative group">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="E-mail"
              />
            </div>
            <div className="relative group">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="Senha"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="text-sm">
              <Link to="/recuperar-senha" size="sm" className="font-light text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30">
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center bg-on-surface px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-surface hover:bg-on-surface-variant transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-on-surface-variant font-light">
              Não tem uma conta?{' '}
              <Link to="/registrar" className="font-medium text-on-surface underline underline-offset-4 hover:text-primary transition-colors">
                Criar conta
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
