import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';

export interface SearchResult extends Lead {
    _matchField?: 'name' | 'industry' | 'location' | 'phone';
}

export function useLeadSearch(tenantId: string) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2 || !tenantId) {
            setResults([]);
            setError(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setError(null);
            try {
                // Busca server-side — encontra leads mesmo fora da página carregada
                const { data, error: dbError } = await supabase
                    .from('leads')
                    .select('id, name, phone, industry, location, status, updated_at, details, social_links, p2c_score')
                    .eq('tenant_id', tenantId)
                    .or(
                        `name.ilike.%${q}%,` +
                        `industry.ilike.%${q}%,` +
                        `location.ilike.%${q}%,` +
                        `phone.ilike.%${q}%`
                    )
                    .order('updated_at', { ascending: false })
                    .limit(12);

                if (dbError) throw dbError;

                const mapped: SearchResult[] = (data || []).map(d => ({
                    id: d.id,
                    tenant_id: tenantId,
                    name: d.name,
                    website: '',
                    phone: d.phone,
                    industry: d.industry,
                    location: d.location,
                    status: d.status as LeadStatus,
                    details: d.details,
                    socialLinks: d.social_links,
                    lastUpdated: d.updated_at,
                    p2c_score: d.p2c_score,
                    // Determina qual campo casou para highlight
                    _matchField: d.name?.toLowerCase().includes(q.toLowerCase())
                        ? 'name'
                        : d.phone?.includes(q)
                            ? 'phone'
                            : d.industry?.toLowerCase().includes(q.toLowerCase())
                                ? 'industry'
                                : 'location',
                }));

                setResults(mapped);
            } catch (err: any) {
                setError(err.message);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 280); // debounce 280ms — rápido mas sem spam de requests

        return () => clearTimeout(timer);
    }, [query, tenantId]);

    const clear = () => { setQuery(''); setResults([]); };

    return { query, setQuery, results, isSearching, error, clear };
}
