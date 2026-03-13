
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
        console.log('[BillingService] getBalance chamado com tenantId:', tenantId);
        
        if (!tenantId || tenantId === 'default') {
            console.log('[BillingService] tenantId inválido ou default, retornando 0');
            return 0;
        }

        console.log(`[BillingService] Buscando saldo para tenant ${tenantId}...`);
        
        const { data, error } = await supabase
            .from('tenant_wallets')
            .select('credit_balance')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        console.log('[BillingService] Resultado da query:', { data, error });

        if (error) {
            console.error(`[Billing] Erro ao buscar saldo para tenant ${tenantId}:`, error);
            return 0;
        }

        if (!data) {
            console.warn(`[Billing] Nenhuma carteira encontrada para o tenant ${tenantId}.`);
        }

        const balance = data?.credit_balance || 0;
        console.log(`[BillingService] Saldo final retornado: ${balance}`);
        
        return balance;
    }

    /**
     * Tenta consumir créditos para um serviço específico
     * Retorna true se houver saldo e o consumo for realizado
     */
    static async useCredits(tenantId: string, amount: number, service: string, description: string): Promise<boolean> {
        console.log(`[BillingService] useCredits: tenant=${tenantId}, amount=${amount}, service=${service}`);
        
        if (!tenantId || tenantId === 'default') {
            console.warn('[BillingService] useCredits negado: tenantId inválido ou default');
            return false;
        }

        const { data, error } = await supabase.rpc('deduct_tenant_credits', {
            p_tenant_id: tenantId,
            p_amount: Math.floor(amount),
            p_service: service,
            p_description: description
        });

        if (error) {
            console.error('[Billing] Falha crítica ao deduzir créditos:', error);
            // Lançar erro real para evitar que o UI mostre "saldo esgotado" quando na verdade é erro de código
            throw new Error(`BILLING_RPC_ERROR: ${error.message}`);
        }

        if (data === false) {
            console.warn(`[Billing] Saldo insuficiente para o tenant ${tenantId}. Necessário: ${amount}`);
            return false;
        }

        console.log(`[BillingService] Créditos deduzidos com sucesso (${amount})`);
        return true;
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
