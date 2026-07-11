import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // If email confirmation is disabled, user might be logged in, but we show success for a bit
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-surface px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-3xl font-headline italic">Conta Criada!</h2>
          <p className="text-on-surface-variant font-light">
            Enviamos um e-mail de confirmação. Por favor, verifique sua caixa de entrada antes de fazer login.
          </p>
          <div className="pt-4">
            <Link to="/login" className="text-sm font-medium underline underline-offset-4 decoration-primary/30 hover:text-primary transition-colors">
              Ir para o Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-surface px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div>
          <h2 className="text-center text-5xl font-headline italic tracking-tight text-on-surface">
            Criar Conta
          </h2>
          <p className="mt-2 text-center text-sm text-on-surface-variant font-light tracking-wide uppercase">
            Junte-se à nossa comunidade exclusiva
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

          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="Nome"
              />
            </div>
            <div className="relative group">
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="Sobrenome"
              />
            </div>
          </div>

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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
              placeholder="Senha"
            />
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
                'Criar'
              )}
            </button>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-on-surface-variant font-light">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-medium text-on-surface underline underline-offset-4 hover:text-primary transition-colors">
                Entrar
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
