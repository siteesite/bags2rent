import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import {
  Ticket, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle,
  X, Search, ChevronDown, Gift, Percent, DollarSign, Calendar,
  Users, ShoppingBag, Truck, ToggleLeft, ToggleRight, Copy, Info
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number | null;
  is_active: boolean;
  applies_to: 'all' | 'products' | 'categories';
  valid_from: string | null;
  valid_until: string | null;
  first_order_only: boolean;
  free_shipping: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_COUPON: Omit<Coupon, 'id' | 'uses_count' | 'created_at' | 'updated_at'> = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  max_uses: null,
  max_uses_per_user: null,
  is_active: true,
  applies_to: 'all',
  valid_from: null,
  valid_until: null,
  first_order_only: false,
  free_shipping: false,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
  return `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')}`;
}

function isExpired(coupon: Coupon): boolean {
  if (!coupon.valid_until) return false;
  return new Date(coupon.valid_until) < new Date();
}

function formatDateInput(isoOrNull: string | null): string {
  if (!isoOrNull) return '';
  return isoOrNull.substring(0, 16); // datetime-local format
}

export function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<typeof EMPTY_COUPON>({ ...EMPTY_COUPON });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCoupons(data || []);
    } catch (err: any) {
      showMessage('error', `Erro ao carregar cupons: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setForm({ ...EMPTY_COUPON });
    setShowModal(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_uses: coupon.max_uses,
      max_uses_per_user: coupon.max_uses_per_user,
      is_active: coupon.is_active,
      applies_to: coupon.applies_to,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      first_order_only: coupon.first_order_only,
      free_shipping: coupon.free_shipping,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showMessage('error', 'O código do cupom é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
      };
      if (editingCoupon) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingCoupon.id);
        if (error) throw error;
        showMessage('success', 'Cupom atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('coupons').insert({ ...payload, uses_count: 0 });
        if (error) throw error;
        showMessage('success', 'Cupom criado com sucesso!');
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      showMessage('error', `Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      showMessage('success', 'Cupom excluído com sucesso!');
    } catch (err: any) {
      showMessage('error', `Erro ao excluir: ${err.message}`);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err: any) {
      showMessage('error', `Erro ao atualizar status: ${err.message}`);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code }));
  };

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && c.is_active && !isExpired(c)) ||
      (filterStatus === 'inactive' && !c.is_active) ||
      (filterStatus === 'expired' && isExpired(c));
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active && !isExpired(c)).length,
    expired: coupons.filter(c => isExpired(c)).length,
    totalUses: coupons.reduce((sum, c) => sum + c.uses_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-headline italic text-3xl">Cupons de Desconto</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            Crie e gerencie cupons promocionais para seus clientes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 flex items-center gap-3 border text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Ticket, color: 'text-primary bg-primary/5' },
          { label: 'Ativos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Expirados', value: stats.expired, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
          { label: 'Usos Totais', value: stats.totalUses, icon: Users, color: 'text-purple-700 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-outline-variant/20 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-full ${stat.color} mb-3`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-0.5 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Pesquisar por código ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive', 'expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                filterStatus === f
                  ? 'bg-primary text-on-primary'
                  : 'bg-white border border-outline-variant text-on-surface-variant hover:border-primary'
              }`}
            >
              {{ all: 'Todos', active: 'Ativos', inactive: 'Inativos', expired: 'Expirados' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant italic">Carregando cupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Ticket className="w-10 h-10 text-on-surface-variant/30" />
            <p className="text-sm text-on-surface-variant italic">Nenhum cupom encontrado.</p>
            <button onClick={openCreate} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline mt-1">
              Criar o primeiro cupom
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-surface-container-low/30">
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Código</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Desconto</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Validade</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Usos</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredCoupons.map(coupon => {
                  const expired = isExpired(coupon);
                  return (
                    <motion.tr
                      key={coupon.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-surface-container-low/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm tracking-wider text-primary">{coupon.code}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(coupon.code); showMessage('success', 'Código copiado!'); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary"
                            title="Copiar código"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-[180px]">{coupon.description}</p>
                        )}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {coupon.free_shipping && (
                            <span className="text-[9px] uppercase font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5" /> Frete Grátis
                            </span>
                          )}
                          {coupon.first_order_only && (
                            <span className="text-[9px] uppercase font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <Gift className="w-2.5 h-2.5" /> 1ª Compra
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1 rounded-full ${coupon.discount_type === 'percentage' ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                            {coupon.discount_type === 'percentage'
                              ? <Percent className="w-3.5 h-3.5 text-purple-700" />
                              : <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                            }
                          </span>
                          <span className="font-bold text-base">{formatDiscount(coupon)}</span>
                        </div>
                        {coupon.min_order_value > 0 && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            Mínimo: R$ {coupon.min_order_value.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="text-sm">
                          {coupon.valid_from && <p className="text-[11px] text-on-surface-variant">De: {formatDate(coupon.valid_from)}</p>}
                          {coupon.valid_until
                            ? <p className={`text-[11px] font-medium ${expired ? 'text-red-600' : 'text-on-surface-variant'}`}>
                                Até: {formatDate(coupon.valid_until)}
                              </p>
                            : <p className="text-[11px] text-on-surface-variant">Sem expiração</p>
                          }
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm font-medium">{coupon.uses_count}</p>
                        {coupon.max_uses !== null && (
                          <p className="text-[11px] text-on-surface-variant">de {coupon.max_uses} máx.</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className="flex items-center gap-1.5 transition-colors"
                          title={coupon.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.is_active && !expired ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Ativo</span>
                            </>
                          ) : expired ? (
                            <>
                              <ToggleLeft className="w-5 h-5 text-red-400" />
                              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Expirado</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-on-surface-variant/40" />
                              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Inativo</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(coupon)}
                            className="p-2 hover:bg-primary/5 hover:text-primary rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(coupon.id)}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Excluir"
                          >
                            {deleting === coupon.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 shadow-2xl max-w-sm w-full space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="font-headline italic text-xl">Excluir Cupom?</h4>
              </div>
              <p className="text-sm text-on-surface-variant">
                Esta ação não pode ser desfeita. O cupom será permanentemente removido.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 border border-outline-variant px-4 py-3 text-sm font-medium hover:bg-surface-container-low transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDelete && handleDelete(confirmDelete)}
                  className="flex-1 bg-red-600 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="coupon-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white shadow-2xl w-full max-w-2xl my-8"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 rounded-full">
                    <Ticket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline italic text-xl">
                      {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                    </h4>
                    <p className="text-xs text-on-surface-variant">Configure todas as condições do cupom abaixo.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-8">
                {/* Code & Description */}
                <div className="space-y-5">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3">
                    Identificação
                  </h5>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Código do Cupom *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex: VERAO25"
                        required
                        className="flex-1 bg-surface-container-low border border-outline-variant px-4 py-3 text-sm font-mono font-bold tracking-widest uppercase focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={generateCode}
                        className="px-4 py-3 border border-outline-variant text-xs font-bold uppercase tracking-wider hover:border-primary hover:text-primary transition-all whitespace-nowrap"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Descrição Interna
                    </label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Ex: Promoção de verão 2025"
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-on-surface-variant italic">Apenas para controle interno, não aparece para o cliente.</p>
                  </div>
                </div>

                {/* Discount Configuration */}
                <div className="space-y-5">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3">
                    Tipo de Desconto
                  </h5>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'percentage' as const, label: 'Percentual', icon: Percent, desc: 'Ex: 15% de desconto' },
                      { type: 'fixed' as const, label: 'Valor Fixo', icon: DollarSign, desc: 'Ex: R$ 30,00 de desconto' },
                    ].map(opt => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, discount_type: opt.type }))}
                        className={`border-2 p-4 text-left transition-all ${
                          form.discount_type === opt.type
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant hover:border-outline-variant/60'
                        }`}
                      >
                        <opt.icon className={`w-5 h-5 mb-2 ${form.discount_type === opt.type ? 'text-primary' : 'text-on-surface-variant'}`} />
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        {form.discount_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant font-medium">
                          {form.discount_type === 'percentage' ? '%' : 'R$'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={form.discount_type === 'percentage' ? 100 : undefined}
                          step="0.01"
                          value={form.discount_value}
                          onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                          required
                          className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm font-bold focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        Pedido Mínimo (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.min_order_value}
                          onChange={e => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))}
                          placeholder="0 = sem mínimo"
                          className="w-full bg-surface-container-low border border-outline-variant pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validity & Limits */}
                <div className="space-y-5">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3">
                    Validade e Limites de Uso
                  </h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Válido De
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateInput(form.valid_from)}
                        onChange={e => setForm(f => ({ ...f, valid_from: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Válido Até
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateInput(form.valid_until)}
                        onChange={e => setForm(f => ({ ...f, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> Usos Totais Máximos
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.max_uses ?? ''}
                        onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Ilimitado"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none"
                      />
                      <p className="text-[10px] text-on-surface-variant italic">Deixe vazio para uso ilimitado.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Usos Máx. por Cliente
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.max_uses_per_user ?? ''}
                        onChange={e => setForm(f => ({ ...f, max_uses_per_user: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Ilimitado"
                        className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Special Options */}
                <div className="space-y-5">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3">
                    Opções Especiais
                  </h5>

                  <div className="space-y-3">
                    {[
                      {
                        key: 'free_shipping' as const,
                        icon: Truck,
                        label: 'Frete Grátis',
                        desc: 'O cupom também zerará o valor do frete no pedido.',
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                      },
                      {
                        key: 'first_order_only' as const,
                        icon: Gift,
                        label: 'Somente Primeira Compra',
                        desc: 'O cupom só poderá ser usado pelo cliente em seu primeiro pedido.',
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                      },
                    ].map(opt => (
                      <div
                        key={opt.key}
                        onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                        className={`flex items-center justify-between p-4 border-2 cursor-pointer transition-all ${
                          form[opt.key] ? 'border-primary bg-primary/3' : 'border-outline-variant hover:border-outline-variant/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${opt.bg}`}>
                            <opt.icon className={`w-4 h-4 ${opt.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{opt.label}</p>
                            <p className="text-[11px] text-on-surface-variant">{opt.desc}</p>
                          </div>
                        </div>
                        {form[opt.key]
                          ? <ToggleRight className="w-7 h-7 text-primary shrink-0" />
                          : <ToggleLeft className="w-7 h-7 text-on-surface-variant/40 shrink-0" />
                        }
                      </div>
                    ))}
                  </div>

                  {/* Active Status */}
                  <div
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center justify-between p-4 border-2 cursor-pointer transition-all ${
                      form.is_active ? 'border-emerald-400 bg-emerald-50/50' : 'border-outline-variant'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold">Cupom Ativo</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {form.is_active ? 'O cupom está disponível para uso pelos clientes.' : 'O cupom está desativado e não pode ser usado.'}
                      </p>
                    </div>
                    {form.is_active
                      ? <ToggleRight className="w-7 h-7 text-emerald-600 shrink-0" />
                      : <ToggleLeft className="w-7 h-7 text-on-surface-variant/40 shrink-0" />
                    }
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-blue-50 border border-blue-100 flex gap-3 text-blue-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Os cupons criados aqui ficam disponíveis no banco de dados e podem ser validados no checkout da loja. 
                    A contagem de usos é incrementada automaticamente a cada pedido confirmado.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-outline-variant px-4 py-3 text-sm font-medium hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary text-on-primary px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                      : <><Ticket className="w-4 h-4" /> {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}</>
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
