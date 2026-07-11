import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface SearchResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  handle: string;
  category: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Foca o input quando abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounce da busca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const term = query.trim();
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, price, image_url, handle, category')
        .eq('status', 'active')
        .or(`name.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%`)
        .limit(8);

      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Fecha com Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white w-full shadow-2xl animate-search-drop">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-5">
          {/* Input row */}
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por vestido, marca, categoria…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-base bg-transparent border-none outline-none placeholder-gray-400 text-black"
            />
            {loading ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
            ) : (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mt-4" />

          {/* Results */}
          {results.length > 0 && (
            <ul className="mt-3 space-y-1 max-h-[60vh] overflow-y-auto pb-2">
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/produto/${product.handle}`}
                    state={{ product: { ...product, image: product.image_url } }}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-12 aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate leading-tight">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {product.brand} · {product.category}
                      </p>
                      <p className="text-xs font-medium text-black mt-1">
                        R$ {product.price},00
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Empty state */}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum produto encontrado para "<span className="text-black font-medium">{query}</span>"
            </p>
          )}

          {/* Hint */}
          {query.trim().length < 2 && (
            <p className="text-xs text-gray-400 text-center py-4">
              Digite ao menos 2 caracteres para buscar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
