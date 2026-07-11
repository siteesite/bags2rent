import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Loader2, Eye, Trash2, X, Search, ChevronLeft, ChevronRight, User, MapPin, Mail, Phone, ShoppingBag, Plus } from 'lucide-react';
import Papa from 'papaparse';

export function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  const [importedCustomers, setImportedCustomers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    accepts_email_marketing: true,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('total_spent', { ascending: false }); // Sort by total spent desc indicating VIPs first
    
    if (error) {
      console.error('Erro ao buscar clientes:', error);
    } else {
      setCustomers(data || []);
    }
    setLoadingCustomers(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este cliente e remover o histórico dele?')) return;
    
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  const openCustomerModal = (customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newCustomer = {
         ...manualCustomer,
         customer_id: `MANUAL-${Date.now()}`,
      };
      const { error } = await supabase.from('customers').insert([newCustomer]);
      if (error) throw error;
      
      alert('Cliente adicionado com sucesso!');
      setIsAddModalOpen(false);
      setManualCustomer({ first_name: '', last_name: '', email: '', phone: '', accepts_email_marketing: true });
      fetchCustomers();
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    } finally {
      setIsSaving(false);
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
        const customersMap = new Map();

        data.forEach(row => {
          const customerId = row['Customer ID']?.trim() || null;
          const email = row['Email']?.trim() || '';
          // We need a unique key. Attempt phone if email isn't there, else random number just to show in preview.
          const uniqueKey = customerId || email || Math.random().toString();
          
          if (!customersMap.has(uniqueKey)) {
            customersMap.set(uniqueKey, {
              customer_id: customerId,
              first_name: row['First Name'] || '',
              last_name: row['Last Name'] || '',
              email: email,
              phone: row['Phone'] || row['Default Address Phone'] || '',
              accepts_email_marketing: row['Accepts Email Marketing']?.toLowerCase() === 'yes',
              accepts_sms_marketing: row['Accepts SMS Marketing']?.toLowerCase() === 'yes',
              total_spent: parseFloat(row['Total Spent']) || 0,
              total_orders: parseInt(row['Total Orders']) || 0,
              note: row['Note'] || '',
              tax_exempt: row['Tax Exempt']?.toLowerCase() === 'yes',
              tags: row['Tags'] || '',
              default_address: {
                company: row['Default Address Company'] || '',
                address1: row['Default Address Address1'] || '',
                address2: row['Default Address Address2'] || '',
                city: row['Default Address City'] || '',
                province_code: row['Default Address Province Code'] || '',
                country_code: row['Default Address Country Code'] || '',
                zip: row['Default Address Zip'] || ''
              }
            });
          }
        });

        const mappedCustomers = Array.from(customersMap.values());
        setImportedCustomers(mappedCustomers);
        alert(`Sucesso! ${mappedCustomers.length} clientes únicos mapeados a partir do arquivo CSV.`);
        
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
    if (importedCustomers.length === 0) return;
    setIsSaving(true);
    try {
      // Upsert into Supabase requires a conflict target.
      // If customer_id isn't guaranteed, we might get errors if we set ON CONFLICT.
      // Assuming email is unique or we just insert them for now as fresh records if no PK conflict matching.
      
      const { error } = await supabase
        .from('customers')
        .upsert(importedCustomers, { onConflict: 'customer_id', ignoreDuplicates: false });
      
      if (error) {
        // If ON CONFLICT customer_id fails because customer_id is null on some records, 
        // fallback to standard insert to at least get them in.
        const fb = await supabase.from('customers').insert(importedCustomers);
        if (fb.error) throw fb.error;
      }
      
      alert('Clientes importados e salvos com sucesso!');
      setImportedCustomers([]);
      setShowCSV(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Erro:', error);
      alert('Erro ao salvar no banco: ' + (error.message || 'Desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(term) || 
           c.email?.toLowerCase().includes(term) ||
           c.phone?.toLowerCase().includes(term) ||
           c.tags?.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline italic text-3xl">Gestão de Clientes</h3>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
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
            {showCSV ? 'Ocultar CSV' : 'Importar CSV do Shopify (Clientes)'}
          </button>
        </div>
      </div>

      {showCSV && importedCustomers.length > 0 && (
        <div className="mb-8 bg-surface-container-lowest border border-amber-500/30 p-6 rounded relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-headline italic text-xl text-amber-900">Prévia da Importação Automática ({importedCustomers.length} clientes)</h4>
            <button 
              onClick={() => {
                setImportedCustomers([]);
                setShowCSV(false);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Cancelar/Fechar
            </button>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            Lista inteligente de extração Shopify. Mostraremos primeiro os perfis mais completos.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container border-b border-outline-variant/20">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome do Cliente</th>
                  <th className="px-4 py-3 font-medium">Email / Telefone</th>
                  <th className="px-4 py-3 font-medium">Compras (Qtd)</th>
                  <th className="px-4 py-3 font-medium">Faturamento VIP</th>
                  <th className="px-4 py-3 font-medium">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {importedCustomers.slice(0, 5).map((c, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/20">
                    <td className="px-4 py-3 font-bold">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3">
                      <span className="block">{c.email || '-'}</span>
                      <span className="text-xs text-on-surface-variant block">{c.phone || '-'}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.total_orders} pedidos</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">R$ {c.total_spent}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] rounded-full uppercase font-bold shrink-0 ${c.accepts_email_marketing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {c.accepts_email_marketing ? 'Email ativado' : 'Opt-out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importedCustomers.length > 5 && (
              <p className="text-center text-sm text-on-surface-variant mt-4">
                Mostrando 5 de {importedCustomers.length} clientes importados.
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
              {isSaving ? 'Salvando Clientes...' : 'Confirmar Importação no Banco'}
            </button>
          </div>
        </div>
      )}

      {/* Main Customers Table */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-on-surface">Base de Clientes</h4>
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar por Nome, E-mail, Telefone ou Tags..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-outline-variant bg-surface-container-lowest pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-sm"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/20 overflow-x-auto mb-4">
        {loadingCustomers ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="animate-spin w-8 h-8 text-on-surface-variant" />
            <span className="ml-2 text-on-surface-variant">Carregando carteira de clientes...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
            <User className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum cliente registrado.</p>
            <p className="text-sm">Tente ajustar sua busca ou fazer uma nova importação.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container border-b border-outline-variant/20">
              <tr>
                <th className="px-6 py-4 font-medium">Nome do Cliente</th>
                <th className="px-6 py-4 font-medium">Contato</th>
                <th className="px-6 py-4 font-medium">Engajamento / Marketing</th>
                <th className="px-6 py-4 font-medium">Total de Pedidos</th>
                <th className="px-6 py-4 font-medium">Valor Vitalício Recebido</th>
                <th className="px-6 py-4 font-medium text-right">Perfil Detalhado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((c) => {
                const isVIP = c.total_spent > 1000;
                
                return (
                  <tr key={c.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isVIP ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-surface-variant text-on-surface-variant'}`}>
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{c.first_name} {c.last_name}</span>
                          {isVIP && <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">⭐ Cliente VIP</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="block text-sm text-on-surface">{c.email || '-'}</span>
                      <span className="block text-xs text-on-surface-variant">{c.phone || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full mr-2 ${c.accepts_email_marketing ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                        {c.accepts_email_marketing ? 'Assina E-mails' : 'Sem E-mail'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold">{c.total_orders} pedidos</span>
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-medium">R$ {c.total_spent}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-on-surface-variant">
                        <button title="Ficha do Cliente" onClick={() => openCustomerModal(c)} className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors bg-surface-container">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button title="Excluir Histórico" onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors">
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

      {filteredCustomers.length > 0 && (
        <div className="flex justify-between items-center mb-8 bg-surface-container-lowest p-4 border border-outline-variant/20">
          <span className="text-sm text-on-surface-variant">
            Mostrando <span className="font-medium text-on-surface">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium text-on-surface">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}</span> de <span className="font-medium text-on-surface">{filteredCustomers.length}</span> clientes
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

      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border-t-8 border-primary">
            <div className="px-6 py-4 flex justify-between items-start z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/30 shadow-inner">
                  {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-headline italic text-3xl text-on-surface">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h3>
                  <div className="flex gap-2 mt-1">
                     <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${selectedCustomer.accepts_email_marketing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedCustomer.accepts_email_marketing ? 'Marketing On' : 'Opt-out Marketing'}
                     </span>
                     {selectedCustomer.total_spent > 1000 && (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          ⭐ VIP Customer
                        </span>
                     )}
                     {selectedCustomer.tax_exempt && (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-800">
                          Isento Imposto
                        </span>
                     )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors bg-surface-container-low"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded border border-outline-variant/20">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-3 text-sm">
                    <User className="w-4 h-4 text-primary" /> Informações de Contato
                  </h4>
                  <div className="space-y-3">
                    <p className="flex items-center gap-3 text-sm text-on-surface">
                      <Mail className="w-4 h-4 text-on-surface-variant flex-shrink-0" /> {selectedCustomer.email || 'Não informado'}
                    </p>
                    <p className="flex items-center gap-3 text-sm text-on-surface">
                      <Phone className="w-4 h-4 text-on-surface-variant flex-shrink-0" /> {selectedCustomer.phone || selectedCustomer.default_address?.phone || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-low p-4 rounded border border-outline-variant/20">
                  <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3 text-sm">
                    <ShoppingBag className="w-4 h-4 text-amber-600" /> Relatório Financeiro (Shopify)
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between bg-white px-3 py-2 rounded shadow-sm">
                       <span className="text-sm font-medium text-on-surface-variant">Valor Vitalício Recebido</span>
                       <span className="text-sm font-bold text-emerald-700">R$ {selectedCustomer.total_spent}</span>
                    </div>
                    <div className="flex justify-between bg-white px-3 py-2 rounded shadow-sm">
                       <span className="text-sm font-medium text-on-surface-variant">Pedidos Feitos</span>
                       <span className="text-sm font-bold text-primary">{selectedCustomer.total_orders} compras</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded border border-outline-variant/20 h-full">
                  <h4 className="font-bold text-on-surface flex items-center gap-2 mb-3 text-sm border-b border-outline-variant/20 pb-2">
                    <MapPin className="w-4 h-4 text-primary" /> Endereço Padrão (Default)
                  </h4>
                  {selectedCustomer.default_address && selectedCustomer.default_address.address1 ? (
                    <div className="text-sm text-on-surface space-y-2">
                      {selectedCustomer.default_address.company && <p className="font-medium text-primary">{selectedCustomer.default_address.company}</p>}
                      <p>{selectedCustomer.default_address.address1}</p>
                      {selectedCustomer.default_address.address2 && <p>{selectedCustomer.default_address.address2}</p>}
                      <p>{selectedCustomer.default_address.city} - {selectedCustomer.default_address.province_code}</p>
                      <p>CEP: {selectedCustomer.default_address.zip}</p>
                      <p>{selectedCustomer.default_address.country_code}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant italic">Endereço padrão não cadastrado no Shopify.</p>
                  )}
                </div>
              </div>
              
              {/* Tags e Anotações Internas */}
              {(selectedCustomer.note || selectedCustomer.tags) && (
                <div className="md:col-span-2 space-y-4 mt-2 border-t border-outline-variant/20 pt-6">
                  {selectedCustomer.tags && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-on-surface-variant shrink-0 w-24">Tags da Loja:</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.tags.split(',').map((tag: string, i: number) => (
                           <span key={i} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-lg">{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.note && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-on-surface-variant shrink-0 w-24">Anotações:</span>
                      <p className="text-sm text-on-surface italic p-3 bg-yellow-50 rounded-r-xl border-l-4 border-yellow-400 w-full">"{selectedCustomer.note}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant/20 px-6 py-4 flex justify-end z-10 transition">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-primary hover:bg-primary-container text-on-primary px-8 py-2 text-sm font-medium transition-colors"
              >
                Fechar Ficha do Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full shadow-2xl relative">
            <div className="px-6 py-4 flex justify-between items-center border-b border-outline-variant/20">
              <h3 className="font-headline italic text-2xl text-on-surface">Novo Cliente Manual</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Nome</label>
                  <input required type="text" value={manualCustomer.first_name} onChange={e => setManualCustomer({...manualCustomer, first_name: e.target.value})} className="w-full border border-outline-variant p-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Sobrenome</label>
                  <input type="text" value={manualCustomer.last_name} onChange={e => setManualCustomer({...manualCustomer, last_name: e.target.value})} className="w-full border border-outline-variant p-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">E-mail</label>
                <input required type="email" value={manualCustomer.email} onChange={e => setManualCustomer({...manualCustomer, email: e.target.value})} className="w-full border border-outline-variant p-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Telefone / WhatsApp</label>
                <input type="text" value={manualCustomer.phone} onChange={e => setManualCustomer({...manualCustomer, phone: e.target.value})} className="w-full border border-outline-variant p-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 mt-4 bg-surface-container-low p-3 rounded">
                <input type="checkbox" id="marketing" checked={manualCustomer.accepts_email_marketing} onChange={e => setManualCustomer({...manualCustomer, accepts_email_marketing: e.target.checked})} className="w-4 h-4 text-primary" />
                <label htmlFor="marketing" className="text-sm font-medium text-on-surface">Aceita receber e-mails de marketing</label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/20 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container hover:text-on-surface-variant">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
