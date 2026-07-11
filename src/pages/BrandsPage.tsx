import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrandData {
  brand: string;
  qty: number;
}

// Map brand name → logo file (for brands that have one)
const BRAND_LOGOS: Record<string, string> = {
  'PatBo':            '/brands/patbo.png',
  'patbo':            '/brands/patbo.png',
  'Agilità':          '/brands/agilita.png',
  'Agilitá':          '/brands/agilita.png',
  'Animale':          '/brands/animale.png',
  'Cris Barros':      '/brands/cris_barros.png',
  'Cult Gaia':        '/brands/cult_gaia.png',
  'Fabiana Milazzo':  '/brands/fabiana_milazzo.png',
  'Ganni':            '/brands/ganni.png',
  'ganni':            '/brands/ganni.png',
  'Le Lis Blanc':     '/brands/le_lis_blanc.png',
  'Ralph Lauren':     '/brands/ralph_lauren.png',
  'Zimmermann':       '/brands/zimmermann.png',
  'Saint Laurent':    '/brands/saint_laurent.png',
  'Chanel':           '/brands/chanel.png',
  'Prada':            '/brands/prada.png',
  'Gucci':            '/brands/gucci.png',
  'Dior':             '/brands/dior.png',
  'Valentino':        '/brands/valentino.png',
};

// Brands to exclude (internal / test)
const EXCLUDED_BRANDS = ['Clothing 2 rent', 'Bags2rent'];

// Clean brand name for URL param
function brandSlug(name: string) {
  return encodeURIComponent(name);
}

export function BrandsPage() {
  const [brands, setBrands]   = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .eq('status', 'active')
        .not('brand', 'is', null)
        .neq('brand', '');

      if (!error && data) {
        // Count per brand
        const countMap: Record<string, number> = {};
        data.forEach((row: { brand: string }) => {
          if (EXCLUDED_BRANDS.includes(row.brand)) return;
          countMap[row.brand] = (countMap[row.brand] ?? 0) + 1;
        });
        const sorted = Object.entries(countMap)
          .map(([brand, qty]) => ({ brand, qty }))
          .sort((a, b) => b.qty - a.qty || a.brand.localeCompare(b.brand));
        setBrands(sorted);
      }
      setLoading(false);
    }
    fetchBrands();
  }, []);

  const filtered = filter
    ? brands.filter((b) => b.brand.toLowerCase().includes(filter.toLowerCase()))
    : brands;

  // Brands WITH logos (featured)
  const featured = filtered.filter((b) => BRAND_LOGOS[b.brand]);
  // Brands WITHOUT logos
  const others   = filtered.filter((b) => !BRAND_LOGOS[b.brand]);

  return (
    <div className="min-h-screen bg-white">

      {/* Hero header */}
      <div className="bg-black text-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-label text-[9px] uppercase tracking-[0.5em] text-white/30 mb-4">
              Parceiras do Acervo
            </p>
            <h1 className="font-headline italic text-6xl md:text-8xl leading-none mb-6">
              Nossas Marcas
            </h1>
            <p className="font-light text-white/50 max-w-md text-sm leading-relaxed">
              Uma curadoria das marcas mais desejadas do mundo da moda.
              Alugue peças exclusivas e assine seu estilo.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filter / search bar */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Buscar marca..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border-b border-gray-300 focus:border-black outline-none text-[11px] py-1.5 pr-6 tracking-wide bg-transparent placeholder-gray-400 transition-colors"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-widest text-gray-400">
            {filtered.length} {filtered.length === 1 ? 'marca' : 'marcas'}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="flex justify-center items-center py-32 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="ml-3 text-sm font-light">Carregando marcas...</span>
          </div>
        ) : (
          <>
            {/* Featured brands — with logos */}
            {featured.length > 0 && (
              <section className="mb-20">
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="font-headline italic text-3xl">Marcas em Destaque</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {featured.map((b, i) => (
                    <motion.div
                      key={b.brand}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                    >
                      <Link
                        to={`/categoria?brand=${brandSlug(b.brand)}`}
                        onMouseEnter={() => setHoveredBrand(b.brand)}
                        onMouseLeave={() => setHoveredBrand(null)}
                        className="relative flex flex-col items-center justify-center bg-gray-50 hover:bg-black transition-all duration-500 group p-8 gap-3 aspect-square"
                      >
                        <img
                          src={BRAND_LOGOS[b.brand]}
                          alt={b.brand}
                          className="h-10 md:h-14 w-auto object-contain mix-blend-multiply group-hover:mix-blend-screen group-hover:invert transition-all duration-500"
                        />
                        <span className={`text-[8px] uppercase tracking-widest transition-colors duration-300 ${
                          hoveredBrand === b.brand ? 'text-white opacity-60' : 'text-gray-400'
                        }`}>
                          {b.qty} {b.qty === 1 ? 'peça' : 'peças'}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All other brands — alphabetical list */}
            {others.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="font-headline italic text-3xl">Todo o Acervo</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* A–Z grouped */}
                {(() => {
                  const allBrandsAlpha = [...featured, ...others].sort((a, b) =>
                    a.brand.localeCompare(b.brand)
                  );
                  const grouped: Record<string, BrandData[]> = {};
                  allBrandsAlpha.forEach((b) => {
                    const letter = b.brand[0].toUpperCase();
                    if (!grouped[letter]) grouped[letter] = [];
                    grouped[letter].push(b);
                  });

                  return Object.entries(grouped).sort().map(([letter, items]) => (
                    <div key={letter} className="mb-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="font-headline italic text-4xl text-gray-200">{letter}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {items.map((b) => (
                          <Link
                            key={b.brand}
                            to={`/categoria?brand=${brandSlug(b.brand)}`}
                            className="group flex items-center justify-between px-4 py-3 border border-gray-100 hover:border-black hover:bg-black transition-all duration-300"
                          >
                            {BRAND_LOGOS[b.brand] ? (
                              <img
                                src={BRAND_LOGOS[b.brand]}
                                alt={b.brand}
                                className="h-5 w-auto object-contain mix-blend-multiply group-hover:invert group-hover:mix-blend-screen transition-all duration-300"
                              />
                            ) : (
                              <span className="text-[10px] font-medium text-black group-hover:text-white transition-colors duration-300 leading-tight">
                                {b.brand}
                              </span>
                            )}
                            <span className="text-[8px] uppercase tracking-widest text-gray-300 group-hover:text-white/40 transition-colors duration-300 ml-2 shrink-0">
                              {b.qty}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </section>
            )}

            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400">
                <p className="font-headline italic text-4xl">Nenhuma marca encontrada</p>
                <button
                  onClick={() => setFilter('')}
                  className="text-[9px] uppercase tracking-widest underline text-black"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="font-label text-[9px] uppercase tracking-[0.4em] opacity-30 mb-2">Aluguel Premium</p>
            <p className="font-headline italic text-2xl md:text-3xl">
              As melhores marcas,<br />acessíveis a você.
            </p>
          </div>
          <Link
            to="/categoria"
            className="inline-block px-10 py-4 border border-white text-white text-[9px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all duration-500 self-start md:self-auto"
          >
            Explorar Acervo
          </Link>
        </div>
      </div>
    </div>
  );
}
