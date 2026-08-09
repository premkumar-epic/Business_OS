import { createClient } from '@supabase/supabase-js';

const url = 'https://lpvcakgzrntpxvsrkilw.supabase.co';
const key = 'sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl';

const supabase = createClient(url, key);

async function fixNames() {
  console.log("Fixing all variations of bachelor/batchelor in Supabase to BACHELORS...");

  // Update customer
  const { data: custData, error: custError } = await supabase
    .from('customers')
    .select('*');
    
  if (custError) {
    console.error("Error fetching customers:", custError);
    return;
  }
  
  for (const c of custData) {
    const name = c.name.toLowerCase();
    if (name.includes('bachelor') || name.includes('batchelor')) {
      console.log(`Updating customer: ${c.name} to BACHELORS`);
      await supabase.from('customers').update({ name: 'BACHELORS' }).eq('id', c.id);
    }
  }

  // Update invoices
  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('*');
    
  if (invError) {
    console.error("Error fetching invoices:", invError);
    return;
  }
  
  for (const inv of invData) {
    const invName = (inv.customer && inv.customer.name) ? inv.customer.name.toLowerCase() : '';
    const settingsName = (inv.settings && inv.settings.customerName) ? inv.settings.customerName.toLowerCase() : '';
    
    if (invName.includes('bachelor') || invName.includes('batchelor') || settingsName.includes('bachelor') || settingsName.includes('batchelor')) {
      console.log(`Updating invoice ${inv.invoiceNo} from ${inv.customer?.name} to BACHELORS`);
      
      const updatedInv = { ...inv };
      if (updatedInv.customer) updatedInv.customer.name = 'BACHELORS';
      if (updatedInv.settings && updatedInv.settings.customerName) updatedInv.settings.customerName = 'BACHELORS';
      
      await supabase.from('invoices').update({ 
        customer: updatedInv.customer,
        settings: updatedInv.settings
      }).eq('id', inv.id);
    }
  }
  
  console.log("Done updating database!");
}

fixNames();
