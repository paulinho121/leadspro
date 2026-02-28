
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';

export const LEADS_PAGE_SIZE = 100;

export function useLeads(tenantId: string, activeTab: string, limit = LEADS_PAGE_SIZE) {
    return useQuery({
        queryKey: ['leads', tenantId, activeTab, limit],
        queryFn: async () => {
            if (!tenantId || tenantId === 'default') return { leads: [], totalCount: 0 };

            // Select only fields needed for display — avoid loading heavy JSON blobs unnecessarily
            let query = supabase
                .from('leads')
                .select('id, tenant_id, name, website, phone, industry, location, status, updated_at, p2c_score, social_links, details, ai_insights', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(0, limit - 1);

            // Tenant isolation
            if (activeTab !== 'master') {
                query = query.eq('tenant_id', tenantId);
            }

            // Otimização Neural: Filtrar por status base na aba ativa para evitar que limit exclua leads
            if (activeTab === 'enriched') {
                query = query.eq('status', 'ENRICHED');
            } else if (activeTab === 'lab') {
                query = query.in('status', ['NEW', 'ENRICHING', 'ENRICHED', 'EXPORTED']);
            }

            const { data, error, count } = await query;

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

            // Visual deduplication
            const seen = new Set<string>();
            const deduped = formattedLeads.filter(lead => {
                const key = lead.name.toLowerCase().trim() + '|' + (lead.location || '').toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            return { leads: deduped, totalCount: count ?? 0 };
        },
        enabled: !!tenantId && tenantId !== 'default',
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 min cache — evita refetches desnecessários
        placeholderData: (prev) => prev, // mantém dados anteriores durante load da próxima página
    });
}
