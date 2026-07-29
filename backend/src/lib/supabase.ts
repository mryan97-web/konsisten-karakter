import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

function getUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL tidak ditemukan');
  return url;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(getUrl(), process.env.SUPABASE_ANON_KEY || '');
  }
  return supabaseInstance;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(getUrl(), process.env.SUPABASE_SERVICE_KEY || '');
  }
  return supabaseAdminInstance;
}
