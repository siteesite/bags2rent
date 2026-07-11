import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminDb, adminStorage } from '../lib/adminClient';
import { Plus, Upload, Loader2, Eye, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Sparkles, Brain } from 'lucide-react';
import { useSiteSettings } from '../context/SettingsContext';
import { clearCloudflareCache } from '../lib/cloudflare';
import Papa from 'papaparse';

const PECAS = ['Vestidos', 'Calças', 'Bolsas', 'Blusas/ Top Croppeds', 'Conjuntos', 'Kimonos', 'Saias', 'Parkas', 'Colar'];
const TAMANHOS = [
  { label: 'P — 34 a 38', value: 'P' },
  { label: 'M — 38 a 40', value: 'M' },
  { label: 'G — 40 a 44', value: 'G' },
  { label: 'Tamanho Único', value: 'tamanho-unico' },
];
const EVENTOS = ['Casamento', 'Coquitel', 'Festa', 'Formatura', 'Gala'];
const MARCAS = ['Acler', 'Agilitá', 'Animale', 'AVE RARA', 'AYA', 'Candy Brown', 'Catarina Mina', 'Cloude', 'Corporeum', 'Cris Barros', 'Cult Gaia', 'Débora Mangabeira', 'ER', 'Fabiana Milazzo', 'Fátima Scofield', 'Fasô', 'Ganni', 'Hisha', 'Jenny Hoo', 'Laura Cangussu', 'Le Lis Blanc', 'Mac Duggal', 'Mageste', 'Mariana Penteado', 'Marina Bitu', 'Mayara Junges', 'NX', 'Oásis', 'PatBo', 'Ralph Lauren', 'Solace London', 'Unity Seven', 'Wanessa Fittireis', 'Zara', 'Zazi White', 'Zimmermann'];
const COLOR_MAP: { name: string; hex: string }[] = [
  { name: 'Amarelo',      hex: '#F5C542' },
  { name: 'Azul',        hex: '#2563EB' },
  { name: 'Bege',        hex: '#D4B896' },
  { name: 'Branco',      hex: '#FFFFFF' },
  { name: 'Cinza',       hex: '#9CA3AF' },
  { name: 'Dourado',     hex: '#C9A84C' },
  { name: 'Laranja',     hex: '#F97316' },
  { name: 'Marrom',      hex: '#92400E' },
  { name: 'Multicolorido', hex: 'linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)' },
  { name: 'Off-white',   hex: '#F5F0E8' },
  { name: 'Prata',       hex: '#B0B7BC' },
  { name: 'Preto',       hex: '#111111' },
  { name: 'Rosa',        hex: '#F472B6' },
  { name: 'Roxo',        hex: '#7C3AED' },
  { name: 'Verde',       hex: '#16A34A' },
  { name: 'Vermelho',    hex: '#DC2626' },
  { name: 'Gold',        hex: '#D4AF37' },
  { name: 'Silver',      hex: '#C0C0C0' },
  { name: 'Floral',      hex: 'conic-gradient(at center, #ff9a9e, #fecfef, #feada6, #ff9a9e)' },
  { name: 'Animal Print', hex: 'radial-gradient(circle at center, #d2b48c 0%, #8b4513 40%, #000 70%)' },
  { name: 'Faixa',       hex: 'repeating-linear-gradient(90deg, #111, #111 5px, #fff 5px, #fff 10px)' },
  { name: 'Grisalho',    hex: '#B8B8B8' },
  { name: 'Geometrico',  hex: 'linear-gradient(135deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111)' },
];

