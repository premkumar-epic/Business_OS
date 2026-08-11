import { createClient } from '@supabase/supabase-js';

const BETA_URL = 'https://vwmutpuizshsatwlyeab.supabase.co';
const BETA_KEY = 'sb_publishable_gO3i8RhRyBgFdUbMSY1Sog_EHjmVCDv';

const getSupabaseConfig = () => {
  // Foolproof override: If we are on the beta Vercel URL, strictly use the Beta Database.
  // This bypasses Vercel's Supabase Integration forcibly injecting Production keys into Preview builds.
  if (typeof window !== 'undefined' && window.location.hostname.includes('beta')) {
    return { url: BETA_URL, key: BETA_KEY };
  }

  const url = localStorage.getItem('ivk_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('ivk_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
};

let cachedSupabase = null;
let lastUrl = null;
let lastKey = null;

export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;

  if (cachedSupabase && url === lastUrl && key === lastKey) {
    return cachedSupabase;
  }

  try {
    cachedSupabase = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return cachedSupabase;
  } catch (e) {
    console.warn("Supabase init error:", e);
    return null;
  }
};

// SQL Schema for user reference
export const SUPABASE_SQL_SCHEMA = `
-- Execute in Supabase SQL Editor:

DROP TABLE IF EXISTS company CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  name TEXT,
  "accountHolder" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  "contactPerson" TEXT,
  "bankName" TEXT,
  "accountNo" TEXT,
  "ifscCode" TEXT,
  branch TEXT,
  "upiId" TEXT,
  passcode TEXT DEFAULT '9449',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  "contactPerson" TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gstin TEXT,
  "oldBalance" NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT,
  hsn TEXT,
  rate NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Pcs',
  category TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT,
  date DATE,
  "dueDate" DATE,
  "referenceDC" TEXT,
  "ewayBillNo" TEXT,
  "vehicleNo" TEXT,
  "lrNo" TEXT,
  "poNo" TEXT,
  "agentName" TEXT,
  "showBankDetails" BOOLEAN DEFAULT TRUE,
  "showSignature" BOOLEAN DEFAULT TRUE,
  notes TEXT,
  "gstNote" TEXT,
  customer JSONB,
  items JSONB,
  "customFields" JSONB,
  subtotal NUMERIC,
  "gstRate" NUMERIC,
  "gstAmount" NUMERIC,
  "useCustomGstAmount" BOOLEAN DEFAULT FALSE,
  "customGstAmount" NUMERIC,
  "oldBalance" NUMERIC,
  "useCustomTotalAmount" BOOLEAN DEFAULT FALSE,
  "customTotalAmount" NUMERIC,
  "totalAmount" NUMERIC,
  status TEXT,
  "paidAmount" NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
`;
