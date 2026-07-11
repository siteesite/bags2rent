/**
 * Script: import_images_from_excel.ts
 * 
 * Lê um arquivo Excel (.xlsx) com os dados dos produtos e imagens,
 * localiza cada produto no banco pelo nome, faz upload das imagens
 * para o Supabase Storage e atualiza o banco de dados.
 *
 * FORMATO ESPERADO DO EXCEL (.xlsx):
 * ---------------------------------------------------------
 * Coluna A (nome_produto)  : Nome do produto (para localizar no BD)
 * Coluna B (imagem_principal): Caminho local OU URL da imagem principal
 * Coluna C (imagem_extra_1) : (Opcional) Imagem extra 1
 * Coluna D (imagem_extra_2) : (Opcional) Imagem extra 2
 * Coluna E (imagem_extra_3) : (Opcional) Imagem extra 3
 * Coluna F (imagem_extra_4) : (Opcional) Imagem extra 4
 * ---------------------------------------------------------
 *
 * COMO USAR:
 *   npx ts-node scripts/import_images_from_excel.ts <caminho-do-excel.xlsx>
 *
 * EXEMPLOS:
 *   npx ts-node scripts/import_images_from_excel.ts ./imagens_produtos.xlsx
 *   npx ts-node scripts/import_images_from_excel.ts /home/usuario/planilha.xlsx
 *
 * MODOS:
 *   Por padrão, o script roda em modo DRY-RUN (apenas simula sem alterar nada).
 *   Para executar de verdade, adicione --execute ao final:
 *   npx ts-node scripts/import_images_from_excel.ts ./planilha.xlsx --execute
 */

import { createClient } from '@supabase/supabase-js';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Configuração ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STORAGE_BUCKET = 'Produtos';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface ExcelRow {
  nome_produto: string;
  imagem_principal: string;
  imagem_extra_1?: string;
  imagem_extra_2?: string;
  imagem_extra_3?: string;
  imagem_extra_4?: string;
}

