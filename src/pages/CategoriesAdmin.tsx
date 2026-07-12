import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash2, X, Loader2, Save, Tag, Ruler, Sparkles, Award, Image as ImageIcon, Eye, EyeOff, Settings as SettingsIcon, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCategories, Category, CategoryType } from '../context/CategoriesContext';
import { createSlug } from '../utils/slug';

const ICON_MAP: Record<string, any> = {
  Tag: Tag,
  Ruler: Ruler,
  Sparkles: Sparkles,
  Award: Award,
};

interface CategoryFormState {
  id?: string;
  type_id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  keywords: string[];
  metadata: Record<string, any>;
  menu_order: number;
  menu_visible: boolean;
  is_active: boolean;
}

interface TypeFormState {
  id?: string;
  slug: string;
  label: string;
  label_plural: string;
  menu_label: string;
  field_name: string;
  show_in_menu: boolean;
  show_on_homepage: boolean;
  menu_order: number;
  homepage_order: number;
  description: string;
  icon: string;
  is_active: boolean;
  has_image: boolean;
}

const DEFAULT_TYPE_FORM: TypeFormState = {
  slug: '',
  label: '',
  label_plural: '',
  menu_label: '',
  field_name: 'category',
  show_in_menu: true,
  show_on_homepage: true,
  menu_order: 0,
  homepage_order: 0,
  description: '',
  icon: 'Tag',
  is_active: true,
  has_image: false,
};

const DEFAULT_CATEGORY_FORM: CategoryFormState = {
  type_id: '',
  slug: '',
  name: '',
  description: '',
  image_url: '',
  keywords: [],
  metadata: {},
  menu_order: 0,
  menu_visible: true,
  is_active: true,
};

