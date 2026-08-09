import { createClient } from '@supabase/supabase-js';

const url = 'https://lpvcakgzrntpxvsrkilw.supabase.co';
const key = 'sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl';

const supabase = createClient(url, key);

async function check() {
  const { data } = await supabase.from('invoices').select('invoiceNo, customer');
  console.log(JSON.stringify(data, null, 2));
}
check();