export function ProductsAdmin() {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [importedProducts, setImportedProducts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [savingTotal, setSavingTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [extraImageFiles, setExtraImageFiles] = useState<(File | null)[]>(Array(4).fill(null));

  const initialProductState = {
    name: '', price: '', originalPrice: '', category: '', 
    size: [] as string[], event: [] as string[], brand: '', color: [] as string[], status: 'active', 
    description: '', image_url: '', seo_title: '', seo_description: '',
    shelf: '', hanger: '',
    extra_images: [] as string[],
    currentMetafields: {} as any
  };
  const [manualProduct, setManualProduct] = useState(initialProductState);
  
  const [showCSV, setShowCSV] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const { settings } = useSiteSettings();

  const generateSeoWithDeepseek = async () => {
    if (!settings?.deepseek_api_key) {
      alert('Por favor, configure a chave da API do Deepseek nas configurações primeiro.');
      return;
    }

    if (!manualProduct.name) {
      alert('Preencha o nome do produto primeiro.');
      return;
    }

    setIsGeneratingSEO(true);
    try {
      const prompt = `Como um especialista em SEO para moda de luxo, gere um SEO Title e uma SEO Meta Description para o seguinte produto:
Nome: ${manualProduct.name}
Marca: ${manualProduct.brand}
Categoria: ${manualProduct.category}
Cor: ${Array.isArray(manualProduct.color) ? manualProduct.color.join(', ') : manualProduct.color}
Tamanho: ${Array.isArray(manualProduct.size) ? manualProduct.size.join(', ') : manualProduct.size}

Critérios:
- SEO Title: Máximo 60 caracteres, inclua a marca e o nome do produto.
- Meta Description: Máximo 160 caracteres, seja persuasivo com foco em aluguel.
- Retorne APENAS um JSON no formato: {"title": "...", "description": "..."}`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.deepseek_api_key}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Você é um assistente especializado em SEO para e-commerce de moda.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      if (result.title && result.description) {
        setManualProduct({
          ...manualProduct,
          seo_title: result.title,
          seo_description: result.description
        });
      }
    } catch (err: any) {
      console.error('Erro Deepseek:', err);
      alert('Erro ao gerar SEO: ' + err.message);
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await adminDb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar produtos:', error);
    } else {
      setProducts(data || []);
    }
    setLoadingProducts(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este produto?')) return;
    
    try {
      console.log('Tentando excluir produto com ID:', id);
      const { error } = await adminDb.from('products').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete error:', error);
        alert('Erro ao excluir: ' + error.message);
      } else {
        console.log('Produto excluído com sucesso');
        setProducts(products.filter(p => p.id !== id));
        // Clear Cloudflare cache
        clearCloudflareCache();
      }
    } catch (err: any) {
      console.error('Exception no handleDelete:', err);
      alert('Erro inesperado ao excluir: ' + err.message);
    }
  };

  const openNewModal = () => {
    setManualProduct(initialProductState);
    setImageFile(null);
    setIsEditing(false);
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setManualProduct({
      name: prod.name || '',
      price: prod.price?.toString() || '',
      originalPrice: prod.compare_at_price?.toString() || '',
      category: prod.category || '',
      size: prod.size
        ? String(prod.size).split(';').map((s: string) => s.trim()).filter(Boolean)
        : [],
      event: prod.metafields?.event_occasion
        ? String(prod.metafields.event_occasion).split(';').map((s: string) => s.trim()).filter(Boolean)
        : [],
      brand: prod.brand || '',
      color: prod.color
        ? String(prod.color).split(';').map((c: string) => c.trim()).filter(Boolean)
        : [],
      status: prod.status || 'active',
      description: prod.description_html || '',
      image_url: prod.image_url || '',
      seo_title: prod.seo_title || '',
      seo_description: prod.seo_description || '',
      shelf: prod.metafields?.Prateleira || '',
      hanger: prod.metafields?.Cabide || '',
      extra_images: prod.extra_images || [],
      currentMetafields: prod.metafields || {}
    });
    setImageFile(null);
    setExtraImageFiles(Array(4).fill(null));
    setIsEditing(true);
    setCurrentId(prod.id);
    setIsModalOpen(true);
  };

  const uploadImageFromUrl = async (url: string, handle: string) => {
    if (!url || !url.startsWith('http')) return url;
    if (url.includes('supabase.co')) return url;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha fetch');
      const blob = await response.blob();
      const ext = url.split('.').pop()?.split('?')[0] || 'png';
      const fileName = `${handle}-${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await adminStorage.from('Produtos').upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = adminStorage.from('Produtos').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (e) {
      console.error('Erro upload imagem:', e);
      return url;
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
        const mainProducts = data.filter(row => row['Title'] && row['Title'].trim() !== '');
        
        const mappedProducts = mainProducts.map(row => {
          const metafields: any = {};
          Object.keys(row).forEach(key => {
            if (key.includes('product.metafields.shopify')) {
              metafields[key] = row[key];
            }
          });

          return {
            handle: row['Handle'] || row['Title'].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            name: row['Title'],
            description_html: row['Body (HTML)'],
            brand: row['Vendor'],
            category: row['Type'] || row['Product Category'],
            tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()) : [],
            status: row['Status']?.toLowerCase() === 'active' ? 'active' : 'draft',
            sku: row['Variant SKU'] || null,
            price: parseFloat(row['Variant Price']) || 0,
            compare_at_price: parseFloat(row['Variant Compare At Price']) || null,
            cost_per_item: parseFloat(row['Cost per item']) || null,
            stock_qty: parseInt(row['Variant Inventory Qty'], 10) || 1,
            barcode: row['Variant Barcode'] || null,
            image_url: row['Image Src'] || row['Variant Image'] || null,
            seo_title: row['SEO Title'] || null,
            seo_description: row['SEO Description'] || null,
            size: row['Tamanho (product.metafields.shopify.size)'] || row['Option1 Value'] || null,
            color: row['Cor (product.metafields.shopify.color-pattern)'] || row['Option2 Value'] || null,
            metafields
          };
        });

        setImportedProducts(mappedProducts);
        alert(`Sucesso! ${mappedProducts.length} produtos foram lidos do CSV.`);
        
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

  const handleManualProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const baseHandle = manualProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      // Garante unicidade do handle adicionando sufixo de tempo no INSERT
      const handle = isEditing ? baseHandle : `${baseHandle}-${Date.now().toString(36)}`;
      let finalImageUrl = manualProduct.image_url;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'png';
        const fileName = `${handle}-${Date.now()}.${ext}`;
        const { error: uploadError } = await adminStorage.from('Produtos').upload(fileName, imageFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = adminStorage.from('Produtos').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      // Handle Extra Images
      const finalExtraImages = [...manualProduct.extra_images];
      for (let i = 0; i < extraImageFiles.length; i++) {
        const file = extraImageFiles[i];
        if (file) {
          const ext = file.name.split('.').pop() || 'png';
          const fileName = `${handle}-extra-${i}-${Date.now()}.${ext}`;
          const { error: uploadError } = await adminStorage.from('Produtos').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = adminStorage.from('Produtos').getPublicUrl(fileName);
          
          // Replace or append URL
          if (i < finalExtraImages.length) {
            finalExtraImages[i] = publicUrlData.publicUrl;
          } else {
            finalExtraImages.push(publicUrlData.publicUrl);
          }
        }
      }

      const productPayload = {
        name: manualProduct.name,
        handle: handle,
        price: parseFloat(manualProduct.price) || 0,
        compare_at_price: parseFloat(manualProduct.originalPrice) || null,
        category: manualProduct.category,
        brand: manualProduct.brand,
        size: Array.isArray(manualProduct.size)
          ? manualProduct.size.join(';')
          : manualProduct.size,
        color: Array.isArray(manualProduct.color)
          ? manualProduct.color.join(';')
          : manualProduct.color,
        status: manualProduct.status,
        description_html: manualProduct.description,
        image_url: finalImageUrl,
        extra_images: finalExtraImages.filter(url => !!url),
        seo_title: manualProduct.seo_title,
        seo_description: manualProduct.seo_description,
        metafields: {
          ...manualProduct.currentMetafields,
          event_occasion: Array.isArray(manualProduct.event)
            ? manualProduct.event.join(';')
            : manualProduct.event,
          Prateleira: manualProduct.shelf,
          Cabide: manualProduct.hanger,
          'Cor principal': manualProduct.color
        }
      };

      if (isEditing && currentId) {
        const { error } = await adminDb.from('products').update(productPayload).eq('id', currentId);
        if (error) throw error;
        alert('Produto atualizado com sucesso!');
      } else {
        const { error } = await adminDb.from('products').insert([productPayload]);
        if (error) throw error;
        alert('Produto cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      fetchProducts();
      // Clear Cloudflare cache
      clearCloudflareCache();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('products_handle_key') || msg.includes('duplicate key')) {
        alert('Erro: Já existe um produto com nome muito similar. Tente um nome ligeiramente diferente.');
      } else {
        alert('Erro ao salvar produto: ' + msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return p.name?.toLowerCase().includes(term) || 
           p.brand?.toLowerCase().includes(term) ||
           p.category?.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline italic text-3xl">Lista de Produtos</h3>
        <div className="flex gap-4">
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
            {showCSV ? 'Ocultar CSV' : 'Importar CSV'}
          </button>
          <button 
            onClick={openNewModal}
            className="flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container px-4 py-2 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {showCSV && importedProducts.length > 0 && (
        <div className="mb-8 bg-surface-container-lowest border border-blue-500/30 p-6 rounded relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-headline italic text-xl">Pré-visualização da Importação ({importedProducts.length} produtos)</h4>
            <button 
              onClick={() => {
                setImportedProducts([]);
                setShowCSV(false);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Cancelar/Fechar Importação
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container border-b border-outline-variant/20">
                <tr>
                  <th className="px-4 py-3 font-medium">Imagem</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Preço Aluguel</th>
                  <th className="px-4 py-3 font-medium">Tamanho</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {importedProducts.slice(0, 5).map((prod, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/20">
                    <td className="px-4 py-3">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-surface-container flex items-center justify-center text-xs text-on-surface-variant">Sem img</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{prod.name}</td>
                    <td className="px-4 py-3">{prod.brand}</td>
                    <td className="px-4 py-3">R$ {prod.price}</td>
                    <td className="px-4 py-3">{prod.size}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${prod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {prod.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importedProducts.length > 5 && (
              <p className="text-center text-sm text-on-surface-variant mt-4">
                Mostrando 5 de {importedProducts.length} produtos importados.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={async () => {
                if (importedProducts.length === 0) return;
                setIsSaving(true);
                setSavingTotal(importedProducts.length);
                setSavingProgress(0);
                try {
                  const updatedProducts = [];
                  for (let i = 0; i < importedProducts.length; i++) {
                    setSavingProgress(i + 1);
                    const prod = { ...importedProducts[i] };
                    if (prod.image_url) {
                       prod.image_url = await uploadImageFromUrl(prod.image_url, prod.handle);
                    }
                    updatedProducts.push(prod);
                  }

                  const { error } = await adminDb
                    .from('products')
                    .upsert(updatedProducts);
                  
                  if (error) throw error;
                  
                  alert('Produtos importados e salvos com sucesso no banco de dados!');
                  setImportedProducts([]);
                  setShowCSV(false);
                  fetchProducts();
                } catch (error: any) {
                  console.error('Erro:', error);
                  alert('Erro ao salvar no banco: ' + (error.message || 'Desconhecido'));
                } finally {
                  setIsSaving(false);
                  setSavingProgress(0);
                  setSavingTotal(0);
                }
              }}
              disabled={isSaving}
              className="bg-primary text-on-primary px-6 py-2 text-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-75 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? `Salvando Imagem ${savingProgress} de ${savingTotal}...` : 'Confirmar Importação de Produtos'}
            </button>
          </div>
        </div>
      )}

      {/* Main Product Table */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-on-surface">Todos os Produtos</h4>
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar por nome, categoria ou marca..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-outline-variant bg-surface-container-lowest pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-sm"
          />
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/20 overflow-x-auto mb-4">
        {loadingProducts ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="animate-spin w-8 h-8 text-on-surface-variant" />
            <span className="ml-2 text-on-surface-variant">Carregando produtos do banco...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum produto encontrado.</p>
            <p className="text-sm">Tente ajustar sua busca ou adicione novos itens.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container border-b border-outline-variant/20">
              <tr>
                <th className="px-6 py-4 font-medium">Imagem</th>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Categoria / Marca</th>
                <th className="px-6 py-4 font-medium">Preço</th>
                <th className="px-6 py-4 font-medium">Estoque</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((prod) => (
                <tr key={prod.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                  <td className="px-6 py-4">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-12 h-12 object-cover object-top rounded-md shadow-sm border border-outline-variant/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-surface-variant flex items-center justify-center text-[10px] text-on-surface-variant text-center leading-tight">Sem Imagem</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium max-w-[200px] truncate">{prod.name}</td>
                  <td className="px-6 py-4">
                    <span className="block">{prod.category || '-'}</span>
                    <span className="text-xs text-on-surface-variant block">{prod.brand || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-emerald-700 font-medium">R$ {prod.price}</td>
                  <td className="px-6 py-4">{prod.stock_qty || 1}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${prod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {prod.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-on-surface-variant">
                      <Link 
                        to={`/produto/${prod.handle}`} 
                        target="_blank" 
                        title="Visualizar" 
                        className="p-2 hover:bg-surface-container rounded transition-colors text-on-surface-variant"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button title="Editar" onClick={() => openEditModal(prod)} className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button title="Excluir" onClick={() => handleDelete(prod.id)} className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="flex justify-between items-center mb-8 bg-surface-container-lowest p-4 border border-outline-variant/20">
          <span className="text-sm text-on-surface-variant">
            Mostrando <span className="font-medium text-on-surface">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium text-on-surface">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> de <span className="font-medium text-on-surface">{filteredProducts.length}</span> produtos
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="font-headline italic text-2xl">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleManualProductSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Nome do Produto (Title)</label>
                  <input 
                    type="text" 
                    required
                    value={manualProduct.name}
                    onChange={(e) => setManualProduct({...manualProduct, name: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: Vestido Longo Seda"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Preço do Aluguel Base (R$)</label>
                  <input 
                    type="number" 
                    required
                    value={manualProduct.price}
                    onChange={(e) => setManualProduct({...manualProduct, price: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: 450"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Valor Original da Peça (R$)</label>
                  <input 
                    type="number" 
                    value={manualProduct.originalPrice}
                    onChange={(e) => setManualProduct({...manualProduct, originalPrice: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: 2500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Tipo de Peça (Category)</label>
                  <select 
                    value={manualProduct.category}
                    onChange={(e) => setManualProduct({...manualProduct, category: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {PECAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-on-surface">Tamanho (Size) — pode escolher vários</label>
                  <div className="flex flex-wrap gap-2 p-4 border border-outline-variant bg-surface-container-lowest">
                    {TAMANHOS.map(t => {
                      const selected = Array.isArray(manualProduct.size)
                        ? manualProduct.size.includes(t.value)
                        : false;
                      return (
                        <label key={t.value} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded border transition-colors ${
                          selected
                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                            : 'border-outline-variant/40 hover:bg-surface-container'
                        }`}>
                          <input
                            type="checkbox"
                            className="accent-primary w-4 h-4 shrink-0"
                            checked={selected}
                            onChange={() => {
                              const current = Array.isArray(manualProduct.size) ? manualProduct.size : [];
                              const updated = selected
                                ? current.filter(s => s !== t.value)
                                : [...current, t.value];
                              setManualProduct({ ...manualProduct, size: updated });
                            }}
                          />
                          <span className="text-sm font-medium">{t.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {Array.isArray(manualProduct.size) && manualProduct.size.length > 0 && (
                    <p className="text-xs text-on-surface-variant">
                      Selecionados: <span className="font-medium text-primary">{manualProduct.size.join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-on-surface">Evento Ideal (Occasion) — pode escolher vários</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-outline-variant bg-surface-container-lowest">
                    {EVENTOS.map(ev => {
                      const selected = Array.isArray(manualProduct.event)
                        ? manualProduct.event.includes(ev)
                        : false;
                      return (
                        <label key={ev} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded border transition-colors ${
                          selected
                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                            : 'border-outline-variant/40 hover:bg-surface-container'
                        }`}>
                          <input
                            type="checkbox"
                            className="accent-primary w-4 h-4 shrink-0"
                            checked={selected}
                            onChange={() => {
                              const current = Array.isArray(manualProduct.event) ? manualProduct.event : [];
                              const updated = selected
                                ? current.filter(e => e !== ev)
                                : [...current, ev];
                              setManualProduct({ ...manualProduct, event: updated });
                            }}
                          />
                          <span className="text-sm leading-tight">{ev}</span>
                        </label>
                      );
                    })}
                  </div>
                  {Array.isArray(manualProduct.event) && manualProduct.event.length > 0 && (
                    <p className="text-xs text-on-surface-variant">
                      Selecionados: <span className="font-medium text-primary">{manualProduct.event.join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Marca (Vendor)</label>
                  <select 
                    value={manualProduct.brand}
                    onChange={(e) => setManualProduct({...manualProduct, brand: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-on-surface">Cor Principal — pode escolher várias</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-4 border border-outline-variant bg-surface-container-lowest">
                    {COLOR_MAP.map(c => {
                      const selected = Array.isArray(manualProduct.color)
                        ? manualProduct.color.includes(c.name)
                        : false;
                      const isGradient = c.hex.startsWith('linear');
                      return (
                        <label key={c.name} className="flex flex-col items-center gap-1.5 cursor-pointer group" title={c.name}>
                          <div
                            className={`w-9 h-9 rounded-full border-4 transition-all duration-200 ${
                              selected
                                ? 'border-primary scale-110 shadow-md'
                                : 'border-transparent group-hover:border-outline-variant'
                            } ${c.name === 'Branco' || c.name === 'Off-white' ? 'ring-1 ring-outline-variant/40' : ''}`}
                            style={isGradient
                              ? { background: c.hex }
                              : { backgroundColor: c.hex }
                            }
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={selected}
                              onChange={() => {
                                const current = Array.isArray(manualProduct.color) ? manualProduct.color : [];
                                const updated = selected
                                  ? current.filter(x => x !== c.name)
                                  : [...current, c.name];
                                setManualProduct({ ...manualProduct, color: updated });
                              }}
                            />
                          </div>
                          <span className={`text-[9px] text-center leading-tight transition-colors ${selected ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                            {c.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {Array.isArray(manualProduct.color) && manualProduct.color.length > 0 && (
                    <p className="text-xs text-on-surface-variant">
                      Selecionadas: <span className="font-medium text-primary">{manualProduct.color.join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Status (Visibilidade)</label>
                  <select 
                    value={manualProduct.status}
                    onChange={(e) => setManualProduct({...manualProduct, status: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="active">Ativo na Loja</option>
                    <option value="draft">Oculto (Rascunho)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Local (Prateleira)</label>
                  <input 
                    type="text" 
                    value={manualProduct.shelf}
                    onChange={(e) => setManualProduct({...manualProduct, shelf: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: P4-01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">Local (Cabide)</label>
                  <input 
                    type="text" 
                    value={manualProduct.hanger}
                    onChange={(e) => setManualProduct({...manualProduct, hanger: e.target.value})}
                    className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="Ex: 03"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Descrição Detalhada</label>
                <textarea 
                  rows={4}
                  value={manualProduct.description}
                  onChange={(e) => setManualProduct({...manualProduct, description: e.target.value})}
                  className="w-full border border-outline-variant bg-transparent px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Informações adicionais do produto (pode conter tags HTML)..."
                ></textarea>
              </div>

              {/* SEO Block (AI parsing) */}
              <div className="p-4 bg-purple-50 border border-purple-100 rounded space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">Campos de SEO Avançado <span className="bg-purple-200 text-purple-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Integração AI</span></h4>
                  <button
                    type="button"
                    onClick={generateSeoWithDeepseek}
                    disabled={isGeneratingSEO}
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white text-[10px] uppercase font-bold tracking-wider hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingSEO ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    Gerar com Deepseek
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-purple-800">SEO Title (Tag Title)</label>
                    <input 
                      type="text" 
                      value={manualProduct.seo_title}
                      onChange={(e) => setManualProduct({...manualProduct, seo_title: e.target.value})}
                      className="w-full border border-purple-200 bg-white px-3 py-1.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                      placeholder="Título otimizado para os motores de busca..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-purple-800">SEO Meta Description</label>
                    <textarea 
                      rows={2}
                      value={manualProduct.seo_description}
                      onChange={(e) => setManualProduct({...manualProduct, seo_description: e.target.value})}
                      className="w-full border border-purple-200 bg-white px-3 py-1.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                      placeholder="Resumo otimizado que será exibido no Google quando o cliente buscar pelo produto..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border border-outline-variant/40 p-4 border-dashed bg-surface-container-lowest">
                <label className="text-sm font-medium text-on-surface flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4" /> 
                  {isEditing && manualProduct.image_url ? 'Trocar Imagem do Produto' : 'Fazer Upload de Imagem'}
                </label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
                />
                
                {(imageFile || manualProduct.image_url) && (
                  <div className="mt-4 flex flex-col items-center bg-surface-container rounded-lg p-4 transition-all hover:bg-surface-container-high border border-outline-variant/30">
                    <p className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest self-start">Visualização da Imagem</p>
                    <div className="relative group">
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : manualProduct.image_url} 
                        alt="Pré-visualização" 
                        className="max-h-64 rounded shadow-2xl border-4 border-white object-contain transition-transform group-hover:scale-[1.02]"
                      />
                      {!imageFile && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                           <span className="bg-white/90 text-[10px] font-bold px-2 py-1 rounded shadow text-on-surface">IMAGEM ATUAL</span>
                        </div>
                      )}
                    </div>
                    {!imageFile && (
                      <p className="text-[10px] text-on-surface-variant mt-3 break-all font-mono opacity-60">
                        {manualProduct.image_url}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Extra Images Gallery */}
              <div className="space-y-4 border border-outline-variant/20 p-6 bg-surface-container-low/30">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                    Galeria de Fotos Extras <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Até 4 Fotos</span>
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((index) => {
                    const currentUrl = manualProduct.extra_images[index];
                    const currentFile = extraImageFiles[index];
                    const previewUrl = currentFile ? URL.createObjectURL(currentFile) : currentUrl;

                    return (
                      <div key={index} className="relative group aspect-[3/4] bg-surface-container-lowest border border-outline-variant/40 rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 hover:border-primary/50 transition-colors">
                        {previewUrl ? (
                          <>
                            <img 
                              src={previewUrl} 
                              alt={`Extra ${index + 1}`} 
                              className="w-full h-full object-cover rounded shadow-sm"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const newExtra = [...manualProduct.extra_images];
                                newExtra[index] = '';
                                const newFiles = [...extraImageFiles];
                                newFiles[index] = null;
                                setManualProduct({...manualProduct, extra_images: newExtra});
                                setExtraImageFiles(newFiles);
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {currentFile && (
                              <div className="absolute bottom-1 left-1 bg-emerald-500 text-[8px] text-white px-1.5 py-0.5 rounded font-bold">NOVO</div>
                            )}
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full text-on-surface-variant hover:text-primary transition-colors">
                            <Plus className="w-6 h-6 opacity-40" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Foto {index + 1}</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                const newFiles = [...extraImageFiles];
                                newFiles[index] = file;
                                setExtraImageFiles(newFiles);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 flex gap-4 justify-end border-t border-outline-variant/20 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary text-on-primary px-8 py-2 text-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-75 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
