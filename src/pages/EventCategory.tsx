import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useSiteSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabase';

// The metafield keys for occasion in the DB
export const OCCASION_METAFIELD_KEY = 'event_occasion';

// Event groups: slug → DB keyword (used with ILIKE '%keyword%')
export const EVENT_GROUPS = [
  {
    slug: 'casamento',
    label: 'Casamento',
    keyword: 'casamento',
    tagline: 'O grande dia merece o look perfeito.',
    description: 'Looks elegantes para cerimônias, festas de casamento e eventos nupciais.',
    image: '/banners/hero_2.png',
    emoji: '💍',
  },
  {
    slug: 'festa',
    label: 'Festa',
    keyword: 'festa',
    tagline: 'Brilhe em qualquer celebração.',
    description: 'Vestidos e conjuntos para festas, aniversários e comemorações especiais.',
    image: '/banners/hero_1.png',
    emoji: '🥂',
  },
  {
    slug: 'formatura',
    label: 'Formatura',
    keyword: 'formatura',
    tagline: 'Marque seu momento com estilo.',
    description: 'Peças formais e elegantes para formaturas e eventos acadêmicos.',
    image: '/banners/hero_3.png',
    emoji: '🎓',
  },
  {
    slug: 'gala',
    label: 'Gala',
    keyword: 'gala',
    tagline: 'A sofisticação como linguagem.',
    description: 'Looks de alta costura para eventos de gala e noites de gala.',
    image: '/banners/noivas.png',
    emoji: '✨',
  },
  {
    slug: 'coquitel',
    label: 'Coquitel',
    keyword: 'coquitel',
    tagline: 'Elegância descontraída para cada encontro.',
    description: 'Peças versáteis para coquitéis, jantares e eventos semi-formais.',
    image: '/banners/alugue_agora.png',
    emoji: '🍾',
  },
  {
    slug: 'premium',
    label: 'Premium',
    keyword: 'premium',
    tagline: 'Edições limitadas das grifes mais cobiçadas.',
    description: 'Bolsas premium para momentos inesquecíveis.',
    image: '/banners/news_for_rent.png',
    emoji: '✨',
    extraFilter: 'premium',
  },
];

export function EventCategory() {
  const { settings } = useSiteSettings();
  const [counts, setCounts] = useState<Record<string, number>>({});

  const filteredEvents = EVENT_GROUPS.filter(ev => 
    !(settings?.menu_hidden_items || []).includes(ev.label)
  );

  useEffect(() => {
    async function fetchCounts() {
      const results: Record<string, number> = {};
      await Promise.all(
        EVENT_GROUPS.map(async (ev) => {
          // Data was harmonized to always use OCCASION_METAFIELD_KEY ('event_occasion')
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .ilike(`metafields->>${OCCASION_METAFIELD_KEY}`, `%${ev.keyword}%`)
            .eq('status', 'active');
          results[ev.slug] = count ?? 0;
        })
      );
      setCounts(results);
    }
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-3"
        >
          <p className="font-label uppercase text-[9px] tracking-[0.5em] text-black/40">
            Aluguel por Evento
          </p>
          <h1 className="font-headline italic text-5xl md:text-7xl text-black leading-none">
            Para cada ocasião,<br />um look perfeito
          </h1>
          <div className="h-px w-20 bg-black mt-4" />
        </motion.div>
      </div>

      {/* Event grid — first 2 big, rest smaller */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {/* Top 2 featured */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {filteredEvents.slice(0, 2).map((ev, index) => (
            <motion.div
              key={ev.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
            >
              <Link
                to={`/evento/${ev.slug}`}
                className="relative flex h-[55vh] overflow-hidden group"
              >
                <div className="absolute inset-0">
                  <img
                    src={ev.image}
                    alt={ev.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors duration-500" />
                </div>
                <div className="relative z-10 flex flex-col justify-between w-full p-8 text-white">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{ev.emoji}</span>
                    {counts[ev.slug] !== undefined && (
                      <span className="font-label text-[9px] uppercase tracking-widest text-white/40">
                        {counts[ev.slug]} peças
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h2 className="font-headline italic text-5xl md:text-6xl leading-none">{ev.label}</h2>
                    <p className="font-light text-sm text-white/70 opacity-0 group-hover:opacity-100 transition-all duration-400 max-w-xs">
                      {ev.tagline}
                    </p>
                    <div className="inline-flex items-center gap-2 border-b border-white/50 pb-1">
                      <span className="font-label text-[9px] uppercase tracking-[0.4em]">Explorar</span>
                      <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom 4 smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredEvents.slice(2).map((ev, index) => (
            <motion.div
              key={ev.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 + index * 0.08 }}
            >
              <Link
                to={`/evento/${ev.slug}`}
                className="relative flex h-[40vh] overflow-hidden group"
              >
                <div className="absolute inset-0">
                  <img
                    src={ev.image}
                    alt={ev.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-500" />
                </div>
                <div className="relative z-10 flex flex-col justify-between w-full p-5 text-white">
                  <span className="text-xl">{ev.emoji}</span>
                  <div className="space-y-2">
                    <h3 className="font-headline italic text-3xl leading-none">{ev.label}</h3>
                    {counts[ev.slug] !== undefined && (
                      <p className="font-label text-[8px] uppercase tracking-widest text-white/40">
                        {counts[ev.slug]} peças
                      </p>
                    )}
                    <div className="inline-flex items-center gap-1 border-b border-white/40 pb-0.5">
                      <span className="font-label text-[8px] uppercase tracking-widest">Ver</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="font-label text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">Acervo Completo</p>
            <p className="font-headline italic text-2xl">Não encontrou seu evento?</p>
          </div>
          <Link
            to="/categoria"
            className="inline-block px-8 py-3 border border-white text-white text-[9px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all duration-300 self-start md:self-auto"
          >
            Ver Toda Coleção
          </Link>
        </div>
      </div>
    </div>
  );
}
