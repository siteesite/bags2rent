import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useCategories } from '../context/CategoriesContext';

// Sizes to exclude (rental periods, not clothing sizes)
const EXCLUDED_SIZES = ['3 dias', '1 dia', 'Default Title', 'tamanho-unico', ''];

interface SizeGroup {
  slug: string;
  label: string;
  keyword: string;
  description: string;
  dbSizes: string[];
  bust: string;
  numericRange: string;
  image: string;
  tagline: string;
}

export function SizeCategory() {
  const { byType } = useCategories();
  const sizeCats = byType('tamanho').filter((c) => c.is_active && c.slug !== 'tamanho-unico');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const groups: SizeGroup[] = sizeCats.map((c) => ({
    slug: c.slug,
    label: c.name,
    keyword: c.name,
    description: c.metadata?.description || c.name,
    dbSizes: c.keywords,
    bust: c.metadata?.bust || '',
    numericRange: c.metadata?.numericRange || '',
    image: c.metadata?.image || c.image_url || '/banners/hero_1.png',
    tagline: c.metadata?.tagline || '',
  }));

  useEffect(() => {
    async function fetchCounts() {
      const results: Record<string, number> = {};
      await Promise.all(
        groups.map(async (group) => {
          const orFilter = [
            ...group.dbSizes.map((s) => `size.eq.${s}`),
            `size.ilike.${group.keyword};%`,
            `size.ilike.%;${group.keyword}`,
            `size.ilike.%;${group.keyword};%`,
          ].join(',');
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .or(orFilter)
            .eq('status', 'active');
          results[group.slug] = count ?? 0;
        })
      );
      setCounts(results);
    }
    if (groups.length) fetchCounts();
  }, [JSON.stringify(groups.map((g) => g.slug))]);

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
            Alugue por Tamanho
          </p>
          <h1 className="font-headline italic text-5xl md:text-7xl text-black leading-none">
            Encontre o seu tamanho
          </h1>
          <div className="h-px w-20 bg-black mt-4" />
        </motion.div>
      </div>

      {groups.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 pb-24 text-center">
          <p className="text-gray-500 italic">Nenhum tamanho cadastrado ainda.</p>
        </div>
      ) : (
        <>
          {/* Size panels */}
          <div className={`grid grid-cols-1 ${groups.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-' + groups.length} min-h-[80vh]`}>
            {groups.map((size, index) => (
              <motion.div
                key={size.slug}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/tamanho/${size.slug}`}
                  className="relative flex flex-col h-full min-h-[60vh] md:min-h-full overflow-hidden group cursor-pointer"
                >
                  {/* Background image */}
                  <div className="absolute inset-0">
                    <img
                      src={size.image}
                      alt={size.description}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-500" />
                  </div>

                  {/* Content overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full p-8 md:p-10 text-white min-h-[60vh] md:min-h-0">
                    {/* Top: numeric size range */}
                    <div className="flex items-center justify-between">
                      {size.numericRange && (
                        <p className="font-label text-[9px] uppercase tracking-[0.4em] opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                          {size.numericRange}
                        </p>
                      )}
                      {counts[size.slug] !== undefined && (
                        <p className="font-label text-[9px] uppercase tracking-[0.3em] opacity-40">
                          {counts[size.slug]} peças
                        </p>
                      )}
                    </div>

                    {/* Center: big letter */}
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <span
                        className="font-headline italic leading-none text-white select-none transition-all duration-500 group-hover:scale-110"
                        style={{ fontSize: 'clamp(7rem, 18vw, 14rem)' }}
                      >
                        {size.label}
                      </span>
                      {size.description && (
                        <p className="font-label text-[10px] uppercase tracking-[0.5em] mt-4 opacity-70">
                          {size.description}
                        </p>
                      )}
                      {/* Sub-sizes shown as pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                        {size.dbSizes.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="text-[7px] uppercase tracking-widest border border-white/30 px-2 py-0.5 text-white/50"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom: tagline + CTA */}
                    {size.tagline && (
                      <div className="space-y-4">
                        <p className="font-light text-sm italic opacity-0 group-hover:opacity-80 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 max-w-xs">
                          {size.tagline}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-label uppercase tracking-[0.4em] border-b border-white/60 pb-1 group-hover:border-white transition-colors duration-300">
                            Explorar
                          </span>
                          <svg
                            className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Side border divider */}
                  {index < groups.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-8 bottom-8 w-px bg-white/20" />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Size guide strip */}
          <div className="border-t border-black/10 bg-black text-white py-12">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="font-label text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">Guia de Tamanhos</p>
                  <p className="font-headline italic text-2xl">Não sabe seu tamanho?</p>
                </div>
                <div className="flex gap-8 text-sm font-light">
                  {groups.map((item) => (
                    <div key={item.slug} className="text-center space-y-1">
                      <p className="font-headline italic text-2xl">{item.label}</p>
                      {item.numericRange && (
                        <p className="text-[9px] uppercase tracking-widest opacity-50">{item.numericRange}</p>
                      )}
                      {item.bust && (
                        <p className="text-[9px] opacity-40">{item.bust}</p>
                      )}
                    </div>
                  ))}
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
        </>
      )}
    </div>
  );
}

export { EXCLUDED_SIZES };
