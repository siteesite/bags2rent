import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Building2, Key, Info, CheckCircle2, AlertCircle, Truck, ScrollText, CreditCard, LayoutTemplate, Search, X, ImageOff, Mail, Send, Upload, MessageCircle, Palette, Menu, Trash2 } from 'lucide-react';
import { useSiteSettings } from '../context/SettingsContext';
import { clearCloudflareCache } from '../lib/cloudflare';

const DEFAULT_TEMPLATE_CREATED = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
  <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-style: italic;">2Bags2rent</h1>
  </div>
  <div style="padding: 20px;">
    <h2>Olá, {{customer_name}}!</h2>
    <p>Seu pedido <strong>{{order_id}}</strong> foi recebido com sucesso.</p>
    <p>Status: <strong>{{financial_status}}</strong></p>
    <p>Valor Total: <strong style="color: #059669;">{{total_price}}</strong></p>
    <h3>Resumo dos Itens:</h3>
    {{items_list}}
    <br/>
    <p>Fique atento(a) para mais atualizações sobre a entrega em seu painel!</p>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>© 2026 2Bags2rent. Todos os direitos reservados.</p>
  </div>
</div>`;

const DEFAULT_TEMPLATE_SHIPPED = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
  <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-style: italic;">2Bags2rent</h1>
  </div>
  <div style="padding: 20px;">
    <h2>Seu pedido foi enviado ou já está disponível! 🚚</h2>
    <p>Olá, {{customer_name}}, ótima notícia! Seu pedido <strong>{{order_id}}</strong> teve o status de entrega atualizado.</p>
    <p>Fique atento(a) no seu endereço de entrega ou com a nossa equipe corporativa para o envio do código de rastreio.</p>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>© 2026 2Bags2rent. Todos os direitos reservados.</p>
  </div>
</div>`;


interface RentalPeriod {
  days: number;
  type: 'fixed' | 'percentage';
  value: number;
  label: string;
}

interface HeroItem {
  type: 'product' | 'image';
  id?: string;
  name?: string;
  brand?: string;
  price?: number;
  image_url: string;
  image_url_tablet?: string;
  image_url_mobile?: string;
  handle?: string;
}

interface Settings {
  id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  openai_api_key: string;
  gpt_model: string;
  shipping_north: number;
  shipping_northeast: number;
  shipping_central_west: number;
  shipping_southeast: number;
  shipping_south: number;
  delivery_north: number;
  delivery_northeast: number;
  delivery_central_west: number;
  delivery_southeast: number;
  delivery_south: number;
  rental_min_days: number;
  preparation_days: number;
  late_fee_percentage: number;
  rental_buffer_days: number;
  rental_periods: RentalPeriod[];
  rental_max_days: number;
  hero_products: HeroItem[];
  whatsapp_number?: string;
  whatsapp_new_tab?: boolean;
  whatsapp_message?: string;
  banner_news_html?: string;
  banner_news_position?: 'center' | 'bottom';
  banner_noivas_html?: string;
  banner_noivas_position?: 'center' | 'bottom';
  banner_alugue_html?: string;
  banner_alugue_position?: 'center' | 'bottom';
  resend_api_key?: string;
  email_active?: boolean;
  email_from_address?: string;
  email_from_name?: string;
  email_template_order_created?: string;
  email_template_order_shipped?: string;
  topbar_text?: string;
  topbar_bg_color?: string;
  topbar_text_color?: string;
  banner_news_desktop?: string;
  banner_news_tablet?: string;
  banner_news_mobile?: string;
  banner_noivas_desktop?: string;
  banner_noivas_tablet?: string;
  banner_noivas_mobile?: string;
  banner_alugue_desktop?: string;
  banner_alugue_tablet?: string;
  banner_alugue_mobile?: string;
  banner_news_title?: string;
  banner_news_text_color?: string;
  banner_noivas_title?: string;
  banner_noivas_text_color?: string;
  banner_alugue_title2?: string;
  banner_alugue_text_color?: string;
  showcase_1_title?: string;
  showcase_1_products?: any[];
  showcase_2_title?: string;
  showcase_2_products?: any[];
  showcase_3_title?: string;
  showcase_3_products?: any[];
  showcase_4_title?: string;
  showcase_4_products?: any[];
  showcase_5_title?: string;
  showcase_5_products?: any[];
  deepseek_api_key?: string;
  menu_peca_visible?: boolean;
  menu_tamanho_visible?: boolean;
  menu_eventos_visible?: boolean;
  menu_marcas_visible?: boolean;
  menu_hidden_items?: string[];
}

const DEFAULT_ID = '00000000-0000-0000-0000-000000000000';

