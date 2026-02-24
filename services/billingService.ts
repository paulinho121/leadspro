
import { supabase } from '../lib/supabase';

export interface WalletInfo {
    balance: number;
    lastUpdated: string;
}

export class BillingService {
    /**
     * Busca o saldo atual do Tenant
     */
    static async getBalance(tenantId: string): Promise<number> {
        if (!tenantId || tenantId === 'default') return 0;

        const { data, error } = await supabase
            .from('tenant_wallets')
            .select('credit_balance')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) {
            console.error('[Billing] Erro ao buscar saldo:', error);
            return 0;
        }

        return data?.credit_balance || 0;
    }

    /**
     * Tenta consumir créditos para um serviço específico
     * Retorna true se houver saldo e o consumo for realizado
     */
    static async useCredits(tenantId: string, amount: number, service: string, description: string): Promise<boolean> {
        if (!tenantId || tenantId === 'default') return false;

        const { data, error } = await supabase.rpc('deduct_tenant_credits', {
            p_tenant_id: tenantId,
            p_amount: amount,
            p_service: service,
            p_description: description
        });

        if (error) {
            console.error('[Billing] Falha ao deduzir créditos:', error);
            return false;
        }

        return data === true;
    }

    /**
     * Busca histórico de transações recente
     */
    static async getTransactions(tenantId: string, limit = 10) {
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }
}
