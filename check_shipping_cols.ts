import { createClient } from '@supabase/supabase-base-js';

const supabaseUrl = 'https://uggofsioqvqcnpwmnznp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZ29mc2lvcXZxY25wd21uem5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzY1ODAsImV4cCI6MjA5MDY1MjU4MH0.dvHU-fSQ-zA3nQA_OZ10UY9D_G-4p24ryW_H4SIuCPk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('settings')
    .select('shipping_north, shipping_northeast, shipping_central_west, shipping_southeast, shipping_south')
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .single();

  if (error) {
    if (error.message.includes('column')) {
      console.log('COLUMNS_MISSING');
    } else {
      console.log('ERROR:', error.message);
    }
  } else if (data) {
    console.log('COLUMNS_EXIST');
  }
}

check();
