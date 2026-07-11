import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, ArrowRight, User, Package, Loader2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface RentalRecord {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  product: {
    name: string;
    brand: string;
    image_url: string;
  };
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function CalendarAdmin() {
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'outgoing' | 'returning' | 'completed'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      // Fetch rentals with product info using inner join
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          id,
          start_date,
          end_date,
          status,
          total_price,
          user_id,
          product:products (
            name,
            brand,
            image_url
          )
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;

      if (data) {
        // Fetch customer data for each rental
        // Since we don't have a direct join to public.customers in the schema easily for auth.users,
        // we'll attempt a secondary fetch to map names.
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email');

        const mappedRentals = data.map((rental: any) => {
          // Attempt to find customer by id or email if possible
          // For now, heuristic match or just placeholder if none
          const customer = customersData?.find(c => c.id === rental.user_id);
          
          return {
            ...rental,
            customer: customer ? {
              first_name: customer.first_name,
              last_name: customer.last_name,
              email: customer.email
            } : {
              first_name: 'Usuário',
              last_name: 'Registrado',
              email: 'info@bags2rent.com'
            }
          } as RentalRecord;
        });

        setRentals(mappedRentals);
      }
    } catch (err) {
      console.error('Erro ao buscar calendário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (rentalId: string, newStatus: string) => {
    setUpdatingId(rentalId);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: newStatus })
        .eq('id', rentalId);

      if (error) throw error;
      
      // Update local state
      setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error('Erro ao atualizar status da locação:', err);
      alert('Falha ao atualizar status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredRentals = rentals.filter(rental => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      rental.product.name.toLowerCase().includes(term) ||
      rental.customer?.first_name.toLowerCase().includes(term) ||
      rental.customer?.last_name.toLowerCase().includes(term);

    const matchesFilter = 
      (filterType === 'all' && rental.status !== 'completed') || 
      (filterType === 'outgoing' && rental.start_date === today && rental.status !== 'completed') ||
      (filterType === 'returning' && rental.end_date === today && rental.status !== 'completed') ||
      (filterType === 'completed' && rental.status === 'completed');

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-headline italic text-3xl">Calendário de Locações</h3>
          <p className="text-on-surface-variant text-sm mt-1">Gestão de entregas e devoluções programadas.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors border ${filterType === 'all' ? 'bg-black text-white border-black' : 'bg-white text-black border-outline-variant hover:bg-surface-container'}`}
          >
            Tudo (Ativos)
          </button>
          <button 
            onClick={() => setFilterType('outgoing')}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors border ${filterType === 'outgoing' ? 'bg-primary text-on-primary border-primary' : 'bg-white text-black border-outline-variant hover:bg-surface-container'}`}
          >
            Saindo Hoje
          </button>
          <button 
            onClick={() => setFilterType('returning')}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors border ${filterType === 'returning' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-black border-outline-variant hover:bg-surface-container'}`}
          >
            Voltando Hoje
          </button>
          <button 
            onClick={() => setFilterType('completed')}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors border ${filterType === 'completed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-black border-outline-variant hover:bg-surface-container'}`}
          >
            Devolvidos
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-surface-container/30 p-4 rounded-lg border border-outline-variant/10">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Pesquisar por peça ou locador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-outline-variant pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant italic">Organizando agenda...</p>
        </div>
      ) : filteredRentals.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-lowest border border-dashed border-outline-variant rounded-lg">
          <CalendarIcon className="w-12 h-12 mx-auto text-outline-variant mb-4" />
          <p className="text-on-surface-variant">Nenhuma locação encontrada para este período ou filtro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRentals.map((rental) => (
            <div key={rental.id} className="group bg-white border border-outline-variant/20 overflow-hidden hover:border-black/20 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row">
                {/* Product Preview */}
                <div className="w-full md:w-48 h-48 md:h-auto bg-surface-container">
                  <img 
                    src={rental.product.image_url} 
                    alt={rental.product.name} 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-grow p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant block mb-1">
                          {rental.product.brand}
                        </span>
                        <h4 className="font-headline italic text-xl group-hover:text-primary transition-colors">
                          {rental.product.name}
                        </h4>
                      </div>
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full ${
                        rental.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        rental.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        rental.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rental.status === 'confirmed' ? 'Confirmado' : 
                         rental.status === 'active' ? 'Em Uso' : 
                         rental.status === 'completed' ? 'Devolvido' : rental.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/5 rounded-full">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Locador</p>
                          <p className="font-medium text-sm">{rental.customer?.first_name} {rental.customer?.last_name}</p>
                          <p className="text-xs text-on-surface-variant">{rental.customer?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex flex-col">
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                            Saída
                          </p>
                          <p className="font-bold text-sm">{formatDate(rental.start_date)}</p>
                        </div>
                        <div className="flex items-center pt-4">
                          <ArrowRight className="w-4 h-4 text-outline-variant" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                            Devolução
                          </p>
                          <p className="font-bold text-sm text-amber-700">{formatDate(rental.end_date)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-on-surface-variant italic">ID: {rental.id.split('-')[0]}...</p>
                      <div className="h-4 w-[1px] bg-outline-variant/20"></div>
                      <p className="font-medium text-sm text-emerald-700">R$ {rental.total_price}</p>
                    </div>

                    <div className="flex gap-2">
                      {rental.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(rental.id, 'active')}
                          disabled={updatingId === rental.id}
                          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-colors disabled:opacity-50"
                        >
                          {updatingId === rental.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                          Entregue
                        </button>
                      )}
                      {rental.status === 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(rental.id, 'completed')}
                          disabled={updatingId === rental.id}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                          {updatingId === rental.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                          Devolvido
                        </button>
                      )}
                      {rental.status === 'completed' && (
                        <span className="text-[10px] uppercase font-bold text-green-600 flex items-center gap-1">
                          ✓ Finalizado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
