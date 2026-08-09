import { createClient } from '@supabase/supabase-js';

const url = 'https://lpvcakgzrntpxvsrkilw.supabase.co';
const key = 'sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('invoices').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
check();
