import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register';

export function CustomerAuthModal({ isOpen, onClose }: CustomerAuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setConfirmationSent(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (data.user?.app_metadata?.role === 'admin') {
          await supabase.auth.signOut();
          throw new Error('Use o acesso administrativo para entrar com esta conta.');
        }
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/checkout`,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.session) setConfirmationSent(true);
    } catch (authError: any) {
      const message = authError?.message || 'Não foi possível autenticar. Tente novamente.';
      setError(message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-auth-title"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            className="fixed inset-x-4 top-1/2 z-[121] mx-auto w-auto max-w-lg -translate-y-1/2 overflow-hidden bg-surface shadow-2xl sm:inset-x-0"
          >
            <div className="relative border-b border-outline-variant/20 bg-on-surface px-7 py-6 text-surface">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-surface/70 transition-colors hover:text-surface"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Checkout seguro</p>
              </div>
              <h2 id="customer-auth-title" className="mt-3 font-headline text-3xl italic">
                Entre para continuar
              </h2>
              <p className="mt-1 text-sm text-surface/70">Seu carrinho ficará reservado enquanto você acessa sua conta.</p>
            </div>

            <div className="p-7 sm:p-8">
              {confirmationSent ? (
                <div className="space-y-5 py-4 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                  <h3 className="font-headline text-2xl italic">Confirme seu e-mail</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Enviamos um link para <strong className="text-on-surface">{email}</strong>. Após confirmar, você voltará para este checkout.
                  </p>
                  <button type="button" onClick={() => changeMode('login')} className="text-xs font-bold uppercase tracking-widest underline underline-offset-4">
                    Já confirmei, fazer login
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-7 grid grid-cols-2 border-b border-outline-variant/30">
                    <button
                      type="button"
                      onClick={() => changeMode('login')}
                      className={`pb-3 text-xs font-bold uppercase tracking-[0.18em] ${mode === 'login' ? 'border-b-2 border-on-surface text-on-surface' : 'text-on-surface-variant'}`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMode('register')}
                      className={`pb-3 text-xs font-bold uppercase tracking-[0.18em] ${mode === 'register' ? 'border-b-2 border-on-surface text-on-surface' : 'text-on-surface-variant'}`}
                    >
                      Criar conta
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="flex items-center gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    {mode === 'register' && (
                      <div className="grid grid-cols-2 gap-4">
                        <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Nome" autoComplete="given-name" className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />
                        <input required value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Sobrenome" autoComplete="family-name" className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />
                      </div>
                    )}

                    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" autoComplete="email" className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />
                    <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />

                    <button type="submit" disabled={loading} className="flex w-full items-center justify-center bg-on-surface px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-surface transition-colors hover:bg-on-surface-variant disabled:opacity-60">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? 'Entrar e continuar' : 'Criar e continuar'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
