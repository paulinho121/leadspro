
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
            // 1. Tentar buscar chaves específicas do Tenant
            const { data, error } = await supabase
                .from('tenant_api_keys')
                .select('gemini_key, openai_key, serper_key')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            // 2. Tentar buscar chaves do CRM (sempre específicas)
            const { data: configData } = await supabase
                .from('white_label_configs')
                .select('api_keys')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            const crmKeys = configData?.api_keys || {};

            // 3. SE as chaves core estiverem vazias, tentar buscar as chaves GLOBAIS do Master
            let platformKeys: any = null;
            if (!data?.gemini_key && !data?.serper_key) {
                const { data: globalKeys } = await supabase.rpc('get_platform_api_keys').maybeSingle();
                if (globalKeys) platformKeys = globalKeys;
            }

            const secrets = {
                gemini: data?.gemini_key || platformKeys?.gemini_key || (import.meta as any).env.VITE_GEMINI_API_KEY || undefined,
                openai: data?.openai_key || platformKeys?.openai_key || (import.meta as any).env.VITE_OPENAI_API_KEY || undefined,
                serper: data?.serper_key || platformKeys?.serper_key || (import.meta as any).env.VITE_SERPER_API_KEY || undefined,
                rdStation: crmKeys?.rd_station_token || undefined,
                hubspot: crmKeys?.hubspot_token || undefined,
                pipedrive: crmKeys?.pipedrive_token || undefined,
                salesforce: crmKeys?.salesforce_token || undefined
            };

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
