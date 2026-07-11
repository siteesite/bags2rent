import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, CheckCircle2, Lock } from 'lucide-react';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
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
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-surface-container rounded-full">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl font-headline italic tracking-tight text-on-surface mb-2">
            Nova Senha
          </h2>
          <p className="text-sm text-on-surface-variant font-light">
            Crie uma nova senha segura para sua conta.
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
                Senha redefinida com sucesso! Redirecionando...
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="relative group">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="Nova Senha"
              />
            </div>
            <div className="relative group">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-0 sm:text-sm transition-all focus:pl-2"
                placeholder="Confirme a Nova Senha"
              />
            </div>
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
                'Redefinir Senha'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
