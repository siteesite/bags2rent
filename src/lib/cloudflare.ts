import { supabase } from './supabase';

export async function clearCloudflareCache() {
  try {
    const zoneId = import.meta.env.VITE_CLOUDFLARE_ZONE_ID;
    const apiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.warn('Cloudflare credentials not found in environment variables.');
      return { success: false, error: 'Credenciais do Cloudflare não configuradas.' };
    }

    const { data: json, error: functionError } = await supabase.functions.invoke('cloudflare-proxy', {
      body: {
        endpoint: `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: { purge_everything: true }
      }
    });

    if (functionError) {
      throw new Error(functionError.message || 'Erro na comunicação com a API do Cloudflare (Proxy)');
    }

    if (json && json.success === false) {
      throw new Error('Falha ao limpar o cache do Cloudflare');
    }

    console.log('[Cloudflare] Cache cleared successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[Cloudflare] Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}