export function CategoriesAdmin() {
  const { types, categories, byType, refetch } = useCategories();
  const [activeTypeSlug, setActiveTypeSlug] = useState<string>(types[0]?.slug ?? 'peca');
  const [editingType, setEditingType] = useState<TypeFormState | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (types.length && !types.find((t) => t.slug === activeTypeSlug)) {
      setActiveTypeSlug(types[0].slug);
    }
  }, [types, activeTypeSlug]);

  const activeType = types.find((t) => t.slug === activeTypeSlug);
  const activeCategories = activeType ? byType(activeType.slug) : [];

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'A imagem deve ter no máximo 5MB.');
        return null;
      }
      const ext = file.name.split('.').pop() || 'png';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `categories/${activeType?.slug || 'misc'}/${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('category-images')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('category-images')
        .getPublicUrl(path);
      return pub.publicUrl;
    } catch (err: any) {
      showMessage('error', 'Erro no upload: ' + (err.message || 'desconhecido'));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveType = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setSaving(true);
    try {
      const payload = {
        ...editingType,
        slug: editingType.slug || createSlug(editingType.label),
        updated_at: new Date().toISOString(),
      };
      if (editingType.id) {
        const { error } = await supabase
          .from('category_types')
          .update(payload)
          .eq('id', editingType.id);
        if (error) throw error;
        showMessage('success', 'Tipo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('category_types')
          .insert([payload]);
        if (error) throw error;
        showMessage('success', 'Tipo criado com sucesso!');
      }
      setEditingType(null);
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao salvar tipo: ' + (err.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id: string, label: string) => {
    if (!window.confirm(`Excluir o tipo "${label}" e TODAS as suas categorias? Esta ação é irreversível.`)) return;
    try {
      const { error } = await supabase.from('category_types').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Tipo excluído com sucesso!');
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao excluir tipo: ' + (err.message || 'desconhecido'));
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSaving(true);
    try {
      const payload = {
        ...editingCategory,
        slug: editingCategory.slug || createSlug(editingCategory.name),
        updated_at: new Date().toISOString(),
      };
      if (editingCategory.id) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
        showMessage('success', 'Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([payload]);
        if (error) throw error;
        showMessage('success', 'Categoria criada com sucesso!');
      }
      setEditingCategory(null);
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao salvar categoria: ' + (err.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Excluir a categoria "${name}"?`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Categoria excluída!');
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao excluir: ' + (err.message || 'desconhecido'));
    }
  };

  const toggleCategoryVisible = async (cat: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ menu_visible: !cat.menu_visible, updated_at: new Date().toISOString() })
        .eq('id', cat.id);
      if (error) throw error;
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao atualizar visibilidade: ' + err.message);
    }
  };

  const toggleTypeShow = async (t: CategoryType, field: 'show_in_menu' | 'show_on_homepage') => {
    try {
      const { error } = await supabase
        .from('category_types')
        .update({ [field]: !t[field], updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
      await refetch();
    } catch (err: any) {
      showMessage('error', 'Erro ao atualizar: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline italic text-3xl">Categorias Dinâmicas</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Crie e edite os tipos e categorias exibidos no menu principal e nos filtros do site.
          </p>
        </div>
        <button
          onClick={() => setEditingType({ ...DEFAULT_TYPE_FORM, menu_order: types.length + 1 })}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-black/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Tipo
        </button>
      </div>

      {message && (
        <div
          className={`p-3 border text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? '✓' : '⚠'} {message.text}
        </div>
      )}

      {/* Tipos de categoria */}
      <section className="bg-white border border-outline-variant/20 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/10">
          <div className="p-2 bg-primary/5 rounded-full">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-headline italic text-xl">Tipos de Categoria</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Agrupa categorias por afinidade (ex: Tipo de Peça, Tamanho, Evento, Marca).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((t) => {
            const Icon = ICON_MAP[t.icon || 'Tag'] || Tag;
            const count = categories.filter((c) => c.type_id === t.id).length;
            return (
              <div
                key={t.id}
                className={`p-5 border transition-all ${
                  activeTypeSlug === t.slug
                    ? 'border-black bg-black/5'
                    : 'border-outline-variant/30 hover:border-black/50 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setActiveTypeSlug(t.slug)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary" />
                      <h5 className="font-headline italic text-lg">{t.label}</h5>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                      Slug: {t.slug} · {count} {count === 1 ? 'categoria' : 'categorias'}
                    </p>
                    {t.menu_label && (
                      <p className="text-[11px] text-on-surface mt-1">
                        Menu: <span className="font-medium">{t.menu_label}</span>
                      </p>
                    )}
                    {t.description && (
                      <p className="text-xs text-on-surface-variant mt-2 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                        t.show_in_menu
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {t.show_in_menu ? '✓ No menu' : '✗ Fora do menu'}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                        t.show_on_homepage
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {t.show_on_homepage ? '✓ Na home' : '✗ Fora da home'}
                      </span>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => toggleTypeShow(t, 'show_in_menu')}
                      className="p-1.5 hover:bg-surface-container transition-colors"
                      title="Alternar visibilidade no menu"
                    >
                      {t.show_in_menu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => setEditingType({ ...DEFAULT_TYPE_FORM, ...t })}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 transition-colors"
                      title="Editar tipo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteType(t.id, t.label)}
                      className="p-1.5 hover:bg-red-50 text-red-600 transition-colors"
                      title="Excluir tipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categorias do tipo ativo */}
      <section className="bg-white border border-outline-variant/20 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/5 rounded-full">
              {activeType && (() => {
                const Icon = ICON_MAP[activeType.icon || 'Tag'] || Tag;
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
            </div>
            <div>
              <h4 className="font-headline italic text-xl">
                Categorias de "{activeType?.label || '—'}"
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {activeCategories.length} {activeCategories.length === 1 ? 'item' : 'itens'} · slug do tipo: <code>{activeType?.slug}</code>
              </p>
            </div>
          </div>
          {activeType && (
            <button
              onClick={() =>
                setEditingCategory({
                  ...DEFAULT_CATEGORY_FORM,
                  type_id: activeType.id,
                  menu_order: activeCategories.length + 1,
                })
              }
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          )}
        </div>

        {activeCategories.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-outline-variant/40 rounded">
            <p className="text-sm text-on-surface-variant italic">
              Nenhuma categoria cadastrada para este tipo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCategories.map((c) => (
              <div
                key={c.id}
                className={`p-4 border transition-all ${
                  c.menu_visible ? 'bg-white border-outline-variant/30' : 'bg-gray-50 border-gray-200 opacity-70'
                } hover:border-black/50`}
              >
                <div className="flex items-start gap-3">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.name} className="w-12 h-12 object-cover rounded shrink-0 border border-outline-variant/20" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h6 className="font-medium text-sm truncate">{c.name}</h6>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-0.5">
                      {c.slug}
                    </p>
                    {c.description && (
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{c.description}</p>
                    )}
                    {c.keywords.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant mt-1 italic">
                        {c.keywords.length} palavra-chave{c.keywords.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => toggleCategoryVisible(c)}
                      className="p-1 hover:bg-surface-container transition-colors"
                      title={c.menu_visible ? 'Ocultar do menu' : 'Mostrar no menu'}
                    >
                      {c.menu_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => setEditingCategory({ ...DEFAULT_CATEGORY_FORM, ...c })}
                      className="p-1 hover:bg-blue-50 text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de edição de TIPO */}
      <AnimatePresence>
        {editingType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
                <h3 className="font-headline italic text-xl">
                  {editingType.id ? 'Editar Tipo' : 'Novo Tipo'}
                </h3>
                <button onClick={() => setEditingType(null)} className="p-2 hover:bg-surface-container rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveType} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Rótulo</label>
                    <input
                      required
                      type="text"
                      value={editingType.label}
                      onChange={(e) =>
                        setEditingType({
                          ...editingType,
                          label: e.target.value,
                          label_plural: editingType.label_plural || e.target.value + (e.target.value.endsWith('s') ? '' : 's'),
                          slug: editingType.slug || createSlug(e.target.value),
                          menu_label: editingType.menu_label || ('Aluguel por ' + e.target.value.replace(/^Tipo de /i, '').replace(/^Marcas?$/i, 'Nossas Marcas')),
                        })
                      }
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Slug</label>
                    <input
                      required
                      type="text"
                      value={editingType.slug}
                      onChange={(e) => setEditingType({ ...editingType, slug: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Rótulo Plural</label>
                    <input
                      type="text"
                      value={editingType.label_plural}
                      onChange={(e) => setEditingType({ ...editingType, label_plural: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Rótulo do Menu</label>
                    <input
                      type="text"
                      value={editingType.menu_label || ''}
                      onChange={(e) => setEditingType({ ...editingType, menu_label: e.target.value })}
                      placeholder="Ex: Aluguel por Peça"
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Campo do Produto</label>
                    <select
                      value={editingType.field_name}
                      onChange={(e) => setEditingType({ ...editingType, field_name: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="category">products.category</option>
                      <option value="size">products.size</option>
                      <option value="brand">products.brand</option>
                      <option value="metafields_event_occasion">products.metafields.event_occasion</option>
                      <option value="tags">products.tags</option>
                      <option value="color">products.color</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ícone</label>
                    <select
                      value={editingType.icon || 'Tag'}
                      onChange={(e) => setEditingType({ ...editingType, icon: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="Tag">Tag</option>
                      <option value="Ruler">Régua</option>
                      <option value="Sparkles">Brilhos</option>
                      <option value="Award">Prêmio</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ordem no Menu</label>
                    <input
                      type="number"
                      value={editingType.menu_order}
                      onChange={(e) => setEditingType({ ...editingType, menu_order: Number(e.target.value) })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ordem na Home</label>
                    <input
                      type="number"
                      value={editingType.homepage_order}
                      onChange={(e) => setEditingType({ ...editingType, homepage_order: Number(e.target.value) })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Descrição</label>
                  <textarea
                    rows={2}
                    value={editingType.description || ''}
                    onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                    className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingType.show_in_menu}
                      onChange={(e) => setEditingType({ ...editingType, show_in_menu: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Exibir no menu principal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingType.show_on_homepage}
                      onChange={(e) => setEditingType({ ...editingType, show_on_homepage: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Exibir na home</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingType.has_image}
                      onChange={(e) => setEditingType({ ...editingType, has_image: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">
                      Aceita imagem (logo / banner)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingType.is_active}
                      onChange={(e) => setEditingType({ ...editingType, is_active: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Ativo</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="px-5 py-2 text-sm font-medium hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2 text-sm font-medium hover:bg-black/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Salvar Tipo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de edição de CATEGORIA */}
      <AnimatePresence>
        {editingCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
                <h3 className="font-headline italic text-xl">
                  {editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button onClick={() => setEditingCategory(null)} className="p-2 hover:bg-surface-container rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome</label>
                    <input
                      required
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          name: e.target.value,
                          slug: editingCategory.slug || createSlug(e.target.value),
                        })
                      }
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Slug</label>
                    <input
                      required
                      type="text"
                      value={editingCategory.slug}
                      onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  {activeType?.has_image && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" />
                        Imagem {activeType.slug === 'marca' ? '(logo)' : '(banner / capa)'}
                      </label>
                      <div className="mt-1 flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editingCategory.image_url || ''}
                            onChange={(e) => setEditingCategory({ ...editingCategory, image_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = await handleImageUpload(file);
                                if (url) {
                                  setEditingCategory((prev) => prev ? { ...prev, image_url: url } : prev);
                                  showMessage('success', 'Imagem enviada!');
                                }
                                if (imageInputRef.current) imageInputRef.current.value = '';
                              }}
                            />
                            <button
                              type="button"
                              disabled={uploadingImage}
                              onClick={() => imageInputRef.current?.click()}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest bg-black text-white hover:bg-black/90 disabled:opacity-50 transition-colors"
                            >
                              {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              {uploadingImage ? 'Enviando...' : 'Upload de imagem'}
                            </button>
                          </div>
                          <p className="text-[10px] text-on-surface-variant italic">
                            Faça upload para o bucket <code>category-images</code> ou cole uma URL.
                          </p>
                        </div>
                        {editingCategory.image_url && (
                          <div className="shrink-0">
                            <img
                              src={editingCategory.image_url}
                              alt="preview"
                              className="w-24 h-24 object-contain bg-white rounded border border-outline-variant/30"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Palavras-chave (uma por linha)</label>
                    <textarea
                      rows={3}
                      value={editingCategory.keywords.join('\n')}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          keywords: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder={'Vestidos\nVestido'}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1 italic">
                      Usado para buscar produtos cujo campo (categoria, tamanho, marca...) contém estes valores.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Descrição</label>
                    <textarea
                      rows={2}
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ordem</label>
                    <input
                      type="number"
                      value={editingCategory.menu_order}
                      onChange={(e) => setEditingCategory({ ...editingCategory, menu_order: Number(e.target.value) })}
                      className="w-full mt-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Metadados extras (JSON)</p>
                  <textarea
                    rows={4}
                    value={JSON.stringify(editingCategory.metadata, null, 2)}
                    onChange={(e) => {
                      try {
                        setEditingCategory({ ...editingCategory, metadata: JSON.parse(e.target.value) });
                      } catch {
                        // ignore parse errors
                      }
                    }}
                    placeholder='{"tagline": "...", "image": "/banners/...", "emoji": "💍"}'
                    className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCategory.menu_visible}
                      onChange={(e) => setEditingCategory({ ...editingCategory, menu_visible: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Visível no menu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCategory.is_active}
                      onChange={(e) => setEditingCategory({ ...editingCategory, is_active: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Ativa</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-5 py-2 text-sm font-medium hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2 text-sm font-medium hover:bg-black/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Salvar'}
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

export { ICON_MAP };
