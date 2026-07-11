import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Clock, Settings, LogOut, User as UserIcon, FileText, ChevronRight, Loader2, Calendar, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'rentals' | 'history' | 'contracts' | 'settings'>('rentals');
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    }
  }, [user, activeTab]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch Rentals with product details
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*, products(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (rentalsError) throw rentalsError;
      setRentals(rentalsData || []);

      // Fetch Orders (for History and Contracts)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('email', user?.email)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row gap-12"
      >
        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded shadow-sm sticky top-32">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-headline italic text-2xl capitalize leading-tight">{user?.name}</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mt-1">{user?.role}</p>
              </div>
            </div>
            
            <p className="text-xs text-on-surface-variant mb-10 pb-6 border-b border-outline-variant/10 font-light italic truncate">
              {user?.email}
            </p>
            
            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('rentals')}
                className={`w-full flex items-center gap-4 px-5 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'rentals' ? 'bg-on-surface text-surface shadow-lg shadow-on-surface/10' : 'hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <Package className="w-4 h-4" /> Meus Aluguéis
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-4 px-5 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'history' ? 'bg-on-surface text-surface shadow-lg shadow-on-surface/10' : 'hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <Clock className="w-4 h-4" /> Histórico de Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('contracts')}
                className={`w-full flex items-center gap-4 px-5 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'contracts' ? 'bg-on-surface text-surface shadow-lg shadow-on-surface/10' : 'hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <FileText className="w-4 h-4" /> Contratos Assinados
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-4 px-5 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'settings' ? 'bg-on-surface text-surface shadow-lg shadow-on-surface/10' : 'hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <Settings className="w-4 h-4" /> Meus Dados
              </button>
              
              <div className="pt-6 mt-6 border-t border-outline-variant/20">
                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 text-xs font-black text-red-600 transition-colors text-left uppercase tracking-widest">
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-xs uppercase tracking-widest font-bold">Carregando painel...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'rentals' && (
                <motion.div
                  key="rentals"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <header>
                    <h3 className="font-headline italic text-4xl mb-2">Aluguéis Ativos</h3>
                    <p className="text-on-surface-variant font-light">Peças que estão com você ou em trânsito.</p>
                  </header>
                  
                  {rentals.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant/20 p-12 text-center rounded">
                      <Package className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-30" />
                      <p className="text-on-surface-variant italic font-light">Você ainda não possui aluguéis ativos.</p>
                      <button 
                        onClick={() => navigate('/')}
                        className="mt-6 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                      >
                        Explorar catálogo
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {rentals.map(rental => (
                        <div key={rental.id} className="bg-surface-container-lowest border border-outline-variant/20 p-6 flex flex-col sm:flex-row gap-8 items-center group transition-all hover:border-outline hover:shadow-xl hover:shadow-primary/5 rounded">
                          <div className="w-24 h-32 overflow-hidden shrink-0 bg-surface-container-low rounded-sm">
                            <img 
                              src={rental.products?.image_url} 
                              alt={rental.products?.name} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="flex-grow text-center sm:text-left">
                            <span className="font-label uppercase tracking-[0.2em] text-[10px] text-primary font-bold mb-1 block">
                              {rental.products?.brand}
                            </span>
                            <h4 className="font-headline italic text-2xl mb-2">{rental.products?.name}</h4>
                            <div className="flex flex-col sm:flex-row gap-6 mt-4 text-xs tracking-wide">
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <Calendar className="w-3 h-3 text-primary" />
                                <p>Devolver em: <span className="text-on-surface font-bold">{format(new Date(rental.end_date), 'dd/MM/yyyy')}</span></p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  rental.status === 'confirmed' ? 'bg-emerald-500' : 
                                  rental.status === 'pending' ? 'bg-orange-400' : 'bg-primary'
                                }`} />
                                <p className="text-on-surface-variant uppercase tracking-widest text-[9px] font-black">
                                  {rental.status === 'confirmed' ? 'Confirmado' : 
                                   rental.status === 'pending' ? 'Aguardando Pagamento' : 'Em trânsito'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 w-full sm:w-auto">
                            <button className="w-full sm:w-auto border border-on-surface px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-on-surface hover:text-white transition-all rounded">
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'contracts' && (
                <motion.div
                  key="contracts"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <header>
                    <h3 className="font-headline italic text-4xl mb-2">Contratos Assinados</h3>
                    <p className="text-on-surface-variant font-light">Seu histórico de aceites de termos de locação.</p>
                  </header>

                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <div className="bg-surface-container-lowest border border-outline-variant/20 p-12 text-center rounded">
                        <FileText className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-30" />
                        <p className="text-on-surface-variant italic font-light">Nenhum contrato assinado encontrado.</p>
                      </div>
                    ) : (
                      orders.map(order => (
                        <div 
                          key={order.id}
                          className="bg-surface-container-lowest border border-outline-variant/10 p-6 flex items-center justify-between hover:border-primary/30 transition-all rounded"
                        >
                          <div className="flex items-center gap-5">
                            <div className="p-3 bg-primary/5 rounded-full">
                              <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-1">
                                Pedido #{order.order_name}
                              </p>
                              <h4 className="text-sm font-bold">Contrato de Locação Digital</h4>
                              <p className="text-[11px] text-on-surface-variant font-light mt-1">
                                Assinado em {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <a 
                            href={`/contrato/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2 transition-all rounded border border-primary/10"
                          >
                            Ver Documento <ChevronRight className="w-3 h-3" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <header>
                    <h3 className="font-headline italic text-4xl mb-2">Histórico de Pedidos</h3>
                    <p className="text-on-surface-variant font-light">Acompanhe seus pagamentos e status.</p>
                  </header>

                  <div className="bg-surface-container-lowest border border-outline-variant/20 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low text-[10px] uppercase tracking-widest font-black text-on-surface-variant border-b border-outline-variant/10">
                          <th className="px-6 py-4">Pedido</th>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Pagamento</th>
                          <th className="px-6 py-4">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-primary">#{order.order_name}</td>
                            <td className="px-6 py-4 text-xs font-light text-on-surface-variant">
                              {format(new Date(order.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-full ${
                                order.financial_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {order.financial_status === 'paid' ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <div className="py-24 text-center">
                  <p className="text-on-surface-variant italic font-light">Funcionalidade em desenvolvimento para a próxima versão.</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

    </div>
  );
}
