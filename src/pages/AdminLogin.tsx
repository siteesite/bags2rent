import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function AdminLogin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && user?.role === 'admin') return <Navigate to="/admin" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : signInError.message);
      setLoading(false);
      return;
    }

    if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Esta conta não possui acesso administrativo.');
      setLoading(false);
      return;
    }

    navigate('/admin', { replace: true });
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8" />
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">Acesso restrito</p>
          <h1 className="font-headline text-4xl italic">Administração</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="flex items-center gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="E-mail administrativo" className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Senha" className="w-full border-0 border-b border-outline-variant bg-transparent px-1 py-3 text-sm focus:border-primary focus:ring-0" />
          <button type="submit" disabled={loading} className="flex w-full justify-center bg-on-surface px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-surface disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar no painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
