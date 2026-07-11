
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HANDLE = 'vestido-maxi-allegro-secret-garden-patbo';
const IMAGE_PATH = '/home/paulotarso/.gemini/antigravity/brain/344b858b-9127-4359-a0fb-7b263bdf50da/media__1776105828430.jpg';

async function main() {
  try {
    console.log(`Lendo imagem em: ${IMAGE_PATH}`);
    if (!fs.existsSync(IMAGE_PATH)) {
      throw new Error(`Arquivo não encontrado: ${IMAGE_PATH}`);
    }

    const fileBuffer = fs.readFileSync(IMAGE_PATH);
    const ext = IMAGE_PATH.split('.').pop();
    const fileName = `${HANDLE}-updated-${Date.now()}.${ext}`;

    console.log(`Subindo imagem para o bucket 'Produtos' como: ${fileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Produtos')
      .upload(fileName, fileBuffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('Produtos')
      .getPublicUrl(fileName);

    console.log(`Imagem subida com sucesso! URL: ${publicUrl}`);

    console.log(`Atualizando produto no banco de dados (handle: ${HANDLE})...`);
    
    // First, let's see if the product exists and what its current images are
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, image_url, extra_images')
      .eq('handle', HANDLE)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!products || products.length === 0) {
      throw new Error(`Produto com handle ${HANDLE} não encontrado.`);
    }

    const product = products[0];
    const oldImageUrl = product.image_url;
    const currentExtras = product.extra_images || [];

    // Following best practice: move old main image to extras if not already there
    const updatedExtras = currentExtras.includes(oldImageUrl) 
      ? currentExtras 
      : [oldImageUrl, ...currentExtras].slice(0, 4);

    const { error: updateError } = await supabase
      .from('products')
      .update({
        image_url: publicUrl,
        extra_images: updatedExtras
      })
      .eq('id', product.id);

    if (updateError) throw updateError;

    console.log('Produto atualizado com sucesso!');
    console.log(`Antiga imagem principal movida para Fotos Extras.`);
  } catch (error) {
    console.error('Erro durante o processo:', error);
    process.exit(1);
  }
}

main();