export function SettingsAdmin() {
  const [settings, setSettings] = useState<Settings>({
    id: DEFAULT_ID,
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    openai_api_key: '',
    gpt_model: 'gpt-4o',
    shipping_north: 0,
    shipping_northeast: 0,
    shipping_central_west: 0,
    shipping_southeast: 0,
    shipping_south: 0,
    delivery_north: 0,
    delivery_northeast: 0,
    delivery_central_west: 0,
    delivery_southeast: 0,
    delivery_south: 0,
    rental_min_days: 1,
    preparation_days: 2,
    late_fee_percentage: 10,
    rental_buffer_days: 3,
    rental_periods: [],
    rental_max_days: 30,
    hero_products: [],
    whatsapp_number: '',
    whatsapp_new_tab: true,
    whatsapp_message: '',
    banner_news_html: '',
    banner_news_position: 'center',
    banner_noivas_html: '',
    banner_noivas_position: 'center',
    banner_alugue_html: '',
    banner_alugue_position: 'bottom',
    resend_api_key: '',
    email_active: false,
    email_from_address: 'contato@2bags2rent.com.br',
    email_from_name: '2Bags2rent',
    email_template_order_created: DEFAULT_TEMPLATE_CREATED,
    email_template_order_shipped: DEFAULT_TEMPLATE_SHIPPED,
    topbar_text: 'Uso o cupom BAGS1 na sua primeira aluguel',
    topbar_bg_color: '#000000',
    topbar_text_color: '#FFFFFF',
    banner_news_desktop: '',
    banner_news_tablet: '',
    banner_news_mobile: '',
    banner_noivas_desktop: '',
    banner_noivas_tablet: '',
    banner_noivas_mobile: '',
    banner_alugue_desktop: '',
    banner_alugue_tablet: '',
    banner_alugue_mobile: '',
    banner_news_title: 'NEWS FOR RENT',
    banner_news_text_color: '#FFFFFF',
    banner_noivas_title: 'BOLSAS EM DESTAQUE',
    banner_noivas_text_color: '#000000',
    banner_alugue_title1: 'LUXURY',
    banner_alugue_title2: 'BAGS',
    banner_alugue_text_color: '#000000',
    showcase_1_title: 'Mais Buscados',
    showcase_1_products: [],
    showcase_2_title: 'Bolsas de Festa',
    showcase_2_products: [],
    showcase_3_title: 'Para o Dia a Dia',
    showcase_3_products: [],
    showcase_4_title: 'Coleção Premium',
    showcase_4_products: [],
    showcase_5_title: 'Bolsas Casuais',
    showcase_5_products: [],
    deepseek_api_key: '',
    menu_peca_visible: true,
    menu_tamanho_visible: true,
    menu_eventos_visible: true,
    menu_marcas_visible: true,
    menu_hidden_items: [],
  });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState<{slot: number, type: 'hero' | 'showcase', showcaseIndex?: number} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'designer' | 'company' | 'ai' | 'shipping' | 'rules' | 'payments' | 'emails'>('designer');
  const { refetch } = useSiteSettings();
  const [testingEmail, setTestingEmail] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<{[key: number]: boolean}>({});
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmailLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearEmailLogs = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todos os logs de e-mail?')) return;
    try {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .gte('created_at', '1970-01-01'); // Delete all
      if (error) throw error;
      setEmailLogs([]);
      setMessage({ type: 'success', text: 'Logs de e-mail limpos com sucesso!' });
    } catch (err: any) {
      console.error('Error clearing email logs:', err);
      setMessage({ type: 'error', text: 'Falha ao limpar logs: ' + err.message });
    }
  };


  const testEmailConnection = async () => {
    if (!settings.resend_api_key) {
      setMessage({ type: 'error', text: 'Preencha a API Key do Resend primeiro.' });
      return;
    }
    setTestingEmail(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { 
          test_mode: true, 
          resend_api_key: settings.resend_api_key,
          from_address: settings.email_from_address,
          from_name: settings.email_from_name,
          to: settings.company_email || 'test@example.com' // Send to company email to verify
        }
      });
      
      if (error) throw error;
      
      if (data && data.success) {
         setMessage({ type: 'success', text: 'E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.' });
      } else {
         throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Test email error:', err);
      setMessage({ type: 'error', text: 'Falha ao enviar e-mail: Verifique se sua chave da API ("re_...") e o Domínio verificado inserido estão corretos.' });
    } finally {
      setTestingEmail(false);
    }
  };

  const tabs = [
    { id: 'designer', label: 'Designer', icon: Palette },
    { id: 'company', label: 'Dados da Empresa', icon: Building2 },
    { id: 'ai', label: 'Inteligência Artificial', icon: Key },
    { id: 'shipping', label: 'Frete por Região', icon: Truck },
    { id: 'rules', label: 'Regras de Locação', icon: ScrollText },
    { id: 'payments', label: 'Pagamentos & Webhook', icon: CreditCard },
    { id: 'emails', label: 'E-mails Transacionais', icon: Mail },
    { id: 'menu', label: 'Menu', icon: Menu },
  ] as const;

  useEffect(() => {
    fetchSettings();
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'emails') {
      fetchEmailLogs();
    }
  }, [activeTab]);


  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Don't close if clicking inside ANY product search container
      if ((e.target as Element).closest('.product-search-container')) {
        return;
      }
      setShowProductSearch(null);
      setProductSearch('');
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, price, image_url, handle')
      .order('name', { ascending: true });
    setAllProducts(data || []);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', DEFAULT_ID)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is No Rows Found
        throw error;
      }

      if (data) {
        // Merge DB data preserving showcase arrays properly
        setSettings(prev => ({
          ...prev,
          ...data,
          // Ensure showcase arrays are always valid arrays (not null)
          showcase_1_products: Array.isArray(data.showcase_1_products) ? data.showcase_1_products : [],
          showcase_2_products: Array.isArray(data.showcase_2_products) ? data.showcase_2_products : [],
          showcase_3_products: Array.isArray(data.showcase_3_products) ? data.showcase_3_products : [],
          showcase_4_products: Array.isArray(data.showcase_4_products) ? data.showcase_4_products : [],
          showcase_5_products: Array.isArray(data.showcase_5_products) ? data.showcase_5_products : [],
          showcase_1_title: data.showcase_1_title || prev.showcase_1_title || 'Mais Buscados',
          showcase_2_title: data.showcase_2_title || prev.showcase_2_title || 'Bolsas de Festa',
          showcase_3_title: data.showcase_3_title || prev.showcase_3_title || 'Para o Dia a Dia',
          showcase_4_title: data.showcase_4_title || prev.showcase_4_title || 'Coleção Premium',
          showcase_5_title: data.showcase_5_title || prev.showcase_5_title || 'Bolsas Casuais',
          menu_hidden_items: Array.isArray(data.menu_hidden_items) ? data.menu_hidden_items : [],
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Clean showcase products: filter out null entries before saving
      const cleanedSettings = { ...settings };
      for (let i = 1; i <= 5; i++) {
        const key = `showcase_${i}_products` as keyof Settings;
        const products = (cleanedSettings[key] as any[]) || [];
        (cleanedSettings as any)[key] = products.filter((p: any) => p && p.id);
      }

      // === DIAGNOSTIC LOG ===
      console.log('[SAVE DEBUG] showcase_1_products being saved:', JSON.stringify(cleanedSettings.showcase_1_products));
      console.log('[SAVE DEBUG] showcase_2_products being saved:', JSON.stringify(cleanedSettings.showcase_2_products));
      const { data: authData } = await supabase.auth.getUser();
      console.log('[SAVE DEBUG] Authenticated user:', authData?.user?.email || 'NOT AUTHENTICATED');
      // ======================

      // Use update (not upsert) — the settings row always exists
      // upsert triggers INSERT which is blocked by RLS policies
      const { id, ...updatePayload } = cleanedSettings as any;
      const { error, data: updateData } = await supabase
        .from('settings')
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', DEFAULT_ID)
        .select('showcase_1_products, showcase_2_products'); // Read back to verify

      console.log('[SAVE DEBUG] Update error:', error);
      console.log('[SAVE DEBUG] Update read-back:', JSON.stringify(updateData));

      if (error) throw error;
      
      // Notify parent context to update global settings (topbar, etc)
      refetch();
      
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      
      // Purge Cloudflare cache automatically
      clearCloudflareCache();
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const addRentalPeriod = () => {
    const newPeriod: RentalPeriod = {
      days: 3,
      type: 'fixed',
      value: 0,
      label: 'Novo Período'
    };
    setSettings({
      ...settings,
      rental_periods: [...(settings.rental_periods || []), newPeriod].sort((a, b) => a.days - b.days)
    });
  };

  const removeRentalPeriod = (index: number) => {
    const newPeriods = [...settings.rental_periods];
    newPeriods.splice(index, 1);
    setSettings({ ...settings, rental_periods: newPeriods });
  };

  const updateRentalPeriod = (index: number, updates: Partial<RentalPeriod>) => {
    const newPeriods = [...settings.rental_periods];
    newPeriods[index] = { ...newPeriods[index], ...updates };
    
    // Auto-generate label
    const p = newPeriods[index];
    if (p.type === 'fixed') {
      p.label = `${p.days} dias (${p.value === 0 ? 'Valor Base' : `+ R$ ${p.value}`})`;
    } else {
      p.label = `${p.days} dias (+ ${p.value}%)`;
    }

    setSettings({ ...settings, rental_periods: newPeriods });
  };

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 8);

  const setHeroProduct = (slot: number, product: any) => {
    setSettings(prev => {
      const updated = [...(prev.hero_products || [null, null, null])];
      while (updated.length < 3) updated.push(null as any);
      updated[slot] = { 
        ...product,
        type: 'product'
      };
      return { ...prev, hero_products: updated };
    });
    setShowProductSearch(null);
    setProductSearch('');
  };

  const setShowcaseProduct = (showcaseIndex: number, slot: number, product: any) => {
    const key = `showcase_${showcaseIndex}_products` as keyof Settings;
    setSettings(prev => {
      const current = [...((prev[key] as any[]) || [null, null, null, null])];
      while (current.length < 4) current.push(null as any);
      current[slot] = product;
      return { ...prev, [key]: current };
    });
    setShowProductSearch(null);
    setProductSearch('');
  };

  const removeShowcaseProduct = (showcaseIndex: number, slot: number) => {
    const key = `showcase_${showcaseIndex}_products` as keyof Settings;
    setSettings(prev => {
      const current = [...((prev[key] as any[]) || [null, null, null, null])];
      while (current.length < 4) current.push(null as any);
      current[slot] = null as any;
      return { ...prev, [key]: current };
    });
  };

  const setHeroImage = (slot: number, imageUrl: string) => {
    const updated = [...(settings.hero_products || [null, null, null])];
    while (updated.length < 3) updated.push(null as any);
    updated[slot] = { 
      type: 'image',
      image_url: imageUrl
    };
    setSettings({ ...settings, hero_products: updated });
  };

  const handleHeroFileUpload = async (slot: number, device: 'desktop' | 'tablet' | 'mobile', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 10MB.' });
      return;
    }

    const uploadKey = `${slot}_${device}`;
    setUploadingSlots(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `hero_${slot}_${device}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);

      // Use functional setState to always read the latest state (avoids stale closure bug)
      let updatedSettings: Settings | null = null;
      setSettings(prev => {
        const updated = [...(prev.hero_products || [null, null, null])];
        while (updated.length < 3) updated.push(null as any);

        const currentItem = updated[slot] || { type: 'image', image_url: '' };
        const field = device === 'desktop' ? 'image_url' : `image_url_${device}`;

        updated[slot] = { ...currentItem, [field]: publicUrl, type: 'image' };
        updatedSettings = { ...prev, hero_products: updated };
        return updatedSettings;
      });

      // Wait a tick for state to update, then persist to DB
      await new Promise(resolve => setTimeout(resolve, 50));
      if (updatedSettings) {
        const { error: saveError } = await supabase
          .from('settings')
          .upsert({ ...(updatedSettings as Settings), updated_at: new Date().toISOString() });
        if (saveError) throw saveError;
        refetch();
      }

      setMessage({ type: 'success', text: `Imagem ${device} salva com sucesso!` });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setMessage({ type: 'error', text: 'Erro ao enviar imagem: ' + error.message });
    } finally {
      setUploadingSlots(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const removeHeroProduct = (slot: number) => {
    const updated = [...(settings.hero_products || [null, null, null])];
    while (updated.length < 3) updated.push(null as any);
    updated[slot] = null as any;
    setSettings({ ...settings, hero_products: updated });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-on-surface-variant italic">Carregando configurações globais...</p>
      </div>
    );
  }

  const renderHtml = (html: string | undefined) => {
    if (!html) return { __html: '' };
    return { __html: html.replace(/className=/g, 'class=') };
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h3 className="font-headline italic text-3xl">Configurações do Sistema</h3>
        <p className="text-on-surface-variant text-sm mt-1">Gerencie os dados da empresa e integrações de IA.</p>
      </div>

      {message && (
        <div className={`p-4 flex items-center gap-3 border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8" style={{ overflowX: 'hidden' }}>
        {/* Tabs Navigation */}
        <div className="flex flex-wrap border-b border-outline-variant/10 gap-x-8 gap-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-sm font-medium transition-all relative ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                {tab.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">

          {activeTab === 'designer' && (
            <motion.div
              key="designer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Designer Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm space-y-12">
                
                {/* Hero section */}
                <div className="product-search-container">
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                    <div className="p-2 bg-primary/5 rounded-full">
                      <LayoutTemplate className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-headline italic text-xl">Painéis Principais (Topo da Home)</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Configure os 3 painéis principais. Eles podem ser produtos específicos ou banners personalizados.</p>
                      <p className="text-[10px] text-on-surface-variant mt-2 italic">Tamanhos recomendados: Desktop (1920x800), Tablet (1024x600), Mobile (768x1024)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[0, 1, 2].map((slot) => {
                      const product = settings.hero_products?.[slot];
                      const isOpen = showProductSearch?.slot === slot && showProductSearch?.type === 'hero';
                      const positions = ['Esquerda (Lateral)', 'Centro (Destaque)', 'Direita (Lateral)'];
                      return (
                        <div key={slot} className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                             {slot + 1} — {positions[slot]}
                          </label>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(settings.hero_products || [null, null, null])];
                                while (updated.length < 3) updated.push(null as any);
                                updated[slot] = { ...(updated[slot] || { image_url: '' }), type: 'product' };
                                setSettings({ ...settings, hero_products: updated });
                              }}
                              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                (product?.type || 'product') === 'product'
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                              }`}
                            >
                              Produto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(settings.hero_products || [null, null, null])];
                                while (updated.length < 3) updated.push(null as any);
                                updated[slot] = { ...(updated[slot] || { image_url: '' }), type: 'image' };
                                setSettings({ ...settings, hero_products: updated });
                              }}
                              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                product?.type === 'image'
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                              }`}
                            >
                              Imagem
                            </button>
                          </div>

                          {(product?.type || 'product') === 'product' ? (
                            <div className="space-y-3">
                              {product && product.id ? (
                                <div className="relative group border border-outline-variant/30 overflow-hidden">
                                  <div className="aspect-[3/4] overflow-hidden bg-surface-container">
                                    {product.image_url ? (
                                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                        <ImageOff className="w-8 h-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3 bg-white">
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{product.brand}</p>
                                    <p className="text-sm font-medium leading-tight mt-0.5 line-clamp-2">{product.name}</p>
                                    <p className="text-xs text-primary font-bold mt-1">R$ {Number(product.price).toFixed(2)}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeHeroProduct(slot)}
                                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setShowProductSearch({slot, type: 'hero'}); setProductSearch(''); }}
                                    className="absolute bottom-0 left-0 right-0 bg-black text-white text-[10px] uppercase tracking-widest py-2 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                  >
                                    Trocar Produto
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setShowProductSearch({slot, type: 'hero'}); setProductSearch(''); }}
                                  className="w-full aspect-[3/4] border-2 border-dashed border-outline-variant/40 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary"
                                >
                                  <Search className="w-8 h-8" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Selecionar Produto</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                               {[
                                 { dKey: 'desktop' as const, lbl: 'Desktop', current: product?.image_url },
                                 { dKey: 'tablet' as const, lbl: 'Tablet', current: product?.image_url_tablet },
                                 { dKey: 'mobile' as const, lbl: 'Mobile', current: product?.image_url_mobile }
                               ].map((dev) => (
                                 <div key={dev.dKey} className="space-y-1.5">
                                   <div className="flex items-center justify-between">
                                     <label className="text-[10px] uppercase font-bold text-on-surface-variant/60 flex items-center gap-1.5">
                                       {dev.lbl}
                                       {dev.current && (
                                         <span className="inline-flex items-center gap-0.5 text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">
                                           <CheckCircle2 className="w-2.5 h-2.5" /> OK
                                         </span>
                                       )}
                                     </label>
                                     {dev.current && (
                                       <button
                                         type="button"
                                         onClick={() => {
                                           setSettings(prev => {
                                             const updated = [...(prev.hero_products || [])];
                                             const field = dev.dKey === 'desktop' ? 'image_url' : `image_url_${dev.dKey}`;
                                             updated[slot] = { ...updated[slot], [field]: '' };
                                             return { ...prev, hero_products: updated };
                                           });
                                         }}
                                         className="text-[9px] text-red-500 hover:underline uppercase font-bold"
                                       >
                                         Remover
                                       </button>
                                     )}
                                   </div>

                                   {/* Image preview — always visible */}
                                   {dev.current ? (
                                     <div className="relative border border-green-300 rounded overflow-hidden aspect-video bg-surface-container ring-1 ring-green-400/30">
                                       <img src={dev.current} className="object-cover w-full h-full" alt={dev.lbl} />
                                       <div className="absolute top-1.5 right-1.5 bg-green-500 text-white rounded-full p-0.5">
                                         <CheckCircle2 className="w-3 h-3" />
                                       </div>
                                     </div>
                                   ) : (
                                     <div className="border border-dashed border-outline-variant/40 rounded aspect-video bg-surface-container/50 flex flex-col items-center justify-center gap-1 opacity-50">
                                       <Upload className="w-4 h-4 text-on-surface-variant" />
                                       <span className="text-[9px] uppercase font-bold text-on-surface-variant">Vazio</span>
                                     </div>
                                   )}

                                   {/* Upload button — always visible below preview */}
                                   <div>
                                     <input
                                       type="file"
                                       accept="image/*"
                                       className="hidden"
                                       id={`upload-hero-${slot}-${dev.dKey}`}
                                       disabled={uploadingSlots[`${slot}_${dev.dKey}`]}
                                       onChange={(e) => handleHeroFileUpload(slot, dev.dKey, e)}
                                     />
                                     <label
                                       htmlFor={`upload-hero-${slot}-${dev.dKey}`}
                                       className={`flex items-center justify-center gap-2 w-full py-2 text-[10px] uppercase font-bold tracking-widest cursor-pointer border transition-all ${
                                         uploadingSlots[`${slot}_${dev.dKey}`]
                                           ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                           : dev.current
                                             ? 'bg-white text-black border-outline-variant hover:bg-surface-container-low'
                                             : 'bg-primary text-white border-primary hover:bg-primary/90'
                                       }`}
                                     >
                                       {uploadingSlots[`${slot}_${dev.dKey}`] ? (
                                         <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
                                       ) : dev.current ? (
                                         <><Upload className="w-3 h-3" /> Trocar imagem</>
                                       ) : (
                                         <><Upload className="w-3 h-3" /> Upload</>
                                       )}
                                     </label>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          )}

                          {isOpen && (
                            <div className="border border-outline-variant/30 bg-white shadow-xl z-50 relative mt-2">
                              <div className="p-3 border-b border-outline-variant/10">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                                  <input
                                    autoFocus
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant bg-surface-container-low focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                                {allProducts
                                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.brand.toLowerCase().includes(productSearch.toLowerCase()))
                                  .map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setHeroProduct(slot, p)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors text-left"
                                  >
                                    <div className="w-10 h-10 shrink-0 overflow-hidden bg-surface-container">
                                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] uppercase font-bold truncate">{p.brand}</p>
                                      <p className="text-xs truncate">{p.name}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-16 product-search-container">
                  {[1, 2, 3, 4, 5].map((idx) => {
                    const titleKey = `showcase_${idx}_title` as keyof Settings;
                    const productsKey = `showcase_${idx}_products` as keyof Settings;
                    
                    return (
                      <div key={idx} className="pt-12 border-t border-outline-variant/10 first:border-t-0 first:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10 pb-6 border-b border-outline-variant/10">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/5 rounded-full">
                              <Search className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                               <h4 className="font-headline italic text-xl">Vitrine {idx}</h4>
                               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/60">Configuração do Módulo</p>
                            </div>
                          </div>
                          
                          <div className="flex-1 max-w-md">
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant font-bold">Título da Vitrine na Home</label>
                              <input 
                                type="text"
                                value={(settings[titleKey] as string) || ''}
                                onChange={(e) => setSettings(prev => ({...prev, [titleKey]: e.target.value}))}
                                className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 text-sm font-headline italic text-lg focus:border-primary focus:outline-none"
                                placeholder={`Ex: Vitrine ${idx}, Destaques, etc.`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {[0, 1, 2, 3].map((slot) => {
                            const product = ((settings[productsKey] as any[]) || [])[slot];
                            const isOpen = showProductSearch?.slot === slot && showProductSearch?.type === 'showcase' && showProductSearch?.showcaseIndex === idx;
                            return (
                              <div key={slot} className="relative">
                                {product && product.id ? (
                                  <div className="flex items-center gap-3 border border-outline-variant/30 bg-surface-container-lowest p-3 group">
                                    {/* Thumbnail pequena */}
                                    <div className="w-12 h-12 shrink-0 overflow-hidden bg-surface-container border border-outline-variant/20">
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                    {/* Nome e marca */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant truncate">{product.brand}</p>
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-widest">Posição {slot + 1}</p>
                                    </div>
                                    {/* Ações */}
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => { setShowProductSearch({slot, type: 'showcase', showcaseIndex: idx}); setProductSearch(''); }}
                                        className="text-[9px] uppercase font-bold tracking-widest border border-outline-variant/40 px-2 py-1 hover:bg-surface-container transition-colors"
                                      >
                                        Trocar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeShowcaseProduct(idx, slot)}
                                        className="p-1 hover:bg-red-50 hover:text-red-600 transition-colors border border-outline-variant/40"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setShowProductSearch({slot, type: 'showcase', showcaseIndex: idx}); setProductSearch(''); }}
                                    className="w-full flex items-center gap-3 border border-dashed border-outline-variant/40 hover:border-primary hover:bg-primary/5 transition-all p-3"
                                  >
                                    <div className="w-12 h-12 shrink-0 bg-surface-container flex items-center justify-center">
                                      <Search className="w-4 h-4 opacity-40 text-on-surface-variant" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Posição {slot + 1}</p>
                                      <p className="text-xs text-on-surface-variant/40">Clique para selecionar produto</p>
                                    </div>
                                  </button>
                                )}

                                {isOpen && (
                                 <div className="absolute top-full left-0 right-0 mt-1 border border-outline-variant/30 bg-white shadow-2xl z-50">
                                   <div className="p-2 border-b border-outline-variant/10">
                                     <input
                                       autoFocus
                                       type="text"
                                       value={productSearch}
                                       onChange={(e) => setProductSearch(e.target.value)}
                                       placeholder="Buscar produto..."
                                       className="w-full px-3 py-1.5 text-xs border border-outline-variant bg-surface-container-low focus:border-primary focus:outline-none"
                                     />
                                   </div>
                                   <div className="max-h-48 overflow-y-auto divide-y divide-outline-variant/10">
                                     {filteredProducts.length === 0 ? (
                                       <p className="text-xs text-center p-4 text-on-surface-variant/60">Nenhum produto encontrado</p>
                                     ) : filteredProducts.map((p) => (
                                       <button
                                         key={p.id}
                                         type="button"
                                         onClick={() => setShowcaseProduct(idx, slot, p)}
                                         className="w-full flex items-center gap-3 p-2 hover:bg-surface-container-low transition-colors text-left"
                                       >
                                         <div className="w-10 h-10 shrink-0 overflow-hidden bg-surface-container">
                                           <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                         </div>
                                         <div className="min-w-0">
                                           <p className="text-[9px] uppercase font-bold truncate text-on-surface-variant">{p.brand}</p>
                                           <p className="text-xs truncate font-medium">{p.name}</p>
                                         </div>
                                       </button>
                                     ))}
                                   </div>
                                 </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hero Texts section */}
                <div className="pt-12 border-t border-outline-variant/10 space-y-8">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/10">
                     <div className="p-2 bg-primary/5 rounded-full">
                       <LayoutTemplate className="w-5 h-5 text-primary" />
                     </div>
                     <div>
                       <h4 className="font-headline italic text-xl">Textos dos Painéis Hero</h4>
                       <p className="text-xs text-on-surface-variant mt-0.5">Insira código HTML para customizar os textos dos três painéis animados principais.</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { key: 'banner_news', lbl: 'Painel Esquerda' },
                        { key: 'banner_noivas', lbl: 'Painel Centro' },
                        { key: 'banner_alugue', lbl: 'Painel Direita' }
                      ].map((pnl) => (
                         <div key={pnl.key} className="p-6 border border-outline-variant/20 bg-surface-container-lowest/50 rounded-sm space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{pnl.lbl}</label>
                            <textarea 
                              rows={4}
                              value={(settings as any)[`${pnl.key}_html`] || ''}
                              onChange={(e) => setSettings({...settings, [`${pnl.key}_html`]: e.target.value})}
                              placeholder="HTML customizado..."
                              className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-[10px] font-mono focus:border-primary focus:outline-none"
                            />
                            <div className="space-y-2">
                               <div className="text-[9px] uppercase font-bold text-on-surface-variant/60">Posição</div>
                               <select
                                  value={(settings as any)[`${pnl.key}_position`] || 'center'}
                                  onChange={(e) => setSettings({...settings, [`${pnl.key}_position`]: e.target.value})}
                                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-xs"
                               >
                                 <option value="center">Centro</option>
                                 <option value="bottom">Canto</option>
                               </select>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Topbar Settings */}
                <div className="pt-12 border-t border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/10">
                    <div className="p-2 bg-pink-50 rounded-full">
                      <Palette className="w-5 h-5 text-pink-700" />
                    </div>
                    <div>
                      <h4 className="font-headline italic text-xl">Barra de Promoção (Topo)</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Customize o texto e as cores da barra superior do site.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-full md:col-span-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Texto</label>
                      <input 
                        type="text" 
                        value={settings.topbar_text || ''}
                        onChange={(e) => setSettings({...settings, topbar_text: e.target.value})}
                        placeholder="Ex: Uso o cupom BAGS1..."
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-4 md:gap-6 flex-col md:flex-row">
                      <div className="space-y-2 flex-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-bold">Cor de Fundo</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={settings.topbar_bg_color || '#000000'}
                            onChange={(e) => setSettings({...settings, topbar_bg_color: e.target.value})}
                            className="h-10 w-10 cursor-pointer bg-transparent border-0 p-0 shadow-sm"
                          />
                          <input 
                            type="text" 
                            value={settings.topbar_bg_color || '#000000'}
                            onChange={(e) => setSettings({...settings, topbar_bg_color: e.target.value})}
                            className="w-full bg-surface-container-low border border-outline-variant px-4 py-2 text-sm focus:border-primary focus:outline-none uppercase font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-bold">Cor do Texto</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={settings.topbar_text_color || '#FFFFFF'}
                            onChange={(e) => setSettings({...settings, topbar_text_color: e.target.value})}
                            className="h-10 w-10 cursor-pointer bg-transparent border-0 p-0 shadow-sm"
                          />
                          <input 
                            type="text" 
                            value={settings.topbar_text_color || '#FFFFFF'}
                            onChange={(e) => setSettings({...settings, topbar_text_color: e.target.value})}
                            className="w-full bg-surface-container-low border border-outline-variant px-4 py-2 text-sm focus:border-primary focus:outline-none uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banners Editoriais section */}
                <div className="pt-12 border-t border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/10">
                    <div className="p-2 bg-indigo-50 rounded-full">
                      <ImageOff className="w-5 h-5 text-indigo-700" />
                    </div>
                    <div>
                      <h4 className="font-headline italic text-xl">Banners Editoriais (Corpo da Home)</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Substitua as imagens das seções secundárias da página inicial.</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {[
                      { keyPrefix: 'banner_news', title: 'Banner 1: News For Rent' },
                      { keyPrefix: 'banner_noivas', title: 'Banner 2: Bolsas em Destaque' },
                      { keyPrefix: 'banner_alugue', title: 'Banner 3: Alugue Agora' }
                    ].map((bConf) => {
                      const titleKey = bConf.keyPrefix === 'banner_alugue' ? 'banner_alugue_title1' : `${bConf.keyPrefix}_title`;
                      const colorKey = `${bConf.keyPrefix}_text_color`;

                      return (
                        <div key={bConf.keyPrefix} className="border border-outline-variant/20 p-6 bg-surface-container-lowest space-y-8">
                          <div className="border-b border-outline-variant/10 pb-4">
                            <h5 className="font-headline italic text-lg">{bConf.title}</h5>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Texto e Cor */}
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Título do Banner</label>
                                  <input 
                                    type="text"
                                    value={(settings as any)[titleKey] || ''}
                                    onChange={(e) => setSettings(prev => ({...prev, [titleKey]: e.target.value}))}
                                    className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                    placeholder="Ex: NEWS FOR RENT"
                                  />
                                </div>
                                {bConf.keyPrefix === 'banner_alugue' ? (
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Título Linha 2</label>
                                    <input 
                                      type="text"
                                      value={settings.banner_alugue_title2 || ''}
                                      onChange={(e) => setSettings(prev => ({...prev, banner_alugue_title2: e.target.value}))}
                                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                      placeholder="Ex: BAGS"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cor do Texto</label>
                                    <div className="flex gap-2">
                                      <input 
                                        type="color"
                                        value={(settings as any)[colorKey] || '#000000'}
                                        onChange={(e) => setSettings(prev => ({...prev, [colorKey]: e.target.value}))}
                                        className="h-[38px] w-12 cursor-pointer border border-outline-variant bg-surface-container-low"
                                      />
                                      <input 
                                        type="text"
                                        value={(settings as any)[colorKey] || ''}
                                        onChange={(e) => setSettings(prev => ({...prev, [colorKey]: e.target.value}))}
                                        className="flex-1 bg-surface-container-low border border-outline-variant px-4 py-2.5 text-sm font-mono focus:border-primary focus:outline-none"
                                        placeholder="#000000"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {bConf.keyPrefix === 'banner_alugue' && (
                                <div className="space-y-2 max-w-[200px]">
                                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cor do Texto</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="color"
                                      value={(settings as any)[colorKey] || '#000000'}
                                      onChange={(e) => setSettings(prev => ({...prev, [colorKey]: e.target.value}))}
                                      className="h-[38px] w-12 cursor-pointer border border-outline-variant bg-surface-container-low"
                                    />
                                    <input 
                                      type="text"
                                      value={(settings as any)[colorKey] || ''}
                                      onChange={(e) => setSettings(prev => ({...prev, [colorKey]: e.target.value}))}
                                      className="flex-1 bg-surface-container-low border border-outline-variant px-4 py-2.5 text-sm font-mono focus:border-primary focus:outline-none"
                                      placeholder="#000000"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Imagens */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                               {[
                                 { dKey: 'desktop', lbl: 'Desktop' },
                                 { dKey: 'tablet', lbl: 'Tablet' },
                                 { dKey: 'mobile', lbl: 'Mobile' }
                               ].map((dev) => {
                                 const fKey = `${bConf.keyPrefix}_${dev.dKey}`;
                                 const cVal = (settings as any)[fKey] as string || '';
                                 return (
                                   <div key={fKey} className="space-y-2">
                                     <label className="text-[10px] uppercase font-bold text-on-surface-variant/60">{dev.lbl}</label>
                                     <div className="relative group border border-outline-variant/20 rounded overflow-hidden aspect-video bg-surface-container flex items-center justify-center">
                                        {cVal ? (
                                          <img src={cVal} className="object-cover w-full h-full" alt="Preview"/>
                                        ) : (
                                          <div className="flex flex-col items-center gap-1 opacity-20">
                                            <Upload className="w-4 h-4"/>
                                            <span className="text-[9px] uppercase font-bold">Vazio</span>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                           <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              id={`upload-${fKey}`}
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if(!file) return;
                                                const fileName = `custom_${fKey}_${Date.now()}.jpg`;
                                                try {
                                                  const { error } = await supabase.storage.from('banners').upload(fileName, file);
                                                  if (error) throw error;
                                                  const { data: pUrl } = supabase.storage.from('banners').getPublicUrl(fileName);
                                                  setSettings({...settings, [fKey]: pUrl.publicUrl});
                                                  setMessage({ type: 'success', text: `Banner ${dev.lbl} atualizado.` });
                                                } catch (err: any) {
                                                  setMessage({ type: 'error', text: 'Erro no upload: ' + err.message });
                                                }
                                              }}
                                           />
                                           <label htmlFor={`upload-${fKey}`} className="p-2 cursor-pointer bg-white text-black rounded-full hover:bg-gray-200 shadow-sm transition-transform active:scale-95">
                                              <Upload className="w-4 h-4"/>
                                           </label>
                                           {cVal && (
                                             <button type="button" onClick={() => setSettings({...settings, [fKey]: ''})} className="p-2 bg-white text-red-500 rounded-full hover:bg-red-50 transition-transform active:scale-95">
                                                <X className="w-4 h-4"/>
                                             </button>
                                           )}
                                        </div>
                                     </div>
                                   </div>
                                 );
                               })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Company Data Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-primary/5 rounded-full">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-headline italic text-xl">Dados da Empresa</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Informações Básicas */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Comercial</label>
                      <input 
                        type="text" 
                        value={settings.company_name}
                        onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                        placeholder="Ex: Bags2rent Luxury"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail de Contato</label>
                      <input 
                        type="email" 
                        value={settings.company_email}
                        onChange={(e) => setSettings({...settings, company_email: e.target.value})}
                        placeholder="contato@empresa.com"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Telefone Fixo Comercial</label>
                      <input 
                        type="text" 
                        value={settings.company_phone}
                        onChange={(e) => setSettings({...settings, company_phone: e.target.value})}
                        placeholder="+55 (11) 99999-9999"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Endereço Completo</label>
                      <textarea 
                        rows={3}
                        value={settings.company_address}
                        onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                        placeholder="Logradouro, número, bairro, cidade - UF, CEP"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      ></textarea>
                    </div>
                  </div>

                  {/* Configurações de WhatsApp */}
                  <div className="space-y-6 p-6 bg-emerald-50/30 border border-emerald-100 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                      <h5 className="font-headline italic text-lg text-emerald-900">Configuração do WhatsApp</h5>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-emerald-800/70">Número do WhatsApp</label>
                      <input 
                        type="text" 
                        value={settings.whatsapp_number || ''}
                        onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                        placeholder="5511999999999"
                        className="w-full bg-white border border-emerald-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                      />
                      <p className="text-[10px] text-emerald-700 italic">Insira apenas números (incluindo DDI e DDD).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-emerald-800/70">Mensagem Padrão (Opcional)</label>
                      <textarea 
                        rows={3}
                        value={settings.whatsapp_message || ''}
                        onChange={(e) => setSettings({...settings, whatsapp_message: e.target.value})}
                        placeholder="Ex: Olá! Gostaria de mais informações sobre as peças."
                        className="w-full bg-white border border-emerald-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={settings.whatsapp_new_tab ?? true}
                          onChange={(e) => setSettings({...settings, whatsapp_new_tab: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 bg-white border-emerald-200 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-emerald-900">Abrir em nova aba</span>
                      </label>
                    </div>

                    <div className="mt-4 p-3 bg-white/50 border border-emerald-100 rounded-sm">
                       <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                         Dica: Este número será usado no botão flutuante, no rodapé e nas páginas de produto.
                       </p>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* AI Integration Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-purple-50 rounded-full">
                    <Key className="w-5 h-5 text-purple-700" />
                  </div>
                  <h4 className="font-headline italic text-xl">Inteligência Artificial (OpenAI)</h4>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-100 flex gap-3 text-blue-800">
                    <Info className="w-5 h-5 shrink-0" />
                    <p className="text-xs leading-relaxed">
                      Esta chave será utilizada para funcionalidades de geração de descrições automáticas,
                      análise de estoque e assistência via chat integrada no site. Mantenha sua chave em segredo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">OpenAI API Key</label>
                    <input 
                      type="password" 
                      value={settings.openai_api_key}
                      onChange={(e) => setSettings({...settings, openai_api_key: e.target.value})}
                      placeholder="sk-..."
                      className="w-full font-mono bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Modelo GPT Padrão</label>
                    <select 
                      value={settings.gpt_model}
                      onChange={(e) => setSettings({...settings, gpt_model: e.target.value})}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors appearance-none"
                    >
                      <option value="gpt-4o">GPT-4o (Recomendado)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Deepseek Integration Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm mt-8">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-orange-50 rounded-full">
                    <Key className="w-5 h-5 text-orange-700" />
                  </div>
                  <h4 className="font-headline italic text-xl">Inteligência Artificial (Deepseek)</h4>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-orange-50 border border-orange-100 flex gap-3 text-orange-800">
                    <Info className="w-5 h-5 shrink-0" />
                    <p className="text-xs leading-relaxed">
                      Esta chave será utilizada para o preenchimento automático de SEO de produtos (Title e Meta Description).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Deepseek API Key</label>
                    <input 
                      type="password" 
                      value={settings.deepseek_api_key}
                      onChange={(e) => setSettings({...settings, deepseek_api_key: e.target.value})}
                      placeholder="sk-..."
                      className="w-full font-mono bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Regional Shipping Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-emerald-50 rounded-full">
                    <Truck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h4 className="font-headline italic text-xl">Custos de Frete por Região</h4>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 flex gap-3 text-emerald-800 mb-8">
                  <Info className="w-5 h-5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    Defina o valor fixo de frete para cada região do Brasil. Estes valores serão aplicados no checkout
                    com base no endereço do cliente ou simulados na página do produto.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span> Região Norte
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Valor</span>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                          <input 
                            type="number" 
                            value={settings.shipping_north}
                            onChange={(e) => setSettings({...settings, shipping_north: Number(e.target.value)})}
                            className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          value={settings.delivery_north}
                          onChange={(e) => setSettings({...settings, delivery_north: Number(e.target.value)})}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">AC, AM, AP, PA, RO, RR, TO</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span> Região Nordeste
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Valor</span>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                          <input 
                            type="number" 
                            value={settings.shipping_northeast}
                            onChange={(e) => setSettings({...settings, shipping_northeast: Number(e.target.value)})}
                            className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          value={settings.delivery_northeast}
                          onChange={(e) => setSettings({...settings, delivery_northeast: Number(e.target.value)})}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          placeholder="Ex: 4"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">AL, BA, CE, MA, PB, PE, PI, RN, SE</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Região Centro-Oeste
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Valor</span>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                          <input 
                            type="number" 
                            value={settings.shipping_central_west}
                            onChange={(e) => setSettings({...settings, shipping_central_west: Number(e.target.value)})}
                            className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          value={settings.delivery_central_west}
                          onChange={(e) => setSettings({...settings, delivery_central_west: Number(e.target.value)})}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          placeholder="Ex: 3"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">DF, GO, MT, MS</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span> Região Sudeste
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Valor</span>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                          <input 
                            type="number" 
                            value={settings.shipping_southeast}
                            onChange={(e) => setSettings({...settings, shipping_southeast: Number(e.target.value)})}
                            className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          value={settings.delivery_southeast}
                          onChange={(e) => setSettings({...settings, delivery_southeast: Number(e.target.value)})}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          placeholder="Ex: 2"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">ES, MG, RJ, SP</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span> Região Sul
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Valor</span>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                          <input 
                            type="number" 
                            value={settings.shipping_south}
                            onChange={(e) => setSettings({...settings, shipping_south: Number(e.target.value)})}
                            className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">Prazo (Dias)</span>
                        <input 
                          type="number" 
                          value={settings.delivery_south}
                          onChange={(e) => setSettings({...settings, delivery_south: Number(e.target.value)})}
                          className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                          placeholder="Ex: 3"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">PR, RS, SC</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Rental Rules Section */}
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-blue-50 rounded-full">
                    <ScrollText className="w-5 h-5 text-blue-700" />
                  </div>
                  <h4 className="font-headline italic text-xl">Regras de Negócio de Locação</h4>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 flex gap-3 text-blue-800 mb-8">
                  <Info className="w-5 h-5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    Estas regras definem como os preços são calculados e quais as restrições logísticas para as
                    locações na plataforma.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Período de Diária (Dias)
                    </label>
                    <input 
                      type="number" 
                      value={settings.rental_min_days}
                      onChange={(e) => setSettings({...settings, rental_min_days: Number(e.target.value)})}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                      placeholder="Ex: 4"
                    />
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Quantos dias estão inclusos no valor de 1 diária. Ex: se for 4, o cliente paga 1 diária para 4 dias de uso.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Multa por Atraso (%)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.late_fee_percentage}
                        onChange={(e) => setSettings({...settings, late_fee_percentage: Number(e.target.value)})}
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-10 text-sm focus:border-primary focus:outline-none transition-colors font-medium pr-10"
                        style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">%</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Percentual cobrado sobre o valor do aluguel para cada dia de atraso na postagem de retorno.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Preparação Pré-Envio (Dias)
                    </label>
                    <input 
                      type="number" 
                      value={settings.preparation_days}
                      onChange={(e) => setSettings({...settings, preparation_days: Number(e.target.value)})}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                      placeholder="Ex: 2"
                    />
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Dias necessários de antecedência para preparar e postar o produto antes do início da locação.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Intervalo Logístico (Dias)
                    </label>
                    <input 
                      type="number" 
                      value={settings.rental_buffer_days}
                      onChange={(e) => setSettings({...settings, rental_buffer_days: Number(e.target.value)})}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                      placeholder="Ex: 3"
                    />
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Janela de tempo entre uma locação e outra para garantir a higienização e devolução física.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Período Máximo (Dias)
                    </label>
                    <input 
                      type="number" 
                      value={settings.rental_max_days}
                      onChange={(e) => setSettings({...settings, rental_max_days: Number(e.target.value)})}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-medium"
                      placeholder="Ex: 30"
                    />
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Tempo máximo permitido para uma locação contínua.
                    </p>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                    <h5 className="font-headline italic text-lg text-on-surface">Prazos e Acréscimos de Preço</h5>
                    <button
                      type="button"
                      onClick={addRentalPeriod}
                      className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                    >
                      + Adicionar Período
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="py-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Dias</th>
                          <th className="py-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Tipo de Ajuste</th>
                          <th className="py-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Valor do Ajuste</th>
                          <th className="py-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {(settings.rental_periods || []).map((period, index) => (
                          <tr key={index} className="group hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-4 pr-4">
                              <input 
                                type="number"
                                value={period.days}
                                onChange={(e) => updateRentalPeriod(index, { days: Number(e.target.value) })}
                                className="w-20 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                              />
                            </td>
                            <td className="py-4 pr-4">
                              <select
                                value={period.type}
                                onChange={(e) => updateRentalPeriod(index, { type: e.target.value as 'fixed' | 'percentage' })}
                                className="bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none appearance-none pr-8 relative"
                              >
                                <option value="fixed">Fixo (R$)</option>
                                <option value="percentage">Percentual (%)</option>
                              </select>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
                                  {period.type === 'fixed' ? 'R$' : '%'}
                                </span>
                                <input 
                                  type="number"
                                  value={period.value}
                                  onChange={(e) => updateRentalPeriod(index, { value: Number(e.target.value) })}
                                  className="w-full bg-surface-container-low border border-outline-variant pl-8 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removeRentalPeriod(index)}
                                className="text-red-600 hover:text-red-800 p-2 transition-colors"
                                title="Remover regra"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!settings.rental_periods || settings.rental_periods.length === 0) && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-on-surface-variant italic">
                              Nenhuma regra de período configurada. Clique em "Adicionar Período" para começar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-sm">
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      💡 <strong>Dica:</strong> O sistema aplicará a regra correspondente ao número exato de dias escolhidos pelo cliente. 
                      Se não houver uma regra exata para os dias selecionados, o preço base por dia será mantido.
                    </p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="p-2 bg-emerald-50 rounded-full">
                    <CreditCard className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h4 className="font-headline italic text-xl">Configuração de Pagamentos (Asaas)</h4>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                         Webhook URL
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded">Ativo</span>
                    </div>
                    
                    <div className="flex gap-2">
                       <input 
                        type="text" 
                        readOnly
                        value="https://uggofsioqvqcnpwmnznp.supabase.co/functions/v1/asaas-webhook"
                        className="flex-1 bg-surface-container-low border border-outline-variant px-4 py-3 text-sm font-mono text-on-surface-variant focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://uggofsioqvqcnpwmnznp.supabase.co/functions/v1/asaas-webhook");
                          alert("URL copiada!");
                        }}
                        className="bg-on-surface text-surface px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-on-surface-variant transition-all"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
                      Cole esta URL no dashboard do Asaas em <strong>Configurações &gt; Webhooks</strong> para receber atualizações automáticas de pagamento.
                    </p>
                  </div>

                  <div className="p-6 bg-surface-container-low border border-outline-variant/10 space-y-4">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <h5 className="text-xs font-bold uppercase tracking-widest">Configuração Necessária</h5>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Para que o processamento funcione, você deve configurar a <strong>API Key</strong> no seu ambiente Supabase:
                      </p>
                      <div className="bg-black text-white p-4 font-mono text-[10px] leading-relaxed rounded overflow-x-auto">
                        supabase secrets set ASAAS_API_KEY=sua_chave_aqui
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Também configure o Token do Webhook para segurança:
                      </p>
                      <div className="bg-black text-white p-4 font-mono text-[10px] leading-relaxed rounded overflow-x-auto">
                        supabase secrets set ASAAS_WEBHOOK_TOKEN=seu_token_aqui
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="border border-outline-variant/10 p-4 rounded bg-surface-container-lowest/50">
                      <h6 className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Eventos Monitorados
                      </h6>
                      <ul className="text-[10px] text-on-surface-variant space-y-1 ml-4 list-disc">
                        <li>PAYMENT_RECEIVED (Confirmação automática)</li>
                        <li>PAYMENT_CONFIRMED (Cartão aprovado)</li>
                        <li>PAYMENT_OVERDUE (Vencido)</li>
                        <li>PAYMENT_REFUNDED (Estornado)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'emails' && (
            <motion.div
              key="emails"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <section className="bg-white border border-outline-variant/20 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <Mail className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <h4 className="font-headline italic text-xl flex items-center gap-2">
                        E-mails Transacionais
                        {settings.email_active ? (
                           <span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Ativo</span>
                        ) : (
                           <span className="bg-gray-100 text-gray-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Inativo</span>
                        )}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Disparos de pedido confirmado, enviado, etc. via Resend API.</p>
                    </div>
                  </div>
                  <a href="/docs/Configuracao_Emails_Resend.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Info className="w-4 h-4" /> Ler Documentação
                  </a>
                </div>

                <div className="space-y-8">
                  {/* Status do Serviço de E-mail */}
                  <div className="p-4 border rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-container-low border-outline-variant/30 gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${settings.resend_api_key && settings.email_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-on-surface">Status do Serviço de E-mail</h5>
                        <p className="text-xs text-on-surface-variant">
                          {settings.resend_api_key 
                            ? settings.email_active 
                              ? 'O serviço Resend está configurado e ativo. Os e-mails estão sendo enviados.' 
                              : 'A API Key está configurada, mas os envios automáticos estão desativados.'
                            : 'O serviço não está configurado. Insira a Resend API Key abaixo para conectar.'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {settings.resend_api_key ? (
                        settings.email_active ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> CONECTADO & ATIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> INATIVO
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" /> DESCONECTADO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container-low p-4 border border-outline-variant/20">
                    <div>
                      <h5 className="text-sm font-bold text-on-surface">Ativar Integração</h5>
                      <p className="text-xs text-on-surface-variant">Ligue para permitir o envio de e-mails em eventos do sistema.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.email_active || false}
                        onChange={(e) => setSettings({...settings, email_active: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Resend API Key</label>
                      <input 
                        type="password" 
                        value={settings.resend_api_key || ''}
                        onChange={(e) => setSettings({...settings, resend_api_key: e.target.value})}
                        placeholder="re_..."
                        className="w-full bg-surface-container-lowest border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail Remetente</label>
                      <input 
                        type="email" 
                        value={settings.email_from_address || ''}
                        onChange={(e) => setSettings({...settings, email_from_address: e.target.value})}
                        placeholder="naoresponda@seusite.com.br"
                        className="w-full bg-surface-container-lowest border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                      <p className="text-[10px] text-on-surface-variant italic">Precisa ser de um domínio verificado no Resend.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Remetente</label>
                      <input 
                        type="text" 
                        value={settings.email_from_name || ''}
                        onChange={(e) => setSettings({...settings, email_from_name: e.target.value})}
                        placeholder="2Bags2rent"
                        className="w-full bg-surface-container-lowest border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex border-b pb-8 border-outline-variant/10">
                     <button
                       type="button"
                       onClick={testEmailConnection}
                       disabled={testingEmail}
                       className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-6 py-2 text-sm font-bold uppercase hover:bg-blue-100 transition-colors disabled:opacity-50"
                     >
                       {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                       {testingEmail ? 'Enviando...' : 'Testar Conexão / Enviar E-mail'}
                     </button>
                  </div>

                  <div className="space-y-6">
                    <h5 className="font-headline italic text-lg">Templates (HTML)</h5>
                    <p className="text-xs text-on-surface-variant mb-4">
                      Você pode usar tags como <code>{'{{customer_name}}'}</code>, <code>{'{{order_id}}'}</code>, <code>{'{{total_price}}'}</code>, <code>{'{{items_list}}'}</code>. 
                    </p>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-primary"></div> Pedido Realizado
                      </label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <textarea 
                          rows={15}
                          value={settings.email_template_order_created || ''}
                          onChange={(e) => setSettings({...settings, email_template_order_created: e.target.value})}
                          className="w-full font-mono text-[11px] leading-relaxed p-4 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:outline-none"
                        ></textarea>
                        <div className="border border-outline-variant/30 bg-white p-4 h-[350px] overflow-y-auto shadow-inner" dangerouslySetInnerHTML={{
                          __html: (settings.email_template_order_created || '')
                            .replace(/\{\{customer_name\}\}/g, 'Mariana Silva')
                            .replace(/\{\{order_id\}\}/g, 'PED-8X9Y2Z')
                            .replace(/\{\{financial_status\}\}/g, 'Aprovado')
                            .replace(/\{\{total_price\}\}/g, '459,90')
                            .replace(/\{\{items_list\}\}/g, '<div style="padding:10px; border:1px dashed #ccc;"><em>1x Vestido de Paetê Preto (R$ 459,90)</em></div>')
                            .replace(/\{\{shipping_address_name\}\}/g, 'Mariana Silva')
                            .replace(/\{\{shipping_address\}\}/g, 'Rua das Flores, 123 - Apto 45<br/>Jardins, São Paulo - SP<br/>01400-000')
                        }} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-blue-500"></div> Pedido Enviado / Disponível
                      </label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <textarea 
                          rows={15}
                          value={settings.email_template_order_shipped || ''}
                          onChange={(e) => setSettings({...settings, email_template_order_shipped: e.target.value})}
                          className="w-full font-mono text-[11px] leading-relaxed p-4 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:outline-none"
                        ></textarea>
                        <div className="border border-outline-variant/30 bg-white p-4 h-[350px] overflow-y-auto shadow-inner" dangerouslySetInnerHTML={{
                          __html: (settings.email_template_order_shipped || '')
                            .replace(/\{\{customer_name\}\}/g, 'Mariana Silva')
                            .replace(/\{\{order_id\}\}/g, 'PED-8X9Y2Z')
                            .replace(/\{\{shipping_address_name\}\}/g, 'Mariana Silva')
                            .replace(/\{\{shipping_address\}\}/g, 'Rua das Flores, 123 - Apto 45<br/>Jardins, São Paulo - SP<br/>01400-000')
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Histórico de E-mails (Logs) */}
                  <div className="mt-12 pt-8 border-t border-outline-variant/10 space-y-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                      <div>
                        <h5 className="font-headline italic text-lg text-on-surface flex items-center gap-2">
                          <Mail className="w-5 h-5 text-primary" /> Histórico de E-mails (Logs)
                        </h5>
                        <p className="text-xs text-on-surface-variant mt-0.5">Confira o status de entrega dos e-mails transacionais enviados recentemente.</p>
                      </div>
                      {emailLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={clearEmailLogs}
                          className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded text-xs font-bold uppercase hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Limpar Logs
                        </button>
                      )}
                    </div>

                    {loadingLogs ? (
                      <div className="flex items-center justify-center py-12 flex-col gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs text-on-surface-variant italic">Carregando logs...</p>
                      </div>
                    ) : emailLogs.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-outline-variant/40 rounded bg-surface-container-lowest">
                        <p className="text-sm text-on-surface-variant italic">Nenhum e-mail enviado recentemente ou logs limpos.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-outline-variant/20 rounded">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant/20">
                              <th className="p-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Destinatário</th>
                              <th className="p-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Assunto</th>
                              <th className="p-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Data / Hora</th>
                              <th className="p-3 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {emailLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                                <td className="p-3 text-xs font-medium text-on-surface">{log.to_email}</td>
                                <td className="p-3 text-xs text-on-surface">
                                  <div>{log.subject}</div>
                                  {log.error_message && (
                                    <div className="text-[10px] text-red-600 mt-1 bg-red-50 p-2 border border-red-100 rounded leading-relaxed">{log.error_message}</div>
                                  )}
                                </td>
                                <td className="p-3 text-xs text-on-surface-variant whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="p-3 text-xs whitespace-nowrap">
                                  {log.status === 'success' ? (
                                    <span className="inline-flex items-center gap-0.5 bg-green-50 border border-green-200 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                      Sucesso
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                      Erro
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <section className="bg-surface-container-low p-6 md:p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-black text-white rounded-sm">
                    <Menu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-headline italic text-2xl">Menu Principal</h3>
                    <p className="text-sm text-on-surface-variant">Configure a exibição das categorias no menu do site.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                  {[
                    { key: 'menu_peca_visible', label: 'Aluguel por Peça' },
                    { key: 'menu_tamanho_visible', label: 'Aluguel por tamanho' },
                    { key: 'menu_eventos_visible', label: 'Aluguel por Eventos' },
                    { key: 'menu_marcas_visible', label: 'Nossas Marcas' },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-white border border-outline-variant/30 hover:border-black transition-colors"
                    >
                      <span className="text-sm font-medium tracking-tight">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings[item.key as keyof Settings] as boolean ?? true}
                          onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-black/5 border-l-4 border-black mb-12">
                  <p className="text-xs text-black leading-relaxed">
                    <strong>Sugestão:</strong> Desative categorias que ainda não possuem produtos cadastrados ou que não fazem parte da sua estratégia atual de exibição.
                  </p>
                </div>

                <div className="space-y-12">
                  <h4 className="font-headline italic text-xl border-b border-outline-variant/20 pb-2">Configurar Submenus</h4>
                  
                  {[
                    { 
                      parent: 'Aluguel por Peça', 
                      visible: settings.menu_peca_visible,
                      items: ['Vestidos', 'Calças', 'Colar', 'Bolsas', 'Blusas/ Top Croppeds', 'Conjuntos', 'Kimonos', 'Saias', 'Parkas'] 
                    },
                    { 
                      parent: 'Aluguel por tamanho', 
                      visible: settings.menu_tamanho_visible,
                      items: ['P — Pequeno', 'M — Médio', 'G — Grande'] 
                    },
                    {
                      parent: 'Aluguel por Eventos',
                      visible: settings.menu_eventos_visible,
                      items: ['Casamento', 'Festa', 'Formatura', 'Gala', 'Coquitel']
                    },
                    { 
                      parent: 'Nossas Marcas', 
                      visible: settings.menu_marcas_visible,
                      items: ['Acler','Agilità','Animale','AVE RARA','AYA','Candy Brown','Catarina Mina','Cris Barros','Cult Gaia','Débora Mangabeira','Fabiana Milazzo','Ganni','Hisha','Jenny Hoo','Le Lis Blanc','Mac Duggal','Mageste','Mariana Penteado','Marina Bitu','NX','PatBo','Ralph Lauren','Solace London','Unity Seven','Wanessa Fittireis','ZARA','Zimmermann'] 
                    }
                  ].map((group) => (
                    <div key={group.parent} className={`space-y-4 ${!group.visible ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                        <h5 className="text-xs font-bold uppercase tracking-widest">{group.parent}</h5>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {group.items.map((item) => {
                          const isHidden = (settings.menu_hidden_items || []).includes(item);
                          return (
                            <div 
                              key={item}
                              className="flex items-center justify-between p-3 bg-white border border-outline-variant/20 rounded-sm hover:border-black/30 transition-colors"
                            >
                              <span className="text-[11px] font-medium leading-tight truncate mr-2" title={item}>{item}</span>
                              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input 
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={!isHidden}
                                  onChange={(e) => {
                                    const currentHidden = settings.menu_hidden_items || [];
                                    const nextHidden = e.target.checked 
                                      ? currentHidden.filter(i => i !== item)
                                      : [...currentHidden, item];
                                    setSettings({ ...settings, menu_hidden_items: nextHidden });
                                  }}
                                />
                                <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-black"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] hover:bg-black/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
            {saving ? 'Gravando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
