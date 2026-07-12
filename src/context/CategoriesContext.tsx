import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface CategoryType {
  id: string;
  slug: string;
  label: string;
  label_plural: string;
  menu_label: string | null;
  field_name: string;
  show_in_menu: boolean;
  show_on_homepage: boolean;
  menu_order: number;
  homepage_order: number;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  has_image: boolean;
}

export interface Category {
  id: string;
  type_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  keywords: string[];
  metadata: Record<string, any>;
  menu_order: number;
  menu_visible: boolean;
  is_active: boolean;
}

interface CategoriesContextType {
  types: CategoryType[];
  categories: Category[];
  loading: boolean;
  byType: (typeSlug: string) => Category[];
  byTypeField: (fieldName: string) => Category[];
  getTypeBySlug: (slug: string) => CategoryType | undefined;
  getCategoryBySlug: (typeSlug: string, slug: string) => Category | undefined;
  refetch: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType>({
  types: [],
  categories: [],
  loading: true,
  byType: () => [],
  byTypeField: () => [],
  getTypeBySlug: () => undefined,
  getCategoryBySlug: () => undefined,
  refetch: async () => {},
});

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<CategoryType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: typesData, error: typesError }, { data: catsData, error: catsError }] = await Promise.all([
        supabase
          .from('category_types')
          .select('*')
          .order('menu_order', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .order('menu_order', { ascending: true }),
      ]);
      if (typesError) throw typesError;
      if (catsError) throw catsError;
      setTypes((typesData || []) as CategoryType[]);
      setCategories((catsData || []) as Category[]);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_types' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const byType = useCallback(
    (typeSlug: string) => {
      const t = types.find((x) => x.slug === typeSlug);
      if (!t) return [];
      return categories.filter((c) => c.type_id === t.id);
    },
    [types, categories]
  );

  const byTypeField = useCallback(
    (fieldName: string) => {
      const t = types.find((x) => x.field_name === fieldName);
      if (!t) return [];
      return categories.filter((c) => c.type_id === t.id);
    },
    [types, categories]
  );

  const getTypeBySlug = useCallback(
    (slug: string) => types.find((t) => t.slug === slug),
    [types]
  );

  const getCategoryBySlug = useCallback(
    (typeSlug: string, slug: string) => {
      const t = types.find((x) => x.slug === typeSlug);
      if (!t) return undefined;
      return categories.find((c) => c.type_id === t.id && c.slug === slug);
    },
    [types, categories]
  );

  return (
    <CategoriesContext.Provider
      value={{
        types,
        categories,
        loading,
        byType,
        byTypeField,
        getTypeBySlug,
        getCategoryBySlug,
        refetch: fetchAll,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);
