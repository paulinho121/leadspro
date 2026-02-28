
import { supabase } from '../lib/supabase';

export interface TenantSecrets {
    gemini?: string;
    openai?: string;
    serper?: string;
    rdStation?: string;
    hubspot?: string;
    pipedrive?: string;
    salesforce?: string;
}

export class SecretService {
    private static secretsCache: Map<string, TenantSecrets> = new Map();

    /**
     * Busca os segredos do tenant de forma segura.
     * Requer que o usuário esteja autenticado e tenha permissão via RLS.
     */
    static async getTenantSecrets(tenantId: string): Promise<TenantSecrets | null> {
        if (!tenantId) return null;

        // Verificar cache
        if (this.secretsCache.has(tenantId)) {
            return this.secretsCache.get(tenantId)!;
        }

        try {
            // Get core secrets
            const { data, error } = await supabase
                .from('tenant_api_keys')
                .select('gemini_key, openai_key, serper_key')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            // Get CRM tokens safely from generic JSON config avoiding schema constraints errors
            const { data: configData } = await supabase
                .from('white_label_configs')
                .select('api_keys')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            const crmKeys = configData?.api_keys || {};

            if (error) {
                console.warn('[Security] Erro ao buscar segredos:', error.message);
            }

            // Fallback para variáveis de ambiente se não houver no banco ou se o tenant for o default
            const secrets = {
                gemini: data?.gemini_key || (import.meta as any).env.VITE_GEMINI_API_KEY || undefined,
                openai: data?.openai_key || (import.meta as any).env.VITE_OPENAI_API_KEY || undefined,
                serper: data?.serper_key || (import.meta as any).env.VITE_SERPER_API_KEY || undefined,
                rdStation: crmKeys?.rd_station_token || undefined,
                hubspot: crmKeys?.hubspot_token || undefined,
                pipedrive: crmKeys?.pipedrive_token || undefined,
                salesforce: crmKeys?.salesforce_token || undefined
            };

            // Armazenar no cache para evitar múltiplas chamadas
            this.secretsCache.set(tenantId, secrets);
            return secrets;
        } catch (err) {
            console.error('[Security] Falha crítica ao recuperar segredos:', err);
            // Fallback de emergência caso o banco falhe
            return {
                gemini: (import.meta as any).env.VITE_GEMINI_API_KEY,
                serper: (import.meta as any).env.VITE_SERPER_API_KEY,
                openai: (import.meta as any).env.VITE_OPENAI_API_KEY
            };
        }
    }

    /**
     * Limpa o cache de segredos (útil no logout)
     */
    static clearCache() {
        this.secretsCache.clear();
    }
}
