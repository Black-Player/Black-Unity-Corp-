import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a valid dummy URL if the provided one is missing or malformed
const isValidUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    // Attempt to fix common issues like missing protocol
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getEffectiveUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder-project.supabase.co';
  return url.startsWith('http') ? url : `https://${url}`;
};

const supabaseUrl = getEffectiveUrl(rawUrl);
const supabaseAnonKey = rawKey || 'placeholder-key';

if (!rawUrl || !rawKey || !isValidUrl(rawUrl)) {
  console.warn('Supabase configuration is missing or invalid.');
  console.info('To connect your database, please add the following to Settings > Secrets:');
  console.info('VITE_SUPABASE_URL: Your Project URL (e.g., https://xdweqmczouwiucfqqgyh.supabase.co)');
  console.info('VITE_SUPABASE_ANON_KEY: Your Project API Key (Anon Key)');
}

export const isSupabaseConfigured = Boolean(rawUrl && rawKey && isValidUrl(rawUrl));

export const supabaseConfigStatus = {
  url: Boolean(rawUrl),
  key: Boolean(rawKey),
  urlValid: isValidUrl(rawUrl),
  isReady: Boolean(rawUrl && rawKey && isValidUrl(rawUrl))
};

export async function pingSupabase(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured) return { success: false, message: "Configuration missing" };
  
  try {
    const fetchWithTimeout = async (resource: string, options: any = {}) => {
      const { timeout = 8000 } = options;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    };

    // Try to hit the Supabase REST health/base endpoint
    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseAnonKey }
    });

    if (response.ok || response.status === 401) {
      return { success: true, message: "Connection established" };
    }
    
    return { success: false, message: `Server returned status ${response.status}` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: "Connection timed out (8s)" };
    }
    return { success: false, message: err.message || "Network connection failed" };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null;
    providerInfo: any[];
  }
}

export async function handleSupabaseError(error: any, operationType: OperationType, table: string | null) {
  // Gracefully ignore fetch errors for Supabase if we're using Dummy URL silently
  if (error?.message?.includes('Failed to fetch') || String(error).includes('Failed to fetch')) {
    console.warn(`[Supabase Mirror] Offline/Disabled. Skipping ${operationType} on ${table}`);
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  
  const errInfo: SupabaseErrorInfo = {
    error: error.message || String(error),
    operationType,
    table,
    authInfo: {
      userId: user?.id,
      email: user?.email,
      emailVerified: user?.email_confirmed_at ? true : false,
      isAnonymous: user?.is_anonymous ?? false,
      tenantId: null,
      providerInfo: user?.app_metadata?.provider ? [{ providerId: user.app_metadata.provider }] : []
    }
  };
  
  console.warn('Supabase Alert (Non-Fatal fallback): ', JSON.stringify(errInfo));
  // Do not throw to break the app, return null to act as empty fallback
  return null;
}
