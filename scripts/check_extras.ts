import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data } = await supabase
    .from('products')
    .select('name, image_url, extra_images')
    .limit(300);

  let comExtras = 0, semExtras = 0, shopifyExtras = 0, supabaseExtras = 0;

  for (const p of data || []) {
    const extras = p.extra_images;
    if (!extras || extras.length === 0) { semExtras++; continue; }
    comExtras++;
    const urls: string[] = extras;
    if (urls.some((u: string) => u.includes('shopify'))) shopifyExtras++;
    if (urls.some((u: string) => u.includes('supabase'))) supabaseExtras++;
  }

  const totalPrincipalShopify = (data || []).filter((p: any) => p.image_url?.includes('shopify')).length;
  const totalPrincipalSupabase = (data || []).filter((p: any) => p.image_url?.includes('supabase')).length;

  console.log(`\n📊 ESTADO DAS IMAGENS NO BANCO:`);
  console.log(`\n  🖼️  Imagem Principal:`);
  console.log(`    No Supabase Storage: ${totalPrincipalSupabase}`);
  console.log(`    Ainda no Shopify:    ${totalPrincipalShopify}`);
  console.log(`\n  📸 Imagens Extras (extra_images):`);
  console.log(`    Produtos com extras:        ${comExtras}`);
  console.log(`    Produtos sem extras:        ${semExtras}`);
  console.log(`    Com extras no Shopify:      ${shopifyExtras}`);
  console.log(`    Com extras no Supabase:     ${supabaseExtras}`);

  console.log('\n📋 Exemplos de produtos com extras:');
  const exemplos = (data || []).filter((p: any) => p.extra_images?.length > 0).slice(0, 3);
  for (const p of exemplos) {
    console.log(`\n  → ${p.name}`);
    console.log(`    Principal: ${(p.image_url || '').substring(0, 90)}`);
    (p.extra_images || []).forEach((url: string, i: number) => {
      console.log(`    Extra ${i+1}: ${url.substring(0, 90)}`);
    });
  }
}

main();
