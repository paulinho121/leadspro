
import { supabase } from '../lib/supabase';

export interface TenantSecrets {
    gemini?: string;
    openai?: string;
    serper?: string;
}

export class SecretService {
    private static secretsCache: Map<string, TenantSecrets> = new Map();

    /**
     * Busca os segredos do tenant de forma segura.
     * Requer que o usuário esteja autenticado e tenha permissão via RLS.
     */
    static async getTenantSecrets(tenantId: string): Promise<TenantSecrets | null> {
        if (!tenantId || tenantId === 'default') return null;

        // Verificar cache
        if (this.secretsCache.has(tenantId)) {
            return this.secretsCache.get(tenantId)!;
        }

        try {
            const { data, error } = await supabase
                .from('tenant_api_keys')
                .select('gemini_key, openai_key, serper_key')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (error) {
                console.warn('[Security] Erro ao buscar segredos:', error.message);
                return null;
            }

            if (!data) return null;

            const secrets = {
                gemini: data.gemini_key || undefined,
                openai: data.openai_key || undefined,
                serper: data.serper_key || undefined
            };

            // Armazenar no cache para evitar múltiplas chamadas
            this.secretsCache.set(tenantId, secrets);
            return secrets;
        } catch (err) {
            console.error('[Security] Falha crítica ao recuperar segredos:', err);
            return null;
        }
    }

    /**
     * Limpa o cache de segredos (útil no logout)
     */
    static clearCache() {
        this.secretsCache.clear();
    }
}
