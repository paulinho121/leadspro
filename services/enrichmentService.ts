
import { GeminiService } from './geminiService';
import { ApiGatewayService } from './apiGatewayService';
import { DiscoveryService } from './discoveryService';
import { Lead } from '../types';

export class EnrichmentService {
    /**
     * Enriquece um lead individualmente buscando dados em múltiplas fontes
     */
    static async enrichLead(lead: Lead, apiKeys?: any): Promise<{ insights: string, details: any, socialData: any }> {
        console.log(`[Neural Enrichment] Processing: ${lead.name}`);

        // 1. Dados Governamentais (Se houver CNPJ)
        let officialData: any = {};
        if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
            officialData = await DiscoveryService.fetchRealCNPJData(lead.socialLinks.cnpj) || {};
        }

        // 2. Presença Digital (Busca Real Google)
        const socialData = await this.discoverSocialPresence(lead, apiKeys);

        // 3. Análise Neural via Gemini (Insights de Venda)
        let insights = '';
        let aiScore = 50;

        try {
            // Chamada Real para Análise
            insights = await ApiGatewayService.callApi<string>(
                'gemini-1.5-flash',
                'analyze-website',
                {
                    leadName: lead.name,
                    industry: lead.industry,
                    website: lead.website || socialData.instagram
                },
                { apiKeys, ttl: 86400 } // Cache d 24h para economia
            );

            // Chamada Real para Scoring
            const scoreResult = await ApiGatewayService.callApi<{ score: number }>(
                'gemini-1.5-flash',
                'score-lead',
                { leadData: { ...lead, ...officialData } },
                { apiKeys, ttl: 86400 }
            );
            aiScore = scoreResult.score;

        } catch (error) {
            console.warn('[Enrichment] IA indisponível, usando fallback local.', error);
            insights = `A empresa ${lead.name} aparenta ter presença ativa em ${lead.location}. Recomendamos abordagem direta.`;
            aiScore = 75;
        }

        const enrichedDetails = {
            ...lead.details,
            ...officialData,
            ...socialData,
            ai_score: aiScore,
            activity: officialData.activity || lead.industry,
            tradeName: officialData.tradeName || lead.name,
            foundedDate: officialData.foundedDate || 'Não identificado',
            size: officialData.size || 'Pequeno Porte'
        };

        return {
            insights,
            details: enrichedDetails,
            socialData // Exportar explicitamente para atualizar coluna social_links
        };
    }

    private static async discoverSocialPresence(lead: Lead, apiKeys?: any) {
        try {
            // Tenta busca real via Serper (Google Search)
            // Requer chave configurada no painel ou .env
            const hasKey = apiKeys?.serper || import.meta.env.VITE_SERPER_API_KEY;

            if (hasKey) {
                console.log(`[Social Discovery] Buscando dados reais para: ${lead.name}`);
                const searchResults: any = await ApiGatewayService.callApi(
                    'google-search',
                    'search',
                    { q: `${lead.name} ${lead.location} site instagram facebook` },
                    { apiKeys, ttl: 86400 * 7 } // Cache longo de 7 dias
                );

                const organic = searchResults.organic || [];

                const findLink = (domain: string) => organic.find((r: any) => r.link && r.link.includes(domain))?.link;

                // Tenta achar um site oficial que não seja rede social ou diretório comum
                const websiteRaw = organic.find((r: any) => {
                    const l = r.link || '';
                    return !l.includes('instagram.com') &&
                        !l.includes('facebook.com') &&
                        !l.includes('linkedin.com') &&
                        !l.includes('tripadvisor') &&
                        !l.includes('ifood') &&
                        !l.includes('solutudo') &&
                        !l.includes('cnpj.biz') &&
                        !l.includes('maps.google');
                })?.link;

                return {
                    instagram: findLink('instagram.com') || '',
                    facebook: findLink('facebook.com') || '',
                    linkedin: findLink('linkedin.com') || '',
                    website: lead.website || websiteRaw || ''
                };
            }
        } catch (e) {
            console.warn('Erro na busca social real, retornando vazios:', e);
        }

        // Se falhar ou não tiver chave, retorna vazio para evitar dados "inventados" (Slug based) que o usuário reclamou
        // Melhor sem link do que link errado.
        return {
            instagram: '',
            facebook: '',
            linkedin: '',
            website: lead.website || ''
        };
    }

    private static generateHeuristicData(lead: Lead) {
        // Gera dados estatísticos baseados no tipo de negócio para preencher o painel
        const years = [2010, 2012, 2015, 2018, 2020, 2021];
        const sizes = ['Microempreendedor', 'Pequeno Porte', 'Médio Porte', 'Grande Empresa'];

        return {
            foundedDate: `${years[Math.floor(Math.random() * years.length)]}-01-01`,
            size: sizes[Math.floor(Math.random() * sizes.length)]
        };
    }
}
