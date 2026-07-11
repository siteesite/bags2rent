import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('products').select('category, status');
  if (error) console.error(error);
  if (data) {
    const counts = {};
    data.forEach(item => {
      const key = `${item.category} (${item.status})`;
      counts[key] = (counts[key] || 0) + 1;
    });
    console.log("Distinct Categories:");
    console.log(counts);
  }
}
check();
