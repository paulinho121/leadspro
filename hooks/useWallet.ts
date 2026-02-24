
import { useQuery } from '@tanstack/react-query';
import { BillingService } from '../services/billingService';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';

export function useWallet(tenantId: string) {
    const setCreditBalance = useStore((state) => state.setCreditBalance);

    const query = useQuery({
        queryKey: ['wallet', tenantId],
        queryFn: () => BillingService.getBalance(tenantId),
        enabled: !!tenantId && tenantId !== 'default',
        refetchInterval: 1000 * 30, // Atualiza a cada 30 segundos
    });

    // Sincroniza com o Zustand para acesso global rápido (sem hooks) se necessário
    useEffect(() => {
        if (query.data !== undefined) {
            setCreditBalance(query.data);
        }
    }, [query.data, setCreditBalance]);

    return query;
}