interface ImportResult {
  produto: string;
  status: 'sucesso' | 'nao_encontrado' | 'erro' | 'dryrun';
  mensagem: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normaliza uma string para comparação (remove acentos, caixa, espaços extras)
 */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Faz upload de uma imagem (arquivo local ou URL remota) para o Supabase Storage.
 * Retorna a URL pública ou null em caso de erro.
 */
async function uploadImage(
  imageSrc: string,
  productHandle: string,
  suffix: string
): Promise<string | null> {
  try {
    let buffer: Buffer;
    let ext: string;

    const isUrl = imageSrc.startsWith('http://') || imageSrc.startsWith('https://');

    if (isUrl) {
      // Download da URL remota
      const resp = await fetch(imageSrc);
      if (!resp.ok) {
        console.error(`    ⚠️  Falha ao baixar: ${imageSrc} (${resp.status})`);
        return null;
      }
      const arrayBuffer = await resp.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      ext = imageSrc.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    } else {
      // Arquivo local
      const absPath = path.resolve(imageSrc);
      if (!fs.existsSync(absPath)) {
        console.error(`    ⚠️  Arquivo não encontrado: ${absPath}`);
        return null;
      }
      buffer = fs.readFileSync(absPath);
      ext = absPath.split('.').pop()?.toLowerCase() || 'jpg';
    }

    // Normalizar extensão
    if (ext === 'jpg') ext = 'jpeg';
    // Nome fixo (sem timestamp) para que upsert:true substitua o arquivo
    // existente no Storage em vez de criar duplicatas a cada execução.
    const fileName = `${productHandle}-${suffix}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const contentType = `image/${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error(`    ❌ Erro no upload: ${uploadError.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.error(`    ❌ Erro inesperado no upload: ${err.message}`);
    return null;
  }
}

// ─── Função Principal ────────────────────────────────────────────────────────

async function importImagesFromExcel(excelPath: string, dryRun: boolean) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     IMPORTAÇÃO DE IMAGENS A PARTIR DO EXCEL          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 MODO DRY-RUN (simulação - nada será alterado no banco)\n');
    console.log('   Para executar de verdade, rode com: --execute\n');
  } else {
    console.log('🚀 MODO EXECUÇÃO - alterações serão feitas no banco de dados!\n');
  }

  // 1. Ler o Excel
  const absExcelPath = path.resolve(excelPath);
  if (!fs.existsSync(absExcelPath)) {
    console.error(`❌ Arquivo Excel não encontrado: ${absExcelPath}`);
    process.exit(1);
  }

  console.log(`📂 Lendo arquivo: ${absExcelPath}`);
  const fileBuffer = fs.readFileSync(absExcelPath);
  const workbook = xlsxRead(fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converter para JSON usando a primeira linha como cabeçalho
  const rawRows = xlsxUtils.sheet_to_json<any>(sheet, { defval: '' });

  if (rawRows.length === 0) {
    console.error('❌ O arquivo Excel está vazio ou sem dados reconhecíveis.');
    process.exit(1);
  }

  // Mapear colunas (aceita nomes com ou sem acento, case insensitive)
  const rows: ExcelRow[] = rawRows.map((row: any) => {
    const keys = Object.keys(row);
    const get = (patterns: string[]) => {
      const key = keys.find(k =>
        patterns.some(p => normalizeStr(k).includes(normalizeStr(p)))
      );
      return key ? String(row[key] || '').trim() : '';
    };

    return {
      nome_produto:     get(['nome', 'name', 'produto', 'product']),
      imagem_principal: get(['principal', 'main', 'imagem_principal', 'image_main', 'foto_principal', 'imagem 1', 'image 1', 'imagem1', 'image1']),
      imagem_extra_1:   get(['extra_1', 'extra1', 'imagem_extra_1', 'imagem 2', 'image 2', 'imagem2', 'image2']),
      imagem_extra_2:   get(['extra_2', 'extra2', 'imagem_extra_2', 'imagem 3', 'image 3', 'imagem3', 'image3']),
      imagem_extra_3:   get(['extra_3', 'extra3', 'imagem_extra_3', 'imagem 4', 'image 4', 'imagem4', 'image4']),
      imagem_extra_4:   get(['extra_4', 'extra4', 'imagem_extra_4', 'imagem 5', 'image 5', 'imagem5', 'image5']),
    };
  }).filter(r => r.nome_produto); // Ignorar linhas sem nome

  console.log(`✅ ${rows.length} linha(s) encontrada(s) no Excel\n`);
  console.log('━'.repeat(60));

  // 2. Carregar todos os produtos do banco para busca local (mais eficiente)
  console.log('\n📡 Carregando produtos do banco de dados...');
  const { data: allProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, name, handle, image_url, extra_images');

  if (fetchError) {
    console.error('❌ Erro ao buscar produtos:', fetchError.message);
    process.exit(1);
  }

  console.log(`✅ ${allProducts?.length || 0} produto(s) carregado(s) do banco\n`);
  console.log('━'.repeat(60));

  // 3. Processar cada linha do Excel
  const results: ImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`\n[${i + 1}/${rows.length}] 🔎 Buscando: "${row.nome_produto}"`);

    // Busca pelo nome (fuzzy: normaliza e verifica se contém)
    const normalizedSearch = normalizeStr(row.nome_produto);
    const matchedProducts = (allProducts || []).filter(p =>
      normalizeStr(p.name || '').includes(normalizedSearch) ||
      normalizedSearch.includes(normalizeStr(p.name || ''))
    );

    if (matchedProducts.length === 0) {
      console.log(`  ⚠️  Produto NÃO encontrado no banco: "${row.nome_produto}"`);
      results.push({ produto: row.nome_produto, status: 'nao_encontrado', mensagem: 'Produto não encontrado pelo nome' });
      continue;
    }

    if (matchedProducts.length > 1) {
      console.log(`  ℹ️  ${matchedProducts.length} produto(s) encontrado(s), usando o primeiro: "${matchedProducts[0].name}"`);
    } else {
      console.log(`  ✅ Produto encontrado: "${matchedProducts[0].name}" (id: ${matchedProducts[0].id})`);
    }

    const product = matchedProducts[0];

    // Coletar imagens da linha
    const imageFields = [
      { src: row.imagem_principal, label: 'principal' },
      { src: row.imagem_extra_1, label: 'extra1' },
      { src: row.imagem_extra_2, label: 'extra2' },
      { src: row.imagem_extra_3, label: 'extra3' },
      { src: row.imagem_extra_4, label: 'extra4' },
    ].filter(f => f.src);

    if (imageFields.length === 0) {
      console.log(`  ⚠️  Nenhuma imagem especificada para este produto.`);
      results.push({ produto: row.nome_produto, status: 'erro', mensagem: 'Nenhuma imagem especificada' });
      continue;
    }

    console.log(`  📸 ${imageFields.length} imagem(ns) para processar`);

    if (dryRun) {
      imageFields.forEach(f => {
        const isUrl = f.src.startsWith('http');
        console.log(`    [DRY-RUN] ${f.label}: ${isUrl ? '🌐 URL' : '📁 arquivo local'} → ${f.src}`);
      });
      results.push({ produto: row.nome_produto, status: 'dryrun', mensagem: `${imageFields.length} imagem(ns) seriam importadas` });
      continue;
    }

    // Modo execução: fazer upload
    try {
      const uploadedUrls: string[] = [];

      for (const field of imageFields) {
        console.log(`    ⬆️  Enviando ${field.label}: ${field.src.substring(0, 60)}...`);
        const url = await uploadImage(field.src, product.handle || `prod-${product.id}`, field.label);
        if (url) {
          uploadedUrls.push(url);
          console.log(`    ✅ Upload OK → ${url.substring(0, 70)}...`);
        }
      }

      if (uploadedUrls.length === 0) {
        results.push({ produto: row.nome_produto, status: 'erro', mensagem: 'Nenhum upload bem-sucedido' });
        continue;
      }

      // Atualizar banco: primeira URL = imagem principal, restante = extras
      const [newMainImage, ...newExtras] = uploadedUrls;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_url: newMainImage,
          extra_images: newExtras.length > 0 ? newExtras : product.extra_images
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`  ❌ Erro ao atualizar BD: ${updateError.message}`);
        results.push({ produto: row.nome_produto, status: 'erro', mensagem: updateError.message });
      } else {
        console.log(`  🎉 Produto atualizado com sucesso! (${uploadedUrls.length} imagem[ns])`);
        results.push({ produto: row.nome_produto, status: 'sucesso', mensagem: `${uploadedUrls.length} imagem(ns) importada(s)` });
      }
    } catch (err: any) {
      console.error(`  ❌ Erro inesperado: ${err.message}`);
      results.push({ produto: row.nome_produto, status: 'erro', mensagem: err.message });
    }
  }

  // 4. Resumo final
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMO FINAL');
  console.log('═'.repeat(60));

  const success = results.filter(r => r.status === 'sucesso').length;
  const notFound = results.filter(r => r.status === 'nao_encontrado').length;
  const errors = results.filter(r => r.status === 'erro').length;
  const dryRuns = results.filter(r => r.status === 'dryrun').length;

  if (!dryRun) {
    console.log(`  ✅ Sucesso:           ${success}`);
    console.log(`  ⚠️  Não encontrado:   ${notFound}`);
    console.log(`  ❌ Erro:              ${errors}`);
  } else {
    console.log(`  🔍 Seriam importados: ${dryRuns}`);
    console.log(`  ⚠️  Não encontrados:  ${notFound}`);
    console.log(`\n  Para executar de verdade: npx ts-node scripts/import_images_from_excel.ts ${excelPath} --execute`);
  }

  console.log('\n' + '═'.repeat(60));

  if (notFound > 0) {
    console.log('\n📝 Produtos NÃO encontrados:');
    results.filter(r => r.status === 'nao_encontrado').forEach(r => {
      console.log(`  • "${r.produto}"`);
    });
  }

  console.log('');
}

// ─── Entry Point ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     IMPORTAÇÃO DE IMAGENS A PARTIR DO EXCEL          ║
╚══════════════════════════════════════════════════════╝

FORMATO DO EXCEL (.xlsx):
  Linha 1: Cabeçalho (veja abaixo)
  Linhas seguintes: Dados

  Colunas esperadas (nomes flexíveis):
  ┌──────────────────┬─────────────────────────────────────────┐
  │ nome_produto     │ Nome do produto (para localizar no BD)  │
  │ imagem_principal │ Caminho local ou URL da imagem principal│
  │ imagem_extra_1   │ (opcional) Imagem extra 1               │
  │ imagem_extra_2   │ (opcional) Imagem extra 2               │
  │ imagem_extra_3   │ (opcional) Imagem extra 3               │
  │ imagem_extra_4   │ (opcional) Imagem extra 4               │
  └──────────────────┴─────────────────────────────────────────┘

COMO USAR:
  # Simular (sem alterar nada):
  npx ts-node scripts/import_images_from_excel.ts ./minha_planilha.xlsx

  # Executar de verdade:
  npx ts-node scripts/import_images_from_excel.ts ./minha_planilha.xlsx --execute

IMAGENS ACEITAS:
  • Arquivo local: /home/usuario/imagens/vestido.jpg
  • Arquivo relativo: ./imagens/vestido.png
  • URL remota: https://exemplo.com/foto.jpg
`);
  process.exit(0);
}

const excelFilePath = args[0];
const isDryRun = !args.includes('--execute');

importImagesFromExcel(excelFilePath, isDryRun);
