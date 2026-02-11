import { createClient } from '@supabase/supabase-js';

/**
 * XEENAPS SUPABASE CLIENT CONFIG
 * Menggunakan standar Vite import.meta.env
 */

const getSupabaseConfig = () => {
  try {
    // Mencoba mengambil dari Vite meta env
    // Fix: Added @ts-ignore to suppress "Property 'env' does not exist on type 'ImportMeta'" errors
    // @ts-ignore
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    // Fix: Added @ts-ignore to suppress "Property 'env' does not exist on type 'ImportMeta'" errors
    // @ts-ignore
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    return { url, key };
  } catch (e) {
    return { url: '', key: '' };
  }
};

let supabaseInstance: any = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    console.warn("Supabase credentials missing. Database registry features will be disabled.");
    return null;
  }

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase:", err);
    return null;
  }
};

// Export dummy object for initial types, but services should use getSupabase()
export const supabase = null;