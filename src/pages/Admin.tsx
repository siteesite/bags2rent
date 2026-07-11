import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingBag, Users, Tag, LogOut, Calendar, Settings, Ticket, RefreshCw } from 'lucide-react';
import { clearCloudflareCache } from '../lib/cloudflare';
import { useNavigate } from 'react-router-dom';
import { Orders } from './Orders';
import { Customers } from './Customers';
import { ProductsAdmin } from './ProductsAdmin';
import { Dashboard } from './Dashboard';
import { CalendarAdmin } from './CalendarAdmin';
import { SettingsAdmin } from './SettingsAdmin';
import { CouponsAdmin } from './CouponsAdmin';

export function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    try {
      setIsClearingCache(true);
      const result = await clearCloudflareCache();

      if (!result.success) {
        if (result.error === 'Credenciais do Cloudflare não configuradas.') {
          alert('As variáveis de ambiente VITE_CLOUDFLARE_ZONE_ID e VITE_CLOUDFLARE_API_TOKEN precisam ser configuradas na sua hospedagem (.env.local).');
        } else {
          throw new Error(result.error);
        }
        return;
      }

      alert('Cache limpo com sucesso! A página será recarregada.');
      window.location.reload();
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      alert(error.message || 'Erro ao tentar limpar o cache. Verifique o console.');
    } finally {
      setIsClearingCache(false);
    }
  };
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Menu / Header do Admin */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-sm gap-4">
        <div>
          <h1 className="font-headline italic text-3xl">Painel Administrativo</h1>
          <p className="text-sm text-on-surface-variant">Gerencie sua loja e configurações</p>
        </div>
        <button
          onClick={handleClearCache}
          disabled={isClearingCache}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-black/90 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isClearingCache ? 'animate-spin' : ''}`} />
          {isClearingCache ? 'Limpando...' : 'Limpar Cache (Cloudflare)'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant/20 p-6">
            <h2 className="font-headline italic text-2xl mb-1">Admin</h2>
            <p className="text-sm text-on-surface-variant mb-6">{user?.email}</p>
            
            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'dashboard' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('produtos')} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'produtos' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <Tag className="w-4 h-4" /> Produtos
              </button>
              <button 
                onClick={() => setActiveTab('pedidos')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'pedidos' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <ShoppingBag className="w-4 h-4" /> Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('clientes')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'clientes' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <Users className="w-4 h-4" /> Clientes
              </button>
              <button 
                onClick={() => setActiveTab('calendario')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'calendario' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <Calendar className="w-4 h-4" /> Calendário
              </button>
              <button 
                onClick={() => setActiveTab('configuracao')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'configuracao' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <Settings className="w-4 h-4" /> Configuração
              </button>
              <button 
                onClick={() => setActiveTab('cupons')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === 'cupons' ? 'bg-primary text-on-primary' : 'hover:bg-surface-container/50'}`}
              >
                <Ticket className="w-4 h-4" /> Cupons
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container/50 text-sm font-medium text-red-600 transition-colors text-left">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow">
          {activeTab === 'dashboard' && (
            <Dashboard />
          )}

          {activeTab === 'produtos' && (
            <ProductsAdmin />
          )}
          {activeTab === 'pedidos' && (
            <Orders />
          )}
          {activeTab === 'clientes' && (
            <Customers />
          )}
          {activeTab === 'calendario' && (
            <CalendarAdmin />
          )}
          {activeTab === 'configuracao' && (
            <SettingsAdmin />
          )}
          {activeTab === 'cupons' && (
            <CouponsAdmin />
          )}
        </div>
      </div>
    </div>
  );
}
