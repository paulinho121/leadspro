
import { useQuery } from '@tanstack/react-query';
import { BillingService } from '../services/billingService';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';

export function useWallet(tenantId: string) {
    const setCreditBalance = useStore((state) => state.setCreditBalance);

    const effectiveTenantId = tenantId;

    const query = useQuery({
        queryKey: ['wallet', effectiveTenantId],
        queryFn: () => BillingService.getBalance(effectiveTenantId!),
        enabled: !!effectiveTenantId && effectiveTenantId !== 'default',
        refetchInterval: 1000 * 10, // Atualiza a cada 10 segundos (mais frequente)
        refetchOnWindowFocus: true, // Atualiza quando a janela ganha foco
        refetchOnReconnect: true, // Atualiza quando reconecta
        staleTime: 1000 * 5, // Considera stale após 5 segundos
        gcTime: 1000 * 30, // Cache por 30 segundos (gcTime substitui cacheTime)
    });

    // Sincroniza com o Zustand para acesso global rápido (sem hooks) se necessário
    useEffect(() => {
        if (query.data !== undefined) {
            console.log('[useWallet] Atualizando saldo no Zustand:', query.data);
            setCreditBalance(query.data);
        }
    }, [query.data, setCreditBalance]);

    // Força uma atualização inicial se não tiver dados
    useEffect(() => {
        if (effectiveTenantId && effectiveTenantId !== 'default' && query.data === undefined && !query.isFetching) {
            console.log('[useWallet] Forçando atualização inicial do saldo');
            query.refetch();
        }
    }, [effectiveTenantId, query.data, query.isFetching, query.refetch]);

    return query;
}
