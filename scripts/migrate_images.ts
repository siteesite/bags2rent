import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateImages() {
  console.log('Starting image migration from Shopify to Supabase...');

  // 1. Fetch products with Shopify images
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, handle, image_url')
    .ilike('image_url', '%shopify.com%');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No products with Shopify images found.');
    return;
  }

  console.log(`Found ${products.length} products to migrate.`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] Migrating: ${product.name}`);

    try {
      const shopifyUrl = product.image_url;
      if (!shopifyUrl) continue;

      // 2. Download from Shopify using native fetch
      const resp = await fetch(shopifyUrl);
      if (!resp.ok) {
        console.error(`  Failed to download: ${shopifyUrl}`);
        continue;
      }
      
      const buffer = await resp.arrayBuffer();
      const ext = shopifyUrl.split('.').pop()?.split('?')[0] || 'png';
      const fileName = `${product.handle}-${Date.now()}.${ext}`;

      // 3. Upload to Supabase Storage (Bucket: 'Produtos')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Produtos')
        .upload(fileName, buffer, { 
            contentType: `image/${ext.replace('jpg', 'jpeg')}`, 
            upsert: true 
        });

      if (uploadError) {
        console.error(`  Upload error: ${uploadError.message}`);
        continue;
      }

      // 4. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('Produtos')
        .getPublicUrl(fileName);
      
      const newUrl = publicUrlData.publicUrl;

      // 5. Update Database
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: newUrl })
        .eq('id', product.id);

      if (updateError) {
        console.error(`  DB Update error: ${updateError.message}`);
      } else {
        console.log(`  Success!`);
      }
    } catch (err: any) {
      console.error(`  Unexpected error:`, err.message);
    }
  }

  console.log('Migration complete!');
}

migrateImages();
