
import { GeminiService } from './geminiService';
import { ApiGatewayService } from './apiGatewayService';
import { DiscoveryService } from './discoveryService';
import { Lead } from '../types';

export class EnrichmentService {
    /**
     * Enriquece um lead individualmente buscando dados em múltiplas fontes
     */
    static async enrichLead(lead: Lead, apiKeys?: any): Promise<{ insights: string, details: any, socialData: any, realEmail?: string }> {
        console.log(`[Neural Enrichment] Processing: ${lead.name}`);

        // 1. Dados Governamentais (Se houver CNPJ)
        let officialData: any = {};
        if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
            officialData = await DiscoveryService.fetchRealCNPJData(lead.socialLinks.cnpj) || {};
        }

        // 2. Presença Digital (Busca Real Google)
        const socialData = await this.discoverSocialPresence(lead, apiKeys);

        // 3. Análise Neural via Gemini (Análise Comercial Completa)
        let insights = '';
        let aiScore = 50;
        let diagnostic: any = {};

        try {
            // Chamada Real para Análise Comercial Consolidada
            diagnostic = await ApiGatewayService.callApi<any>(
                'gemini-1.5-flash',
                'analyze-commercial',
                {
                    leadName: lead.name,
                    industry: lead.industry,
                    location: lead.location,
                    website: lead.website || socialData.website,
                    instagram: socialData.instagram,
                    facebook: socialData.facebook,
                    phone: lead.phone,
                    mapSnippet: lead.socialLinks?.map_link || ''
                },
                { apiKeys, ttl: 86400 }
            );

            insights = diagnostic.strategic_insight || '';
            aiScore = (diagnostic.commercial_score || 5) * 10; // Normalizar para escala 1-100

        } catch (error) {
            console.warn('[Enrichment] IA indisponível, usando fallback local.', error);
            insights = `A empresa ${lead.name} aparenta ter presença ativa em ${lead.location}. Recomendamos abordagem direta.`;
            aiScore = 75;
        }

        const enrichedDetails = {
            ...lead.details,
            ...officialData,
            ...socialData,
            ...diagnostic, // WhatsApp, Ads, Instagram status, maturidade e p2c_score
            ai_score: aiScore,
            p2c_score: diagnostic.p2c_score || (aiScore / 100), // Fallback baseado no aiScore
            activity: officialData.activity || lead.industry,
            tradeName: officialData.tradeName || lead.name,
            foundedDate: officialData.foundedDate || 'Não identificado',
            size: officialData.size || 'Pequeno Porte',
            real_email: socialData.realEmail
        };

        return {
            insights,
            details: enrichedDetails,
            socialData, // Exportar explicitamente para atualizar coluna social_links
            realEmail: socialData.realEmail
        };
    }

    private static async discoverSocialPresence(lead: Lead, apiKeys?: any) {
        try {
            const hasKey = apiKeys?.serper || import.meta.env.VITE_SERPER_API_KEY;

            if (hasKey) {
                console.log(`[Social Discovery] Buscando dados reais para: ${lead.name}`);

                // Busca ampliada para encontrar contato e email real
                const searchResults: any = await ApiGatewayService.callApi(
                    'google-search',
                    'search',
                    { q: `${lead.name} ${lead.location} "email" "contato" site instagram facebook` },
                    { apiKeys, ttl: 86400 * 7 }
                );

                const organic = searchResults.organic || [];
                const findLink = (domain: string) => organic.find((r: any) => r.link && r.link.includes(domain))?.link;

                // Capturar todos os snippets para extração de email via IA
                const snippets = organic.map((r: any) => r.snippet).join(' | ');

                // Tenta extrair email real via IA se houver snippets
                let realEmail = '';
                try {
                    const prompt = `Analise os seguintes textos de resultados de busca e extraia o EMAIL REAL de contato da empresa "${lead.name}". 
                    IGNORE e-mails terminados em @gmail.com, @hotmail.com ou emails de contabilidade (ex: contabil, adm, fiscal) a menos que sejam os únicos disponíveis. 
                    Dê preferência para emails com o domínio da empresa. 
                    Retorne APENAS o email puro ou "NÃO ENCONTRADO".
                    Textos: ${snippets}`;

                    const extracted = await ApiGatewayService.callApi<string>(
                        'gemini-1.5-flash',
                        'custom-prompt',
                        { prompt },
                        { apiKeys, ttl: 86400 }
                    );

                    if (extracted && extracted.includes('@') && !extracted.includes(' ')) {
                        realEmail = extracted.toLowerCase().trim();
                        console.log(`[Neural Email] Email Real detectado: ${realEmail}`);
                    }
                } catch (emailErr) {
                    console.warn('Erro ao extrair email via IA:', emailErr);
                }

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
                    website: lead.website || websiteRaw || '',
                    realEmail: realEmail
                };
            }
        } catch (e) {
            console.warn('Erro na busca social real:', e);
        }

        return {
            instagram: '',
            facebook: '',
            linkedin: '',
            website: lead.website || '',
            realEmail: ''
        };
    }
}
