import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a valid dummy URL if the provided one is missing or malformed
const isValidUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

if (!rawUrl || !rawKey || !isValidUrl(rawUrl)) {
  console.error('Supabase configuration is missing or invalid. Please set VITE_SUPABASE_URL (must start with https://) and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const isSupabaseConfigured = Boolean(rawUrl && rawKey && isValidUrl(rawUrl));

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
  }
}

export async function handleSupabaseError(error: any, operationType: OperationType, table: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const errInfo: SupabaseErrorInfo = {
    error: error.message || String(error),
    operationType,
    table,
    authInfo: {
      userId: user?.id,
      email: user?.email,
      emailVerified: user?.email_confirmed_at ? true : false,
      isAnonymous: user?.is_anonymous,
    }
  };
  
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
