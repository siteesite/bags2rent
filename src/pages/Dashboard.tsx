import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, Users, Eye, Database, X, ShoppingCart, MapPin, CreditCard } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    totalCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  
  const [cfData, setCfData] = useState<{
    history: any[];
    totals: { requests: number; pageViews: number; uniques: number };
  } | null>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchCloudflareAnalytics();
  }, []);

  const fetchCloudflareAnalytics = async () => {
    const zoneId = import.meta.env.VITE_CLOUDFLARE_ZONE_ID;
    const apiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      setCfError('Credenciais do Cloudflare não configuradas no ambiente.');
      return;
    }

    setCfLoading(true);
    try {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const dateGt = d.toISOString().split('T')[0];

      const query = `
        query {
          viewer {
            zones(filter: { zoneTag: "${zoneId}" }) {
              httpRequests1dGroups(
                limit: 30,
                filter: { date_gt: "${dateGt}" },
                orderBy: [date_DESC]
              ) {
                dimensions { date }
                sum { requests, bytes, pageViews }
                uniq { uniques }
              }
            }
          }
        }
      `;

      const { data: json, error: functionError } = await supabase.functions.invoke('cloudflare-proxy', {
        body: {
          endpoint: 'https://api.cloudflare.com/client/v4/graphql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: { query }
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro na comunicação com a API do Cloudflare (Proxy)');
      }

      if (json.errors) {
        throw new Error(json.errors[0]?.message || 'Erro nos dados da API do Cloudflare');
      }

      const groups = json.data?.viewer?.zones[0]?.httpRequests1dGroups || [];
      const history = groups.map((g: any) => ({
        data: new Date(g.dimensions.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        visualizacoes: g.sum.pageViews,
        visitantes: g.uniq.uniques,
        requisicoes: g.sum.requests,
      })).reverse(); 

      const totals = history.reduce((acc: any, curr: any) => ({
        pageViews: acc.pageViews + curr.visualizacoes,
        uniques: acc.uniques + curr.visitantes,
        requests: acc.requests + curr.requisicoes,
      }), { pageViews: 0, uniques: 0, requests: 0 });

      setCfData({ history, totals });
    } catch (err: any) {
      console.error('Error fetching Cloudflare analytics:', err);
      setCfError(err.message || 'Falha ao buscar métricas de tráfego');
    } finally {
      setCfLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Revenue (sum of all paid or all orders total_price)
      const { data: orders } = await supabase
        .from('orders')
        .select('total_price, financial_status');
        
      const revenue = orders?.reduce((sum, order) => {
        // Consider only paid items for revenue, or all if we want gross
        if (order.financial_status?.toLowerCase() === 'paid') {
          return sum + (Number(order.total_price) || 0);
        }
        return sum;
      }, 0) || 0;

      const totalOrders = orders?.length || 0;

      // Fetch Customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch latest 5 orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        revenue,
        totalOrders,
        totalCustomers: customersCount || 0
      });
      setRecentOrders(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, field: 'fulfillment_status' | 'financial_status', newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setSelectedOrder({ ...selectedOrder, [field]: newStatus });
      setRecentOrders(recentOrders.map(o => o.id === id ? { ...o, [field]: newStatus } : o));
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-on-surface-variant">Carregando métricas da loja...</p>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-headline italic text-3xl mb-6">Visão Geral</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm">
          <p className="text-sm text-on-surface-variant mb-2 font-medium">Receita Total (Paga)</p>
          <p className="text-3xl font-light text-emerald-700">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm">
          <p className="text-sm text-on-surface-variant mb-2 font-medium">Pedidos Cadastrados</p>
          <p className="text-3xl font-light text-primary">{stats.totalOrders}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm">
          <p className="text-sm text-on-surface-variant mb-2 font-medium">Base de Clientes</p>
          <p className="text-3xl font-light text-primary">{stats.totalCustomers}</p>
        </div>
      </div>

      <h3 className="font-headline italic text-2xl mb-4">Métricas de Tráfego (Últimos 30 dias)</h3>
      
      {cfLoading ? (
        <div className="flex justify-center p-8 bg-surface-container-lowest border border-outline-variant/20 mb-8 rounded shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : cfError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8 border border-red-100 text-sm">
          {cfError}
        </div>
      ) : cfData && cfData.history.length > 0 ? (
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm text-on-surface-variant font-medium">Visitantes Únicos</p>
              </div>
              <p className="text-3xl font-light text-primary">{cfData.totals.uniques.toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-on-surface-variant font-medium">Visualizações de Páginas</p>
              </div>
              <p className="text-3xl font-light text-emerald-700">{cfData.totals.pageViews.toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-on-surface-variant font-medium">Cliques/Requisições</p>
              </div>
              <p className="text-3xl font-light text-blue-700">{cfData.totals.requests.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 rounded shadow-sm">
            <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">Tráfego Diário</h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cfData.history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <Line type="monotone" name="Visitantes" dataKey="visitantes" stroke="#000000" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="PageViews" dataKey="visualizacoes" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
         <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 text-center text-on-surface-variant mb-8 rounded shadow-sm">
           Nenhum dado de tráfego disponível para os últimos 30 dias.
         </div>
      )}

      <h3 className="font-headline italic text-2xl mb-4">Pedidos Recentes</h3>
      
      {recentOrders.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 text-center text-on-surface-variant">
          Nenhum pedido recente encontrado no banco de dados.
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant/20 overflow-x-auto rounded shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container border-b border-outline-variant/20">
              <tr>
                <th className="px-6 py-4 font-medium">Pedido (ID)</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Status Financeiro</th>
                <th className="px-6 py-4 font-medium">Status Entrega</th>
                <th className="px-6 py-4 font-medium">Valor Total</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => {
                const isPaid = order.financial_status?.toLowerCase() === 'paid';
                return (
                  <tr key={order.id} className="border-b border-outline-variant/20 hover:bg-surface-container/50">
                    <td className="px-6 py-4 font-bold">{order.order_name}</td>
                    <td className="px-6 py-4">{order.billing_address?.name || order.email || '-'}</td>
                    <td className="px-6 py-4">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {order.financial_status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded-full text-gray-700 font-medium">
                        {order.fulfillment_status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-700">R$ {order.total_price}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openOrderModal(order)}
                        className="p-2 hover:bg-primary/10 text-primary rounded transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex flex-col gap-1">
                <h3 className="font-headline italic text-2xl">Pedido {selectedOrder.order_name}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Finanças:</span>
                    <select 
                      value={selectedOrder.financial_status || 'pending'}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusUpdate(selectedOrder.id, 'financial_status', e.target.value)}
                      className={`text-xs border rounded px-2 py-1 outline-none font-bold uppercase ${
                        selectedOrder.financial_status?.toLowerCase() === 'paid' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-orange-100 text-orange-800 border-orange-200'
                      }`}
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="partially_paid">Parcialmente Pago</option>
                      <option value="refunded">Reembolsado</option>
                      <option value="voided">Cancelado/Estornado</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Entrega:</span>
                    <select 
                      value={selectedOrder.fulfillment_status || 'pending'}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusUpdate(selectedOrder.id, 'fulfillment_status', e.target.value)}
                      className="text-xs bg-surface border border-outline-variant rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="pending">Pendente</option>
                      <option value="processing">Em Processamento</option>
                      <option value="shipped">Enviado</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Carrinho / Line Items */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/20 pb-2">
                    <ShoppingCart className="w-5 h-5" /> Carrinho de Compras
                  </h4>
                  <div className="space-y-4">
                    {selectedOrder.line_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-surface-container-lowest p-3 border border-outline-variant/30 rounded">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-on-surface">{item.name}</span>
                          <span className="text-xs text-on-surface-variant">
                            Qtd: {item.quantity} 
                            {item.sku && ` | SKU: ${item.sku}`}
                            {item.size && ` | Tam: ${item.size}`}
                            {item.color && ` | Cor: ${item.color}`}
                          </span>
                          {item.dates && (
                            <span className="text-[10px] text-primary font-bold mt-1">{item.dates}</span>
                          )}
                          {item.period && (
                            <span className="text-[10px] text-on-surface-variant italic">{item.period}</span>
                          )}
                        </div>
                        <span className="font-medium text-emerald-700">R$ {item.price}</span>
                      </div>
                    ))}
                    {(!selectedOrder.line_items || selectedOrder.line_items.length === 0) && (
                      <p className="text-sm text-on-surface-variant">Nenhum item listado neste pedido.</p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded space-y-4">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                    <CreditCard className="w-5 h-5" /> Resumo Financeiro
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span>R$ {selectedOrder.subtotal || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Frete</span>
                    <span>R$ {selectedOrder.shipping || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Taxas</span>
                    <span>R$ {selectedOrder.taxes || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Descontos ({selectedOrder.discount_code})</span>
                    <span className="text-red-500">- R$ {selectedOrder.discount_amount || 0}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-outline-variant/20">
                    <span>Total ({selectedOrder.currency || 'BRL'})</span>
                    <span className="text-emerald-700">R$ {selectedOrder.total_price}</span>
                  </div>
                  <div className="pt-2 text-[10px] text-on-surface-variant font-mono space-y-1">
                    {selectedOrder.asaas_payment_id && (
                      <p>Asaas ID: {selectedOrder.asaas_payment_id}</p>
                    )}
                    {selectedOrder.pagarme_order_id && (
                      <p>Pagar.me ID: {selectedOrder.pagarme_order_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cliente / Endereço */}
              <div className="space-y-6">
                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/20 pb-2">
                    👤 Cliente
                  </h4>
                  <p className="text-sm font-medium mb-1">{selectedOrder.billing_address?.name || 'Sem nome'}</p>
                  <p className="text-sm text-on-surface-variant">{selectedOrder.email || 'Sem email'}</p>
                  <p className="text-sm text-on-surface-variant">{selectedOrder.customer_phone || 'Sem telefone'}</p>
                </div>

                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/20 pb-2">
                    <MapPin className="w-5 h-5" /> Endereço de Entrega
                  </h4>
                  <div className="text-sm text-on-surface-variant space-y-1">
                    <p className="font-medium text-on-surface">{selectedOrder.shipping_address?.name}</p>
                    <p>{selectedOrder.shipping_address?.street}</p>
                    <p>{selectedOrder.shipping_address?.city} - {selectedOrder.shipping_address?.province}</p>
                    <p>CEP: {selectedOrder.shipping_address?.zip}</p>
                    <p>{selectedOrder.shipping_address?.country}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant/20 px-6 py-4 flex justify-end z-10 transition">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2 text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
