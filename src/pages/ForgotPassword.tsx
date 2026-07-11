import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/resetar-senha`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-surface px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h2 className="text-5xl font-headline italic tracking-tight text-on-surface mb-4">
            Redefinir Senha
          </h2>
          <p className="text-sm text-on-surface-variant font-light max-w-[280px] mx-auto">
            Nós enviaremos um e-mail para você redefinir sua senha de acesso.
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
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-50 text-green-700 p-4 flex items-center gap-3 text-sm border border-green-100"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Verifique seu e-mail para continuar o processo.
              </motion.div>
            )}
          </AnimatePresence>

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
              placeholder="Seu e-mail cadastrado"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="group relative flex w-full justify-center bg-on-surface px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-surface hover:bg-on-surface-variant transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enviar Instruções'
              )}
            </button>
          </div>
          
          <div className="text-center mt-8">
            <Link to="/login" className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
              Voltar para o Login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
