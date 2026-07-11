import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface HeroItem {
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

export interface SiteSettings {
  whatsapp_number: string;
  whatsapp_new_tab: boolean;
  whatsapp_message: string;
  banner_news_html: string;
  banner_news_position: 'center' | 'bottom';
  banner_noivas_html: string;
  banner_noivas_position: 'center' | 'bottom';
  banner_alugue_html: string;
  banner_alugue_position: 'center' | 'bottom';
  topbar_text: string;
  topbar_bg_color: string;
  topbar_text_color: string;
  banner_news_desktop: string;
  banner_news_tablet: string;
  banner_news_mobile: string;
  banner_noivas_desktop: string;
  banner_noivas_tablet: string;
  banner_noivas_mobile: string;
  banner_alugue_desktop: string;
  banner_alugue_tablet: string;
  banner_alugue_mobile: string;
  banner_news_title: string;
  banner_news_text_color: string;
  banner_noivas_title: string;
  banner_noivas_text_color: string;
  banner_alugue_title1: string;
  banner_alugue_title2: string;
  banner_alugue_text_color: string;
  showcase_1_title: string;
  showcase_1_products: any[];
  showcase_2_title: string;
  showcase_2_products: any[];
  showcase_3_title: string;
  showcase_3_products: any[];
  showcase_4_title: string;
  showcase_4_products: any[];
  showcase_5_title: string;
  showcase_5_products: any[];
  hero_products: HeroItem[];
  menu_peca_visible: boolean;
  menu_tamanho_visible: boolean;
  menu_eventos_visible: boolean;
  menu_marcas_visible: boolean;
  menu_hidden_items: string[];
  rental_min_days: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: '5511999999999',
  whatsapp_new_tab: true,
  whatsapp_message: '',
  banner_news_html: '',
  banner_news_position: 'center',
  banner_noivas_html: '',
  banner_noivas_position: 'center',
  banner_alugue_html: '',
  banner_alugue_position: 'bottom',
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
  hero_products: [],
  menu_peca_visible: true,
  menu_tamanho_visible: true,
  menu_eventos_visible: true,
  menu_marcas_visible: true,
  menu_hidden_items: [],
  rental_min_days: 4,
};

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refetch: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      if (data) {
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          ...data,
          whatsapp_number: data.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
          menu_hidden_items: Array.isArray(data.menu_hidden_items) ? data.menu_hidden_items : []
        });
      }
    } catch (e) {
      // fallback to defaults silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SettingsContext);
