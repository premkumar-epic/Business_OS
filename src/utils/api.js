import { getSupabaseClient } from './supabaseClient';

const API_BASE = '/api';

// Helper to determine if we should use Supabase
const useSupabase = () => {
  const client = getSupabaseClient();
  return client !== null;
};

export const api = {
  // Company Profile
  async getCompany() {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('company')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || { id: 'default' };
    }
    
    const res = await fetch(`${API_BASE}/company`);
    if (!res.ok) throw new Error("Failed to fetch company profile");
    return res.json();
  },

  async updateCompany(company) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const companyId = company.id || 'default';
      const companyData = { ...company, id: companyId };
      const { data, error } = await supabase
        .from('company')
        .upsert(companyData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company)
    });
    if (!res.ok) throw new Error("Failed to update company profile");
    return res.json();
  },

  // Customers (CRM)
  async getCustomers() {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
  },

  async addCustomer(customer) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const id = customer.id || 'cust-' + Date.now();
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customer, id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error("Failed to add customer");
    return res.json();
  },

  async updateCustomer(id, customer) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/customers?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error("Failed to update customer");
    return res.json();
  },

  async deleteCustomer(id) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    const res = await fetch(`${API_BASE}/customers?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete customer");
    return res.json();
  },

  // Products Catalog
  async getProducts() {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },

  async addProduct(product) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const id = product.id || 'prod-' + Date.now();
      const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error("Failed to add product");
    return res.json();
  },

  async updateProduct(id, product) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/products?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error("Failed to update product");
    return res.json();
  },

  async deleteProduct(id) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    const res = await fetch(`${API_BASE}/products?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete product");
    return res.json();
  },

  // Invoices (Full nesting)
  async getInvoices() {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data.map(inv => {
        const ext = (inv.customer && inv.customer.extendedData) ? inv.customer.extendedData : {};
        const { settings, ...rest } = inv;
        return { ...rest, ...ext, ...(settings || {}) };
      });
    }

    const res = await fetch(`${API_BASE}/invoices`);
    if (!res.ok) throw new Error("Failed to fetch invoices");
    const data = await res.json();
    return data.map(inv => {
      const ext = (inv.customer && inv.customer.extendedData) ? inv.customer.extendedData : {};
      const { settings, ...rest } = inv;
      return { ...rest, ...ext, ...(settings || {}) };
    });
  },

  async saveInvoice(invoice) {
    // Pack all dynamic/UI fields into a single 'settings' JSONB column
    const { 
      discountAmount, 
      showContactDetails, 
      documentTitle, 
      _showDrafts, 
      isSaving,
      packingCharges,
      shippingCharges,
      customerName,
      customerAddress,
      customerPhone,
      customerGstin,
      settings,
      applyGst,
      gstType,
      ...coreInvoice 
    } = invoice;
    
    const invoiceData = {
      ...coreInvoice,
      id: coreInvoice.id || 'inv-' + Date.now(),
      customer: {
        ...(coreInvoice.customer || {}),
        extendedData: {
          discountAmount,
          showContactDetails,
          documentTitle,
          packingCharges,
          shippingCharges,
          customerName,
          customerAddress,
          customerPhone,
          customerGstin,
          applyGst,
          gstType
        }
      }
    };
    
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('invoices')
        .upsert(invoiceData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });
    if (!res.ok) throw new Error("Failed to save invoice");
    return res.json();
  },

  async deleteInvoice(id) {
    if (useSupabase()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    }

    const res = await fetch(`${API_BASE}/invoices?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete invoice");
    return res.json();
  },

  // Secure Auth
  async unlock(password) {
    if (useSupabase()) {
      try {
        const company = await this.getCompany();
        const companyPin = company.passcode || "9449";
        if (password === companyPin) {
          return { success: true, token: "supabase_auth_token_xyz" };
        } else {
          throw new Error("Invalid Passcode");
        }
      } catch (e) {
        if (password === "9449") {
          return { success: true, token: "supabase_auth_token_xyz" };
        }
        throw new Error("Invalid Passcode");
      }
    }

    const res = await fetch(`${API_BASE}/auth/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Access Denied");
    }
    return res.json();
  }
};
