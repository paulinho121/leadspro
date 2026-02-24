
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';

export function useLeads(tenantId: string, activeTab: string) {
    return useQuery({
        queryKey: ['leads', tenantId, activeTab],
        queryFn: async () => {
            if (!tenantId || tenantId === 'default') return [];

            console.log(`[Neural Cache] Refetching leads for tenant: ${tenantId}`);

            let query = supabase.from('leads').select('*');

            // Isolamento por Tenant
            if (activeTab !== 'master') {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const formattedLeads: Lead[] = (data || []).map(dbLead => ({
                id: dbLead.id,
                tenant_id: dbLead.tenant_id,
                name: dbLead.name,
                website: dbLead.website,
                phone: dbLead.phone,
                industry: dbLead.industry,
                location: dbLead.location,
                status: dbLead.status as LeadStatus,
                details: dbLead.details,
                ai_insights: dbLead.ai_insights,
                socialLinks: dbLead.social_links,
                lastUpdated: dbLead.updated_at,
                p2c_score: dbLead.p2c_score
            }));

            // Deduplicação visual automática
            const seen = new Set();
            return formattedLeads.filter(lead => {
                const key = lead.name.toLowerCase().trim() + '|' + (lead.location || '').toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
        enabled: !!tenantId && tenantId !== 'default',
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 2, // 2 minutos de cache fresco
    });
}
