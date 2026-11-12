import { SITE } from './site-config.js';

export const isConfigured = Boolean(SITE.supabaseUrl && SITE.supabaseAnonKey);
let supabasePromise;
export async function getSupabase() {
  if (!isConfigured) return null;
  if (!supabasePromise) {
    supabasePromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => createClient(SITE.supabaseUrl, SITE.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }));
  }
  return supabasePromise;
}
