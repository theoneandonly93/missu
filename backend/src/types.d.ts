// Minimal ambient module declarations to silence missing type errors during development

declare module 'bs58' {
  const bs58: any;
  export default bs58;
}

declare module '@supabase/supabase-js' {
  // Minimal shape used in this project
  export type SupabaseClient = any;
  export function createClient(url: string, key: string): SupabaseClient;
  export default {
    createClient: createClient,
  } as any;
}
