import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Loader2, Eye, Trash2, X, Search, ChevronLeft, ChevronRight, ShoppingCart, MapPin, CreditCard, Phone, User, ExternalLink, FileText } from 'lucide-react';
import Papa from 'papaparse';

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const [importedOrders, setImportedOrders] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar pedidos:', error);
    } else {
      setOrders(data || []);
    }
    setLoadingOrders(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este pedido?')) return;
    
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const openOrderModal = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Send email if shipped
      if (newStatus.toLowerCase() === 'shipped') {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: selectedOrder.email,
              template_type: 'order_shipped',
              variables: {
                customer_name: selectedOrder.billing_address?.name || 'Cliente',
                order_id: selectedOrder.order_name
              }
            }
          });
        } catch (emailErr) {
          console.error('Error sending shipped email:', emailErr);
        }
      }

      // Sync with rentals status
      if (selectedOrder.order_name) {
        let rentalStatus = '';
        if (newStatus === 'shipped' || newStatus === 'delivered') {
          rentalStatus = 'active';
        } else if (newStatus === 'cancelled') {
          rentalStatus = 'cancelled';
        }

        if (rentalStatus) {
          await supabase
            .from('rentals')
            .update({ status: rentalStatus })
            .eq('order_name', selectedOrder.order_name);
        }
      }

      setSelectedOrder({ ...selectedOrder, fulfillment_status: newStatus });
      setOrders(orders.map(o => o.id === id ? { ...o, fulfillment_status: newStatus } : o));
      // No alert to keep it smooth, maybe just a toast later
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setShowCSV(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const ordersMap = new Map();

        data.forEach(row => {
          const orderName = row['Name']?.trim();
          if (!orderName) return;
          
          const lineItem = {
            quantity: parseInt(row['Lineitem quantity']) || 1,
            name: row['Lineitem name'],
            price: parseFloat(row['Lineitem price']) || 0,
            sku: row['Lineitem sku'] || '',
            compare_at_price: parseFloat(row['Lineitem compare at price']) || null
          };

          if (!ordersMap.has(orderName)) {
            // New order entry
            ordersMap.set(orderName, {
              order_name: orderName,
              email: row['Email'] || '',
              financial_status: row['Financial Status'] || '',
              fulfillment_status: row['Fulfillment Status'] || '',
              total_price: parseFloat(row['Total']) || 0,
              subtotal: parseFloat(row['Subtotal']) || 0,
              shipping: parseFloat(row['Shipping']) || 0,
              taxes: parseFloat(row['Taxes']) || 0,
              discount_code: row['Discount Code'] || '',
              discount_amount: parseFloat(row['Discount Amount']) || 0,
              created_at: row['Created at'] || new Date().toISOString(),
              paid_at: row['Paid at'] || null,
              payment_method: row['Payment Method'] || '',
              notes: row['Notes'] || '',
              tags: row['Tags'] || '',
              customer_phone: row['Phone'] || row['Shipping Phone'] || row['Billing Phone'] || '',
              billing_address: {
                name: row['Billing Name'] || '',
                street: row['Billing Street'] || '',
                city: row['Billing City'] || '',
                province: row['Billing Province'] || '',
                zip: row['Billing Zip'] || '',
                country: row['Billing Country'] || ''
              },
              shipping_address: {
                name: row['Shipping Name'] || '',
                street: row['Shipping Street'] || '',
                city: row['Shipping City'] || '',
                province: row['Shipping Province'] || '',
                zip: row['Shipping Zip'] || '',
                country: row['Shipping Country'] || ''
              },
              line_items: [lineItem]
            });
          } else {
            // Exisiting order row, just append line items
            // Sometime secondary rows lack Name/Email detail, we just need the Lineitem part
            const existingOrder = ordersMap.get(orderName);
            if (lineItem.name) {
              existingOrder.line_items.push(lineItem);
            }
          }
        });

        const mappedOrders = Array.from(ordersMap.values());
        setImportedOrders(mappedOrders);
        alert(`Sucesso! ${mappedOrders.length} pedidos únicos mapeados a partir do CSV.`);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('Erro ao importar CSV:', error);
        alert('Erro ao ler o arquivo CSV.');
      }
    });
  };

  const handleConfirmImport = async () => {
    if (importedOrders.length === 0) return;
    setIsSaving(true);
    try {
      // Upsert into Supabase
      const { error } = await supabase
        .from('orders')
        .upsert(importedOrders, { onConflict: 'order_name' });
      
      if (error) throw error;
      
      alert('Pedidos importados e salvos com sucesso!');
      setImportedOrders([]);
      setShowCSV(false);
      fetchOrders();
    } catch (error: any) {
      console.error('Erro:', error);
      alert('Erro ao salvar no banco: ' + (error.message || 'Desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return o.order_name?.toLowerCase().includes(term) || 
           o.email?.toLowerCase().includes(term) ||
           o.financial_status?.toLowerCase().includes(term) ||
           o.billing_address?.name?.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline italic text-3xl">Gestão de Pedidos</h3>
        <div className="flex gap-4">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => {
              if (showCSV) {
                setShowCSV(false);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant hover:bg-surface-container transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            {showCSV ? 'Ocultar CSV' : 'Importar CSV do Shopify'}
          </button>
        </div>
      </div>

      {showCSV && importedOrders.length > 0 && (
        <div className="mb-8 bg-surface-container-lowest border border-amber-500/30 p-6 rounded relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-headline italic text-xl text-amber-900">Prévia da Importação Automática ({importedOrders.length} pedidos)</h4>
            <button 
              onClick={() => {
                setImportedOrders([]);
                setShowCSV(false);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Cancelar/Fechar
            </button>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            O arquivo CSV foi processado inteligentemente. Múltiplas linhas do mesmo pedido foram agrupadas em um único carrinho.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container border-b border-outline-variant/20">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor Total</th>
                  <th className="px-4 py-3 font-medium">Status Financeiro</th>
                  <th className="px-4 py-3 font-medium">Itens no Carrinho</th>
                </tr>
              </thead>
              <tbody>
                {importedOrders.slice(0, 5).map((ord, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/20">
                    <td className="px-4 py-3 font-bold">{ord.order_name}</td>
                    <td className="px-4 py-3">
                      <span className="block">{ord.billing_address?.name || '-'}</span>
                      <span className="text-xs text-on-surface-variant block">{ord.email || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">R$ {ord.total_price}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${ord.financial_status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ord.financial_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{ord.line_items?.length} itens</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importedOrders.length > 5 && (
              <p className="text-center text-sm text-on-surface-variant mt-4">
                Mostrando 5 de {importedOrders.length} pedidos importados.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleConfirmImport}
              disabled={isSaving}
              className="bg-primary text-on-primary px-6 py-2 text-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-75 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Salvando Pedidos...' : 'Confirmar Importação no Banco'}
            </button>
          </div>
        </div>
      )}

      {/* Main Orders Table */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-on-surface">Todos os Pedidos</h4>
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar por ID, Nome ou Status..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-outline-variant bg-surface-container-lowest pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-sm"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/20 overflow-x-auto mb-4">
        {loadingOrders ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="animate-spin w-8 h-8 text-on-surface-variant" />
            <span className="ml-2 text-on-surface-variant">Carregando pedidos do banco...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum pedido encontrado.</p>
            <p className="text-sm">Tente ajustar sua busca ou fazer uma nova importação.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container border-b border-outline-variant/20">
              <tr>
                <th className="px-6 py-4 font-medium">Pedido (ID)</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Status Financeiro</th>
                <th className="px-6 py-4 font-medium">Entrega</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Período / Locação</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((ord) => {
                const isPaid = ord.financial_status?.toLowerCase() === 'paid';
                return (
                  <tr key={ord.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                    <td className="px-6 py-4 font-bold text-primary">{ord.order_name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(ord.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="block">{ord.billing_address?.name || '-'}</span>
                      <span className="text-xs text-on-surface-variant block">{ord.email || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {ord.financial_status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded-full text-gray-700 font-medium">
                        {ord.fulfillment_status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-medium">R$ {ord.total_price}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-[10px]">
                        {ord.line_items?.[0]?.dates ? (
                          <span className="text-primary font-medium">{ord.line_items[0].dates}</span>
                        ) : (
                          <span className="text-on-surface-variant italic">Data não definida</span>
                        )}
                        {ord.line_items?.[0]?.period && (
                          <span className="text-on-surface-variant">{ord.line_items[0].period}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-on-surface-variant">
                        <a 
                          href={`/contrato/${ord.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Ver Contrato em PDF" 
                          className="p-2 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                        <button title="Visualizar" onClick={() => openOrderModal(ord)} className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button title="Excluir" onClick={() => handleDelete(ord.id)} className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mb-8 bg-surface-container-lowest p-4 border border-outline-variant/20">
          <span className="text-sm text-on-surface-variant">
            Mostrando <span className="font-medium text-on-surface">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium text-on-surface">{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}</span> de <span className="font-medium text-on-surface">{filteredOrders.length}</span> pedidos
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="font-headline italic text-2xl flex items-center gap-3">
                Pedido {selectedOrder.order_name}
                <span className={`px-2 py-1 text-sm uppercase font-bold rounded-full ${selectedOrder.financial_status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {selectedOrder.financial_status || 'pendente'}
                </span>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Status Entrega:</span>
                  <select 
                    value={selectedOrder.fulfillment_status || 'pending'}
                    disabled={isUpdating}
                    onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                    className="text-xs bg-surface border border-outline-variant rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="pending">Pendente</option>
                    <option value="processing">Em Processamento</option>
                    <option value="shipped">Enviado (Gatilha E-mail)</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </div>
              </h3>
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
                    <span>Total ({selectedOrder.currency})</span>
                    <span className="text-emerald-700">R$ {selectedOrder.total_price}</span>
                  </div>
                  <div className="pt-2 text-xs text-on-surface-variant">
                    <p>Método: <span className="font-mono">{selectedOrder.payment_method || 'Não especificado'}</span></p>
                    {selectedOrder.asaas_payment_id && <p className="font-mono text-[10px] mt-1">Asaas ID: {selectedOrder.asaas_payment_id}</p>}
                    {selectedOrder.pagarme_order_id && <p className="font-mono text-[10px] mt-1">Pagar.me ID: {selectedOrder.pagarme_order_id}</p>}
                    {selectedOrder.paid_at && <p>Pago em: {new Date(selectedOrder.paid_at).toLocaleString('pt-BR')}</p>}
                  </div>
                </div>
              </div>

              {/* Cliente / Endereço */}
              <div className="space-y-6">
                {/* Cliente */}
                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/20 pb-2">
                    <User className="w-5 h-5" /> Cliente
                  </h4>
                  <div className="space-y-2.5 text-sm">
                    {/* Nome */}
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-0.5">Nome</span>
                      <p className="font-medium text-on-surface">{selectedOrder.billing_address?.name || selectedOrder.shipping_address?.name || 'Não informado'}</p>
                    </div>

                    {/* CPF */}
                    {(selectedOrder.customer_cpf || selectedOrder.cpf) && (
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-0.5">CPF</span>
                        <p className="font-mono text-on-surface">{selectedOrder.customer_cpf || selectedOrder.cpf}</p>
                      </div>
                    )}

                    {/* E-mail */}
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-0.5">E-mail</span>
                      <a href={`mailto:${selectedOrder.email}`} className="text-primary hover:underline break-all">
                        {selectedOrder.email || 'Não informado'}
                      </a>
                    </div>

                    {/* WhatsApp / Telefone */}
                    {(selectedOrder.customer_phone || selectedOrder.billing_address?.phone) && (() => {
                      const rawPhone = (selectedOrder.customer_phone || selectedOrder.billing_address?.phone || '').replace(/\D/g, '');
                      const intlPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                      return (
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-0.5">WhatsApp</span>
                          <a
                            href={`https://wa.me/${intlPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-emerald-600 font-medium hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {selectedOrder.customer_phone || selectedOrder.billing_address?.phone}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="bg-surface-container/30 border border-outline-variant/20 p-5 rounded">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/20 pb-2">
                    <MapPin className="w-5 h-5" /> Endereço de Entrega
                  </h4>
                  {(() => {
                    const addr = selectedOrder.shipping_address || selectedOrder.billing_address;
                    if (!addr) return <p className="text-sm text-on-surface-variant italic">Sem endereço registrado.</p>;
                    const streetFull = [addr.street, addr.number].filter(Boolean).join(', ');
                    const complement = addr.complement || addr.neighborhood || '';
                    const cityState = [addr.city, addr.province || addr.state].filter(Boolean).join(' - ');
                    const mapsQuery = encodeURIComponent([streetFull, complement, cityState, addr.zip].filter(Boolean).join(', '));
                    return (
                      <div className="text-sm text-on-surface-variant space-y-1.5">
                        {addr.name && <p className="font-medium text-on-surface">{addr.name}</p>}
                        {streetFull && <p>{streetFull}</p>}
                        {complement && <p>{complement}</p>}
                        {cityState && <p>{cityState}</p>}
                        {addr.zip && (
                          <p>CEP: <span className="font-mono">{addr.zip}</span></p>
                        )}
                        {addr.country && <p className="text-xs opacity-60">{addr.country}</p>}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver no Google Maps
                        </a>
                      </div>
                    );
                  })()}
                </div>
                
                {selectedOrder.notes && (
                  <div className="bg-amber-50 shrink-0 border border-amber-200 p-4 rounded text-sm text-amber-900">
                    <p className="font-bold mb-1">Observações do Cliente:</p>
                    <p className="italic">"{selectedOrder.notes}"</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant/20 px-6 py-4 flex justify-end z-10 transition">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2 text-sm font-medium transition-colors"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
